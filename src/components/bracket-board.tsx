import { CheckCircle2, Circle, Trophy } from "lucide-react";
import {
  getFinalScoreText,
  getGameWinnerTeamId,
  getMatchupSnapshot,
  getSeriesWinnerTeamId,
} from "@/lib/game-status";
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

type SlotSource = {
  matchupId: string;
  outcome: "winner" | "loser";
  fallback: string;
};

type Slot = {
  team?: Team;
  fallback: string;
  score?: number;
};

const slotSources: Record<string, [SlotSource, SlotSource]> = {
  "game-5": [
    { matchupId: "game-1", outcome: "loser", fallback: "Loser Game 1" },
    { matchupId: "game-2", outcome: "loser", fallback: "Loser Game 2" },
  ],
  "game-6": [
    { matchupId: "game-3", outcome: "loser", fallback: "Loser Game 3" },
    { matchupId: "game-4", outcome: "loser", fallback: "Loser Game 4" },
  ],
  "game-7": [
    { matchupId: "game-1", outcome: "winner", fallback: "Winner Game 1" },
    { matchupId: "game-2", outcome: "winner", fallback: "Winner Game 2" },
  ],
  "game-8": [
    { matchupId: "game-3", outcome: "winner", fallback: "Winner Game 3" },
    { matchupId: "game-4", outcome: "winner", fallback: "Winner Game 4" },
  ],
  "game-9": [
    { matchupId: "game-5", outcome: "winner", fallback: "Winner Game 5" },
    { matchupId: "game-8", outcome: "loser", fallback: "Loser Game 8" },
  ],
  "game-10": [
    { matchupId: "game-6", outcome: "winner", fallback: "Winner Game 6" },
    { matchupId: "game-7", outcome: "loser", fallback: "Loser Game 7" },
  ],
  "bracket-1-final": [
    { matchupId: "game-7", outcome: "winner", fallback: "Winner Game 7" },
    { matchupId: "game-9", outcome: "winner", fallback: "Winner Game 9" },
  ],
  "bracket-2-final": [
    { matchupId: "game-8", outcome: "winner", fallback: "Winner Game 8" },
    { matchupId: "game-10", outcome: "winner", fallback: "Winner Game 10" },
  ],
  champion: [
    { matchupId: "bracket-1-final", outcome: "winner", fallback: "Bracket 1 Winner" },
    { matchupId: "bracket-2-final", outcome: "winner", fallback: "Bracket 2 Winner" },
  ],
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
  const matchup = getMatchup(data, matchupId);
  if (!matchup) return null;
  const round = getRound(data, matchup.roundId);
  const winnerTeamId = getResolvedWinnerTeamId(data, matchup);
  const winner = getTeam(data, winnerTeamId);
  const pick = entrant ? getTeam(data, entrant.picks[matchup.id]) : undefined;
  const slots = getDisplaySlots(data, matchup);
  const isCorrect = Boolean(entrant && pick && winner && pick.id === winner.id);
  const isWrong = Boolean(entrant && pick && winner && pick.id !== winner.id);
  const scoreText = getFinalScoreText(getMatchupSnapshot(data, matchup));

  return (
    <article className={`bracket-matchup${compact ? " compact" : ""}${isCorrect ? " correct" : ""}${isWrong ? " wrong" : ""}`}>
      <header>
        <span>{round.points} pts</span>
        <small>{labelFor(matchup)}</small>
      </header>
      <div className="bracket-team-stack">
        {entrant ? (
          <TeamLine
            team={pick}
            fallback="No pick"
            champion={matchup.id === "champion"}
            isWinner={Boolean(pick && winner && pick.id === winner.id)}
          />
        ) : (
          slots.map((slot, index) => (
            <TeamLine
              key={`${matchup.id}-${slot.team?.id ?? slot.fallback}-${index}`}
              team={slot.team}
              fallback={slot.fallback}
              score={slot.score}
              champion={matchup.id === "champion" && Boolean(slot.team)}
              isWinner={Boolean(slot.team && winnerTeamId === slot.team.id)}
            />
          ))
        )}
      </div>
      {scoreText ? <p className="bracket-scoreline">{scoreText}</p> : null}
      {entrant ? (
        <div className="pick-outcome">
          {isCorrect ? <CheckCircle2 size={15} /> : <Circle size={15} />}
          <span>{winner ? (isCorrect ? "Correct" : isWrong ? "Incorrect" : "No result") : "Pending"}</span>
        </div>
      ) : null}
    </article>
  );
}

