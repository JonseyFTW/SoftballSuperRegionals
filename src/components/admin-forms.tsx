"use client";

import { useTransition } from "react";
import {
  deleteEntrant,
  saveEntrant,
  saveMatchup,
  saveRound,
  saveSettings,
} from "@/app/actions";
import { AutoSaveForm } from "@/components/auto-save-form";
import { BracketPicker } from "@/components/bracket-picker";
import { slotLabel } from "@/components/bracket-view";
import { getDefaultPayoutRules, getTeam } from "@/lib/pool";
import type { Entrant, Matchup, PoolData, Round, Team } from "@/lib/types";

export function SettingsAutoForm({ data }: { data: PoolData }) {
  const rules = data.settings.payoutRules;

  return (
    <AutoSaveForm action={saveSettings} className="admin-form settings-grid" autoSave={false}>
      <label>
        Pool name
        <input name="name" defaultValue={data.settings.name} required />
      </label>
      <label>
        Entry fee
        <input
          name="entryFee"
          type="number"
          min="0"
          step="1"
          defaultValue={data.settings.entryFee}
        />
      </label>
      <label>
        Admin Venmo
        <input
          name="adminVenmo"
          defaultValue={data.settings.adminVenmo ?? ""}
          placeholder="@your-handle"
        />
      </label>
      <label>
        Admin Zelle
        <input
          name="adminZelle"
          defaultValue={data.settings.adminZelle ?? ""}
          placeholder="email or phone"
        />
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
      <label className="checkbox-label checkbox-block">
        <input
          name="publicEntriesOpen"
          type="checkbox"
          defaultChecked={data.settings.publicEntriesOpen ?? false}
        />
        Allow public bracket entries
      </label>
      <button className="button button-primary" type="submit">
        Save settings
      </button>
    </AutoSaveForm>
  );
}

export function RoundAutoForm({ round }: { round: Round }) {
  return (
    <AutoSaveForm action={saveRound} className="admin-row-form">
      <input type="hidden" name="roundId" value={round.id} />
      <strong>{round.name}</strong>
      <span>
        {round.points} pts{round.scoreByAdvance ? " · scored on who advances" : " · per game"}
      </span>
      <label>
        Lock time
        <input
          name="lockAt"
          type="datetime-local"
          defaultValue={round.lockAt?.slice(0, 16) ?? ""}
        />
      </label>
      <label className="checkbox-label">
        <input name="isLocked" type="checkbox" defaultChecked={round.isLocked} />
        Locked
      </label>
      <button className="button button-secondary" type="submit">
        Save
      </button>
    </AutoSaveForm>
  );
}

export function MatchupAutoForm({ data, matchup }: { data: PoolData; matchup: Matchup }) {
  const teamA = getTeam(data, matchup.teamAId);
  const teamB = getTeam(data, matchup.teamBId);
  const choices = [teamA, teamB].filter(isTeam);
  // Before both feeders finish, let the admin pick from any team.
  const winnerOptions = choices.length === 2 ? choices : data.teams;

  return (
    <AutoSaveForm action={saveMatchup} className="admin-row-form matchup-form">
      <input type="hidden" name="matchupId" value={matchup.id} />
      <div className="matchup-teams">
        <strong>{teamA?.shortName ?? slotLabel(data, matchup.slotA)}</strong>
        <span>vs</span>
        <strong>{teamB?.shortName ?? slotLabel(data, matchup.slotB)}</strong>
      </div>
      <label>
        Winner
        <select name="winnerTeamId" defaultValue={matchup.winnerTeamId ?? ""}>
          <option value="">Unresolved</option>
          {winnerOptions.map((team) => (
            <option key={team.id} value={team.id}>
              {team.shortName}
            </option>
          ))}
        </select>
      </label>
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
    </AutoSaveForm>
  );
}

export function EntrantAutoForm({
  data,
  entrant,
}: {
  data: PoolData;
  entrant: Entrant;
}) {
  return (
    <AutoSaveForm action={saveEntrant} className="admin-form entrant-form" autoSave={false}>
      <input type="hidden" name="entrantId" value={entrant.id} />
      <h3>{entrant.name}</h3>
      <label>
        Name
        <input name="name" defaultValue={entrant.name} required />
      </label>
      <div className="two-col">
        <label>
          Venmo
          <input name="venmo" defaultValue={entrant.venmo ?? ""} placeholder="@handle" />
        </label>
        <label>
          Zelle
          <input name="zelle" defaultValue={entrant.zelle ?? ""} placeholder="email or phone" />
        </label>
      </div>
      <div className="two-col">
        <label>
          Tie-breaker runs
          <input
            name="tiebreakerRuns"
            type="number"
            min="0"
            defaultValue={entrant.tiebreakerRuns}
          />
        </label>
        <label className="checkbox-label checkbox-block">
          <input name="paid" type="checkbox" defaultChecked={entrant.paid} />
          Paid
        </label>
      </div>
      <label>
        Notes
        <textarea name="notes" rows={2} defaultValue={entrant.notes ?? ""} />
      </label>
      <BracketPicker
        teams={data.teams}
        matchups={data.matchups}
        rounds={data.rounds}
        initialPicks={entrant.picks}
      />
      <div className="form-actions">
        <button className="button button-primary" type="submit">
          Save entrant
        </button>
        <DeleteEntrantButton entrantId={entrant.id} entrantName={entrant.name} />
      </div>
    </AutoSaveForm>
  );
}

export function AddEntrantForm({ data }: { data: PoolData }) {
  return (
    <AutoSaveForm
      action={saveEntrant}
      className="admin-form entrant-form"
      autoSave={false}
      resetOnSave
    >
      <input type="hidden" name="entrantId" value="" />
      <h3>Add entrant</h3>
      <label>
        Name
        <input name="name" required />
      </label>
      <div className="two-col">
        <label>
          Venmo
          <input name="venmo" placeholder="@handle" />
        </label>
        <label>
          Zelle
          <input name="zelle" placeholder="email or phone" />
        </label>
      </div>
      <div className="two-col">
        <label>
          Tie-breaker runs
          <input name="tiebreakerRuns" type="number" min="0" defaultValue={0} />
        </label>
        <label className="checkbox-label checkbox-block">
          <input name="paid" type="checkbox" />
          Paid
        </label>
      </div>
      <label>
        Notes
        <textarea name="notes" rows={2} />
      </label>
      <BracketPicker teams={data.teams} matchups={data.matchups} rounds={data.rounds} />
      <div className="form-actions">
        <button className="button button-primary" type="submit">
          Add entrant
        </button>
      </div>
    </AutoSaveForm>
  );
}

function DeleteEntrantButton({
  entrantId,
  entrantName,
}: {
  entrantId: string;
  entrantName: string;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      className="button button-danger"
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!confirm(`Delete ${entrantName}? This cannot be undone.`)) return;
        const formData = new FormData();
        formData.set("entrantId", entrantId);
        startTransition(async () => {
          await deleteEntrant(formData);
        });
      }}
    >
      {isPending ? "Deleting..." : "Delete"}
    </button>
  );
}

function isTeam(team: Team | undefined): team is Team {
  return Boolean(team);
}
