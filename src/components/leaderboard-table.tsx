import Link from "next/link";
import type { LeaderboardEntry } from "@/lib/types";

export function LeaderboardTable({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <div className="table-wrap">
      <table className="leaderboard-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Entrant</th>
            <th>Pts</th>
            <th>Left</th>
            <th>Max</th>
            <th>Paid</th>
            <th>TB</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr key={entry.entrantId}>
              <td>{index + 1}</td>
              <td>
                <Link href={`/entrants/${entry.entrantId}`}>{entry.name}</Link>
              </td>
              <td>{entry.points}</td>
              <td>{entry.possiblePointsLeft}</td>
              <td>{entry.maxPoints}</td>
              <td>
                <span className={entry.paid ? "pill pill-paid" : "pill pill-unpaid"}>
                  {entry.paid ? "Paid" : "Unpaid"}
                </span>
              </td>
              <td>{entry.tiebreakerRuns}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
