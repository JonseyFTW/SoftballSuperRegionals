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
    team("alabama", "Alabama Crimson Tide", "Alabama", "ALA", "16", "#9e1b32"),
    team("lsu", "LSU Tigers", "LSU", "LSU", "9", "#461d7c"),
    team("arkansas", "Arkansas Razorbacks", "Arkansas", "ARK", "3", "#9d2235"),
    team("duke", "Duke Blue Devils", "Duke", "DUKE", "14", "#00539b"),
    team("texas", "Texas Longhorns", "Texas", "TEX", "6", "#bf5700"),
    team(
      "arizona-state",
      "Arizona State Sun Devils",
      "Arizona State",
      "ASU",
      "11",
      "#8c1d40",
    ),
    team("florida", "Florida Gators", "Florida", "FLA", "2", "#0021a5"),
    team("texas-tech", "Texas Tech Red Raiders", "Texas Tech", "TTU", "15", "#cc0000"),
    team("oklahoma", "Oklahoma Sooners", "Oklahoma", "OU", "1", "#841617"),
    team(
      "mississippi-state",
      "Mississippi State Bulldogs",
      "Mississippi State",
      "MSST",
      "16",
      "#660000",
    ),
    team("tennessee", "Tennessee Lady Volunteers", "Tennessee", "TENN", "7", "#ff8200"),
    team("georgia", "Georgia Bulldogs", "Georgia", "UGA", "10", "#ba0c2f"),
    team("nebraska", "Nebraska Cornhuskers", "Nebraska", "NEB", "4", "#e41c38"),
    team(
      "oklahoma-state",
      "Oklahoma State Cowgirls",
      "Oklahoma State",
      "OKST",
      "13",
      "#ff7300",
    ),
    team("ucla", "UCLA Bruins", "UCLA", "UCLA", "5", "#2774ae"),
    team("ucf", "UCF Knights", "UCF", "UCF", "12", "#ba9b37"),
  ];

  const rounds: Round[] = [
    round("super-regionals", "Super Regionals", 1),
    round("wcws-semis", "WCWS Semifinals", 2),
    round("championship-matchup", "Championship Matchup", 4),
    round("champion", "National Champion", 8),
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
      matchup("super-alabama-lsu", "super-regionals", "Alabama vs LSU", "alabama", "lsu", 1),
      matchup("super-arkansas-duke", "super-regionals", "Arkansas vs Duke", "arkansas", "duke", 2),
      matchup(
        "super-texas-arizona-state",
        "super-regionals",
        "Texas vs Arizona State",
        "texas",
        "arizona-state",
        3,
      ),
      matchup(
        "super-florida-texas-tech",
        "super-regionals",
        "Florida vs Texas Tech",
        "florida",
        "texas-tech",
        4,
      ),
      matchup(
        "super-oklahoma-mississippi-state",
        "super-regionals",
        "Oklahoma vs Mississippi State",
        "oklahoma",
        "mississippi-state",
        5,
      ),
      matchup(
        "super-tennessee-georgia",
        "super-regionals",
        "Tennessee vs Georgia",
        "tennessee",
        "georgia",
        6,
      ),
      matchup(
        "super-nebraska-oklahoma-state",
        "super-regionals",
        "Nebraska vs Oklahoma State",
        "nebraska",
        "oklahoma-state",
        7,
      ),
      matchup("super-ucla-ucf", "super-regionals", "UCLA vs UCF", "ucla", "ucf", 8),
      matchup("wcws-semi-1", "wcws-semis", "WCWS semifinal pick 1", undefined, undefined, 9),
      matchup("wcws-semi-2", "wcws-semis", "WCWS semifinal pick 2", undefined, undefined, 10),
      matchup(
        "championship-matchup",
        "championship-matchup",
        "Championship matchup",
        undefined,
        undefined,
        11,
      ),
      matchup("champion", "champion", "National champion", undefined, undefined, 12),
    ],
    entrants: [
      {
        id: "entry-sample-1",
        name: "Sample Leader",
        paid: true,
        venmo: "@sample-leader",
        tiebreakerRuns: 24,
        picks: {
          "super-alabama-lsu": "lsu",
          "super-arkansas-duke": "duke",
          "super-texas-arizona-state": "texas",
          "super-florida-texas-tech": "florida",
          "super-oklahoma-mississippi-state": "oklahoma",
          "super-tennessee-georgia": "tennessee",
          "super-nebraska-oklahoma-state": "nebraska",
          "super-ucla-ucf": "ucla",
          "wcws-semi-1": "oklahoma",
          "wcws-semi-2": "tennessee",
          "championship-matchup": "oklahoma",
          champion: "oklahoma",
        },
      },
      {
        id: "entry-sample-2",
        name: "Sample Chaser",
        paid: false,
        zelle: "sample@example.com",
        tiebreakerRuns: 19,
        picks: {
          "super-alabama-lsu": "alabama",
          "super-arkansas-duke": "arkansas",
          "super-texas-arizona-state": "arizona-state",
          "super-florida-texas-tech": "texas-tech",
          "super-oklahoma-mississippi-state": "mississippi-state",
          "super-tennessee-georgia": "georgia",
          "super-nebraska-oklahoma-state": "oklahoma-state",
          "super-ucla-ucf": "ucf",
          "wcws-semi-1": "texas-tech",
          "wcws-semi-2": "georgia",
          "championship-matchup": "georgia",
          champion: "georgia",
        },
      },
    ],
    snapshots: [],
    updatedAt: now,
  };
}

export function calculateLeaderboard(data: PoolData): LeaderboardEntry[] {
  return data.entrants.map((entrant) => {
    const points = calculateEntrantPoints(entrant, data.matchups, data.rounds);
    const possiblePointsLeft = calculatePossiblePointsLeft(entrant, data.matchups, data.rounds);
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
  const unresolved = data.matchups.filter(
    (matchup) =>
      !matchup.winnerTeamId && matchup.teamAId && matchup.teamBId && matchup.roundId !== "champion",
  );
  const scenarios = enumerateScenarios(unresolved);
  const totals = new Map<string, { first: number; tied: number }>();

  data.entrants.forEach((entrant) => totals.set(entrant.id, { first: 0, tied: 0 }));

  scenarios.forEach((scenario) => {
    const scenarioMatchups = data.matchups.map((matchup) => ({
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
      (matchup.teamAId === teamId || matchup.teamBId === teamId) &&
      matchup.winnerTeamId &&
      matchup.winnerTeamId !== teamId,
  );
}

export function isRoundLocked(round: Round, at: Date = new Date()): boolean {
  if (round.isLocked) return true;
  if (!round.lockAt) return false;
  const lockAt = new Date(round.lockAt);
  return Number.isFinite(lockAt.getTime()) && lockAt <= at;
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
