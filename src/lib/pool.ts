import type {
  BracketId,
  Entrant,
  LeaderboardEntry,
  Matchup,
  PayoutRule,
  PoolData,
  Round,
  RoundId,
  ScenarioOdd,
  Team,
  TeamSlot,
} from "./types";
import { getSeriesWinnerTeamId } from "./game-status";
import { enumerateBracketOutcomes, possibleWinnerIds } from "./bracket";

const now = new Date().toISOString();

export function getDefaultPayoutRules(places: number): PayoutRule[] {
  const templates: Record<number, number[]> = {
    1: [100],
    2: [70, 30],
    3: [50, 30, 20],
    4: [40, 30, 20, 10],
  };
  const percents = templates[places] ?? [100];
  return percents.map((percent, index) => ({ place: index + 1, percent }));
}

export function createInitialPoolData(): PoolData {
  const teams: Team[] = [
    team("texas-tech", "Texas Tech Red Raiders", "Texas Tech", "TTU", "3", "#cc0000"),
    team(
      "mississippi-state",
      "Mississippi State Bulldogs",
      "Mississippi State",
      "MSST",
      "5",
      "#660000",
    ),
    team("tennessee", "Tennessee Lady Volunteers", "Tennessee", "TENN", "2", "#ff8200"),
    team("texas", "Texas Longhorns", "Texas", "TEX", "1", "#bf5700"),
    team("alabama", "Alabama Crimson Tide", "Alabama", "ALA", "1", "#9e1b32"),
    team("ucla", "UCLA Bruins", "UCLA", "UCLA", "2", "#2774ae"),
    team("arkansas", "Arkansas Razorbacks", "Arkansas", "ARK", "4", "#9d2235"),
    team("nebraska", "Nebraska Cornhuskers", "Nebraska", "NEB", "1", "#e41c38"),
  ];

  const rounds: Round[] = [
    round("wb-round1", "Winners' Bracket Round 1", 1),
    round("lb-round1", "Elimination Round 1", 2),
    round("wb-final", "Winners' Bracket Final", 3),
    round("lb-final", "Elimination Final", 4),
    round("bracket-final", "Bracket Final (advance to Finals)", 5, true),
    round("championship", "National Champion", 6, true),
  ];

  const matchups: Matchup[] = [
    // Bracket 1 winners' round 1
    game("g1", "wb-round1", "bracket-1", "1", seed("texas-tech"), seed("mississippi-state"), 1),
    game("g2", "wb-round1", "bracket-1", "2", seed("tennessee"), seed("texas"), 2),
    // Bracket 2 winners' round 1
    game("g3", "wb-round1", "bracket-2", "3", seed("alabama"), seed("ucla"), 3),
    game("g4", "wb-round1", "bracket-2", "4", seed("arkansas"), seed("nebraska"), 4),
    // Elimination round 1 (losers of the two round-1 games)
    game("g5", "lb-round1", "bracket-1", "5", loser("g1"), loser("g2"), 5),
    game("g6", "lb-round1", "bracket-2", "6", loser("g3"), loser("g4"), 6),
    // Winners' bracket final (winners of the two round-1 games)
    game("g7", "wb-final", "bracket-1", "7", winner("g1"), winner("g2"), 7),
    game("g8", "wb-final", "bracket-2", "8", winner("g3"), winner("g4"), 8),
    // Elimination final (loser of WB final vs winner of elimination round 1)
    game("g9", "lb-final", "bracket-1", "9", loser("g7"), winner("g5"), 9),
    game("g10", "lb-final", "bracket-2", "10", loser("g8"), winner("g6"), 10),
    // Bracket final - who advances to the WCWS Finals (loser must win twice)
    game("g11", "bracket-final", "bracket-1", "11/12", winner("g7"), winner("g9"), 11),
    game("g13", "bracket-final", "bracket-2", "13/14", winner("g8"), winner("g10"), 13),
    // Championship - best of three
    game("championship", "championship", "finals", "Finals", winner("g11"), winner("g13"), 20),
  ];

  return {
    settings: {
      name: "WCWS Pick'em",
      entryFee: 10,
      adminVenmo: "@wcws-admin",
      adminZelle: "",
      payoutRules: getDefaultPayoutRules(3),
      publicEntriesOpen: false,
    },
    teams,
    rounds,
    matchups,
    entrants: [
      {
        id: "entry-sample-1",
        name: "Sample Leader",
        paid: true,
        venmo: "@sample-leader",
        tiebreakerRuns: 11,
        picks: {
          g1: "texas-tech",
          g2: "tennessee",
          g3: "alabama",
          g4: "nebraska",
          g5: "texas",
          g6: "ucla",
          g7: "tennessee",
          g8: "alabama",
          g9: "texas",
          g10: "ucla",
          g11: "tennessee",
          g13: "alabama",
          championship: "alabama",
        },
      },
      {
        id: "entry-sample-2",
        name: "Sample Chaser",
        paid: false,
        zelle: "sample@example.com",
        tiebreakerRuns: 8,
        picks: {
          g1: "mississippi-state",
          g2: "texas",
          g3: "ucla",
          g4: "arkansas",
          g5: "texas-tech",
          g6: "nebraska",
          g7: "texas",
          g8: "ucla",
          g9: "texas-tech",
          g10: "nebraska",
          g11: "texas",
          g13: "ucla",
          championship: "texas",
        },
      },
    ],
    snapshots: [],
    updatedAt: now,
  };
}

