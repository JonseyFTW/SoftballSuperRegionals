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
  it("does not seed ESPN game IDs into matchups", () => {
    expect(createInitialPoolData().matchups.some((matchup) => matchup.espnGameId)).toBe(false);
  });

  it("treats manual locks and past lock times as locked", () => {
    expect(
      isRoundLocked({
        id: "winners-first",
        name: "Winners' Bracket Opening Round",
        points: 1,
        isLocked: true,
      }),
    ).toBe(true);
    expect(
      isRoundLocked(
        {
          id: "winners-first",
          name: "Winners' Bracket Opening Round",
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
      (matchup) => matchup.id === "game-2",
    );
    const semis = data.rounds.find((round) => round.id === "winners-second");

    expect(tennesseeGeorgia).toBeDefined();
    expect(semis?.points).toBe(3);

    const updated = {
      ...data,
      matchups: data.matchups.map((matchup) =>
        matchup.id === "game-2"
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
            "game-2": "tennessee",
            "game-1": "texas-tech",
            "game-7": "tennessee",
          },
        },
        {
          id: "entry-2",
          name: "Jess",
          paid: false,
          tiebreakerRuns: 18,
          picks: {
            "game-2": "texas",
            "game-1": "mississippi-state",
            "game-7": "texas",
          },
        },
      ],
    };

    const leaderboard = calculateLeaderboard(updated);

    expect(leaderboard[0]).toMatchObject({
      entrantId: "entry-1",
      points: 1,
      possiblePointsLeft: 4,
      maxPoints: 5,
    });
    expect(leaderboard[1]).toMatchObject({
      entrantId: "entry-2",
      points: 0,
      possiblePointsLeft: 4,
      maxPoints: 4,
    });
  });

  it("scores bracket picks when the game winner is set", () => {
    const data = createInitialPoolData();
    const updated = {
      ...data,
      snapshots: [
        {
          matchupId: "game-1",
          espnGameId: "401873434",
          awayTeamName: "Texas Tech Red Raiders",
          homeTeamName: "Mississippi State Bulldogs",
          awayAbbreviation: "TTU",
          homeAbbreviation: "MSST",
          awayScore: 5,
          homeScore: 2,
          status: "Final",
          statusState: "post",
          onFirst: false,
          onSecond: false,
          onThird: false,
          seriesSummary: "TTU wins series 2-0",
          source: "espn" as const,
          updatedAt: "2026-05-22T00:00:00.000Z",
        },
        {
          matchupId: "game-4",
          espnGameId: "401873440",
          awayTeamName: "Arkansas Razorbacks",
          homeTeamName: "Nebraska Cornhuskers",
          awayAbbreviation: "ARK",
          homeAbbreviation: "NEB",
          awayScore: 1,
          homeScore: 8,
          status: "Final",
          statusState: "post",
          onFirst: false,
          onSecond: false,
          onThird: false,
          seriesSummary: "NEB leads series 1-0",
          source: "espn" as const,
          updatedAt: "2026-05-22T00:00:00.000Z",
        },
      ],
      entrants: [
        {
          id: "entry-1",
          name: "Tech Pick",
          paid: true,
          tiebreakerRuns: 21,
          picks: {
            "game-1": "texas-tech",
            "game-4": "nebraska",
          },
        },
        {
          id: "entry-2",
          name: "Mississippi State Pick",
          paid: true,
          tiebreakerRuns: 18,
          picks: {
            "game-1": "mississippi-state",
            "game-4": "nebraska",
          },
        },
      ],
    };

    const leaderboard = calculateLeaderboard(updated);

    expect(leaderboard.find((entry) => entry.name === "Tech Pick")).toMatchObject({
      points: 2,
    });
    expect(leaderboard.find((entry) => entry.name === "Mississippi State Pick")).toMatchObject({
      points: 1,
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
          ["game-1", "game-2"].includes(matchup.id),
        )
        .map((matchup) => ({ ...matchup, winnerTeamId: undefined })),
      entrants: [
        {
          id: "entry-1",
          name: "Split",
          paid: true,
          tiebreakerRuns: 20,
          picks: {
            "game-1": "texas-tech",
            "game-2": "tennessee",
          },
        },
        {
          id: "entry-2",
          name: "Opposite",
          paid: true,
          tiebreakerRuns: 21,
          picks: {
            "game-1": "mississippi-state",
            "game-2": "texas",
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
