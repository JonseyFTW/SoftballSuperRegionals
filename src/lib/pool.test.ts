import { describe, expect, it } from "vitest";
import {
  calculateLeaderboard,
  calculatePayouts,
  calculateScenarioOdds,
  createInitialPoolData,
  getDefaultPayoutRules,
  isRoundLocked,
  migratePoolData,
  sortLeaderboard,
} from "./pool";
import type { Entrant, PoolData } from "./types";

// The first round of every bracket from the seed image.
const DECIDED: Record<string, string> = {
  g1: "texas-tech",
  g2: "tennessee",
  g3: "alabama",
  g4: "nebraska",
  g5: "texas",
  g6: "ucla",
};

function withWinners(data: PoolData, winners: Record<string, string>): PoolData {
  return {
    ...data,
    matchups: data.matchups.map((matchup) =>
      winners[matchup.id] ? { ...matchup, winnerTeamId: winners[matchup.id] } : matchup,
    ),
  };
}

describe("pool scoring", () => {
  it("does not seed ESPN game IDs into matchups", () => {
    expect(createInitialPoolData().matchups.some((matchup) => matchup.espnGameId)).toBe(false);
  });

  it("uses the WCWS round point ladder with advancement scoring at the top", () => {
    const rounds = createInitialPoolData().rounds;
    expect(rounds.map((round) => [round.id, round.points])).toEqual([
      ["wb-round1", 1],
      ["lb-round1", 2],
      ["wb-final", 3],
      ["lb-final", 4],
      ["bracket-final", 5],
      ["championship", 6],
    ]);
    expect(rounds.find((round) => round.id === "bracket-final")?.scoreByAdvance).toBe(true);
    expect(rounds.find((round) => round.id === "championship")?.scoreByAdvance).toBe(true);
  });

  it("models two bracket finals and a single championship pick", () => {
    const matchups = createInitialPoolData().matchups;
    expect(matchups.filter((matchup) => matchup.roundId === "bracket-final")).toHaveLength(2);
    expect(matchups.filter((matchup) => matchup.roundId === "championship")).toHaveLength(1);
  });

  it("treats manual locks and past lock times as locked", () => {
    expect(
      isRoundLocked({ id: "wb-round1", name: "Winners' Bracket Round 1", points: 1, isLocked: true }),
    ).toBe(true);
    expect(
      isRoundLocked(
        {
          id: "wb-round1",
          name: "Winners' Bracket Round 1",
          points: 1,
          isLocked: false,
          lockAt: "2026-05-28T15:00:00.000Z",
        },
        new Date("2026-05-28T16:00:00.000Z"),
      ),
    ).toBe(true);
  });

  it("starts a fresh pool with no winners decided", () => {
    expect(createInitialPoolData().matchups.some((matchup) => matchup.winnerTeamId)).toBe(false);
  });

  it("scores decided games by round and keeps the full path possible for a clean bracket", () => {
    const leaderboard = calculateLeaderboard(withWinners(createInitialPoolData(), DECIDED));
    const leader = leaderboard.find((entry) => entry.entrantId === "entry-sample-1");
    const chaser = leaderboard.find((entry) => entry.entrantId === "entry-sample-2");

    // g1-g6 are decided: 4 winners-round-1 (1pt) + 2 elimination-round-1 (2pt) = 8.
    expect(leader).toMatchObject({ points: 8, possiblePointsLeft: 30, maxPoints: 38 });
    // Chaser missed every decided game but still has live picks in later rounds.
    expect(chaser).toMatchObject({ points: 0, possiblePointsLeft: 24, maxPoints: 24 });
  });

  it("awards the 6-point championship only for picking the team that wins the series", () => {
    const data = withWinners(createInitialPoolData(), { ...DECIDED, championship: "alabama" });
    const leaderboard = calculateLeaderboard(data);
    const leader = leaderboard.find((entry) => entry.entrantId === "entry-sample-1");
    // Leader picked Alabama as champion (+6) on top of the 8 already banked.
    expect(leader?.points).toBe(14);
  });

  it("drops possible points once a picked team is eliminated", () => {
    const entrant: Entrant = {
      id: "loser-pick",
      name: "Backed Mississippi State",
      paid: true,
      tiebreakerRuns: 5,
      // Picked Mississippi State to win the whole thing, but they already lost g1 and g5.
      picks: { championship: "mississippi-state" },
    };
    const data: PoolData = { ...withWinners(createInitialPoolData(), DECIDED), entrants: [entrant] };

    const leaderboard = calculateLeaderboard(data);
    expect(leaderboard[0]).toMatchObject({ points: 0, possiblePointsLeft: 0 });
  });
});

