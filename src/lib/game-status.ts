import type { GameSnapshot, Matchup, PoolData } from "./types";

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
    const teamA = data.teams.find((team) => team.id === matchup.teamAId);
    const teamB = data.teams.find((team) => team.id === matchup.teamBId);
    if (!teamA || !teamB) return false;

    return teamInSnapshot(teamA, snapshot) && teamInSnapshot(teamB, snapshot);
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

function namesMatch(a?: string, b?: string): boolean {
  const left = normalizeName(a);
  const right = normalizeName(b);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

function normalizeName(value?: string): string {
  return value?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
}
