import { describe, expect, it } from "vitest";
import { findMatchupForSnapshot, getFinalScoreText } from "./game-status";
import { createInitialPoolData } from "./pool";

describe("game status display", () => {
  it("formats final score text for completed games", () => {
    expect(
      getFinalScoreText({
        espnGameId: "401873428",
        awayTeamName: "Georgia Bulldogs",
        homeTeamName: "Tennessee Lady Volunteers",
        awayAbbreviation: "UGA",
        homeAbbreviation: "TENN",
        awayScore: 1,
        homeScore: 3,
        status: "Final",
        statusState: "post",
        onFirst: false,
        onSecond: false,
        onThird: false,
        source: "espn",
        updatedAt: "2026-05-22T00:00:00.000Z",
      }),
    ).toBe("UGA 1, TENN 3");
  });

  it("does not show a final score for scheduled games", () => {
    expect(
      getFinalScoreText({
        espnGameId: "401873428",
        awayTeamName: "Georgia Bulldogs",
        homeTeamName: "Tennessee Lady Volunteers",
        awayAbbreviation: "UGA",
        homeAbbreviation: "TENN",
        awayScore: 0,
        homeScore: 0,
        status: "Scheduled",
        statusState: "pre",
        onFirst: false,
        onSecond: false,
        onThird: false,
        source: "espn",
        updatedAt: "2026-05-22T00:00:00.000Z",
      }),
    ).toBeUndefined();
  });

  it("matches ESPN header snapshots to bracket matchups without a stored game ID", () => {
    const data = createInitialPoolData();
    const matchup = findMatchupForSnapshot(data, {
      espnGameId: "401873434",
      awayTeamName: "Texas Tech Red Raiders",
      homeTeamName: "Florida Gators",
      awayAbbreviation: "TTU",
      homeAbbreviation: "FLA",
      awayScore: 0,
      homeScore: 0,
      status: "Top 1st",
      statusState: "in",
      onFirst: false,
      onSecond: false,
      onThird: false,
      source: "espn",
      updatedAt: "2026-05-22T00:00:00.000Z",
    });

    expect(matchup?.id).toBe("super-florida-texas-tech");
  });
});
