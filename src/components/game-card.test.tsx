import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GameCard } from "./game-card";
import { createInitialPoolData } from "@/lib/pool";

describe("GameCard", () => {
  it("renders base runners as a diamond and balls/strikes as filled dots", () => {
    const data = createInitialPoolData();
    const matchup = data.matchups[0];

    data.snapshots = [
      {
        matchupId: matchup.id,
        espnGameId: "live-test",
        awayTeamName: "Alabama Crimson Tide",
        homeTeamName: "LSU Tigers",
        awayAbbreviation: "ALA",
        homeAbbreviation: "LSU",
        awayScore: 1,
        homeScore: 2,
        status: "Top 4th",
        statusState: "in",
        inning: 4,
        inningHalf: "Top",
        balls: 2,
        strikes: 1,
        outs: 1,
        onFirst: true,
        onSecond: true,
        onThird: false,
        batter: "Live Batter",
        pitcher: "Live Pitcher",
        source: "espn",
        updatedAt: "2026-05-22T00:00:00.000Z",
      },
    ];

    const html = renderToStaticMarkup(<GameCard data={data} matchup={matchup} />);

    expect(html).toContain('data-testid="base-diamond"');
    expect(html).toContain('data-base="first"');
    expect(html).toContain('data-base="second"');
    expect(html).toContain('data-base="third"');
    expect(html).toContain('data-testid="balls-count"');
    expect(html).toContain('data-testid="strikes-count"');
    expect(html.match(/class="count-dot filled"/g)).toHaveLength(3);
    expect(html).not.toContain(">B 2<");
    expect(html).not.toContain(">S 1<");
  });
});
