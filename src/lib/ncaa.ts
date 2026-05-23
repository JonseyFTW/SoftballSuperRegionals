import type { GameSnapshot, Matchup, PoolData, Team } from "./types";

type AnyRecord = Record<string, unknown>;

const bracketUrl = "https://ncaa-api.henrygd.me/brackets/softball/d1/2026";

export async function fetchNcaaBracketSnapshots(data: PoolData): Promise<GameSnapshot[]> {
  const response = await fetch(bracketUrl, { next: { revalidate: 60 } });
  if (!response.ok) throw new Error(`NCAA bracket request failed: ${response.status}`);
  return normalizeNcaaBracketSnapshots(await response.json(), data);
}

export function normalizeNcaaBracketSnapshots(payload: unknown, data: PoolData): GameSnapshot[] {
  const championship = first(asArray(asRecord(payload).championships));
  const games = asArray(championship.games)
    .map(asRecord)
    .filter((game) => isSuperRegionalGame(game) && asArray(game.teams).length >= 2);
  const snapshots: GameSnapshot[] = [];

  data.matchups
    .filter((matchup) => matchup.roundId === "super-regionals")
    .forEach((matchup) => {
      const matchupGames = games.filter((game) => ncaaGameMatchesMatchup(data, matchup, game));
      const seriesSummary = getSeriesSummary(data, matchup, matchupGames);

      matchupGames.forEach((game) => {
        snapshots.push(normalizeNcaaGame(game, matchup, seriesSummary));
      });
    });

  return snapshots;
}

function normalizeNcaaGame(
  game: AnyRecord,
  matchup: Matchup,
  seriesSummary: string | undefined,
): GameSnapshot {
  const teams = asArray(game.teams).map(asRecord);
  const away = teams[0] ?? {};
  const home = teams[1] ?? {};

  return {
    matchupId: matchup.id,
    espnGameId: ncaaSnapshotId(game),
    awayTeamName: ncaaTeamName(away),
    homeTeamName: ncaaTeamName(home),
    awayAbbreviation: stringValue(away.nameShort),
    homeAbbreviation: stringValue(home.nameShort),
    awayScore: numberValue(away.score),
    homeScore: numberValue(home.score),
    status: ncaaStatusText(game),
    statusState: ncaaStatusState(game),
    onFirst: false,
    onSecond: false,
    onThird: false,
    seriesSummary,
    startDate: stringValue(game.startDate),
    source: "ncaa",
    updatedAt: new Date().toISOString(),
  };
}

function getSeriesSummary(
  data: PoolData,
  matchup: Matchup,
  games: AnyRecord[],
): string | undefined {
  const teamIds = [matchup.teamAId, matchup.teamBId].filter((teamId): teamId is string =>
    Boolean(teamId),
  );
  if (teamIds.length !== 2) return undefined;

  const wins = new Map(teamIds.map((teamId) => [teamId, 0]));
  games.filter(isFinalNcaaGame).forEach((game) => {
    const winnerTeamId = getWinningTeamId(data, matchup, game);
    if (winnerTeamId) wins.set(winnerTeamId, (wins.get(winnerTeamId) ?? 0) + 1);
  });

  const [teamAId, teamBId] = teamIds;
  const teamAWins = wins.get(teamAId) ?? 0;
  const teamBWins = wins.get(teamBId) ?? 0;
  if (teamAWins === 0 && teamBWins === 0) return undefined;
  if (teamAWins === teamBWins) return `Series tied ${teamAWins}-${teamBWins}`;

  const leaderId = teamAWins > teamBWins ? teamAId : teamBId;
  const leaderWins = Math.max(teamAWins, teamBWins);
  const trailingWins = Math.min(teamAWins, teamBWins);
  const verb = leaderWins >= 2 ? "wins" : "leads";

  return `${seriesLabel(data, leaderId)} ${verb} series ${leaderWins}-${trailingWins}`;
}

function ncaaGameMatchesMatchup(data: PoolData, matchup: Matchup, game: AnyRecord): boolean {
  const ncaaTeams = asArray(game.teams).map(asRecord);
  const matchupTeams = [matchup.teamAId, matchup.teamBId]
    .map((teamId) => data.teams.find((team) => team.id === teamId))
    .filter((team): team is Team => Boolean(team));

  return (
    matchupTeams.length === 2 &&
    matchupTeams.every((team) =>
      ncaaTeams.some((ncaaTeam) => ncaaTeamMatchesTeam(ncaaTeam, team)),
    )
  );
}

function getWinningTeamId(
  data: PoolData,
  matchup: Matchup,
  game: AnyRecord,
): string | undefined {
  const winner = asArray(game.teams).map(asRecord).find(isNcaaWinner);
  if (!winner) return undefined;

  return [matchup.teamAId, matchup.teamBId].find((teamId) => {
    const team = data.teams.find((candidate) => candidate.id === teamId);
    return team && ncaaTeamMatchesTeam(winner, team);
  });
}

function ncaaTeamMatchesTeam(ncaaTeam: AnyRecord, team: Team): boolean {
  const ncaaNames = [
    stringValue(ncaaTeam.nameShort),
    stringValue(ncaaTeam.nameFull),
    stringValue(ncaaTeam.seoname),
  ];
  const appNames = [team.name, team.shortName, team.abbreviation];

  return appNames.some((appName) =>
    ncaaNames.some((ncaaName) => namesMatch(appName, ncaaName)),
  );
}

function isSuperRegionalGame(game: AnyRecord): boolean {
  const sectionId = numberValue(game.sectionId);
  return sectionId >= 201 && sectionId <= 208;
}

function isFinalNcaaGame(game: AnyRecord): boolean {
  return (
    stringValue(game.gameState).toUpperCase() === "F" ||
    /\bfinal\b/i.test(`${stringValue(game.finalMessage)} ${stringValue(game.statusCodeDisplay)}`)
  );
}

function isNcaaWinner(team: AnyRecord): boolean {
  return team.isWinner === true || team.isWinner === "true";
}

function ncaaStatusText(game: AnyRecord): string {
  if (ncaaStatusState(game) === "pre") return "Scheduled";
  return (
    stringValue(game.finalMessage) ||
    stringValue(game.currentPeriod) ||
    stringValue(game.statusCodeDisplay) ||
    "Scheduled"
  );
}

function ncaaStatusState(game: AnyRecord): string | undefined {
  const gameState = stringValue(game.gameState).toUpperCase();
  if (gameState === "F") return "post";
  if (gameState === "I") return "in";
  if (gameState === "P") return "pre";
  if (isFinalNcaaGame(game)) return "post";
  return undefined;
}

function ncaaSnapshotId(game: AnyRecord): string {
  return `ncaa-${idValue(game.contestId) || idValue(game.bracketPositionId)}`;
}

function ncaaTeamName(team: AnyRecord): string {
  return stringValue(team.nameFull) || stringValue(team.nameShort);
}

function seriesLabel(data: PoolData, teamId: string): string {
  const team = data.teams.find((candidate) => candidate.id === teamId);
  return team?.abbreviation ?? team?.shortName ?? teamId;
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

function asRecord(value: unknown): AnyRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as AnyRecord;
  }
  return {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function first(values: unknown[]): AnyRecord {
  return asRecord(values[0]);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function idValue(value: unknown): string {
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  return "";
}

function numberValue(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return 0;
}
