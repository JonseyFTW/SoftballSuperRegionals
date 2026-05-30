import type {
  Entrant,
  LeaderboardEntry,
  Matchup,
  PayoutRule,
  PoolData,
  Round,
  RoundId,
  ScenarioOdd,
  Team,
} from "./types";
import { getGameWinnerTeamId, getSeriesWinnerTeamId } from "./game-status";

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
      "Mississippi St.",
      "MSST",
      "",
      "#660000",
    ),
    team("tennessee", "Tennessee Lady Volunteers", "Tennessee", "TENN", "2", "#ff8200"),
    team("texas", "Texas Longhorns", "Texas", "TEX", "1", "#bf5700"),
    team("alabama", "Alabama Crimson Tide", "Alabama", "ALA", "1", "#9e1b32"),
    team("ucla", "UCLA Bruins", "UCLA", "UCLA", "2", "#2774ae"),
    team("arkansas", "Arkansas Razorbacks", "Arkansas", "ARK", "2", "#9d2235"),
    team("nebraska", "Nebraska Cornhuskers", "Nebraska", "NEB", "1", "#e41c38"),
  ];

  const rounds: Round[] = [
    round("winners-first", "Winners' Bracket Opening Round", 1),
    round("elimination-first", "Elimination Bracket Opening Round", 2),
    round("winners-second", "Winners' Bracket Semifinals", 3),
    round("elimination-second", "Elimination Bracket Semifinals", 4),
    round("bracket-finals", "Bracket Finals Advancer", 5),
    round("champion", "National Champion", 6),
  ];

  return {
    settings: {
      name: "WCWS Pick'em",
      entryFee: 10,
      adminVenmo: "@wcws-admin",
      adminZelle: "",
      payoutRules: getDefaultPayoutRules(3),
    },
    teams,
    rounds,
    matchups: [
      matchup("game-1", "winners-first", "Game 1: Texas Tech vs Mississippi St.", "texas-tech", "mississippi-state", 1),
      matchup("game-2", "winners-first", "Game 2: Tennessee vs Texas", "tennessee", "texas", 2),
      matchup("game-3", "winners-first", "Game 3: Alabama vs UCLA", "alabama", "ucla", 3),
      matchup("game-4", "winners-first", "Game 4: Arkansas vs Nebraska", "arkansas", "nebraska", 4),
      matchup("game-5", "elimination-first", "Game 5: Loser Game 1 vs Loser Game 2", undefined, undefined, 5),
      matchup("game-6", "elimination-first", "Game 6: Loser Game 3 vs Loser Game 4", undefined, undefined, 6),
      matchup("game-7", "winners-second", "Game 7: Winner Game 1 vs Winner Game 2", undefined, undefined, 7),
      matchup("game-8", "winners-second", "Game 8: Winner Game 3 vs Winner Game 4", undefined, undefined, 8),
      matchup("game-9", "elimination-second", "Game 9: Winner Game 5 vs Loser Game 8", undefined, undefined, 9),
      matchup("game-10", "elimination-second", "Game 10: Winner Game 6 vs Loser Game 7", undefined, undefined, 10),
      matchup("bracket-1-final", "bracket-finals", "Bracket 1 Final: Championship Series Advancer", undefined, undefined, 11),
      matchup("bracket-2-final", "bracket-finals", "Bracket 2 Final: Championship Series Advancer", undefined, undefined, 12),
      matchup("champion", "champion", "National Champion", undefined, undefined, 13),
    ],
    entrants: [
      {
        id: "entry-sample-1",
        name: "Sample Leader",
        paid: true,
        venmo: "@sample-leader",
        tiebreakerRuns: 24,
        picks: {
          "game-1": "texas-tech",
          "game-2": "texas",
          "game-3": "alabama",
          "game-4": "nebraska",
          "game-5": "texas",
          "game-6": "ucla",
          "game-7": "texas",
          "game-8": "ucla",
          "game-9": "texas",
          "game-10": "ucla",
          "bracket-1-final": "texas",
          "bracket-2-final": "ucla",
          champion: "texas",
        },
      },
      {
        id: "entry-sample-2",
        name: "Sample Chaser",
        paid: false,
        zelle: "sample@example.com",
        tiebreakerRuns: 19,
        picks: {
          "game-1": "mississippi-state",
          "game-2": "tennessee",
          "game-3": "ucla",
          "game-4": "arkansas",
          "game-5": "tennessee",
          "game-6": "arkansas",
          "game-7": "tennessee",
          "game-8": "arkansas",
          "game-9": "tennessee",
          "game-10": "arkansas",
          "bracket-1-final": "tennessee",
          "bracket-2-final": "arkansas",
          champion: "tennessee",
        },
      },
    ],
    snapshots: [],
    updatedAt: now,
  };
}

