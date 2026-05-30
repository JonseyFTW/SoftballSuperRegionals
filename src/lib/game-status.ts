import type { GameSnapshot, Matchup, PoolData } from "./types";

type SlotSource = {
  matchupId: string;
  outcome: "winner" | "loser";
};

const derivedSlotSources: Record<string, [SlotSource, SlotSource]> = {
  "game-5": [
    { matchupId: "game-1", outcome: "loser" },
    { matchupId: "game-2", outcome: "loser" },
  ],
  "game-6": [
    { matchupId: "game-3", outcome: "loser" },
    { matchupId: "game-4", outcome: "loser" },
  ],
  "game-7": [
    { matchupId: "game-1", outcome: "winner" },
    { matchupId: "game-2", outcome: "winner" },
  ],
  "game-8": [
    { matchupId: "game-3", outcome: "winner" },
    { matchupId: "game-4", outcome: "winner" },
  ],
  "game-9": [
    { matchupId: "game-5", outcome: "winner" },
    { matchupId: "game-8", outcome: "loser" },
  ],
  "game-10": [
    { matchupId: "game-6", outcome: "winner" },
    { matchupId: "game-7", outcome: "loser" },
  ],
  "bracket-1-final": [
    { matchupId: "game-7", outcome: "winner" },
    { matchupId: "game-9", outcome: "winner" },
  ],
  "bracket-2-final": [
    { matchupId: "game-8", outcome: "winner" },
    { matchupId: "game-10", outcome: "winner" },
  ],
  champion: [
    { matchupId: "bracket-1-final", outcome: "winner" },
    { matchupId: "bracket-2-final", outcome: "winner" },
  ],
};

export function getMatchupSnapshot(data: PoolData, matchup: Matchup): GameSnapshot | undefined {
  const snapshots = data.snapshots.filter((candidate) => snapshotMatchesMatchup(candidate, matchup));
  return snapshots.reduce<GameSnapshot | undefined>(
    (best, candidate) =>
      !best || displaySnapshotRank(candidate) > displaySnapshotRank(best) ? candidate : best,
    undefined,
  );
}

function snapshotMatchesMatchup(snapshot: GameSnapshot, matchup: Matchup): boolean {
  if (snapshot.matchupId && snapshot.matchupId === matchup.id) return true;
  if (matchup.espnGameId && snapshot.espnGameId === matchup.espnGameId) return true;
  return false;
}

export function findMatchupForSnapshot(
  data: PoolData,
  snapshot: GameSnapshot,
): Matchup | undefined {
  const exactMatch = data.matchups.find(
    (matchup) => matchup.espnGameId && matchup.espnGameId === snapshot.espnGameId,
  );
  if (exactMatch) return exactMatch;

  return data.matchups.find((matchup) => {
    const matchupTeams = getMatchupTeams(data, matchup);
    if (matchupTeams.length !== 2) return false;

    return matchupTeams.every((team) => teamInSnapshot(team, snapshot));
  });
}

export function getGameWinnerTeamId(data: PoolData, matchup: Matchup): string | undefined {
  const snapshot = getMatchupSnapshot(data, matchup);
  if (!snapshot || !isFinalSnapshot(snapshot)) return undefined;
  const winnerNames =
    snapshot.awayScore > snapshot.homeScore
      ? [snapshot.awayTeamName, snapshot.awayAbbreviation]
      : snapshot.homeScore > snapshot.awayScore
        ? [snapshot.homeTeamName, snapshot.homeAbbreviation]
        : [];
  if (winnerNames.length === 0) return undefined;

  const candidateTeamIds = [matchup.teamAId, matchup.teamBId].filter(
    (teamId): teamId is string => Boolean(teamId),
  );
  const searchableTeamIds = candidateTeamIds.length
    ? candidateTeamIds
    : data.teams.map((team) => team.id);

  return searchableTeamIds.find((teamId) => {
    const team = data.teams.find((candidate) => candidate.id === teamId);
    return team && winnerNames.some((winnerName) => teamNameMatches(team, winnerName));
  });
}

export function isLiveSnapshot(snapshot: GameSnapshot | undefined): boolean {
  if (!snapshot) return false;
  if (snapshot.statusState === "in") return true;
  if (snapshot.statusState === "pre" || snapshot.statusState === "post") return false;

  return (
    Boolean(snapshot.inningHalf) &&
    !/\b(final|scheduled|postponed|cancelled|canceled)\b/i.test(snapshot.status)
  );
}

export function getFinalScoreText(snapshot: GameSnapshot | undefined): string | undefined {
  if (!snapshot || !isFinalSnapshot(snapshot)) return undefined;
  const away = snapshot.awayAbbreviation || snapshot.awayTeamName || "Away";
  const home = snapshot.homeAbbreviation || snapshot.homeTeamName || "Home";
  return `${away} ${snapshot.awayScore}, ${home} ${snapshot.homeScore}`;
}

export function getSeriesWinnerTeamId(data: PoolData, matchup: Matchup): string | undefined {
  const series = parseSeriesSummary(getSeriesSnapshot(data, matchup)?.seriesSummary);
  if (!series || series.wins < 2) return undefined;
  return getSeriesTeam(data, matchup, series.teamLabel)?.id;
}

