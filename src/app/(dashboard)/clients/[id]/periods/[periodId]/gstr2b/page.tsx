// src/app/(dashboard)/clients/[id]/periods/[periodId]/gstr2b/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { db, filingPeriods } from "@/db";
import { eq } from "drizzle-orm";
import { getGstr2bInvoices } from "@/lib/actions/gstr2b";
import Gstr2bClient from "./Gstr2bClient";

export const dynamic = "force-dynamic";
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default async function Gstr2bPage({ params }: { params: Promise<{ id: string; periodId: string }> }) {
  const { id, periodId } = await params;
  const period = await db.query.filingPeriods.findFirst({
    where: eq(filingPeriods.id, periodId),
    with: { client: true },
  });
  if (!period || period.clientId !== id) notFound();
  const existing = await getGstr2bInvoices(periodId);
  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-zinc-400 px-8 pt-8">
        <Link href="/clients" className="hover:text-zinc-700 transition-colors">Clients</Link>
        <span>/</span>
        <Link href={`/clients/${id}`} className="hover:text-zinc-700 transition-colors">{period.client.name}</Link>
        <span>/</span>
        <Link href={`/clients/${id}/periods/${periodId}`} className="hover:text-zinc-700 transition-colors">{MONTHS[period.month-1]} {period.year}</Link>
        <span>/</span>
        <span className="text-zinc-700">GSTR-2B</span>
      </div>
      <Gstr2bClient
        filingPeriodId={periodId}
        clientId={id}
        periodLabel={`${MONTHS[period.month-1]} ${period.year} · ${period.client.name}`}
        existingCount={existing.length}
        existingFileName={period.gstr2bFileName}
        existingInvoices={existing}
      />
    </div>
  );
}