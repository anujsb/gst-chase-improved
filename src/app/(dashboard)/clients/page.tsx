// src/app/(dashboard)/clients/page.tsx

import Link from "next/link";
import { getAllClients } from "@/lib/actions/clients";

export const dynamic = "force-dynamic";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default async function ClientsPage() {
  const clients = await getAllClients();

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Clients</h1>
          <p className="text-sm text-zinc-500 mt-1">{clients.length} registered client{clients.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/clients/new" className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Client
        </Link>
      </div>

      {clients.length === 0 ? (
        <div className="bg-white border border-dashed border-zinc-300 rounded-xl p-16 text-center">
          <p className="text-sm font-medium text-zinc-700 mb-1">No clients yet</p>
          <p className="text-xs text-zinc-400 mb-4">Add your first client to start managing their GST filings.</p>
          <Link href="/clients/new" className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white text-sm rounded-lg hover:bg-zinc-800 transition-colors">
            Add your first client
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {clients.map((client) => {
            const latest = client.filingPeriods[0];
            return (
              <Link
                key={client.id}
                href={`/clients/${client.id}`}
                className="group flex items-center gap-5 bg-white border border-zinc-200 rounded-xl px-6 py-4 hover:border-zinc-300 hover:shadow-sm transition-all"
              >
                <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                  <span className="text-sm font-semibold text-zinc-600">{client.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-zinc-900 truncate">{client.name}</p>
                  {client.tradeName && <p className="text-xs text-zinc-400 truncate">{client.tradeName}</p>}
                </div>
                <span className="hidden md:block font-mono text-xs text-zinc-500 bg-zinc-50 border border-zinc-200 px-2 py-1 rounded-md">{client.gstin}</span>
                <span className="text-sm text-zinc-500 min-w-[72px]">
                  {latest ? `${MONTHS[latest.month - 1]} ${latest.year}` : <span className="text-zinc-300">—</span>}
                </span>
                <span className={`text-xs min-w-[90px] ${
                  latest?.status === "filed" ? "text-emerald-600" :
                  latest?.status === "in_progress" ? "text-amber-600" :
                  latest?.status === "reconciled" ? "text-blue-600" :
                  latest?.status === "pending" ? "text-zinc-500" : "text-zinc-300"
                }`}>
                  {latest?.status?.replace("_", " ") ?? "No filings"}
                </span>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-zinc-300 group-hover:text-zinc-500 transition-colors shrink-0">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}