import { CheckCircle2, Circle } from "lucide-react";
import { getRound, getTeam } from "@/lib/pool";
import type { Entrant, PoolData } from "@/lib/types";

export function PickList({ data, entrant }: { data: PoolData; entrant: Entrant }) {
  return (
    <div className="pick-list">
      {data.matchups
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((matchup) => {
          const pick = getTeam(data, entrant.picks[matchup.id]);
          const winner = getTeam(data, matchup.winnerTeamId);
          const isCorrect = pick && winner && pick.id === winner.id;
          const isWrong = pick && winner && pick.id !== winner.id;
          const round = getRound(data, matchup.roundId);

          return (
            <div key={matchup.id} className="pick-row">
              <div className={isCorrect ? "pick-status correct" : isWrong ? "pick-status wrong" : "pick-status"}>
                {isCorrect ? <CheckCircle2 size={18} /> : <Circle size={18} />}
              </div>
              <div>
                <strong>{matchup.label}</strong>
                <span>
                  {round.name} · {round.points} pts
                </span>
              </div>
              <b>{pick?.shortName ?? "No pick"}</b>
            </div>
          );
        })}
    </div>
  );
}
