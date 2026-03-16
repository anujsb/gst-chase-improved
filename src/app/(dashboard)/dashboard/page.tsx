// src/app/(dashboard)/dashboard/page.tsx
import Link from "next/link";
import { getAllClients } from "@/lib/actions/clients";

export const dynamic = "force-dynamic";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default async function DashboardPage() {
  const clients = await getAllClients();
  const now = new Date();

  const stats = {
    total:      clients.length,
    pending:    clients.filter((c) => !c.filingPeriods[0] || c.filingPeriods[0].status === "pending").length,
    inProgress: clients.filter((c) => c.filingPeriods[0]?.status === "in_progress").length,
    filed:      clients.filter((c) => c.filingPeriods[0]?.status === "filed").length,
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {MONTHS[now.getMonth()]} {now.getFullYear()} · GST Filing Period
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Clients",  value: stats.total,      color: "text-zinc-900" },
          { label: "Pending",        value: stats.pending,    color: "text-amber-600" },
          { label: "In Progress",    value: stats.inProgress, color: "text-blue-600" },
          { label: "Filed",          value: stats.filed,      color: "text-emerald-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-zinc-200 rounded-xl p-5">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`text-2xl font-semibold tabular-nums ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <Link href="/clients/new" className="group flex items-center gap-4 p-5 bg-white border border-zinc-200 rounded-xl hover:border-zinc-300 hover:shadow-sm transition-all">
          <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0">
            <svg width="16" height="16" fill="none" stroke="white" strokeWidth="1.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-900">Add New Client</p>
            <p className="text-xs text-zinc-500 mt-0.5">Register a GST client</p>
          </div>
        </Link>
        <Link href="/clients" className="group flex items-center gap-4 p-5 bg-white border border-zinc-200 rounded-xl hover:border-zinc-300 hover:shadow-sm transition-all">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <svg width="16" height="16" fill="none" stroke="white" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-900">All Clients</p>
            <p className="text-xs text-zinc-500 mt-0.5">View and manage filings</p>
          </div>
        </Link>
      </div>

      {clients.length === 0 ? (
        <div className="bg-white border border-dashed border-zinc-300 rounded-xl p-16 text-center">
          <p className="text-sm text-zinc-500 mb-3">No clients yet.</p>
          <Link href="/clients/new" className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white text-sm rounded-lg hover:bg-zinc-800 transition-colors">
            Add your first client
          </Link>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-900">Recent Clients</h2>
            <Link href="/clients" className="text-xs text-blue-600 hover:text-blue-700">View all →</Link>
          </div>
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  {["Client","GSTIN","Latest Period","Status",""].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {clients.slice(0, 8).map((c) => {
                  const fp = c.filingPeriods[0];
                  return (
                    <tr key={c.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-zinc-900">{c.name}</td>
                      <td className="px-5 py-3.5 font-mono text-xs text-zinc-500">{c.gstin}</td>
                      <td className="px-5 py-3.5 text-zinc-600">{fp ? `${MONTHS[fp.month-1]} ${fp.year}` : "—"}</td>
                      <td className="px-5 py-3.5">
                        {fp ? (
                          <span className={`inline-flex items-center gap-1.5 text-xs ${
                            fp.status==="filed"?"text-emerald-600":fp.status==="in_progress"?"text-amber-600":fp.status==="reconciled"?"text-blue-600":"text-zinc-400"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${fp.status==="filed"?"bg-emerald-400":fp.status==="in_progress"?"bg-amber-400":fp.status==="reconciled"?"bg-blue-400":"bg-zinc-300"}`}/>
                            {fp.status.replace("_"," ")}
                          </span>
                        ) : <span className="text-zinc-300 text-xs">No filings</span>}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link href={`/clients/${c.id}`} className="text-xs text-blue-600 hover:text-blue-700">Open →</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}