/**
 * Detects pool data saved by the older super-regional model (no bracket feeds /
 * no championship round) so it can be rebuilt into the WCWS double-elimination
 * bracket.
 */
function isLegacyPool(data: PoolData): boolean {
  const hasChampionshipRound = data.rounds?.some((round) => round.id === "championship");
  const everyMatchupHasBracket =
    Array.isArray(data.matchups) &&
    data.matchups.length > 0 &&
    data.matchups.every((matchup) => Boolean(matchup.bracketId));
  return !hasChampionshipRound || !everyMatchupHasBracket;
}

/**
 * Upgrades legacy pool data to the WCWS bracket. Entrants, paid status, and pool
 * settings are preserved; picks are reset to the new bracket because the old
 * super-regional picks reference games that no longer exist. Returns the same
 * object once the data is already in the new format.
 */
export function migratePoolData(data: PoolData): PoolData {
  if (!isLegacyPool(data)) return data;

  const scaffold = createInitialPoolData();
  const validMatchupIds = new Set(scaffold.matchups.map((matchup) => matchup.id));
  const entrants = (data.entrants ?? []).map((entrant) => ({
    ...entrant,
    picks: Object.fromEntries(
      Object.entries(entrant.picks ?? {}).filter(([matchupId]) => validMatchupIds.has(matchupId)),
    ),
  }));

  return {
    ...scaffold,
    settings: { ...scaffold.settings, ...data.settings },
    entrants,
    snapshots: [],
    updatedAt: data.updatedAt ?? scaffold.updatedAt,
  };
}

export function calculateLeaderboard(data: PoolData): LeaderboardEntry[] {
  const winnerOf = actualWinnerLookup(data);
  const byId = new Map(data.matchups.map((matchup) => [matchup.id, matchup]));
  const memo = new Map<string, Set<string>>();

  return data.entrants.map((entrant) => {
    const points = scoreEntrant(entrant, data.matchups, data.rounds, winnerOf);
    const possiblePointsLeft = calculatePossiblePointsLeft(
      entrant,
      data,
      winnerOf,
      byId,
      memo,
    );
    return {
      entrantId: entrant.id,
      name: entrant.name,
      paid: entrant.paid,
      points,
      possiblePointsLeft,
      maxPoints: points + possiblePointsLeft,
      tiebreakerRuns: entrant.tiebreakerRuns,
      tiebreakerDistance:
        typeof data.settings.championshipRunsActual === "number"
          ? Math.abs(entrant.tiebreakerRuns - data.settings.championshipRunsActual)
          : undefined,
    };
  });
}

export function sortLeaderboard(
  entries: LeaderboardEntry[],
  data: PoolData,
): LeaderboardEntry[] {
  return [...entries].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.maxPoints !== a.maxPoints) return b.maxPoints - a.maxPoints;
    if (typeof data.settings.championshipRunsActual === "number") {
      return (a.tiebreakerDistance ?? Infinity) - (b.tiebreakerDistance ?? Infinity);
    }
    return a.name.localeCompare(b.name);
  });
}

export function calculatePayouts(data: PoolData) {
  const expectedPot = data.entrants.length * data.settings.entryFee;
  const collectedPot =
    data.entrants.filter((entrant) => entrant.paid).length * data.settings.entryFee;
  const payouts = data.settings.payoutRules.map((rule) => ({
    place: rule.place,
    percent: rule.percent,
    amount: roundMoney(expectedPot * (rule.percent / 100)),
  }));

  return { expectedPot, collectedPot, payouts };
}

