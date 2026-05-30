import { CheckCircle2, Circle, Trophy } from "lucide-react";
import { getSeriesWinnerTeamId } from "@/lib/game-status";
import { getRound, getTeam } from "@/lib/pool";
import type { Entrant, Matchup, PoolData, Team } from "@/lib/types";

const bracketOne = {
  title: "Bracket 1",
  opening: ["game-1", "game-2"],
  elimination: "game-5",
  winners: "game-7",
  eliminationSecond: "game-9",
  final: "bracket-1-final",
};

const bracketTwo = {
  title: "Bracket 2",
  opening: ["game-3", "game-4"],
  elimination: "game-6",
  winners: "game-8",
  eliminationSecond: "game-10",
  final: "bracket-2-final",
};

export function BracketBoard({ data, entrant }: { data: PoolData; entrant?: Entrant }) {
  return (
    <div className="wcws-bracket" aria-label={entrant ? `${entrant.name} bracket picks` : "WCWS bracket"}>
      <div className="bracket-title">
        <strong>Women&apos;s College World Series</strong>
        <span>Double elimination · bracket finalists advance to best of 3</span>
      </div>
      <div className="bracket-scroll">
        <section className="bracket-side" aria-label="Bracket 1">
          <BracketHalf data={data} entrant={entrant} config={bracketOne} />
        </section>
        <section className="bracket-side" aria-label="Bracket 2">
          <BracketHalf data={data} entrant={entrant} config={bracketTwo} />
        </section>
        <section className="finals-column" aria-label="WCWS Finals">
          <div className="finals-card">
            <div>
              <span className="bracket-label">WCWS Finals</span>
              <strong>Best of 3</strong>
            </div>
            <div className="finals-lines">
              <span>Game 1</span>
              <span>Game 2</span>
              <span>Game 3 · if necessary</span>
            </div>
            <MatchupBox data={data} entrant={entrant} matchupId="champion" compact />
          </div>
        </section>
      </div>
    </div>
  );
}

function BracketHalf({
  data,
  entrant,
  config,
}: {
  data: PoolData;
  entrant?: Entrant;
  config: typeof bracketOne;
}) {
  return (
    <div className="bracket-half">
      <h3>{config.title}</h3>
      <div className="bracket-stage stage-opening">
        <span className="bracket-label">Winners&apos; Bracket</span>
        {config.opening.map((matchupId) => (
          <MatchupBox key={matchupId} data={data} entrant={entrant} matchupId={matchupId} />
        ))}
      </div>
      <div className="bracket-stage stage-elimination-first">
        <span className="bracket-label">Elimination Bracket</span>
        <MatchupBox data={data} entrant={entrant} matchupId={config.elimination} />
      </div>
      <div className="bracket-stage stage-winners-second">
        <MatchupBox data={data} entrant={entrant} matchupId={config.winners} />
      </div>
      <div className="bracket-stage stage-elimination-second">
        <MatchupBox data={data} entrant={entrant} matchupId={config.eliminationSecond} />
      </div>
      <div className="bracket-stage stage-bracket-final">
        <MatchupBox data={data} entrant={entrant} matchupId={config.final} />
        <div className="if-note">If necessary game is not scored separately.</div>
      </div>
    </div>
  );
}

function MatchupBox({
  data,
  entrant,
  matchupId,
  compact = false,
}: {
  data: PoolData;
  entrant?: Entrant;
  matchupId: string;
  compact?: boolean;
}) {
  const matchup = data.matchups.find((candidate) => candidate.id === matchupId);
  if (!matchup) return null;
  const round = getRound(data, matchup.roundId);
  const winner = getTeam(data, matchup.winnerTeamId ?? getSeriesWinnerTeamId(data, matchup));
  const pick = entrant ? getTeam(data, entrant.picks[matchup.id]) : undefined;
  const selected = pick ?? winner;
  const isCorrect = Boolean(entrant && pick && winner && pick.id === winner.id);
  const isWrong = Boolean(entrant && pick && winner && pick.id !== winner.id);
  const matchupTeams = [getTeam(data, matchup.teamAId), getTeam(data, matchup.teamBId)].filter(isTeam);

  return (
    <article className={`bracket-matchup${compact ? " compact" : ""}${isCorrect ? " correct" : ""}${isWrong ? " wrong" : ""}`}>
      <header>
        <span>{round.points} pts</span>
        <small>{labelFor(matchup)}</small>
      </header>
      {entrant || winner || matchupTeams.length === 0 ? (
        <TeamLine team={selected} fallback={entrant ? "No pick" : "TBD"} champion={matchup.id === "champion"} />
      ) : (
        matchupTeams.map((team) => <TeamLine key={team.id} team={team} />)
      )}
      {entrant ? (
        <div className="pick-outcome">
          {isCorrect ? <CheckCircle2 size={15} /> : <Circle size={15} />}
          <span>{winner ? (isCorrect ? "Correct" : isWrong ? "Incorrect" : "No result") : "Pending"}</span>
        </div>
      ) : null}
    </article>
  );
}

function TeamLine({ team, fallback = "TBD", champion = false }: { team?: Team; fallback?: string; champion?: boolean }) {
  return (
    <div className="bracket-team-line">
      {champion ? <Trophy size={15} /> : <span className="team-seed">{team?.seed || ""}</span>}
      <strong>{team?.shortName ?? fallback}</strong>
    </div>
  );
}

function labelFor(matchup: Matchup): string {
  if (matchup.id === "bracket-1-final") return "Games 11/12";
  if (matchup.id === "bracket-2-final") return "Games 13/14";
  if (matchup.id === "champion") return "Champion";
  return matchup.id.replace("game-", "Game ");
}

function isTeam(team: Team | undefined): team is Team {
  return Boolean(team);
}
