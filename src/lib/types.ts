export type RoundId =
  | "wb-round1"
  | "lb-round1"
  | "wb-final"
  | "lb-final"
  | "bracket-final"
  | "championship";

export type BracketId = "bracket-1" | "bracket-2" | "finals";

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
  /**
   * When true, picks in this round score on whether the entrant chose the team
   * that ADVANCES (the bracket final and the best-of-three championship), not on
   * each individual game. The loser-bracket team must win twice, so we only score
   * the survivor.
   */
  scoreByAdvance?: boolean;
  lockAt?: string;
  isLocked: boolean;
};

/**
 * Where a matchup slot's team comes from. "team" is a fixed seed; "winner"/"loser"
 * feed from the result of another matchup so the bracket can cascade.
 */
export type TeamSlot =
  | { type: "team"; teamId: string }
  | { type: "winner"; matchupId: string }
  | { type: "loser"; matchupId: string };

export type Matchup = {
  id: string;
  roundId: RoundId;
  bracketId: BracketId;
  label: string;
  /** Official WCWS game number(s) for display, e.g. "1" or "11/12". */
  gameLabel?: string;
  slotA?: TeamSlot;
  slotB?: TeamSlot;
  /** Resolved participants. Derived from slots + winners; may be set manually. */
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
  /** When true, anyone can submit their own bracket from the public entry page. */
  publicEntriesOpen?: boolean;
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
  source: "espn" | "manual" | "ncaa";
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