export function calculateLeaderboard(data: PoolData): LeaderboardEntry[] {
  const matchups = matchupsWithSeriesWinners(data);
  return data.entrants.map((entrant) => {
    const points = calculateEntrantPoints(entrant, matchups, data.rounds);
    const possiblePointsLeft = calculatePossiblePointsLeft(entrant, matchups, data.rounds);
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
  const matchups = matchupsWithSeriesWinners(data);
  const unresolved = matchups.filter(
    (matchup) =>
      !matchup.winnerTeamId && matchup.teamAId && matchup.teamBId && matchup.roundId !== "champion",
  );
  const scenarios = enumerateScenarios(unresolved);
  const totals = new Map<string, { first: number; tied: number }>();

  data.entrants.forEach((entrant) => totals.set(entrant.id, { first: 0, tied: 0 }));

  scenarios.forEach((scenario) => {
    const scenarioMatchups = matchups.map((matchup) => ({
      ...matchup,
      winnerTeamId: matchup.winnerTeamId ?? scenario[matchup.id],
    }));
    const scores = data.entrants.map((entrant) => ({
      entrant,
      points: calculateEntrantPoints(entrant, scenarioMatchups, data.rounds),
    }));
    const highScore = Math.max(...scores.map((score) => score.points));
    const winners = scores.filter((score) => score.points === highScore);

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
      firstPlacePercent: percent(total.first, scenarios.length),
      tiedFirstPercent: percent(total.tied, scenarios.length),
      scenarios: scenarios.length,
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

export function isTeamAlive(teamId: string, matchups: Matchup[]): boolean {
  return !matchups.some(
    (matchup) =>
      isEliminationLossRound(matchup.roundId) &&
      (matchup.teamAId === teamId || matchup.teamBId === teamId) &&
      matchup.winnerTeamId &&
      matchup.winnerTeamId !== teamId,
  );
}

function isEliminationLossRound(roundId: RoundId): boolean {
  return !["winners-first", "winners-second"].includes(roundId);
}

export function isRoundLocked(round: Round, at: Date = new Date()): boolean {
  if (round.isLocked) return true;
  if (!round.lockAt) return false;
  const lockAt = new Date(round.lockAt);
  return Number.isFinite(lockAt.getTime()) && lockAt <= at;
}

function matchupsWithSeriesWinners(data: PoolData): Matchup[] {
  return data.matchups.map((matchup) => ({
    ...matchup,
    winnerTeamId:
      matchup.winnerTeamId ??
      (matchup.roundId === "bracket-finals" || matchup.roundId === "champion"
        ? getSeriesWinnerTeamId(data, matchup)
        : getGameWinnerTeamId(data, matchup)),
  }));
}

function calculateEntrantPoints(
  entrant: Entrant,
  matchups: Matchup[],
  rounds: Round[],
): number {
  return matchups.reduce((total, matchup) => {
    const pickedTeamId = entrant.picks[matchup.id];
    if (!matchup.winnerTeamId || pickedTeamId !== matchup.winnerTeamId) return total;
    return total + (rounds.find((roundItem) => roundItem.id === matchup.roundId)?.points ?? 0);
  }, 0);
}

function calculatePossiblePointsLeft(
  entrant: Entrant,
  matchups: Matchup[],
  rounds: Round[],
): number {
  return matchups.reduce((total, matchup) => {
    const pickedTeamId = entrant.picks[matchup.id];
    if (!pickedTeamId || matchup.winnerTeamId || !isTeamAlive(pickedTeamId, matchups)) {
      return total;
    }
    return total + (rounds.find((roundItem) => roundItem.id === matchup.roundId)?.points ?? 0);
  }, 0);
}

function enumerateScenarios(matchups: Matchup[]): Record<string, string>[] {
  if (matchups.length === 0) return [{}];
  return matchups.reduce<Record<string, string>[]>(
    (scenarios, matchup) =>
      scenarios.flatMap((scenario) =>
        [matchup.teamAId, matchup.teamBId]
          .filter((teamId): teamId is string => Boolean(teamId))
          .map((teamId) => ({ ...scenario, [matchup.id]: teamId })),
      ),
    [{}],
  );
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
  seed: string,
  color: string,
): Team {
  return { id, name, shortName, abbreviation, seed, color };
}

function round(id: RoundId, name: string, points: number): Round {
  return { id, name, points, isLocked: false };
}

function matchup(
  id: string,
  roundId: RoundId,
  label: string,
  teamAId: string | undefined,
  teamBId: string | undefined,
  sortOrder: number,
): Matchup {
  return { id, roundId, label, teamAId, teamBId, sortOrder };
}