export function calculateScenarioOdds(data: PoolData): ScenarioOdd[] {
  const outcomes = enumerateBracketOutcomes(data);
  const totals = new Map<string, { first: number; tied: number }>();
  data.entrants.forEach((entrant) => totals.set(entrant.id, { first: 0, tied: 0 }));

  outcomes.forEach((outcome) => {
    const scores = data.entrants.map((entrant) => ({
      entrant,
      points: scoreEntrant(entrant, data.matchups, data.rounds, (id) => outcome[id]),
    }));
    const highScore = scores.reduce((max, score) => Math.max(max, score.points), 0);
    const winners = scores.filter((score) => score.points === highScore && highScore > 0);

    winners.forEach(({ entrant }) => {
      const total = totals.get(entrant.id);
      if (!total) return;
      if (winners.length === 1) total.first += 1;
      else total.tied += 1;
    });
  });

  return data.entrants.map((entrant) => {
    const total = totals.get(entrant.id) ?? { first: 0, tied: 0 };
    return {
      entrantId: entrant.id,
      name: entrant.name,
      firstPlacePercent: percent(total.first, outcomes.length),
      tiedFirstPercent: percent(total.tied, outcomes.length),
      scenarios: outcomes.length,
    };
  });
}

export function getTeam(data: PoolData, teamId?: string): Team | undefined {
  return data.teams.find((teamItem) => teamItem.id === teamId);
}

export function getRound(data: PoolData, roundId: RoundId): Round {
  const roundItem = data.rounds.find((candidate) => candidate.id === roundId);
  if (!roundItem) throw new Error(`Unknown round: ${roundId}`);
  return roundItem;
}

export function isRoundLocked(round: Round, at: Date = new Date()): boolean {
  if (round.isLocked) return true;
  if (!round.lockAt) return false;
  const lockAt = new Date(round.lockAt);
  return Number.isFinite(lockAt.getTime()) && lockAt <= at;
}

function actualWinnerLookup(data: PoolData): (matchupId: string) => string | undefined {
  const winners = new Map<string, string | undefined>(
    data.matchups.map((matchup) => [
      matchup.id,
      matchup.winnerTeamId ?? getSeriesWinnerTeamId(data, matchup),
    ]),
  );
  return (matchupId) => winners.get(matchupId);
}

function scoreEntrant(
  entrant: Entrant,
  matchups: Matchup[],
  rounds: Round[],
  winnerOf: (matchupId: string) => string | undefined,
): number {
  return matchups.reduce((total, matchup) => {
    const pickedTeamId = entrant.picks[matchup.id];
    const winnerTeamId = winnerOf(matchup.id);
    if (!winnerTeamId || pickedTeamId !== winnerTeamId) return total;
    return total + roundPoints(rounds, matchup.roundId);
  }, 0);
}

function calculatePossiblePointsLeft(
  entrant: Entrant,
  data: PoolData,
  winnerOf: (matchupId: string) => string | undefined,
  byId: Map<string, Matchup>,
  memo: Map<string, Set<string>>,
): number {
  const winnerOfMatchup = (matchup: Matchup) => winnerOf(matchup.id);
  return data.matchups.reduce((total, matchup) => {
    const pickedTeamId = entrant.picks[matchup.id];
    if (!pickedTeamId || winnerOf(matchup.id)) return total;
    const stillPossible = possibleWinnerIds(matchup.id, byId, winnerOfMatchup, memo);
    if (!stillPossible.has(pickedTeamId)) return total;
    return total + roundPoints(data.rounds, matchup.roundId);
  }, 0);
}

function roundPoints(rounds: Round[], roundId: RoundId): number {
  return rounds.find((roundItem) => roundItem.id === roundId)?.points ?? 0;
}

function percent(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 100);
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function team(
  id: string,
  name: string,
  shortName: string,
  abbreviation: string,
  seedLabel: string,
  color: string,
): Team {
  return { id, name, shortName, abbreviation, seed: seedLabel, color };
}

function round(id: RoundId, name: string, points: number, scoreByAdvance = false): Round {
  return { id, name, points, scoreByAdvance, isLocked: false };
}

function seed(teamId: string): TeamSlot {
  return { type: "team", teamId };
}

function winner(matchupId: string): TeamSlot {
  return { type: "winner", matchupId };
}

function loser(matchupId: string): TeamSlot {
  return { type: "loser", matchupId };
}

function game(
  id: string,
  roundId: RoundId,
  bracketId: BracketId,
  gameLabel: string,
  slotA: TeamSlot,
  slotB: TeamSlot,
  sortOrder: number,
  winnerTeamId?: string,
): Matchup {
  const label =
    roundId === "championship" ? "Championship Finals (Best of 3)" : `Game ${gameLabel}`;
  return { id, roundId, bracketId, gameLabel, label, slotA, slotB, sortOrder, winnerTeamId };
}