function TeamLine({
  team,
  fallback = "TBD",
  champion = false,
  score,
  isWinner = false,
}: {
  team?: Team;
  fallback?: string;
  champion?: boolean;
  score?: number;
  isWinner?: boolean;
}) {
  return (
    <div className={`bracket-team-line${isWinner ? " winner" : ""}`}>
      {champion ? <Trophy size={15} /> : <span className="team-seed">{team?.seed || ""}</span>}
      <strong>{team?.shortName ?? fallback}</strong>
      {typeof score === "number" ? <b>{score}</b> : null}
    </div>
  );
}

function getDisplaySlots(data: PoolData, matchup: Matchup): Slot[] {
  const explicitTeams = [getTeam(data, matchup.teamAId), getTeam(data, matchup.teamBId)];
  const explicitSlots = explicitTeams
    .filter((team): team is Team => Boolean(team))
    .map((team) => ({ team, fallback: team.shortName, score: getScoreForTeam(data, matchup, team) }));
  if (explicitSlots.length > 0) return padSlots(explicitSlots, matchup);

  const sources = slotSources[matchup.id];
  if (!sources) return [{ fallback: "TBD" }, { fallback: "TBD" }];

  return sources.map((source) => {
    const teamId = getSourceTeamId(data, source);
    const team = getTeam(data, teamId);
    return { team, fallback: team?.shortName ?? source.fallback };
  });
}

function padSlots(slots: Slot[], matchup: Matchup): Slot[] {
  if (slots.length >= 2 || matchup.id === "champion") return slots;
  return [...slots, { fallback: "TBD" }];
}

function getSourceTeamId(data: PoolData, source: SlotSource): string | undefined {
  const matchup = getMatchup(data, source.matchupId);
  if (!matchup) return undefined;
  const winnerTeamId = getResolvedWinnerTeamId(data, matchup);
  if (source.outcome === "winner") return winnerTeamId;
  if (!winnerTeamId) return undefined;
  return getDisplaySlots(data, matchup)
    .map((slot) => slot.team?.id)
    .find((teamId) => teamId && teamId !== winnerTeamId);
}

function getResolvedWinnerTeamId(data: PoolData, matchup: Matchup): string | undefined {
  return (
    matchup.winnerTeamId ??
    (matchup.roundId === "super-regionals" ||
      matchup.roundId === "bracket-finals" ||
      matchup.roundId === "champion"
      ? getSeriesWinnerTeamId(data, matchup)
      : getGameWinnerTeamId(data, matchup))
  );
}

function getScoreForTeam(data: PoolData, matchup: Matchup, team: Team): number | undefined {
  const snapshot = getMatchupSnapshot(data, matchup);
  if (!snapshot) return undefined;
  if (snapshotTeamMatches(team, snapshot.awayTeamName, snapshot.awayAbbreviation)) {
    return snapshot.awayScore;
  }
  if (snapshotTeamMatches(team, snapshot.homeTeamName, snapshot.homeAbbreviation)) {
    return snapshot.homeScore;
  }
  return undefined;
}

function snapshotTeamMatches(team: Team, ...names: (string | undefined)[]): boolean {
  return [team.name, team.shortName, team.abbreviation].some((teamName) =>
    names.some((name) => namesMatch(teamName, name)),
  );
}

function getMatchup(data: PoolData, matchupId: string): Matchup | undefined {
  return data.matchups.find((candidate) => candidate.id === matchupId);
}

function labelFor(matchup: Matchup): string {
  if (matchup.id === "bracket-1-final") return "Games 11/12";
  if (matchup.id === "bracket-2-final") return "Games 13/14";
  if (matchup.id === "champion") return "Champion";
  return matchup.id.replace("game-", "Game ");
}

function namesMatch(a?: string, b?: string): boolean {
  const left = normalizeName(a);
  const right = normalizeName(b);
  if (!left || !right) return false;
  if (left === right) return true;

  const leftTokens = tokenizeName(a);
  const rightTokens = tokenizeName(b);
  if (leftTokens.length > 1 || rightTokens.length > 1) {
    const shorter = left.length <= right.length ? left : right;
    const longer = left.length > right.length ? left : right;
    return shorter.length >= 8 && longer.includes(shorter);
  }

  return false;
}

function tokenizeName(value?: string): string[] {
  return value?.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

function normalizeName(value?: string): string {
  return value?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
}
