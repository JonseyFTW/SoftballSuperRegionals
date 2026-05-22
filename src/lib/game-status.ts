import type { GameSnapshot, Matchup, PoolData } from "./types";

export function getMatchupSnapshot(data: PoolData, matchup: Matchup): GameSnapshot | undefined {
  return data.snapshots.find(
    (candidate) =>
      candidate.matchupId === matchup.id || candidate.espnGameId === matchup.espnGameId,
  );
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
