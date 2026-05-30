import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { resolveBracket } from "@/lib/bracket";
import { createInitialPoolData } from "@/lib/pool";
import { BracketView } from "./bracket-view";

describe("BracketView", () => {
  it("renders both pods, the finals, and the round point ladder", () => {
    const data = resolveBracket(createInitialPoolData());
    const html = renderToStaticMarkup(<BracketView data={data} />);

    expect(html).toContain("Bracket 1");
    expect(html).toContain("Bracket 2");
    expect(html).toContain("Championship Finals");
    expect(html).toContain("Texas Tech");
    expect(html).toContain("1 pt");
    expect(html).toContain("5 pts");
    expect(html).toContain("6 pts");
  });

  it("marks an entrant's decided picks correct and incorrect", () => {
    const seed = createInitialPoolData();
    const decided: Record<string, string> = {
      g1: "texas-tech",
      g2: "tennessee",
      g3: "alabama",
      g4: "nebraska",
    };
    const data = resolveBracket({
      ...seed,
      matchups: seed.matchups.map((matchup) =>
        decided[matchup.id] ? { ...matchup, winnerTeamId: decided[matchup.id] } : matchup,
      ),
    });
    const leader = data.entrants.find((entrant) => entrant.id === "entry-sample-1");
    const chaser = data.entrants.find((entrant) => entrant.id === "entry-sample-2");

    const leaderHtml = renderToStaticMarkup(<BracketView data={data} entrant={leader} />);
    const chaserHtml = renderToStaticMarkup(<BracketView data={data} entrant={chaser} />);

    expect(leaderHtml).toContain("is-correct");
    expect(leaderHtml).toContain("tag-correct");
    expect(chaserHtml).toContain("is-wrong");
  });
});
