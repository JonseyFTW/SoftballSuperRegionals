"use client";

import Link from "next/link";
import { useTransition } from "react";
import {
  deleteEntrant,
  saveEntrant,
  saveMatchup,
  saveRound,
  saveSettings,
} from "@/app/actions";
import { AutoSaveForm } from "@/components/auto-save-form";
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
      <span>{round.points} pts</span>
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
  const matchupTeams = [getTeam(data, matchup.teamAId), getTeam(data, matchup.teamBId)].filter(isTeam);
  const wcwsTeamIds = new Set([
    "texas-tech",
    "mississippi-state",
    "tennessee",
    "texas",
    "alabama",
    "ucla",
    "arkansas",
    "nebraska",
  ]);
  const wcwsTeams = data.teams.filter((team) => wcwsTeamIds.has(team.id));
  const winnerChoices = matchupTeams.length > 0 ? matchupTeams : wcwsTeams;
  return (
    <AutoSaveForm action={saveMatchup} className="admin-row-form matchup-form">
      <input type="hidden" name="matchupId" value={matchup.id} />
      <label>
        Label
        <input name="label" defaultValue={matchup.label} />
      </label>
      <TeamSelect
        data={data}
        name="teamAId"
        defaultValue={matchup.teamAId}
        blankLabel="Team A"
      />
      <TeamSelect
        data={data}
        name="teamBId"
        defaultValue={matchup.teamBId}
        blankLabel="Team B"
      />
      <label>
        Winner
        <select name="winnerTeamId" defaultValue={matchup.winnerTeamId ?? ""}>
          <option value="">Unresolved</option>
          {winnerChoices.map((team) => (
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
    <AutoSaveForm action={saveEntrant} className="admin-form entrant-form">
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
      <PickEditorGrid data={data} picks={entrant.picks} />
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
      <PickEditorGrid data={data} />
      <div className="form-actions">
        <button className="button button-primary" type="submit">
          Add entrant
        </button>
      </div>
    </AutoSaveForm>
  );
}


export function AdminEntrantBracketForm({
  data,
  entrant,
}: {
  data: PoolData;
  entrant: Entrant;
}) {
  return (
    <AutoSaveForm action={saveEntrant} className="admin-form visual-pick-form" autoSave={false}>
      <input type="hidden" name="entrantId" value={entrant.id} />
      <div className="two-col">
        <label>
          Name
          <input name="name" defaultValue={entrant.name} required />
        </label>
        <label>
          Tie-breaker runs
          <input
            name="tiebreakerRuns"
            type="number"
            min="0"
            defaultValue={entrant.tiebreakerRuns}
          />
        </label>
      </div>
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
          Notes
          <textarea name="notes" rows={2} defaultValue={entrant.notes ?? ""} />
        </label>
        <label className="checkbox-label checkbox-block">
          <input name="paid" type="checkbox" defaultChecked={entrant.paid} />
          Paid
        </label>
      </div>
      <PickEditorGrid data={data} picks={entrant.picks} />
      <div className="form-actions">
        <button className="button button-primary" type="submit">
          Save bracket picks
        </button>
        <Link className="button button-secondary" href="/admin">
          Back to admin
        </Link>
        <DeleteEntrantButton entrantId={entrant.id} entrantName={entrant.name} />
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


function PickEditorGrid({ data, picks = {} }: { data: PoolData; picks?: Record<string, string> }) {
  const groups = [
    { title: "Bracket 1", ids: ["game-1", "game-2", "game-5", "game-7", "game-9", "bracket-1-final"] },
    { title: "Bracket 2", ids: ["game-3", "game-4", "game-6", "game-8", "game-10", "bracket-2-final"] },
    { title: "WCWS Finals", ids: ["champion"] },
  ];

  return (
    <div className="visual-pick-grid">
      {groups.map((group) => (
        <section key={group.title} className="visual-pick-section">
          <h3>{group.title}</h3>
          {group.ids.map((matchupId) => {
            const matchup = data.matchups.find((candidate) => candidate.id === matchupId);
            if (!matchup) return null;
            const round = data.rounds.find((candidate) => candidate.id === matchup.roundId);
            return (
              <label key={matchup.id} className="visual-pick-card">
                <span>
                  {round?.points ?? 0} pts <small>{matchup.id.replace("game-", "Game ")}</small>
                </span>
                <strong>{matchup.label}</strong>
                <PickSelect
                  data={data}
                  matchup={matchup}
                  name={`pick-${matchup.id}`}
                  defaultValue={picks[matchup.id]}
                />
              </label>
            );
          })}
        </section>
      ))}
    </div>
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
  const wcwsTeamIds = new Set([
    "texas-tech",
    "mississippi-state",
    "tennessee",
    "texas",
    "alabama",
    "ucla",
    "arkansas",
    "nebraska",
  ]);
  const wcwsTeams = data.teams.filter((team) => wcwsTeamIds.has(team.id));
  const choices = matchupTeams.length > 0 ? matchupTeams : wcwsTeams;

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
