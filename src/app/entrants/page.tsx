import Link from "next/link";
import { AutoRefresh } from "@/components/auto-refresh";
import { getMatchupSnapshot, isLiveSnapshot } from "@/lib/game-status";
import { calculateLeaderboard, sortLeaderboard } from "@/lib/pool";
import { getPoolDataWithLiveSnapshots } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function EntrantsPage() {
  const data = await getPoolDataWithLiveSnapshots();
  const leaderboard = sortLeaderboard(calculateLeaderboard(data), data);
  const hasLiveGames = data.matchups.some((matchup) =>
    isLiveSnapshot(getMatchupSnapshot(data, matchup)),
  );

  return (
    <div className="stack">
      <AutoRefresh hasLiveGames={hasLiveGames} />
      <section className="panel">
        <div className="section-heading">
          <div>
            <h1>Entrants</h1>
            <p>Open any entry to inspect their bracket and remaining path.</p>
          </div>
        </div>
        <div className="entrant-grid">
          {leaderboard.map((entry, index) => (
            <Link key={entry.entrantId} className="entrant-card" href={`/entrants/${entry.entrantId}`}>
              <span>#{index + 1}</span>
              <strong>{entry.name}</strong>
              <small>
                {entry.points} points · {entry.maxPoints} max
              </small>
              <b className={entry.paid ? "pill pill-paid" : "pill pill-unpaid"}>
                {entry.paid ? "Paid" : "Unpaid"}
              </b>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
