import { describe, expect, it } from "vitest";
import {
  calculateLeaderboard,
  calculatePayouts,
  calculateScenarioOdds,
  createInitialPoolData,
  getDefaultPayoutRules,
  isRoundLocked,
  sortLeaderboard,
} from "./pool";

describe("pool scoring", () => {
  it("treats manual locks and past lock times as locked", () => {
    expect(
      isRoundLocked({
        id: "super-regionals",
        name: "Super Regionals",
        points: 1,
        isLocked: true,
      }),
    ).toBe(true);
    expect(
      isRoundLocked(
        {
          id: "super-regionals",
          name: "Super Regionals",
          points: 1,
          isLocked: false,
          lockAt: "2026-05-21T18:00:00.000Z",
        },
        new Date("2026-05-21T19:00:00.000Z"),
      ),
    ).toBe(true);
  });

  it("scores resolved picks and keeps only still-alive unresolved picks possible", () => {
    const data = createInitialPoolData();
    const tennesseeGeorgia = data.matchups.find(
      (matchup) => matchup.id === "super-tennessee-georgia",
    );
    const semis = data.rounds.find((round) => round.id === "wcws-semis");

    expect(tennesseeGeorgia).toBeDefined();
    expect(semis?.points).toBe(2);

    const updated = {
      ...data,
      matchups: data.matchups.map((matchup) =>
        matchup.id === "super-tennessee-georgia"
          ? { ...matchup, winnerTeamId: "tennessee" }
          : matchup,
      ),
      entrants: [
        {
          id: "entry-1",
          name: "Sam",
          paid: true,
          tiebreakerRuns: 21,
          picks: {
            "super-tennessee-georgia": "tennessee",
            "super-alabama-lsu": "alabama",
            "wcws-semi-1": "tennessee",
          },
        },
        {
          id: "entry-2",
          name: "Jess",
          paid: false,
          tiebreakerRuns: 18,
          picks: {
            "super-tennessee-georgia": "georgia",
            "super-alabama-lsu": "lsu",
            "wcws-semi-1": "georgia",
          },
        },
      ],
    };

    const leaderboard = calculateLeaderboard(updated);

    expect(leaderboard[0]).toMatchObject({
      entrantId: "entry-1",
      points: 1,
      possiblePointsLeft: 3,
      maxPoints: 4,
    });
    expect(leaderboard[1]).toMatchObject({
      entrantId: "entry-2",
      points: 0,
      possiblePointsLeft: 1,
      maxPoints: 1,
    });
  });

  it("uses championship series total runs as the tie-breaker when actual runs exist", () => {
    const data = {
      ...createInitialPoolData(),
      settings: {
        ...createInitialPoolData().settings,
        championshipRunsActual: 19,
      },
      entrants: [
        {
          id: "entry-1",
          name: "Close",
          paid: true,
          tiebreakerRuns: 20,
          picks: {},
        },
        {
          id: "entry-2",
          name: "Far",
          paid: true,
          tiebreakerRuns: 13,
          picks: {},
        },
      ],
    };

    const sorted = sortLeaderboard(calculateLeaderboard(data), data);

    expect(sorted.map((entry) => entry.name)).toEqual(["Close", "Far"]);
  });
});

describe("payouts", () => {
  it("provides expected default payout templates", () => {
    expect(getDefaultPayoutRules(1).map((rule) => rule.percent)).toEqual([100]);
    expect(getDefaultPayoutRules(2).map((rule) => rule.percent)).toEqual([
      70, 30,
    ]);
    expect(getDefaultPayoutRules(3).map((rule) => rule.percent)).toEqual([
      50, 30, 20,
    ]);
    expect(getDefaultPayoutRules(4).map((rule) => rule.percent)).toEqual([
      40, 30, 20, 10,
    ]);
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
  it("enumerates unresolved outcomes and returns first-place/tie chances", () => {
    const data = {
      ...createInitialPoolData(),
      matchups: createInitialPoolData().matchups
        .filter((matchup) =>
          ["super-alabama-lsu", "super-tennessee-georgia"].includes(matchup.id),
        )
        .map((matchup) => ({ ...matchup, winnerTeamId: undefined })),
      entrants: [
        {
          id: "entry-1",
          name: "Split",
          paid: true,
          tiebreakerRuns: 20,
          picks: {
            "super-alabama-lsu": "alabama",
            "super-tennessee-georgia": "tennessee",
          },
        },
        {
          id: "entry-2",
          name: "Opposite",
          paid: true,
          tiebreakerRuns: 21,
          picks: {
            "super-alabama-lsu": "lsu",
            "super-tennessee-georgia": "georgia",
          },
        },
      ],
    };

    const odds = calculateScenarioOdds(data);

    expect(odds).toEqual([
      {
        entrantId: "entry-1",
        name: "Split",
        firstPlacePercent: 25,
        tiedFirstPercent: 50,
        scenarios: 4,
      },
      {
        entrantId: "entry-2",
        name: "Opposite",
        firstPlacePercent: 25,
        tiedFirstPercent: 50,
        scenarios: 4,
      },
    ]);
  });
});
