// src/app/(dashboard)/clients/[id]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { getClientById } from "@/lib/actions/clients";
import { GST_STATES } from "@/lib/validators";
import NewPeriodButton from "./NewPeriodButton";

export const dynamic = "force-dynamic";

const MONTHS  = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const FMONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default async function ClientPage({ params }: { params: { id: string } }) {
  const client = await getClientById(params.id);
  if (!client) notFound();

  return (
    <div className="p-8">
      <div className="flex items-center gap-2 text-sm text-zinc-400 mb-6">
        <Link href="/clients" className="hover:text-zinc-700 transition-colors">Clients</Link>
        <span>/</span>
        <span className="text-zinc-700">{client.name}</span>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center shrink-0">
            <span className="text-lg font-semibold text-white">{client.name.charAt(0)}</span>
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-zinc-900">{client.name}</h1>
            {client.tradeName && <p className="text-sm text-zinc-500">{client.tradeName}</p>}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-50 border border-zinc-200 font-mono text-xs text-zinc-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />{client.gstin}
              </span>
              {client.stateCode && GST_STATES[client.stateCode] && (
                <span className="text-xs text-zinc-500">{GST_STATES[client.stateCode]}</span>
              )}
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-500 capitalize">
                {client.registrationType?.replace("_", " ")}
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-zinc-100">
          {[
            { label: "Phone",    value: client.phone          ? `+91 ${client.phone}`          : "—" },
            { label: "WhatsApp", value: client.whatsappNumber ? `+91 ${client.whatsappNumber}` : "—" },
            { label: "Email",    value: client.email ?? "—" },
          ].map((c) => (
            <div key={c.label}>
              <p className="text-xs text-zinc-400 mb-0.5">{c.label}</p>
              <p className="text-sm text-zinc-700 truncate">{c.value}</p>
            </div>
          ))}
        </div>
        {client.notes && (
          <div className="mt-4 pt-4 border-t border-zinc-100">
            <p className="text-xs text-zinc-400 mb-0.5">Notes</p>
            <p className="text-sm text-zinc-600">{client.notes}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">Filing Periods</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Monthly GSTR filings</p>
        </div>
        <NewPeriodButton clientId={client.id} />
      </div>

      {client.filingPeriods.length === 0 ? (
        <div className="bg-white border border-dashed border-zinc-300 rounded-xl p-10 text-center">
          <p className="text-sm text-zinc-500">No filing periods yet.</p>
          <p className="text-xs text-zinc-400 mt-1">Create a period to start uploading invoices.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {client.filingPeriods.map((fp) => (
            <Link key={fp.id} href={`/clients/${params.id}/periods/${fp.id}`}
              className="group flex items-center gap-5 bg-white border border-zinc-200 rounded-xl px-6 py-4 hover:border-zinc-300 hover:shadow-sm transition-all">
              <div className="w-20 shrink-0">
                <p className="text-sm font-semibold text-zinc-900">{MONTHS[fp.month - 1]} {fp.year}</p>
                <p className="text-xs text-zinc-400">{FMONTHS[fp.month - 1]}</p>
              </div>
              <span className={`text-xs w-24 ${
                fp.status === "filed"       ? "text-emerald-600" :
                fp.status === "in_progress" ? "text-amber-600"   :
                fp.status === "reconciled"  ? "text-blue-600"    : "text-zinc-400"
              }`}>
                {fp.status.replace("_", " ")}
              </span>
              <div className="flex-1 flex items-center gap-4 text-xs">
                <span><span className="font-semibold text-zinc-700 tabular-nums">{fp.totalInvoicesInBooks ?? 0}</span> <span className="text-zinc-400">invoices</span></span>
                <span><span className="font-semibold text-zinc-700 tabular-nums">{fp.totalInvoicesIn2B ?? 0}</span> <span className="text-zinc-400">in 2B</span></span>
                {(fp.matchedCount  ?? 0) > 0 && <span><span className="font-semibold text-emerald-600 tabular-nums">{fp.matchedCount}</span>  <span className="text-zinc-400">matched</span></span>}
                {(fp.mismatchCount ?? 0) > 0 && <span><span className="font-semibold text-red-500 tabular-nums">{fp.mismatchCount}</span> <span className="text-zinc-400">issues</span></span>}
              </div>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"
                className="text-zinc-300 group-hover:text-zinc-500 transition-colors shrink-0">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}