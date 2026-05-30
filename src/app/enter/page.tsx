import Link from "next/link";
import { createPublicEntrant } from "@/app/actions";
import { BracketPicker } from "@/components/bracket-picker";
import { resolveBracket } from "@/lib/bracket";
import { getPoolData } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function EnterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const data = resolveBracket(await getPoolData());

  if (!data.settings.publicEntriesOpen) {
    return (
      <div className="stack">
        <section className="panel">
          <div className="section-heading">
            <div>
              <h1>Entries are closed</h1>
              <p>The pool admin has not opened public bracket entry yet.</p>
            </div>
          </div>
          <Link className="button button-secondary" href="/">
            Back to dashboard
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="stack">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">{data.settings.name}</p>
          <h1>Fill out your bracket</h1>
          <p>
            Pick a winner for every game on both sides. Your picks cascade — choose
            the winners&apos; side and the elimination side all the way to your champion.
            Points: 1 → 6 by round. The bracket final and championship score on who
            advances.
          </p>
        </div>
      </section>

      <section className="panel">
        {error === "name" ? (
          <p className="form-error">Please enter your name before submitting.</p>
        ) : null}
        <form action={createPublicEntrant} className="admin-form entrant-form">
          <div className="two-col">
            <label>
              Your name
              <input name="name" required placeholder="First Last" />
            </label>
            <label>
              Championship total runs (tie-breaker)
              <input name="tiebreakerRuns" type="number" min="0" defaultValue={0} />
            </label>
          </div>
          <div className="two-col">
            <label>
              Venmo (optional)
              <input name="venmo" placeholder="@handle" />
            </label>
            <label>
              Zelle (optional)
              <input name="zelle" placeholder="email or phone" />
            </label>
          </div>
          <BracketPicker teams={data.teams} matchups={data.matchups} rounds={data.rounds} />
          <div className="form-actions">
            <button className="button button-primary" type="submit">
              Submit my bracket
            </button>
            <Link className="button button-ghost" href="/">
              Cancel
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}