export function getSeriesStatusText(data: PoolData, matchup: Matchup): string | undefined {
  const summary = getSeriesSnapshot(data, matchup)?.seriesSummary;
  const series = parseSeriesSummary(summary);
  if (!series) return summary;

  const teamName = getSeriesTeam(data, matchup, series.teamLabel)?.shortName ?? series.teamLabel;
  const status = `${teamName} ${series.wins >= 2 ? "wins" : "leads"} series ${series.wins}-${series.losses}`;
  return series.wins >= 2 ? status : `Game ${series.wins + series.losses + 1} - ${status}`;
}

function isFinalSnapshot(snapshot: GameSnapshot): boolean {
  return snapshot.statusState === "post" || /\bfinal\b/i.test(snapshot.status);
}

function displaySnapshotRank(snapshot: GameSnapshot): number {
  if (isLiveSnapshot(snapshot)) return 100;
  if (isFinalSnapshot(snapshot)) return 10;
  return 0;
}

function getSeriesSnapshot(data: PoolData, matchup: Matchup): GameSnapshot | undefined {
  return data.snapshots
    .filter((candidate) => snapshotMatchesMatchup(candidate, matchup))
    .reduce<GameSnapshot | undefined>(
      (best, candidate) =>
        !best || seriesSnapshotRank(candidate) > seriesSnapshotRank(best) ? candidate : best,
      undefined,
    );
}

function seriesSnapshotRank(snapshot: GameSnapshot): number {
  const series = parseSeriesSummary(snapshot.seriesSummary);
  const gamesPlayed = series ? series.wins + series.losses : 0;
  const seriesWon = series && series.wins >= 2 ? 100 : 0;
  const live = isLiveSnapshot(snapshot) ? 1 : 0;
  return seriesWon + gamesPlayed * 10 + live;
}

function parseSeriesSummary(summary: string | undefined) {
  const match = summary?.match(/^(.+?)\s+(leads|wins|won)\s+series\s+(\d+)-(\d+)/i);
  if (!match) return undefined;
  return {
    teamLabel: match[1].trim(),
    wins: Number(match[3]),
    losses: Number(match[4]),
  };
}

function getSeriesTeam(data: PoolData, matchup: Matchup, teamLabel: string) {
  return [matchup.teamAId, matchup.teamBId]
    .map((teamId) => data.teams.find((team) => team.id === teamId))
    .find(
      (team) =>
        team &&
        [team.abbreviation, team.shortName, team.name].some((name) => namesMatch(name, teamLabel)),
    );
}

function getMatchupTeams(data: PoolData, matchup: Matchup) {
  const explicitTeams = [matchup.teamAId, matchup.teamBId]
    .map((teamId) => data.teams.find((team) => team.id === teamId))
    .filter((team): team is PoolData["teams"][number] => Boolean(team));
  if (explicitTeams.length === 2) return explicitTeams;

  const sources = derivedSlotSources[matchup.id];
  if (!sources) return explicitTeams;

  return sources
    .map((source) => getSourceTeamId(data, source))
    .map((teamId) => data.teams.find((team) => team.id === teamId))
    .filter((team): team is PoolData["teams"][number] => Boolean(team));
}

function getSourceTeamId(data: PoolData, source: SlotSource): string | undefined {
  const matchup = data.matchups.find((candidate) => candidate.id === source.matchupId);
  if (!matchup) return undefined;
  const winnerTeamId = getKnownWinnerTeamId(data, matchup);
  if (source.outcome === "winner") return winnerTeamId;
  if (!winnerTeamId) return undefined;
  return getMatchupTeams(data, matchup)
    .map((team) => team.id)
    .find((teamId) => teamId !== winnerTeamId);
}

function getKnownWinnerTeamId(data: PoolData, matchup: Matchup): string | undefined {
  return (
    matchup.winnerTeamId ??
    (["super-regionals", "bracket-finals", "champion"].includes(matchup.roundId)
      ? getSeriesWinnerTeamId(data, matchup)
      : getGameWinnerTeamId(data, matchup))
  );
}

function teamInSnapshot(
  team: PoolData["teams"][number],
  snapshot: GameSnapshot,
): boolean {
  const snapshotNames = [
    snapshot.awayTeamName,
    snapshot.homeTeamName,
    snapshot.awayAbbreviation,
    snapshot.homeAbbreviation,
  ];
  const teamNames = [team.name, team.shortName, team.abbreviation];

  return teamNames.some((teamName) =>
    snapshotNames.some((snapshotName) => namesMatch(teamName, snapshotName)),
  );
}

function teamNameMatches(team: PoolData["teams"][number], value?: string): boolean {
  return [team.name, team.shortName, team.abbreviation].some((teamName) => namesMatch(teamName, value));
}

function namesMatch(a?: string, b?: string): boolean {
  const left = normalizeName(a);
  const right = normalizeName(b);
  if (!left || !right) return false;
  if (left === right) return true;

  const leftTokens = tokenizeName(a);
  const rightTokens = tokenizeName(b);
  if (leftTokens.length > 1 || rightTokens.length > 1) {
    const shorter = left.length <= right.length ? left : right;
    const longer = left.length > right.length ? left : right;
    return shorter.length >= 8 && longer.includes(shorter);
  }

  return false;
}

function tokenizeName(value?: string): string[] {
  return value?.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

function normalizeName(value?: string): string {
  return value?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
}
