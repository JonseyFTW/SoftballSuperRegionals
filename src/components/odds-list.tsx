import type { ScenarioOdd } from "@/lib/types";

export function OddsList({ odds }: { odds: ScenarioOdd[] }) {
  if (odds.length === 0) {
    return <p className="muted">No entrants yet.</p>;
  }

  return (
    <div className="odds-list">
      {odds.map((odd) => (
        <div key={odd.entrantId} className="odds-row">
          <div>
            <strong>{odd.name}</strong>
            <span>{odd.scenarios} scenarios</span>
          </div>
          <div className="odds-bars">
            <span style={{ width: `${Math.max(odd.firstPlacePercent, 4)}%` }} />
          </div>
          <small>
            {odd.firstPlacePercent}% solo · {odd.tiedFirstPercent}% tie
          </small>
        </div>
      ))}
    </div>
  );
}
