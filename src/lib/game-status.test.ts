import { describe, expect, it } from "vitest";
import { resolveBracket } from "./bracket";
import {
  findMatchupForSnapshot,
  getFinalScoreText,
  getSeriesStatusText,
  getSeriesWinnerTeamId,
} from "./game-status";
import { createInitialPoolData } from "./pool";
import type { GameSnapshot } from "./types";

const baseSnapshot: GameSnapshot = {
  espnGameId: "test",
  awayTeamName: "",
  homeTeamName: "",
  awayScore: 0,
  homeScore: 0,
  status: "",
  onFirst: false,
  onSecond: false,
  onThird: false,
  source: "espn",
  updatedAt: "2026-05-28T00:00:00.000Z",
};

describe("game status display", () => {
  it("formats final score text for completed games", () => {
    expect(
      getFinalScoreText({
        ...baseSnapshot,
        awayTeamName: "Mississippi State Bulldogs",
        homeTeamName: "Texas Tech Red Raiders",
        awayAbbreviation: "MSST",
        homeAbbreviation: "TTU",
        awayScore: 0,
        homeScore: 8,
        status: "Final",
        statusState: "post",
      }),
    ).toBe("MSST 0, TTU 8");
  });

  it("does not show a final score for scheduled games", () => {
    expect(
      getFinalScoreText({
        ...baseSnapshot,
        status: "Scheduled",
        statusState: "pre",
      }),
    ).toBeUndefined();
  });

  it("does not confuse Texas with Texas Tech when matching snapshots", () => {
    const data = resolveBracket(createInitialPoolData());
    const matchup = findMatchupForSnapshot(data, {
      ...baseSnapshot,
      espnGameId: "wcws-g1",
      awayTeamName: "Texas Tech Red Raiders",
      homeTeamName: "Mississippi State Bulldogs",
      awayAbbreviation: "TTU",
      homeAbbreviation: "MSST",
      status: "Top 1st",
      statusState: "in",
    });

    expect(matchup?.id).toBe("g1");
  });

  it("formats the next game from a best-of-three series lead", () => {
    const data = resolveBracket(createInitialPoolData());
    const matchup = data.matchups.find((candidate) => candidate.id === "g1");
    expect(matchup).toBeDefined();

    data.snapshots = [
      {
        ...baseSnapshot,
        matchupId: "g1",
        awayTeamName: "Texas Tech Red Raiders",
        homeTeamName: "Mississippi State Bulldogs",
        awayScore: 5,
        homeScore: 2,
        status: "Final",
        statusState: "post",
        seriesSummary: "TTU leads series 1-0",
      },
    ];

    expect(getSeriesStatusText(data, matchup!)).toBe("Game 2 - Texas Tech leads series 1-0");
    expect(getSeriesWinnerTeamId(data, matchup!)).toBeUndefined();
  });

  it("identifies a best-of-three series winner from a completed series summary", () => {
    const data = resolveBracket(createInitialPoolData());
    const matchup = data.matchups.find((candidate) => candidate.id === "g1");
    expect(matchup).toBeDefined();

    data.snapshots = [
      {
        ...baseSnapshot,
        matchupId: "g1",
        awayTeamName: "Texas Tech Red Raiders",
        homeTeamName: "Mississippi State Bulldogs",
        awayScore: 8,
        homeScore: 0,
        status: "Final",
        statusState: "post",
        seriesSummary: "TTU wins series 2-0",
      },
    ];

    expect(getSeriesStatusText(data, matchup!)).toBe("Texas Tech wins series 2-0");
    expect(getSeriesWinnerTeamId(data, matchup!)).toBe("texas-tech");
  });
});
