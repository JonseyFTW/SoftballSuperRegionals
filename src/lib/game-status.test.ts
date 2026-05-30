import { describe, expect, it } from "vitest";
import {
  findMatchupForSnapshot,
  getFinalScoreText,
  getSeriesStatusText,
  getSeriesWinnerTeamId,
} from "./game-status";
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
      homeTeamName: "Mississippi State Bulldogs",
      awayAbbreviation: "TTU",
      homeAbbreviation: "MSST",
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

    expect(matchup?.id).toBe("game-1");
  });

  it("formats the next game from a best-of-three series lead", () => {
    const data = createInitialPoolData();
    const matchup = data.matchups.find(
      (candidate) => candidate.id === "game-4",
    );

    expect(matchup).toBeDefined();

    data.snapshots = [
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
        source: "espn",
        updatedAt: "2026-05-22T00:00:00.000Z",
      },
    ];

    expect(getSeriesStatusText(data, matchup!)).toBe("Game 2 - Nebraska leads series 1-0");
    expect(getSeriesWinnerTeamId(data, matchup!)).toBeUndefined();
  });

  it("identifies a best-of-three series winner from a completed series summary", () => {
    const data = createInitialPoolData();
    const matchup = data.matchups.find(
      (candidate) => candidate.id === "game-1",
    );

    expect(matchup).toBeDefined();

    data.snapshots = [
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
        source: "espn",
        updatedAt: "2026-05-22T00:00:00.000Z",
      },
    ];

    expect(getSeriesStatusText(data, matchup!)).toBe("Texas Tech wins series 2-0");
    expect(getSeriesWinnerTeamId(data, matchup!)).toBe("texas-tech");
  });

  it("uses the furthest series snapshot when multiple games match one series", () => {
    const data = createInitialPoolData();
    const matchup = data.matchups.find(
      (candidate) => candidate.id === "game-1",
    );

    expect(matchup).toBeDefined();

    data.snapshots = [
      {
        matchupId: "game-1",
        espnGameId: "game-1",
        awayTeamName: "Texas Tech Red Raiders",
        homeTeamName: "Mississippi State Bulldogs",
        awayAbbreviation: "TTU",
        homeAbbreviation: "MSST",
        awayScore: 10,
        homeScore: 8,
        status: "Final",
        statusState: "post",
        onFirst: false,
        onSecond: false,
        onThird: false,
        seriesSummary: "TTU leads series 1-0",
        source: "espn",
        updatedAt: "2026-05-22T00:00:00.000Z",
      },
      {
        matchupId: "game-1",
        espnGameId: "game-2",
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
        source: "espn",
        updatedAt: "2026-05-22T03:00:00.000Z",
      },
    ];

    expect(getSeriesStatusText(data, matchup!)).toBe("Texas Tech wins series 2-0");
    expect(getSeriesWinnerTeamId(data, matchup!)).toBe("texas-tech");
  });
});
