import { describe, expect, it } from "vitest";
import { normalizeNcaaBracketSnapshots } from "./ncaa";
import { createInitialPoolData } from "./pool";

describe("NCAA bracket normalization", () => {
  it("maps a single WCWS game to its bracket matchup by team names", () => {
    const snapshots = normalizeNcaaBracketSnapshots(
      {
        championships: [
          {
            games: [
              {
                contestId: 7001,
                gameState: "F",
                finalMessage: "FINAL",
                statusCodeDisplay: "final",
                startDate: "05/28/2026",
                teams: [
                  { nameShort: "Texas Tech", nameFull: "Texas Tech", score: 8, isWinner: true },
                  { nameShort: "Mississippi St.", nameFull: "Mississippi State", score: 0, isWinner: false },
                ],
              },
            ],
          },
        ],
      },
      createInitialPoolData(),
    );

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toMatchObject({
      matchupId: "g1",
      source: "ncaa",
      awayTeamName: "Texas Tech",
      homeTeamName: "Mississippi State",
    });
    // Single elimination games are not series, so no series summary is attached.
    expect(snapshots[0].seriesSummary).toBeUndefined();
  });

  it("does not attach the Texas Tech game to Texas's elimination matchup", () => {
    const snapshots = normalizeNcaaBracketSnapshots(
      {
        championships: [
          {
            games: [
              {
                contestId: 7001,
                gameState: "F",
                finalMessage: "FINAL",
                teams: [
                  { nameShort: "Texas Tech", nameFull: "Texas Tech", score: 8, isWinner: true },
                  { nameShort: "Mississippi St.", nameFull: "Mississippi State", score: 0, isWinner: false },
                ],
              },
            ],
          },
        ],
      },
      createInitialPoolData(),
    );

    expect(snapshots.some((snapshot) => snapshot.matchupId === "g5")).toBe(false);
  });
});
