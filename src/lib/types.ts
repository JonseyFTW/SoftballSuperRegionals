export type RoundId =
  | "super-regionals"
  | "wcws-semis"
  | "championship-matchup"
  | "champion";

export type Team = {
  id: string;
  name: string;
  shortName: string;
  abbreviation: string;
  seed?: string;
  color?: string;
  logoUrl?: string;
};

export type Round = {
  id: RoundId;
  name: string;
  points: number;
  lockAt?: string;
  isLocked: boolean;
};

export type Matchup = {
  id: string;
  roundId: RoundId;
  label: string;
  teamAId?: string;
  teamBId?: string;
  winnerTeamId?: string;
  espnGameId?: string;
  sortOrder: number;
};

export type Entrant = {
  id: string;
  name: string;
  paid: boolean;
  venmo?: string;
  zelle?: string;
  notes?: string;
  tiebreakerRuns: number;
  picks: Record<string, string>;
};

export type PayoutRule = {
  place: number;
  percent: number;
};

export type PoolSettings = {
  name: string;
  entryFee: number;
  adminVenmo?: string;
  adminZelle?: string;
  payoutRules: PayoutRule[];
  championshipRunsActual?: number;
};

export type GameSnapshot = {
  matchupId?: string;
  espnGameId: string;
  awayTeamName: string;
  homeTeamName: string;
  awayAbbreviation?: string;
  homeAbbreviation?: string;
  awayScore: number;
  homeScore: number;
  status: string;
  statusState?: string;
  inning?: number;
  inningHalf?: string;
  balls?: number;
  strikes?: number;
  outs?: number;
  onFirst: boolean;
  onSecond: boolean;
  onThird: boolean;
  batter?: string;
  pitcher?: string;
  lastPlay?: string;
  seriesSummary?: string;
  startDate?: string;
  source: "espn" | "manual";
  updatedAt: string;
};

export type PoolData = {
  settings: PoolSettings;
  teams: Team[];
  rounds: Round[];
  matchups: Matchup[];
  entrants: Entrant[];
  snapshots: GameSnapshot[];
  updatedAt: string;
};

export type LeaderboardEntry = {
  entrantId: string;
  name: string;
  paid: boolean;
  points: number;
  possiblePointsLeft: number;
  maxPoints: number;
  tiebreakerRuns: number;
  tiebreakerDistance?: number;
};

export type ScenarioOdd = {
  entrantId: string;
  name: string;
  firstPlacePercent: number;
  tiedFirstPercent: number;
  scenarios: number;
};
