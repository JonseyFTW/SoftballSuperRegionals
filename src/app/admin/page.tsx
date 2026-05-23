import { RefreshCw } from "lucide-react";
import {
  deleteEntrant,
  logoutAdmin,
  saveEntrant,
  saveMatchup,
  saveRound,
  saveSettings,
  syncEspn,
} from "@/app/actions";
import { AutoSubmitForm } from "@/components/auto-submit-form";
import { requireAdmin } from "@/lib/auth";
import { getDefaultPayoutRules, getTeam } from "@/lib/pool";
import { getPoolData } from "@/lib/store";
import type { Entrant, Matchup, PoolData, Team } from "@/lib/types";

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
          <p>Edit entrants, paid status, picks, payout settings, winners, and ESPN game IDs.</p>
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

      <SettingsForm data={data} />
      <RoundForms data={data} />
      <MatchupForms data={data} />
      <EntrantForms data={data} />
    </div>
  );
}

function SettingsForm({ data }: { data: PoolData }) {
  const rules = data.settings.payoutRules;

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>Pool Settings</h2>
          <p>Payment info, entry fee, payout split, and championship-runs tiebreaker.</p>
        </div>
      </div>
      <form className="admin-form settings-grid" action={saveSettings}>
        <label>
          Pool name
          <input name="name" defaultValue={data.settings.name} required />
        </label>
        <label>
          Entry fee
          <input name="entryFee" type="number" min="0" step="1" defaultValue={data.settings.entryFee} />
        </label>
        <label>
          Admin Venmo
          <input name="adminVenmo" defaultValue={data.settings.adminVenmo ?? ""} placeholder="@your-handle" />
        </label>
        <label>
          Admin Zelle
          <input name="adminZelle" defaultValue={data.settings.adminZelle ?? ""} placeholder="email or phone" />
        </label>
        <label>
          Places paid
          <select name="payoutPlaces" defaultValue={rules.length}>
            {[1, 2, 3, 4].map((place) => (
              <option key={place} value={place}>
                {place}
              </option>
            ))}
          </select>
        </label>
        <label>
          Championship total runs
          <input
            name="championshipRunsActual"
            type="number"
            min="0"
            defaultValue={data.settings.championshipRunsActual ?? ""}
            placeholder="Set after final"
          />
        </label>
        {[1, 2, 3, 4].map((place) => (
          <label key={place}>
            Place {place} %
            <input
              name={`payoutPercent-${place}`}
              type="number"
              min="0"
              max="100"
              defaultValue={
                rules.find((rule) => rule.place === place)?.percent ??
                getDefaultPayoutRules(place).at(-1)?.percent ??
                0
              }
            />
          </label>
        ))}
        <button className="button button-primary" type="submit">
          Save settings
        </button>
      </form>
    </section>
  );
}

function RoundForms({ data }: { data: PoolData }) {
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
          <form key={round.id} className="admin-row-form" action={saveRound}>
            <input type="hidden" name="roundId" value={round.id} />
            <strong>{round.name}</strong>
            <span>{round.points} pts</span>
            <label>
              Lock time
              <input name="lockAt" type="datetime-local" defaultValue={round.lockAt?.slice(0, 16) ?? ""} />
            </label>
            <label className="checkbox-label">
              <input name="isLocked" type="checkbox" defaultChecked={round.isLocked} />
              Locked
            </label>
            <button className="button button-secondary" type="submit">
              Save
            </button>
          </form>
        ))}
      </div>
    </section>
  );
}

function MatchupForms({ data }: { data: PoolData }) {
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
              <form className="admin-row-form matchup-form" action={saveMatchup} autoComplete="off">
                <input type="hidden" name="matchupId" value={matchup.id} />
                <label>
                  Label
                  <input name="label" defaultValue={matchup.label} />
                </label>
                <TeamSelect data={data} name="teamAId" defaultValue={matchup.teamAId} blankLabel="Team A" />
                <TeamSelect data={data} name="teamBId" defaultValue={matchup.teamBId} blankLabel="Team B" />
                <WinnerSelect data={data} matchup={matchup} />
                <label>
                  ESPN game ID
                  <input
                    name="espnGameId"
                    defaultValue={matchup.espnGameId ?? ""}
                    placeholder="Optional override"
                    autoComplete="off"
                  />
                </label>
                <button className="button button-secondary" type="submit">
                  Save
                </button>
              </form>
            </details>
          ))}
      </div>
    </section>
  );
}

