// src/app/(dashboard)/clients/[id]/periods/[periodId]/reconcile/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { db, filingPeriods, purchaseInvoices, gstr2bInvoices } from "@/db";
import { eq } from "drizzle-orm";
import ReconcileClient from "./ReconcileClient";

export const dynamic = "force-dynamic";
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default async function ReconcilePage({ params }: { params: Promise<{ id: string; periodId: string }> }) {
  const { id, periodId } = await params;
  const period = await db.query.filingPeriods.findFirst({
    where: eq(filingPeriods.id, periodId),
    with: { client: true },
  });
  if (!period || period.clientId !== id) notFound();
  const [purchases, gstr2b] = await Promise.all([
    db.query.purchaseInvoices.findMany({ where: eq(purchaseInvoices.filingPeriodId, periodId) }),
    db.query.gstr2bInvoices.findMany({ where: eq(gstr2bInvoices.filingPeriodId, periodId) }),
  ]);
  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-zinc-400 px-8 pt-8">
        <Link href="/clients" className="hover:text-zinc-700 transition-colors">Clients</Link>
        <span>/</span>
        <Link href={`/clients/${id}`} className="hover:text-zinc-700 transition-colors">{period.client.name}</Link>
        <span>/</span>
        <Link href={`/clients/${id}/periods/${periodId}`} className="hover:text-zinc-700 transition-colors">{MONTHS[period.month-1]} {period.year}</Link>
        <span>/</span>
        <span className="text-zinc-700">Reconcile</span>
      </div>
      <ReconcileClient
        filingPeriodId={periodId}
        clientId={id}
        periodLabel={`${MONTHS[period.month-1]} ${period.year} · ${period.client.name}`}
        purchases={purchases}
        gstr2b={gstr2b}
        periodStatus={period.status}
        savedCounts={{ matched: period.matchedCount ?? 0, partial: period.partialCount ?? 0, mismatch: period.mismatchCount ?? 0 }}
      />
    </div>
  );
}