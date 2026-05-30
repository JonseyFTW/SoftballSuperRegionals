import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminEntrantBracketForm } from "@/components/admin-forms";
import { BracketBoard } from "@/components/bracket-board";
import { requireAdmin } from "@/lib/auth";
import { getPoolData } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminEntrantPicksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const data = await getPoolData();
  const entrant = data.entrants.find((candidate) => candidate.id === id);
  if (!entrant) notFound();

  return (
    <div className="stack">
      <Link className="back-link" href="/admin">
        <ArrowLeft size={16} />
        Admin portal
      </Link>
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Visual pick editor</p>
            <h1>{entrant.name}</h1>
            <p>
              Use the grouped bracket cards below to set every pick without scrolling through one long list.
            </p>
          </div>
        </div>
        <BracketBoard data={data} entrant={entrant} />
      </section>
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Edit picks</h2>
            <p>Selections are grouped by bracket side and finals to match the WCWS sheet.</p>
          </div>
        </div>
        <AdminEntrantBracketForm data={data} entrant={entrant} />
      </section>
    </div>
  );
}
