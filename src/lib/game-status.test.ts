import { describe, expect, it } from "vitest";
import { getFinalScoreText } from "./game-status";

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
});
