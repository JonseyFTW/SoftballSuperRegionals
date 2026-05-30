import type { Matchup, PoolData, TeamSlot } from "./types";
import { getSeriesWinnerTeamId } from "./game-status";

/**
 * The WCWS bracket is a feed graph: most games take their two teams from the
 * winner or loser of an earlier game. These helpers walk that graph so we can
 * (a) fill in the live participants of each game from results so far,
 * (b) figure out which teams can still win a given slot (possible points), and
 * (c) enumerate every still-possible full bracket outcome (scenario odds).
 */

function matchupMap(matchups: Matchup[]): Map<string, Matchup> {
  return new Map(matchups.map((matchup) => [matchup.id, matchup]));
}

/** Actual winner of a matchup, honoring a manually set winner or a derived series winner. */
export function actualWinnerTeamId(data: PoolData, matchup: Matchup): string | undefined {
  return matchup.winnerTeamId ?? getSeriesWinnerTeamId(data, matchup);
}

/**
 * Resolve a single slot to a concrete teamId given the winners decided so far,
 * or undefined when it cannot be determined yet.
 */
function resolveSlot(
  slot: TeamSlot | undefined,
  byId: Map<string, Matchup>,
  winnerOf: (matchup: Matchup) => string | undefined,
  seen: Set<string> = new Set(),
): string | undefined {
  if (!slot) return undefined;
  if (slot.type === "team") return slot.teamId;

  const source = byId.get(slot.matchupId);
  if (!source || seen.has(source.id)) return undefined;
  const nextSeen = new Set(seen).add(source.id);

  const winner = winnerOf(source);
  if (slot.type === "winner") return winner;

  // Loser feed: need the winner plus both participants to know who lost.
  if (!winner) return undefined;
  const participants = [
    resolveSlot(source.slotA, byId, winnerOf, nextSeen) ?? source.teamAId,
    resolveSlot(source.slotB, byId, winnerOf, nextSeen) ?? source.teamBId,
  ];
  return participants.find((teamId) => teamId && teamId !== winner) ?? undefined;
}

/**
 * Returns the matchups with teamAId/teamBId filled in from the bracket feeds and
 * the results decided so far. Fixed seeds always resolve; downstream games resolve
 * as their feeder games finish.
 */
export function resolveBracket(data: PoolData): PoolData {
  const byId = matchupMap(data.matchups);
  const winnerOf = (matchup: Matchup) => actualWinnerTeamId(data, matchup);
  const matchups = data.matchups.map((matchup) => ({
    ...matchup,
    teamAId: resolveSlot(matchup.slotA, byId, winnerOf) ?? matchup.teamAId,
    teamBId: resolveSlot(matchup.slotB, byId, winnerOf) ?? matchup.teamBId,
    winnerTeamId: winnerOf(matchup),
  }));
  return { ...data, matchups };
}

/**
 * Teams that can still win a given matchup slot, using only the results known so
 * far. Resolved games return just their winner. This is an upper bound used for
 * "possible points left".
 */
export function possibleWinnerIds(
  matchupId: string,
  byId: Map<string, Matchup>,
  winnerOf: (matchup: Matchup) => string | undefined,
  memo: Map<string, Set<string>> = new Map(),
): Set<string> {
  const cached = memo.get(matchupId);
  if (cached) return cached;

  const result = new Set<string>();
  memo.set(matchupId, result);

  const matchup = byId.get(matchupId);
  if (!matchup) return result;

  const winner = winnerOf(matchup);
  if (winner) {
    result.add(winner);
    return result;
  }

  for (const teamId of possibleSlotTeamIds(matchup.slotA, matchup.teamAId, byId, winnerOf, memo)) {
    result.add(teamId);
  }
  for (const teamId of possibleSlotTeamIds(matchup.slotB, matchup.teamBId, byId, winnerOf, memo)) {
    result.add(teamId);
  }
  return result;
}

