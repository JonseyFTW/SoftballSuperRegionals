import { RadioTower } from "lucide-react";
import { getFinalScoreText, getMatchupSnapshot } from "@/lib/game-status";
import { getTeam } from "@/lib/pool";
import type { Matchup, PoolData } from "@/lib/types";

export function GameCard({ data, matchup }: { data: PoolData; matchup: Matchup }) {
  const teamA = getTeam(data, matchup.teamAId);
  const teamB = getTeam(data, matchup.teamBId);
  const snapshot = getMatchupSnapshot(data, matchup);
  const topName = snapshot?.awayTeamName || teamA?.shortName || "TBD";
  const bottomName = snapshot?.homeTeamName || teamB?.shortName || "TBD";
  const topScore = snapshot ? snapshot.awayScore : "-";
  const bottomScore = snapshot ? snapshot.homeScore : "-";

  return (
    <article className="game-card">
      <div className="game-card-topline">
        <span>{snapshot?.seriesSummary || matchup.label}</span>
        <RadioTower size={15} />
      </div>
      <div className="scorebug">
        <div className="score-team">
          <span>{snapshot?.awayAbbreviation || teamA?.abbreviation || "AWAY"}</span>
          <strong>{topScore}</strong>
          <small>{topName}</small>
        </div>
        <div className="score-status">
          <b>{snapshot?.status || "No live feed"}</b>
          <span>
            {snapshot?.inningHalf ? `${snapshot.inningHalf} ${snapshot.inning ?? ""}` : "Series pick"}
          </span>
        </div>
        <div className="score-team score-team-home">
          <span>{snapshot?.homeAbbreviation || teamB?.abbreviation || "HOME"}</span>
          <strong>{bottomScore}</strong>
          <small>{bottomName}</small>
        </div>
      </div>
      <div className="base-diamond" data-testid="base-diamond" aria-label="Base runners">
        <span
          className={snapshot?.onSecond ? "base-marker occupied" : "base-marker"}
          data-base="second"
          aria-label={snapshot?.onSecond ? "Runner on second" : "Second base empty"}
        />
        <span
          className={snapshot?.onThird ? "base-marker occupied" : "base-marker"}
          data-base="third"
          aria-label={snapshot?.onThird ? "Runner on third" : "Third base empty"}
        />
        <span
          className={snapshot?.onFirst ? "base-marker occupied" : "base-marker"}
          data-base="first"
          aria-label={snapshot?.onFirst ? "Runner on first" : "First base empty"}
        />
      </div>
      <div className="count-row">
        <CountDots label="B" max={4} value={snapshot?.balls} testId="balls-count" />
        <CountDots label="S" max={3} value={snapshot?.strikes} testId="strikes-count" />
        <span>O {snapshot?.outs ?? "-"}</span>
      </div>
      <p className="muted compact">
        {snapshot?.batter
          ? `Batter: ${snapshot.batter}`
          : snapshot?.lastPlay || "Live ESPN feed"}
        {snapshot?.pitcher ? ` · Pitcher: ${snapshot.pitcher}` : ""}
      </p>
    </article>
  );
}

function CountDots({
  label,
  max,
  value,
  testId,
}: {
  label: string;
  max: number;
  value?: number;
  testId: string;
}) {
  const filledCount = typeof value === "number" ? Math.max(0, Math.min(value, max)) : 0;

  return (
    <span
      className="count-dots"
      data-count-type={label === "B" ? "balls" : "strikes"}
      data-testid={testId}
      aria-label={`${label} ${value ?? "-"}`}
    >
      <b>{label}</b>
      <span aria-hidden="true">
        {Array.from({ length: max }, (_, index) => (
          <span key={index} className={index < filledCount ? "count-dot filled" : "count-dot"} />
        ))}
      </span>
    </span>
  );
}

export function MatchupRow({ data, matchup }: { data: PoolData; matchup: Matchup }) {
  const teamA = getTeam(data, matchup.teamAId);
  const teamB = getTeam(data, matchup.teamBId);
  const snapshot = getMatchupSnapshot(data, matchup);
  const status = snapshot?.status || (matchup.espnGameId ? "Not live" : "No ESPN ID");
  const finalScore = getFinalScoreText(snapshot);

  return (
    <article className="matchup-row">
      <div>
        <strong>{matchup.label}</strong>
        <span>
          {[teamA?.abbreviation, teamB?.abbreviation].filter(Boolean).join(" vs ") || "TBD"}
        </span>
      </div>
      <div className="matchup-result">
        {finalScore ? <span className="matchup-score">{finalScore}</span> : null}
        <span className="matchup-status">{status}</span>
      </div>
    </article>
  );
}
