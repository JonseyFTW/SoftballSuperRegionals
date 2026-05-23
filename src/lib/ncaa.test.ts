import { describe, expect, it } from "vitest";
import { calculateLeaderboard, createInitialPoolData } from "./pool";
import { normalizeNcaaBracketSnapshots } from "./ncaa";

describe("NCAA bracket normalization", () => {
  it("scores a completed super regional series when ESPN no longer has a game ID", () => {
    const data = {
      ...createInitialPoolData(),
      entrants: [
        {
          id: "entry-tennessee",
          name: "Tennessee Pick",
          paid: true,
          tiebreakerRuns: 21,
          picks: {
            "super-tennessee-georgia": "tennessee",
          },
        },
        {
          id: "entry-georgia",
          name: "Georgia Pick",
          paid: true,
          tiebreakerRuns: 18,
          picks: {
            "super-tennessee-georgia": "georgia",
          },
        },
      ],
      snapshots: normalizeNcaaBracketSnapshots(
        {
          championships: [
            {
              games: [
                {
                  contestId: 6599912,
                  sectionId: 207,
                  title: "Georgia vs Tennessee",
                  gameState: "F",
                  finalMessage: "FINAL",
                  statusCodeDisplay: "final",
                  startDate: "05/21/2026",
                  teams: [
                    {
                      nameShort: "Tennessee",
                      nameFull: "University of Tennessee",
                      score: 3,
                      isWinner: true,
                    },
                    {
                      nameShort: "Georgia",
                      nameFull: "University of Georgia",
                      score: 1,
                      isWinner: false,
                    },
                  ],
                },
                {
                  contestId: 6599913,
                  sectionId: 207,
                  title: "Tennessee vs Georgia",
                  gameState: "F",
                  finalMessage: "FINAL",
                  statusCodeDisplay: "final",
                  startDate: "05/22/2026",
                  teams: [
                    {
                      nameShort: "Tennessee",
                      nameFull: "University of Tennessee",
                      score: 2,
                      isWinner: true,
                    },
                    {
                      nameShort: "Georgia",
                      nameFull: "University of Georgia",
                      score: 1,
                      isWinner: false,
                    },
                  ],
                },
              ],
            },
          ],
        },
        createInitialPoolData(),
      ),
    };

    expect(data.snapshots).toHaveLength(2);
    expect(data.snapshots[0]).toMatchObject({
      matchupId: "super-tennessee-georgia",
      seriesSummary: "TENN wins series 2-0",
      source: "ncaa",
    });

    const leaderboard = calculateLeaderboard(data);

    expect(leaderboard.find((entry) => entry.name === "Tennessee Pick")).toMatchObject({
      points: 1,
    });
    expect(leaderboard.find((entry) => entry.name === "Georgia Pick")).toMatchObject({
      points: 0,
    });
  });
});