function EntrantForms({ data }: { data: PoolData }) {
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>Entrants + Picks</h2>
          <p>Payment handles remain visible only here.</p>
        </div>
      </div>
      <div className="entrant-admin-stack">
        <EntrantForm data={data} />
        <div className="admin-list">
          {data.entrants.map((entrant) => (
            <details key={entrant.id} className="admin-disclosure entrant-disclosure">
              <summary>
                <span>{entrant.name}</span>
                <small>{entrant.paid ? "Paid" : "Unpaid"} - {Object.keys(entrant.picks).length} picks</small>
              </summary>
              <EntrantForm data={data} entrant={entrant} />
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function EntrantForm({ data, entrant }: { data: PoolData; entrant?: Entrant }) {
  const Form = entrant ? AutoSubmitForm : "form";

  return (
    <Form className="admin-form entrant-form" action={saveEntrant} autoComplete="off">
      <input type="hidden" name="entrantId" value={entrant?.id ?? ""} />
      <h3>{entrant ? entrant.name : "Add entrant"}</h3>
      <label>
        Name
        <input name="name" defaultValue={entrant?.name ?? ""} required />
      </label>
      <div className="two-col">
        <label>
          Venmo
          <input name="venmo" defaultValue={entrant?.venmo ?? ""} placeholder="@handle" />
        </label>
        <label>
          Zelle
          <input name="zelle" defaultValue={entrant?.zelle ?? ""} placeholder="email or phone" />
        </label>
      </div>
      <div className="two-col">
        <label>
          Tie-breaker runs
          <input name="tiebreakerRuns" type="number" min="0" defaultValue={entrant?.tiebreakerRuns ?? 0} />
        </label>
        <label className="checkbox-label checkbox-block">
          <input name="paid" type="checkbox" defaultChecked={entrant?.paid ?? false} />
          Paid
        </label>
      </div>
      <label>
        Notes
        <textarea name="notes" rows={2} defaultValue={entrant?.notes ?? ""} />
      </label>
      <div className="pick-admin-list">
        {data.matchups
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((matchup) => (
            <label key={matchup.id}>
              {matchup.label}
              <PickSelect
                data={data}
                matchup={matchup}
                name={`pick-${matchup.id}`}
                defaultValue={entrant?.picks[matchup.id]}
              />
            </label>
          ))}
      </div>
      <div className="form-actions">
        <button className="button button-primary" type="submit">
          {entrant ? "Save entrant" : "Add entrant"}
        </button>
        {entrant ? (
          <button className="button button-danger" formAction={deleteEntrant}>
            Delete
          </button>
        ) : null}
      </div>
    </Form>
  );
}

function TeamSelect({
  data,
  name,
  defaultValue,
  blankLabel,
}: {
  data: PoolData;
  name: string;
  defaultValue?: string;
  blankLabel: string;
}) {
  return (
    <label>
      {blankLabel}
      <select name={name} defaultValue={defaultValue ?? ""}>
        <option value="">{blankLabel}</option>
        {data.teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.shortName}
          </option>
        ))}
      </select>
    </label>
  );
}

function WinnerSelect({ data, matchup }: { data: PoolData; matchup: Matchup }) {
  const teams = [getTeam(data, matchup.teamAId), getTeam(data, matchup.teamBId)].filter(isTeam);
  return (
    <label>
      Winner
      <select name="winnerTeamId" defaultValue={matchup.winnerTeamId ?? ""}>
        <option value="">Unresolved</option>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.shortName}
          </option>
        ))}
      </select>
    </label>
  );
}

function PickSelect({
  data,
  matchup,
  name,
  defaultValue,
}: {
  data: PoolData;
  matchup: Matchup;
  name: string;
  defaultValue?: string;
}) {
  const matchupTeams = [getTeam(data, matchup.teamAId), getTeam(data, matchup.teamBId)].filter(isTeam);
  const choices = matchupTeams.length > 0 ? matchupTeams : data.teams;

  return (
    <select name={name} defaultValue={defaultValue ?? ""}>
      <option value="">No pick</option>
      {choices.map((team) => (
        <option key={team.id} value={team.id}>
          {team.shortName}
        </option>
      ))}
    </select>
  );
}

function isTeam(team: Team | undefined): team is Team {
  return Boolean(team);
}

function matchupSummary(data: PoolData, matchup: Matchup): string {
  const teams = [getTeam(data, matchup.teamAId), getTeam(data, matchup.teamBId)]
    .filter(isTeam)
    .map((team) => team.shortName);
  const winner = getTeam(data, matchup.winnerTeamId)?.shortName;
  const teamText = teams.length ? teams.join(" vs ") : "Teams unset";
  return winner ? `${teamText} - winner: ${winner}` : teamText;
}
