import { DollarSign, Trophy, Users, Wand2 } from "lucide-react";
import Link from "next/link";
import { AutoRefresh } from "@/components/auto-refresh";
import { BracketView } from "@/components/bracket-view";
import { GameCard } from "@/components/game-card";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { MetricCard } from "@/components/metric-card";
import { OddsList } from "@/components/odds-list";
import { getMatchupSnapshot, isLiveSnapshot } from "@/lib/game-status";
import {
  calculateLeaderboard,
  calculatePayouts,
  calculateScenarioOdds,
  sortLeaderboard,
} from "@/lib/pool";
import { getPoolDataWithLiveSnapshots } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getPoolDataWithLiveSnapshots();
  const leaderboard = sortLeaderboard(calculateLeaderboard(data), data);
  const payout = calculatePayouts(data);
  const odds = calculateScenarioOdds(data);
  const paidCount = data.entrants.filter((entrant) => entrant.paid).length;
  const liveMatchups = data.matchups
    .filter((matchup) => isLiveSnapshot(getMatchupSnapshot(data, matchup)))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="stack">
      <AutoRefresh hasLiveGames={liveMatchups.length > 0} />
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Double-elimination bracket pool</p>
          <h1>{data.settings.name}</h1>
          <p>
            Pick both sides of the WCWS bracket. Points scale by round (1→6), and
            the bracket final and championship score on who advances.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/entrants">
              View everyone&apos;s picks
            </Link>
            {data.settings.publicEntriesOpen ? (
              <Link className="button button-secondary" href="/enter">
                Fill out a bracket
              </Link>
            ) : null}
            <Link className="button button-secondary" href="/admin">
              Admin portal
            </Link>
          </div>
        </div>
        <div className="hero-score">
          <span>Current leader</span>
          <strong>{leaderboard[0]?.name ?? "No entries yet"}</strong>
          <b>{leaderboard[0]?.points ?? 0} pts</b>
        </div>
      </section>

      <section className="metrics-grid" aria-label="Pool summary">
        <MetricCard
          icon={<Users size={18} />}
          label="Entrants"
          value={String(data.entrants.length)}
          detail={`${paidCount} paid`}
        />
        <MetricCard
          icon={<DollarSign size={18} />}
          label="Expected pot"
          value={`$${payout.expectedPot}`}
          detail={`$${payout.collectedPot} collected`}
        />
        <MetricCard
          icon={<Trophy size={18} />}
          label="Top payout"
          value={`$${payout.payouts[0]?.amount ?? 0}`}
          detail={`${payout.payouts.length} ${payout.payouts.length === 1 ? "place" : "places"} paid`}
        />
        <MetricCard
          icon={<Wand2 size={18} />}
          label="Odds model"
          value={`${odds[0]?.firstPlacePercent ?? 0}%`}
          detail="leader solo-win chance"
        />
      </section>

      <section className="content-grid">
        <div className="panel panel-wide">
          <div className="section-heading">
            <div>
              <h2>Leaderboard</h2>
              <p>Points, possible points left, and tie-breaker value.</p>
            </div>
          </div>
          <LeaderboardTable entries={leaderboard} />
        </div>
        <div className="panel">
          <div className="section-heading">
            <div>
              <h2>Likely Winners</h2>
              <p>Scenario odds across unresolved games.</p>
            </div>
          </div>
          <OddsList odds={odds} />
        </div>
      </section>

      {liveMatchups.length ? (
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>Live Now</h2>
              <p>{liveMatchups.length} game{liveMatchups.length === 1 ? "" : "s"} in progress</p>
            </div>
          </div>
          <div className="game-grid">
            {liveMatchups.map((matchup) => (
              <GameCard key={matchup.id} data={data} matchup={matchup} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Bracket</h2>
            <p>Winners advance right; losers drop to the elimination side. Points by round below each game.</p>
          </div>
        </div>
        <BracketView data={data} />
      </section>
    </div>
  );
}