describe("legacy migration", () => {
  it("rebuilds the WCWS bracket while preserving entrants and settings", () => {
    const legacy = {
      settings: {
        name: "Family Pool",
        entryFee: 10,
        adminVenmo: "@host",
        payoutRules: [{ place: 1, percent: 100 }],
      },
      teams: [{ id: "lsu", name: "LSU", shortName: "LSU", abbreviation: "LSU" }],
      rounds: [{ id: "super-regionals", name: "Super Regionals", points: 1, isLocked: false }],
      matchups: [
        {
          id: "super-x",
          roundId: "super-regionals",
          label: "x",
          teamAId: "lsu",
          teamBId: "duke",
          sortOrder: 1,
        },
      ],
      entrants: [
        { id: "e1", name: "Chad", paid: true, venmo: "@chad", tiebreakerRuns: 4, picks: { "super-x": "lsu" } },
      ],
      snapshots: [],
      updatedAt: "2026-05-20T00:00:00.000Z",
    } as unknown as PoolData;

    const migrated = migratePoolData(legacy);

    expect(migrated.matchups).toHaveLength(13);
    expect(migrated.matchups.every((matchup) => Boolean(matchup.bracketId))).toBe(true);
    expect(migrated.rounds.find((round) => round.id === "championship")?.points).toBe(6);
    // Entrants and settings carry over; obsolete picks are dropped.
    expect(migrated.entrants[0]).toMatchObject({ name: "Chad", paid: true, venmo: "@chad" });
    expect(migrated.entrants[0].picks).toEqual({});
    expect(migrated.settings).toMatchObject({ name: "Family Pool", adminVenmo: "@host" });
  });

  it("is a no-op for data already in the WCWS format", () => {
    const current = createInitialPoolData();
    expect(migratePoolData(current)).toBe(current);
  });
});

describe("payouts", () => {
  it("provides expected default payout templates", () => {
    expect(getDefaultPayoutRules(1).map((rule) => rule.percent)).toEqual([100]);
    expect(getDefaultPayoutRules(2).map((rule) => rule.percent)).toEqual([70, 30]);
    expect(getDefaultPayoutRules(3).map((rule) => rule.percent)).toEqual([50, 30, 20]);
    expect(getDefaultPayoutRules(4).map((rule) => rule.percent)).toEqual([40, 30, 20, 10]);
  });

  it("calculates expected and collected pot separately", () => {
    const data = {
      ...createInitialPoolData(),
      settings: {
        ...createInitialPoolData().settings,
        entryFee: 10,
        payoutRules: getDefaultPayoutRules(2),
      },
      entrants: [
        { id: "a", name: "A", paid: true, picks: {}, tiebreakerRuns: 18 },
        { id: "b", name: "B", paid: false, picks: {}, tiebreakerRuns: 19 },
        { id: "c", name: "C", paid: true, picks: {}, tiebreakerRuns: 20 },
      ],
    };

    expect(calculatePayouts(data)).toEqual({
      expectedPot: 30,
      collectedPot: 20,
      payouts: [
        { place: 1, percent: 70, amount: 21 },
        { place: 2, percent: 30, amount: 9 },
      ],
    });
  });
});

describe("scenario odds", () => {
  it("splits first-place odds over an unresolved championship", () => {
    const base = createInitialPoolData();
    const data: PoolData = {
      ...base,
      matchups: [
        {
          id: "championship",
          roundId: "championship",
          bracketId: "finals",
          label: "Championship Finals (Best of 3)",
          gameLabel: "Finals",
          slotA: { type: "team", teamId: "texas" },
          slotB: { type: "team", teamId: "alabama" },
          sortOrder: 1,
        },
      ],
      entrants: [
        { id: "texas-fan", name: "Texas Fan", paid: true, tiebreakerRuns: 7, picks: { championship: "texas" } },
        { id: "bama-fan", name: "Bama Fan", paid: true, tiebreakerRuns: 9, picks: { championship: "alabama" } },
      ],
    };

    expect(calculateScenarioOdds(data)).toEqual([
      { entrantId: "texas-fan", name: "Texas Fan", firstPlacePercent: 50, tiedFirstPercent: 0, scenarios: 2 },
      { entrantId: "bama-fan", name: "Bama Fan", firstPlacePercent: 50, tiedFirstPercent: 0, scenarios: 2 },
    ]);
  });
});

describe("sort + tiebreaker", () => {
  it("uses championship total runs as the tie-breaker when actual runs exist", () => {
    const data = {
      ...createInitialPoolData(),
      settings: { ...createInitialPoolData().settings, championshipRunsActual: 19 },
      entrants: [
        { id: "entry-1", name: "Close", paid: true, tiebreakerRuns: 20, picks: {} },
        { id: "entry-2", name: "Far", paid: true, tiebreakerRuns: 13, picks: {} },
      ],
    };

    const sorted = sortLeaderboard(calculateLeaderboard(data), data);
    expect(sorted.map((entry) => entry.name)).toEqual(["Close", "Far"]);
  });
});
