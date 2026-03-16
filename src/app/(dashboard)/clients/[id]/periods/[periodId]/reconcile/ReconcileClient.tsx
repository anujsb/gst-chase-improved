// src/app/(dashboard)/clients/[id]/periods/[periodId]/reconcile/ReconcileClient.tsx
"use client";
import { useState, useTransition } from "react";
import { runReconciliation } from "@/lib/actions/gstr2b";
import { reconcile, type ReconciliationSummary, type ReconciliationResult } from "@/lib/reconciliation";
import type { PurchaseInvoice, Gstr2bInvoice } from "@/db/schema";

type Filter = "all" | "matched" | "partial" | "mismatch" | "missing_in_2b" | "missing_in_books";

interface Props {
  filingPeriodId: string;
  clientId: string;
  periodLabel: string;
  purchases: PurchaseInvoice[];
  gstr2b: Gstr2bInvoice[];
  periodStatus: string;
  savedCounts: { matched: number; partial: number; mismatch: number };
}

export default function ReconcileClient({ filingPeriodId, clientId, periodLabel, purchases, gstr2b, periodStatus, savedCounts }: Props) {
  const [isPending, startTransition] = useTransition();
  // Run reconciliation immediately in client if data is available
  const initialSummary = purchases.length > 0 && gstr2b.length > 0 ? reconcile(purchases, gstr2b) : null;
  const [summary, setSummary] = useState<ReconciliationSummary | null>(initialSummary);
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(periodStatus === "reconciled" || periodStatus === "filed");

  const notReady = purchases.length === 0 || gstr2b.length === 0;

  function rerun() {
    if (notReady) return;
    setSummary(reconcile(purchases, gstr2b));
    setSaved(false);
  }

  function save() {
    if (!summary) return;
    setError(null);
    startTransition(async () => {
      const res = await runReconciliation(filingPeriodId, clientId);
      if ("error" in res && res.error) { setError(res.error); return; }
      setSaved(true);
    });
  }

  const filtered = (summary?.results ?? []).filter(r => filter === "all" || r.status === filter);

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Reconciliation</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{periodLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          {summary && (
            <button onClick={rerun} className="text-xs text-zinc-500 hover:text-zinc-900 border border-zinc-200 hover:border-zinc-300 px-3 py-1.5 rounded-lg transition-colors">
              Re-run
            </button>
          )}
          {summary && !saved && (
            <button onClick={save} disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              {isPending ? "Saving…" : "Save & Confirm →"}
            </button>
          )}
          {saved && (
            <a href={`/clients/${clientId}/periods/${filingPeriodId}/export`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors">
              Export GSTR-3B →
            </a>
          )}
        </div>
      </div>

      {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

      {notReady && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-1">
          {purchases.length === 0 && (
            <p className="text-sm text-amber-800">⚠ No purchase invoices uploaded. <a href={`/clients/${clientId}/periods/${filingPeriodId}/invoices`} className="underline font-medium">Upload invoices</a></p>
          )}
          {gstr2b.length === 0 && (
            <p className="text-sm text-amber-800">⚠ No GSTR-2B data uploaded. <a href={`/clients/${clientId}/periods/${filingPeriodId}/gstr2b`} className="underline font-medium">Upload GSTR-2B</a></p>
          )}
        </div>
      )}

      {summary && (
        <>
          {/* Summary filter chips */}
          <div className="grid grid-cols-6 gap-2 mb-6">
            {([
              { key:"all",             label:"All",            count: summary.results.length,     bg:"bg-white",         text:"text-zinc-900",   border:"border-zinc-200" },
              { key:"matched",         label:"✓ Matched",      count: summary.matched,             bg:"bg-emerald-50",    text:"text-emerald-700",border:"border-emerald-200" },
              { key:"partial",         label:"~ Partial",      count: summary.partial,             bg:"bg-amber-50",      text:"text-amber-700",  border:"border-amber-200" },
              { key:"mismatch",        label:"✗ Mismatch",     count: summary.mismatch,            bg:"bg-red-50",        text:"text-red-700",    border:"border-red-200" },
              { key:"missing_in_2b",   label:"✗ Not in 2B",   count: summary.missingIn2B,         bg:"bg-red-50",        text:"text-red-700",    border:"border-red-200" },
              { key:"missing_in_books",label:"? Not in Books", count: summary.missingInBooks,      bg:"bg-orange-50",     text:"text-orange-700", border:"border-orange-200" },
            ] as const).map(chip => (
              <button key={chip.key} onClick={() => setFilter(chip.key as Filter)}
                className={`text-center p-3 border rounded-xl transition-all ${chip.bg} ${chip.border} ${filter===chip.key?"ring-2 ring-zinc-400 ring-offset-1":""}`}>
                <p className={`text-xl font-semibold tabular-nums ${chip.text}`}>{chip.count}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5 font-medium">{chip.label}</p>
              </button>
            ))}
          </div>

          {/* ITC box */}
          <div className="bg-white border border-zinc-200 rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">ITC Available (matched entries only)</p>
              <p className="text-sm font-semibold text-emerald-700 tabular-nums">
                Total ₹{summary.totalItcAvailable.toLocaleString("en-IN",{minimumFractionDigits:2})}
              </p>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label:"IGST", value: summary.itcIgst },
                { label:"CGST", value: summary.itcCgst },
                { label:"SGST/UTGST", value: summary.itcSgst },
                { label:"Cess", value: summary.itcCess },
              ].map(it => (
                <div key={it.label} className="bg-zinc-50 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-zinc-500 mb-0.5">{it.label}</p>
                  <p className="text-sm font-semibold text-zinc-900 tabular-nums">₹{it.value.toLocaleString("en-IN",{minimumFractionDigits:2})}</p>
                </div>
              ))}
            </div>
            {saved && (
              <p className="text-xs text-emerald-600 mt-3 pt-3 border-t border-zinc-100">
                ✓ Saved — these figures will pre-fill your GSTR-3B export.
              </p>
            )}
          </div>

          {/* Results */}
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              {filter==="all" ? "All results" : filter.replace(/_/g," ")} — {filtered.length}
            </p>
          </div>

          <div className="space-y-2">
            {filtered.map((result, idx) => {
              const key = result.purchaseInvoiceId ?? result.gstr2bInvoiceId ?? String(idx);
              return (
                <ResultRow
                  key={key}
                  result={result}
                  expanded={expanded === key}
                  onToggle={() => setExpanded(expanded === key ? null : key)}
                />
              );
            })}
            {filtered.length === 0 && (
              <p className="text-center text-sm text-zinc-400 py-8">No results for this filter.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Result Row ────────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  matched:          { bg:"bg-emerald-50", border:"border-emerald-200", dot:"bg-emerald-400", label:"Matched",          text:"text-emerald-700" },
  partial:          { bg:"bg-amber-50",   border:"border-amber-200",   dot:"bg-amber-400",   label:"Partial match",    text:"text-amber-700" },
  mismatch:         { bg:"bg-red-50",     border:"border-red-200",     dot:"bg-red-500",     label:"Mismatch",         text:"text-red-700" },
  missing_in_2b:    { bg:"bg-red-50",     border:"border-red-200",     dot:"bg-red-500",     label:"Not in GSTR-2B",   text:"text-red-700" },
  missing_in_books: { bg:"bg-orange-50",  border:"border-orange-200",  dot:"bg-orange-400",  label:"Not in books",     text:"text-orange-700" },
} as const;

function ResultRow({ result, expanded, onToggle }: { result: ReconciliationResult; expanded: boolean; onToggle: () => void }) {
  const s = STATUS_STYLE[result.status];
  const invNo    = result.purchase?.invoiceNumber ?? result.gstr2b?.invoiceNumber ?? "—";
  const supplier = result.purchase?.supplierName  ?? result.gstr2b?.supplierName  ?? "—";
  const gstin    = result.purchase?.supplierGstin ?? result.gstr2b?.supplierGstin ?? "—";
  const date     = result.purchase?.invoiceDate   ?? result.gstr2b?.invoiceDate   ?? "—";
  const total    = Number(result.purchase?.totalAmount ?? result.gstr2b?.totalAmount ?? 0);

  return (
    <div className={`border rounded-xl overflow-hidden ${s.border}`}>
      <button onClick={onToggle}
        className={`w-full flex items-center gap-4 px-5 py-3.5 text-left ${s.bg} hover:brightness-[0.97] transition-all`}>
        <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
        <div className="flex-1 grid grid-cols-4 gap-4 items-center min-w-0">
          <div className="min-w-0">
            <p className="text-xs font-mono text-zinc-700 truncate">{invNo}</p>
            <p className="text-[10px] text-zinc-400">{date}</p>
          </div>
          <div className="col-span-2 min-w-0">
            <p className="text-xs text-zinc-700 truncate">{supplier}</p>
            <p className="text-[10px] font-mono text-zinc-400 truncate">{gstin}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-zinc-900 tabular-nums">₹{total.toLocaleString("en-IN")}</p>
            {(result.taxableDiff ?? 0) > 2 && (
              <p className="text-[10px] text-red-500">Δ ₹{result.taxableDiff!.toFixed(2)}</p>
            )}
          </div>
        </div>
        <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border ${s.text} ${s.bg} ${s.border}`}>
          {s.label}
        </span>
        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"
          className={`shrink-0 text-zinc-400 transition-transform ${expanded?"rotate-180":""}`}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {expanded && (
        <div className="px-5 py-4 bg-white border-t border-zinc-100">
          <div className="grid grid-cols-2 gap-6 mb-4">
            <Side title="Your Books" inv={result.purchase} type="purchase" />
            <Side title="GSTR-2B"    inv={result.gstr2b}   type="gstr2b" />
          </div>
          {result.issues.length > 0 && (
            <div className="mt-3 pt-3 border-t border-zinc-100">
              <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wider mb-2">Issues Found</p>
              <ul className="space-y-1.5">
                {result.issues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-zinc-700">
                    <span className="text-red-400 shrink-0 mt-0.5">✗</span>{issue}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.suggestions.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider mb-2">Action Required</p>
              <ul className="space-y-1.5">
                {result.suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-zinc-600">
                    <span className="text-blue-400 shrink-0 mt-0.5">→</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Side({ title, inv, type }: { title: string; inv: PurchaseInvoice | Gstr2bInvoice | undefined; type: "purchase" | "gstr2b" }) {
  if (!inv) return (
    <div>
      <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">{title}</p>
      <p className="text-xs text-zinc-400 italic">Not found</p>
    </div>
  );
  const rows = [
    ["Invoice No.", inv.invoiceNumber],
    ["Date",        inv.invoiceDate],
    ["GSTIN",       inv.supplierGstin],
    ["Taxable",     `₹${Number(inv.taxableAmount).toLocaleString("en-IN")}`],
    ["IGST",        `₹${Number(inv.igst??0).toLocaleString("en-IN")}`],
    ["CGST",        `₹${Number(inv.cgst??0).toLocaleString("en-IN")}`],
    ["SGST",        `₹${Number(inv.sgst??0).toLocaleString("en-IN")}`],
    ["Total",       `₹${Number(inv.totalAmount).toLocaleString("en-IN")}`],
    ...(type==="gstr2b" ? [["ITC", (inv as Gstr2bInvoice).itcAvailable ?? "Y"]] : []),
    ...((inv.isRcm) ? [["RCM","Yes"]] : []),
  ];
  return (
    <div>
      <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">{title}</p>
      <div className="space-y-1">
        {rows.map(([l,v]) => (
          <div key={l} className="flex items-center justify-between gap-2 text-xs">
            <span className="text-zinc-400 shrink-0">{l}</span>
            <span className={`text-zinc-700 truncate ${l==="Invoice No."||l==="GSTIN"?"font-mono":""} ${l==="Total"?"font-semibold text-zinc-900":""}`}>{v||"—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}