function possibleSlotTeamIds(
  slot: TeamSlot | undefined,
  fallbackTeamId: string | undefined,
  byId: Map<string, Matchup>,
  winnerOf: (matchup: Matchup) => string | undefined,
  memo: Map<string, Set<string>>,
): Set<string> {
  if (!slot) return new Set(fallbackTeamId ? [fallbackTeamId] : []);
  if (slot.type === "team") return new Set([slot.teamId]);

  const source = byId.get(slot.matchupId);
  if (!source) return new Set(fallbackTeamId ? [fallbackTeamId] : []);

  if (slot.type === "winner") {
    return possibleWinnerIds(source.id, byId, winnerOf, memo);
  }

  // Loser feed: anyone who can play in the source can be its loser, minus a known winner.
  const participants = new Set<string>([
    ...possibleSlotTeamIds(source.slotA, source.teamAId, byId, winnerOf, memo),
    ...possibleSlotTeamIds(source.slotB, source.teamBId, byId, winnerOf, memo),
  ]);
  const winner = winnerOf(source);
  if (winner && participants.size > 1) participants.delete(winner);
  return participants;
}

/**
 * Enumerate every still-possible complete bracket outcome (a winner for every
 * matchup) consistent with the feeds and the results so far. Games are processed
 * in sort order, so each game's participants are known before we branch on it.
 */
export function enumerateBracketOutcomes(data: PoolData): Record<string, string>[] {
  const ordered = [...data.matchups].sort((a, b) => a.sortOrder - b.sortOrder);
  const winnerOf = (matchup: Matchup) => actualWinnerTeamId(data, matchup);

  let outcomes: Record<string, string>[] = [{}];

  for (const matchup of ordered) {
    const slotTeam = (slot: TeamSlot | undefined, fallback: string | undefined, assigned: Record<string, string>) =>
      resolveSlotInScenario(slot, fallback, assigned, data) ?? fallback;

    outcomes = outcomes.flatMap((assigned) => {
      const decided = winnerOf(matchup);
      if (decided) return [{ ...assigned, [matchup.id]: decided }];

      const teamA = slotTeam(matchup.slotA, matchup.teamAId, assigned);
      const teamB = slotTeam(matchup.slotB, matchup.teamBId, assigned);
      const choices = [teamA, teamB].filter((teamId): teamId is string => Boolean(teamId));
      if (choices.length === 0) return [assigned];
      return choices.map((teamId) => ({ ...assigned, [matchup.id]: teamId }));
    });
  }

  return outcomes;
}

function resolveSlotInScenario(
  slot: TeamSlot | undefined,
  fallback: string | undefined,
  assigned: Record<string, string>,
  data: PoolData,
): string | undefined {
  if (!slot) return fallback;
  if (slot.type === "team") return slot.teamId;

  const source = data.matchups.find((matchup) => matchup.id === slot.matchupId);
  if (!source) return fallback;
  const winner = assigned[source.id] ?? actualWinnerTeamId(data, source);
  if (slot.type === "winner") return winner;

  if (!winner) return fallback;
  const participants = [
    resolveSlotInScenario(source.slotA, source.teamAId, assigned, data),
    resolveSlotInScenario(source.slotB, source.teamBId, assigned, data),
  ];
  return participants.find((teamId) => teamId && teamId !== winner) ?? fallback;
}

/**
 * Cascade an entrant's picks: given the picks they have made, fill in the two
 * teams that would appear in each downstream game so a pick form can show them.
 * Mirrors resolveBracket but uses the entrant's predicted winners.
 */
export function resolveMatchupTeamsForPicks(
  data: PoolData,
  picks: Record<string, string>,
): Record<string, { teamAId?: string; teamBId?: string }> {
  const result: Record<string, { teamAId?: string; teamBId?: string }> = {};
  const ordered = [...data.matchups].sort((a, b) => a.sortOrder - b.sortOrder);

  const slotTeam = (slot: TeamSlot | undefined, fallback?: string): string | undefined => {
    if (!slot) return fallback;
    if (slot.type === "team") return slot.teamId;
    const source = data.matchups.find((matchup) => matchup.id === slot.matchupId);
    if (!source) return fallback;
    const winner = picks[source.id];
    if (slot.type === "winner") return winner;
    if (!winner) return undefined;
    const a = result[source.id]?.teamAId;
    const b = result[source.id]?.teamBId;
    return [a, b].find((teamId) => teamId && teamId !== winner);
  };

  for (const matchup of ordered) {
    result[matchup.id] = {
      teamAId: slotTeam(matchup.slotA, matchup.teamAId),
      teamBId: slotTeam(matchup.slotB, matchup.teamBId),
    };
  }

  return result;
}
