import { describe, expect, it } from "vitest";
import { normalizeEspnHeaderEvent, normalizeEspnGamePackage } from "./espn";
import { isLiveSnapshot } from "./game-status";

describe("ESPN normalization", () => {
  it("extracts a live scorebug from ESPN header events", () => {
    const snapshot = normalizeEspnHeaderEvent({
      id: "401873440",
      summary: "Delayed, Bottom 1st",
      shortName: "OKST @ NEB",
      situation: {
        balls: 1,
        strikes: 0,
        outs: 1,
        onFirst: true,
        onSecond: false,
        onThird: false,
        batter: {
          athlete: { displayName: "Hannah Camenzind" },
          summary: "0-0",
        },
        pitcher: {
          athlete: { displayName: "Ruby Meylan" },
          summary: "0.1 IP, 0 ER",
        },
        lastPlay: { text: "Pitch 1 : Ball 1" },
      },
      competitions: [
        {
          startDate: "2026-05-22T01:00Z",
          series: { summary: "", totalCompetitions: 3 },
          status: {
            period: 1,
            type: {
              state: "in",
              detail: "Delayed, Bottom 1st",
              completed: false,
            },
          },
          competitors: [
            {
              homeAway: "away",
              score: "0",
              team: { displayName: "Oklahoma State Cowgirls", abbreviation: "OKST" },
            },
            {
              homeAway: "home",
              score: "0",
              team: { displayName: "Nebraska Cornhuskers", abbreviation: "NEB" },
            },
          ],
        },
      ],
    });

    expect(snapshot).toMatchObject({
      espnGameId: "401873440",
      awayTeamName: "Oklahoma State Cowgirls",
      homeTeamName: "Nebraska Cornhuskers",
      awayScore: 0,
      homeScore: 0,
      status: "Delayed, Bottom 1st",
      statusState: "in",
      inning: 1,
      inningHalf: "Bot",
      balls: 1,
      strikes: 0,
      outs: 1,
      onFirst: true,
      onSecond: false,
      onThird: false,
      batter: "Hannah Camenzind",
      pitcher: "Ruby Meylan",
      lastPlay: "Pitch 1 : Ball 1",
    });
  });

  it("extracts a live scorebug from the current ESPN header shape", () => {
    const snapshot = normalizeEspnHeaderEvent({
      id: "401873434",
      shortName: "TTU @ FLA",
      summary: "Top 1st",
      date: "2026-05-22T15:00:00Z",
      fullStatus: {
        period: 1,
        periodPrefix: "Top",
        type: {
          state: "in",
          detail: "Top 1st",
          completed: false,
        },
      },
      situation: {
        balls: 0,
        strikes: 0,
        outs: 0,
        onFirst: false,
        onSecond: false,
        onThird: false,
        lastPlay: { text: "Middle of the 1st inning" },
      },
      competitors: [
        {
          homeAway: "away",
          displayName: "Texas Tech Red Raiders",
          abbreviation: "TTU",
          score: "0",
        },
        {
          homeAway: "home",
          displayName: "Florida Gators",
          abbreviation: "FLA",
          score: "0",
        },
      ],
    });

    expect(snapshot).toMatchObject({
      espnGameId: "401873434",
      awayTeamName: "Texas Tech Red Raiders",
      homeTeamName: "Florida Gators",
      awayAbbreviation: "TTU",
      homeAbbreviation: "FLA",
      awayScore: 0,
      homeScore: 0,
      status: "Top 1st",
      statusState: "in",
      inning: 1,
      inningHalf: "Top",
      lastPlay: "Middle of the 1st inning",
    });
  });

  it("extracts series and status from a game package payload", () => {
    const snapshot = normalizeEspnGamePackage({
      gameId: 401873428,
      gamepackageJSON: {
        situation: {
          outs: 1,
          balls: 2,
          strikes: 2,
          onSecond: { playerId: 57143 },
          batter: { athlete: { displayName: "Sara Mosley" } },
          pitcher: { athlete: { displayName: "Karlyn Pickens" } },
          lastPlay: { text: "Mosley singled to center." },
        },
        header: {
          competitions: [
            {
              status: {
                periodPrefix: "Top",
                period: 7,
                type: { detail: "Top 7th", state: "in", completed: false },
              },
              series: [{ summary: "TENN leads series 1-0", totalCompetitions: 3 }],
              competitors: [
                {
                  homeAway: "away",
                  score: "1",
                  team: { displayName: "Georgia Bulldogs", abbreviation: "UGA" },
                },
                {
                  homeAway: "home",
                  score: "3",
                  team: {
                    displayName: "Tennessee Lady Volunteers",
                    abbreviation: "TENN",
                  },
                },
              ],
            },
          ],
        },
      },
    });

    expect(snapshot).toMatchObject({
      espnGameId: "401873428",
      awayScore: 1,
      homeScore: 3,
      status: "Top 7th",
      statusState: "in",
      inning: 7,
      inningHalf: "Top",
      seriesSummary: "TENN leads series 1-0",
      balls: 2,
      strikes: 2,
      outs: 1,
      onFirst: false,
      onSecond: true,
      onThird: false,
    });
  });

  it("identifies active scorebugs without treating scheduled or final games as live", () => {
    const baseSnapshot = {
      espnGameId: "1",
      awayTeamName: "Away",
      homeTeamName: "Home",
      awayScore: 0,
      homeScore: 0,
      status: "Scheduled",
      onFirst: false,
      onSecond: false,
      onThird: false,
      source: "espn" as const,
      updatedAt: "2026-05-22T00:00:00.000Z",
    };

    expect(isLiveSnapshot({ ...baseSnapshot, statusState: "in" })).toBe(true);
    expect(isLiveSnapshot({ ...baseSnapshot, statusState: "pre" })).toBe(false);
    expect(isLiveSnapshot({ ...baseSnapshot, statusState: "post", status: "Final" })).toBe(false);
    expect(isLiveSnapshot({ ...baseSnapshot, status: "Bottom 3rd", inningHalf: "Bot" })).toBe(true);
  });
});
