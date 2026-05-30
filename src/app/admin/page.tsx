import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { logoutAdmin, syncEspn } from "@/app/actions";
import {
  AddEntrantForm,
  EntrantAutoForm,
  MatchupAutoForm,
  RoundAutoForm,
  SettingsAutoForm,
} from "@/components/admin-forms";
import { requireAdmin } from "@/lib/auth";
import { getTeam } from "@/lib/pool";
import { getPoolData } from "@/lib/store";
import type { Matchup, PoolData } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();
  const data = await getPoolData();

  return (
    <div className="stack">
      <section className="panel admin-title">
        <div>
          <p className="eyebrow">Password protected</p>
          <h1>Admin Portal</h1>
          <p>
            Edit entrants, paid status, picks, payout settings, winners, and ESPN game IDs. Changes
            save automatically.
          </p>
        </div>
        <div className="admin-actions">
          <form action={syncEspn}>
            <button className="button button-secondary" type="submit">
              <RefreshCw size={16} />
              Sync ESPN
            </button>
          </form>
          <form action={logoutAdmin}>
            <button className="button button-ghost" type="submit">
              Log out
            </button>
          </form>
        </div>
      </section>

      <SettingsSection data={data} />
      <RoundsSection data={data} />
      <MatchupsSection data={data} />
      <EntrantsSection data={data} />
    </div>
  );
}

function SettingsSection({ data }: { data: PoolData }) {
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>Pool Settings</h2>
          <p>Payment info, entry fee, payout split, and championship-runs tiebreaker.</p>
        </div>
      </div>
      <SettingsAutoForm data={data} />
    </section>
  );
}

function RoundsSection({ data }: { data: PoolData }) {
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>Round Locks</h2>
          <p>Use lock time for the one-hour-before-start rule, or manually lock/unlock.</p>
        </div>
      </div>
      <div className="admin-list">
        {data.rounds.map((round) => (
          <RoundAutoForm key={round.id} round={round} />
        ))}
      </div>
    </section>
  );
}

function MatchupsSection({ data }: { data: PoolData }) {
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>Matchups + Winners</h2>
          <p>Set winners for scoring and ESPN IDs for live scorebug sync.</p>
        </div>
      </div>
      <div className="admin-list">
        {data.matchups
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((matchup) => (
            <details key={matchup.id} className="admin-disclosure">
              <summary>
                <span>{matchup.label}</span>
                <small>{matchupSummary(data, matchup)}</small>
              </summary>
              <MatchupAutoForm data={data} matchup={matchup} />
            </details>
          ))}
      </div>
    </section>
  );
}

function EntrantsSection({ data }: { data: PoolData }) {
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>Entrants + Picks</h2>
          <p>Payment handles remain visible only here.</p>
        </div>
      </div>
      <div className="entrant-admin-stack">
        <AddEntrantForm data={data} />
        <div className="admin-list">
          {data.entrants.map((entrant) => (
            <details key={entrant.id} className="admin-disclosure entrant-disclosure">
              <summary>
                <span>{entrant.name}</span>
                <small>
                  {entrant.paid ? "Paid" : "Unpaid"} - {Object.keys(entrant.picks).length} picks
                </small>
              </summary>
              <Link className="button button-secondary admin-entrant-edit-link" href={`/admin/entrants/${entrant.id}`}>
                Open visual pick editor
              </Link>
              <EntrantAutoForm data={data} entrant={entrant} />
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function matchupSummary(data: PoolData, matchup: Matchup): string {
  const teams = [getTeam(data, matchup.teamAId), getTeam(data, matchup.teamBId)]
    .filter((team): team is NonNullable<typeof team> => Boolean(team))
    .map((team) => team.shortName);
  const winner = getTeam(data, matchup.winnerTeamId)?.shortName;
  const teamText = teams.length ? teams.join(" vs ") : "Teams unset";
  return winner ? `${teamText} - winner: ${winner}` : teamText;
}
