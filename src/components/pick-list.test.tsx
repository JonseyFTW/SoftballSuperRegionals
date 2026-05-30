import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createInitialPoolData } from "@/lib/pool";
import { PickList } from "./pick-list";

describe("PickList", () => {
  it("marks picks correct when a series winner is derived from snapshots", () => {
    const data = createInitialPoolData();
    const entrant = {
      id: "entry-tennessee",
      name: "Tennessee Pick",
      paid: true,
      tiebreakerRuns: 21,
      picks: {
        "game-2": "tennessee",
      },
    };

    data.snapshots = [
      {
        matchupId: "game-2",
        espnGameId: "ncaa-6599913",
        awayTeamName: "University of Tennessee",
        homeTeamName: "University of Texas",
        awayAbbreviation: "Tennessee",
        homeAbbreviation: "Texas",
        awayScore: 2,
        homeScore: 1,
        status: "FINAL",
        statusState: "post",
        onFirst: false,
        onSecond: false,
        onThird: false,
        seriesSummary: "TENN wins series 2-0",
        source: "ncaa",
        updatedAt: "2026-05-23T00:00:00.000Z",
      },
    ];

    const html = renderToStaticMarkup(<PickList data={data} entrant={entrant} />);

    expect(html).toContain("Game 2: Tennessee vs Texas");
    expect(html).toContain('class="pick-status correct"');
  });
});
