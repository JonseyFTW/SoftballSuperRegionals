import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { BracketBoard } from "@/components/bracket-board";
import { PublicEntryForm } from "@/components/public-entry-form";
import { getPoolData } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function EntryPage() {
  const data = await getPoolData();

  return (
    <div className="stack">
      <Link className="back-link" href="/">
        <ArrowLeft size={16} />
        Dashboard
      </Link>
      <section className="hero-panel entry-hero">
        <div>
          <p className="eyebrow">Public bracket entry</p>
          <h1>Make your picks</h1>
          <p>
            Complete both sides of the WCWS double-elimination bracket. Bracket finals are scored by
            the team that advances, not by each possible if-necessary game.
          </p>
        </div>
      </section>
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Bracket format</h2>
            <p>Opening winners, elimination games, bracket-final advancers, and champion.</p>
          </div>
        </div>
        <BracketBoard data={data} />
      </section>
      <PublicEntryForm data={data} />
    </div>
  );
}
