import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PickList } from "@/components/pick-list";
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

  return (
    <div className="stack">
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
            <p>Correct picks turn green once a series winner is available.</p>
          </div>
        </div>
        <PickList data={data} entrant={entrant} />
      </section>
    </div>
  );
}
