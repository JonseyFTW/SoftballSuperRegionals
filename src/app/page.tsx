import { DollarSign, Trophy, Users, Wand2 } from "lucide-react";
import Link from "next/link";
import { AutoRefresh } from "@/components/auto-refresh";
import { GameCard, MatchupRow } from "@/components/game-card";
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
  const superRegionals = data.matchups
    .filter((matchup) => matchup.roundId === "super-regionals")
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const liveMatchups = superRegionals.filter((matchup) =>
    isLiveSnapshot(getMatchupSnapshot(data, matchup)),
  );
  const inactiveMatchups = superRegionals.filter(
    (matchup) => !isLiveSnapshot(getMatchupSnapshot(data, matchup)),
  );

  return (
    <div className="stack">
      <AutoRefresh hasLiveGames={liveMatchups.length > 0} />
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Straight pick&apos;em bracket</p>
          <h1>{data.settings.name}</h1>
          <p>
            Track picks, live super regional scorebugs, possible points left,
            payout math, and who still has a path to the top.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/entrants">
              View everyone&apos;s picks
            </Link>
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

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Super Regionals</h2>
            <p>{liveMatchups.length ? `${liveMatchups.length} live now` : "No live games right now"}</p>
          </div>
        </div>
        <div className="scoreboard-stack">
          {liveMatchups.length ? (
            <div className="game-grid">
              {liveMatchups.map((matchup) => (
                <GameCard key={matchup.id} data={data} matchup={matchup} />
              ))}
            </div>
          ) : null}
          <div className="matchup-list">
            {inactiveMatchups.map((matchup) => (
              <MatchupRow key={matchup.id} data={data} matchup={matchup} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
