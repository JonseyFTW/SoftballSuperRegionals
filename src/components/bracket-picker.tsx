"use client";

import { useMemo, useState } from "react";
import type { Matchup, Round, RoundId, Team, TeamSlot } from "@/lib/types";

type PickMap = Record<string, string>;

const ROUND_GROUPS: { title: string; rounds: RoundId[] }[] = [
  { title: "Winners' Bracket", rounds: ["wb-round1", "wb-final"] },
  { title: "Elimination Bracket", rounds: ["lb-round1", "lb-final"] },
  { title: "Advances to Finals", rounds: ["bracket-final"] },
];

export function BracketPicker({
  teams,
  matchups,
  rounds,
  initialPicks = {},
}: {
  teams: Team[];
  matchups: Matchup[];
  rounds: Round[];
  initialPicks?: PickMap;
}) {
  const ordered = useMemo(
    () => [...matchups].sort((a, b) => a.sortOrder - b.sortOrder),
    [matchups],
  );
  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const roundById = useMemo(() => new Map(rounds.map((round) => [round.id, round])), [rounds]);
  const [picks, setPicks] = useState<PickMap>(initialPicks);

  const participants = useMemo(() => computeParticipants(ordered, picks), [ordered, picks]);

  const choose = (matchupId: string, teamId: string) => {
    setPicks((current) => prune(ordered, { ...current, [matchupId]: teamId }));
  };

  const championPick = picks.championship;
  const madeCount = ordered.filter((matchup) => picks[matchup.id]).length;

  const slotName = (slot?: TeamSlot): string => {
    if (!slot) return "TBD";
    if (slot.type === "team") return teamById.get(slot.teamId)?.shortName ?? "TBD";
    const source = matchups.find((matchup) => matchup.id === slot.matchupId);
    const game = source?.gameLabel ?? "?";
    return slot.type === "winner" ? `Winner G${game}` : `Loser G${game}`;
  };

  return (
    <div className="bracket-picker">
      {Object.entries(picks).map(([matchupId, teamId]) => (
        <input key={matchupId} type="hidden" name={`pick-${matchupId}`} value={teamId} />
      ))}

      <div className="bracket-picker-status">
        <span>
          {madeCount}/{ordered.length} games picked
        </span>
        <strong>
          Champion: {championPick ? teamById.get(championPick)?.shortName ?? "—" : "Not set"}
        </strong>
      </div>

      <div className="bracket-pods">
        {(["bracket-1", "bracket-2"] as const).map((bracketId) => (
          <section key={bracketId} className="bracket-pod">
            <h4>{bracketId === "bracket-1" ? "Bracket 1" : "Bracket 2"}</h4>
            {ROUND_GROUPS.map((group) => {
              const games = ordered.filter(
                (matchup) =>
                  matchup.bracketId === bracketId && group.rounds.includes(matchup.roundId),
              );
              if (games.length === 0) return null;
              return (
                <div key={group.title} className="bracket-group">
                  <span className="bracket-group-title">{group.title}</span>
                  <div className="bracket-games">
                    {games.map((matchup) => (
                      <PickGame
                        key={matchup.id}
                        matchup={matchup}
                        round={roundById.get(matchup.roundId)}
                        teamAId={participants[matchup.id]?.teamAId}
                        teamBId={participants[matchup.id]?.teamBId}
                        pick={picks[matchup.id]}
                        teamById={teamById}
                        slotName={slotName}
                        onPick={choose}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        ))}
      </div>

      {ordered
        .filter((matchup) => matchup.roundId === "championship")
        .map((matchup) => (
          <div key={matchup.id} className="bracket-group bracket-finals">
            <span className="bracket-group-title">Championship Finals · Best of 3</span>
            <div className="bracket-games">
              <PickGame
                matchup={matchup}
                round={roundById.get(matchup.roundId)}
                teamAId={participants[matchup.id]?.teamAId}
                teamBId={participants[matchup.id]?.teamBId}
                pick={picks[matchup.id]}
                teamById={teamById}
                slotName={slotName}
                onPick={choose}
              />
            </div>
          </div>
        ))}
    </div>
  );
}

function PickGame({
  matchup,
  round,
  teamAId,
  teamBId,
  pick,
  teamById,
  slotName,
  onPick,
}: {
  matchup: Matchup;
  round?: Round;
  teamAId?: string;
  teamBId?: string;
  pick?: string;
  teamById: Map<string, Team>;
  slotName: (slot?: TeamSlot) => string;
  onPick: (matchupId: string, teamId: string) => void;
}) {
  const points = round?.points ?? 0;
  const heading = round?.scoreByAdvance
    ? matchup.roundId === "championship"
      ? "Champion"
      : "Who advances"
    : `Game ${matchup.gameLabel}`;

  return (
    <article className="picker-game">
      <header>
        <span>{heading}</span>
        <b className="bracket-points">
          {points} pt{points === 1 ? "" : "s"}
        </b>
      </header>
      <PickButton
        matchupId={matchup.id}
        teamId={teamAId}
        label={teamById.get(teamAId ?? "")?.shortName ?? slotName(matchup.slotA)}
        seed={teamById.get(teamAId ?? "")?.seed}
        selected={Boolean(teamAId && pick === teamAId)}
        onPick={onPick}
      />
      <PickButton
        matchupId={matchup.id}
        teamId={teamBId}
        label={teamById.get(teamBId ?? "")?.shortName ?? slotName(matchup.slotB)}
        seed={teamById.get(teamBId ?? "")?.seed}
        selected={Boolean(teamBId && pick === teamBId)}
        onPick={onPick}
      />
    </article>
  );
}

function PickButton({
  matchupId,
  teamId,
  label,
  seed,
  selected,
  onPick,
}: {
  matchupId: string;
  teamId?: string;
  label: string;
  seed?: string;
  selected: boolean;
  onPick: (matchupId: string, teamId: string) => void;
}) {
  return (
    <button
      type="button"
      className={selected ? "picker-team selected" : "picker-team"}
      disabled={!teamId}
      aria-pressed={selected}
      onClick={() => teamId && onPick(matchupId, teamId)}
    >
      <span className="bracket-seed">{seed ?? ""}</span>
      <span className="bracket-team-name">{label}</span>
    </button>
  );
}

function computeParticipants(
  ordered: Matchup[],
  picks: PickMap,
): Record<string, { teamAId?: string; teamBId?: string }> {
  const result: Record<string, { teamAId?: string; teamBId?: string }> = {};
  const byId = new Map(ordered.map((matchup) => [matchup.id, matchup]));

  const slotTeam = (slot?: TeamSlot, fallback?: string): string | undefined => {
    if (!slot) return fallback;
    if (slot.type === "team") return slot.teamId;
    const source = byId.get(slot.matchupId);
    if (!source) return fallback;
    const winner = picks[source.id];
    if (slot.type === "winner") return winner;
    if (!winner) return undefined;
    const a = result[source.id]?.teamAId;
    const b = result[source.id]?.teamBId;
    return [a, b].find((id) => id && id !== winner);
  };

  for (const matchup of ordered) {
    result[matchup.id] = {
      teamAId: slotTeam(matchup.slotA, matchup.teamAId),
      teamBId: slotTeam(matchup.slotB, matchup.teamBId),
    };
  }

  return result;
}

/** Drop any pick that is no longer one of its game's two participants. */
function prune(ordered: Matchup[], picks: PickMap): PickMap {
  let next = picks;
  for (let i = 0; i < ordered.length; i += 1) {
    const participants = computeParticipants(ordered, next);
    const cleaned: PickMap = {};
    let changed = false;
    for (const matchup of ordered) {
      const pick = next[matchup.id];
      const { teamAId, teamBId } = participants[matchup.id] ?? {};
      if (pick && (pick === teamAId || pick === teamBId)) {
        cleaned[matchup.id] = pick;
      } else if (pick) {
        changed = true;
      }
    }
    next = cleaned;
    if (!changed) break;
  }
  return next;
}
