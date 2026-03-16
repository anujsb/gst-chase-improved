// src/app/(dashboard)/dashboard/page.tsx

import Link from "next/link";
import { getAllClients } from "@/lib/actions/clients";

export const dynamic = "force-dynamic";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default async function DashboardPage() {
  const clients = await getAllClients();

  const totalClients = clients.length;
  const pendingFilings = clients.filter((c) => c.filingPeriods[0]?.status === "pending").length;
  const activeFilings = clients.filter((c) => c.filingPeriods[0]?.status === "in_progress").length;
  const filedThisMonth = clients.filter((c) => c.filingPeriods[0]?.status === "filed").length;

  const now = new Date();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">{MONTHS[now.getMonth()]} {now.getFullYear()} · GST Filing Period</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Clients", value: totalClients, accent: "default" },
          { label: "Pending", value: pendingFilings, accent: "amber" },
          { label: "In Progress", value: activeFilings, accent: "blue" },
          { label: "Filed", value: filedThisMonth, accent: "green" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-zinc-200 rounded-xl p-5">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`text-2xl font-semibold tabular-nums ${
              s.accent === "amber" ? "text-amber-600" :
              s.accent === "blue" ? "text-blue-600" :
              s.accent === "green" ? "text-emerald-600" : "text-zinc-900"
            }`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Link href="/clients/new" className="group flex items-center gap-4 p-5 bg-white border border-zinc-200 rounded-xl hover:border-zinc-300 hover:shadow-sm transition-all">
          <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0">
            <svg width="16" height="16" fill="none" stroke="white" strokeWidth="1.5" viewBox="0 0 24 24">
              <circle cx="12" cy="8" r="4"/><path d="M4 20v-1a8 8 0 0 1 16 0v1"/>
              <line x1="12" y1="2" x2="12" y2="6"/><line x1="10" y1="4" x2="14" y2="4"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-900">Add New Client</p>
            <p className="text-xs text-zinc-500 mt-0.5">Register a new GST client</p>
          </div>
        </Link>
        <Link href="/clients" className="group flex items-center gap-4 p-5 bg-white border border-zinc-200 rounded-xl hover:border-zinc-300 hover:shadow-sm transition-all">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <svg width="16" height="16" fill="none" stroke="white" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-900">View All Clients</p>
            <p className="text-xs text-zinc-500 mt-0.5">Manage filings</p>
          </div>
        </Link>
      </div>

      {/* Recent clients */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-900">Recent Clients</h2>
          <Link href="/clients" className="text-xs text-blue-600 hover:text-blue-700">View all →</Link>
        </div>

        {clients.length === 0 ? (
          <div className="bg-white border border-dashed border-zinc-300 rounded-xl p-12 text-center">
            <p className="text-sm text-zinc-500 mb-3">No clients yet.</p>
            <Link href="/clients/new" className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white text-sm rounded-lg hover:bg-zinc-800 transition-colors">
              Add your first client
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Client</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">GSTIN</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Latest Period</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {clients.slice(0, 8).map((client) => {
                  const latest = client.filingPeriods[0];
                  return (
                    <tr key={client.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-zinc-900">{client.name}</td>
                      <td className="px-5 py-3.5 font-mono text-xs text-zinc-600">{client.gstin}</td>
                      <td className="px-5 py-3.5 text-zinc-600">
                        {latest ? `${MONTHS[latest.month - 1]} ${latest.year}` : <span className="text-zinc-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        {latest ? (
                          <span className={`inline-flex items-center gap-1.5 text-xs ${
                            latest.status === "filed" ? "text-emerald-600" :
                            latest.status === "in_progress" ? "text-amber-600" :
                            latest.status === "reconciled" ? "text-blue-600" : "text-zinc-400"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              latest.status === "filed" ? "bg-emerald-400" :
                              latest.status === "in_progress" ? "bg-amber-400" :
                              latest.status === "reconciled" ? "bg-blue-400" : "bg-zinc-300"
                            }`} />
                            {latest.status.replace("_", " ")}
                          </span>
                        ) : <span className="text-zinc-300 text-xs">No filings</span>}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link href={`/clients/${client.id}`} className="text-xs text-blue-600 hover:text-blue-700">Open →</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}