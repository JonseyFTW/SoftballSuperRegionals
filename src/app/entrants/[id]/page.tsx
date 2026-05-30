import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AutoRefresh } from "@/components/auto-refresh";
import { BracketView } from "@/components/bracket-view";
import { getMatchupSnapshot, isLiveSnapshot } from "@/lib/game-status";
import { calculateLeaderboard, calculateScenarioOdds, sortLeaderboard } from "@/lib/pool";
import { getPoolDataWithLiveSnapshots } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function EntrantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getPoolDataWithLiveSnapshots();
  const entrant = data.entrants.find((candidate) => candidate.id === id);
  if (!entrant) notFound();

  const leaderboardEntry = sortLeaderboard(calculateLeaderboard(data), data).find(
    (entry) => entry.entrantId === id,
  );
  const odds = calculateScenarioOdds(data).find((entry) => entry.entrantId === id);
  const hasLiveGames = data.matchups.some((matchup) =>
    isLiveSnapshot(getMatchupSnapshot(data, matchup)),
  );

  return (
    <div className="stack">
      <AutoRefresh hasLiveGames={hasLiveGames} />
      <Link className="back-link" href="/entrants">
        <ArrowLeft size={16} />
        All entrants
      </Link>
      <section className="panel">
        <div className="entrant-hero">
          <div>
            <h1>{entrant.name}</h1>
            <p>
              {leaderboardEntry?.points ?? 0} points · {leaderboardEntry?.possiblePointsLeft ?? 0} left ·{" "}
              {leaderboardEntry?.maxPoints ?? 0} max
            </p>
          </div>
          <div className="entrant-odds">
            <span>Win odds</span>
            <strong>{odds?.firstPlacePercent ?? 0}%</strong>
            <small>{odds?.tiedFirstPercent ?? 0}% tie chance</small>
          </div>
        </div>
      </section>
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Bracket Picks</h2>
            <p>Correct picks turn green once a game is decided.</p>
          </div>
        </div>
        <BracketView data={data} entrant={entrant} />
      </section>
    </div>
  );
}
