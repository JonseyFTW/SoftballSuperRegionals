import { submitPublicEntry } from "@/app/actions";
import { getRound, getTeam } from "@/lib/pool";
import type { Matchup, PoolData, Team } from "@/lib/types";

const pickGroups = [
  { title: "Bracket 1", ids: ["game-1", "game-2", "game-5", "game-7", "game-9", "bracket-1-final"] },
  { title: "Bracket 2", ids: ["game-3", "game-4", "game-6", "game-8", "game-10", "bracket-2-final"] },
  { title: "WCWS Finals", ids: ["champion"] },
];

export function PublicEntryForm({ data }: { data: PoolData }) {
  return (
    <form action={submitPublicEntry} className="admin-form entrant-form public-entry-form">
      <h2>Your WCWS Bracket</h2>
      <p className="muted">
        Pick every game path through both double-elimination brackets, then choose your national champion.
      </p>
      <div className="two-col">
        <label>
          Name
          <input name="name" required placeholder="Your name" />
        </label>
        <label>
          Tie-breaker runs
          <input name="tiebreakerRuns" type="number" min="0" defaultValue={0} />
        </label>
      </div>
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
      <div className="visual-pick-grid">
        {pickGroups.map((group) => (
          <section key={group.title} className="visual-pick-section">
            <h3>{group.title}</h3>
            {group.ids.map((matchupId) => {
              const matchup = data.matchups.find((candidate) => candidate.id === matchupId);
              if (!matchup) return null;
              const round = getRound(data, matchup.roundId);
              return (
                <label key={matchup.id} className="visual-pick-card">
                  <span>
                    {round.points} pts <small>{matchup.id.replace("game-", "Game ")}</small>
                  </span>
                  <strong>{matchup.label}</strong>
                  <PickSelect data={data} matchup={matchup} name={`pick-${matchup.id}`} />
                </label>
              );
            })}
          </section>
        ))}
      </div>
      <button className="button button-primary" type="submit">
        Submit bracket
      </button>
    </form>
  );
}

function PickSelect({ data, matchup, name }: { data: PoolData; matchup: Matchup; name: string }) {
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
    <select name={name} required defaultValue="">
      <option value="" disabled>
        Select winner
      </option>
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
