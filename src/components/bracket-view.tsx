import { Check } from "lucide-react";
import { getFinalScoreText, getMatchupSnapshot, isLiveSnapshot } from "@/lib/game-status";
import { getRound, getTeam } from "@/lib/pool";
import type { Entrant, Matchup, PoolData, RoundId, TeamSlot } from "@/lib/types";

const BRACKET_TITLES: Record<string, string> = {
  "bracket-1": "Bracket 1",
  "bracket-2": "Bracket 2",
};

const ROUND_GROUPS: { title: string; rounds: RoundId[] }[] = [
  { title: "Winners' Bracket", rounds: ["wb-round1", "wb-final"] },
  { title: "Elimination Bracket", rounds: ["lb-round1", "lb-final"] },
  { title: "Advances to Finals", rounds: ["bracket-final"] },
];

export function BracketView({
  data,
  entrant,
}: {
  data: PoolData;
  entrant?: Entrant;
}) {
  const championship = data.matchups.find((matchup) => matchup.roundId === "championship");

  return (
    <div className="bracket-view">
      <div className="bracket-pods">
        {(["bracket-1", "bracket-2"] as const).map((bracketId) => (
          <section key={bracketId} className="bracket-pod">
            <h3>{BRACKET_TITLES[bracketId]}</h3>
            {ROUND_GROUPS.map((group) => {
              const games = data.matchups
                .filter(
                  (matchup) =>
                    matchup.bracketId === bracketId && group.rounds.includes(matchup.roundId),
                )
                .sort((a, b) => a.sortOrder - b.sortOrder);
              if (games.length === 0) return null;
              return (
                <div key={group.title} className="bracket-group">
                  <span className="bracket-group-title">{group.title}</span>
                  <div className="bracket-games">
                    {games.map((matchup) => (
                      <GameNode key={matchup.id} data={data} matchup={matchup} entrant={entrant} />
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        ))}
      </div>

      {championship ? (
        <div className="bracket-group bracket-finals">
          <span className="bracket-group-title">Championship Finals · Best of 3</span>
          <div className="bracket-games">
            <GameNode data={data} matchup={championship} entrant={entrant} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function GameNode({
  data,
  matchup,
  entrant,
}: {
  data: PoolData;
  matchup: Matchup;
  entrant?: Entrant;
}) {
  const round = getRound(data, matchup.roundId);
  const winnerId = matchup.winnerTeamId;
  const pickId = entrant?.picks[matchup.id];
  const snapshot = getMatchupSnapshot(data, matchup);
  const finalScore = getFinalScoreText(snapshot);
  const live = isLiveSnapshot(snapshot);

  const correct = entrant && winnerId && pickId === winnerId;
  const wrong = entrant && winnerId && pickId && pickId !== winnerId;
  const className = ["bracket-game", correct ? "is-correct" : "", wrong ? "is-wrong" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={className}>
      <header>
        <span>
          {round.scoreByAdvance ? "Advances" : `Game ${matchup.gameLabel}`}
          {live ? <em className="bracket-live"> · LIVE</em> : null}
        </span>
        <b className="bracket-points">{round.points} pt{round.points === 1 ? "" : "s"}</b>
      </header>
      <TeamLine
        data={data}
        teamId={matchup.teamAId}
        slot={matchup.slotA}
        winnerId={winnerId}
        pickId={pickId}
      />
      <TeamLine
        data={data}
        teamId={matchup.teamBId}
        slot={matchup.slotB}
        winnerId={winnerId}
        pickId={pickId}
      />
      <footer>
        {entrant ? (
          <span className={correct ? "tag tag-correct" : wrong ? "tag tag-wrong" : "tag"}>
            Pick: {getTeam(data, pickId)?.shortName ?? "—"}
            {correct ? ` · +${round.points}` : ""}
          </span>
        ) : null}
        {finalScore ? <span className="bracket-score">{finalScore}</span> : null}
      </footer>
    </article>
  );
}

function TeamLine({
  data,
  teamId,
  slot,
  winnerId,
  pickId,
}: {
  data: PoolData;
  teamId?: string;
  slot?: TeamSlot;
  winnerId?: string;
  pickId?: string;
}) {
  const team = getTeam(data, teamId);
  const isWinner = Boolean(team && winnerId && team.id === winnerId);
  const isPick = Boolean(team && pickId && team.id === pickId);
  const className = ["bracket-team", isWinner ? "winner" : "", isPick ? "picked" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className}>
      <span className="bracket-seed">{team?.seed ?? ""}</span>
      <span className="bracket-team-name">{team?.shortName ?? slotLabel(data, slot)}</span>
      {isWinner ? <Check size={15} aria-label="Winner" /> : null}
    </div>
  );
}

export function slotLabel(data: PoolData, slot?: TeamSlot): string {
  if (!slot) return "TBD";
  if (slot.type === "team") return getTeam(data, slot.teamId)?.shortName ?? "TBD";
  const source = data.matchups.find((matchup) => matchup.id === slot.matchupId);
  const game = source?.gameLabel ?? "?";
  return slot.type === "winner" ? `Winner G${game}` : `Loser G${game}`;
}
