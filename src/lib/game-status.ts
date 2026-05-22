import type { GameSnapshot, Matchup, PoolData } from "./types";

export function getMatchupSnapshot(data: PoolData, matchup: Matchup): GameSnapshot | undefined {
  return data.snapshots.find(
    (candidate) =>
      candidate.matchupId === matchup.id || candidate.espnGameId === matchup.espnGameId,
  );
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

function isFinalSnapshot(snapshot: GameSnapshot): boolean {
  return snapshot.statusState === "post" || /\bfinal\b/i.test(snapshot.status);
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
