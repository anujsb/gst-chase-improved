// src/app/(dashboard)/clients/[id]/periods/[periodId]/export/ExportClient.tsx
"use client";
import type { Gstr3bData } from "@/lib/actions/export";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

interface Props {
  filingPeriodId: string;
  clientId: string;
  periodLabel: string;
  gstr3bData: Gstr3bData | null;
}

export default function ExportClient({ filingPeriodId, clientId, periodLabel, gstr3bData }: Props) {
  if (!gstr3bData) {
    return (
      <div className="p-8">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-sm text-amber-800">
          <p className="font-medium mb-1">Reconciliation not completed</p>
          <p>Complete the reconciliation step before exporting GSTR-3B.</p>
          <a href={`/clients/${clientId}/periods/${filingPeriodId}/reconcile`}
            className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-amber-700 text-white text-xs font-medium rounded-lg hover:bg-amber-800 transition-colors">
            Go to Reconciliation →
          </a>
        </div>
      </div>
    );
  }

  const { period, table4, invoiceSummary } = gstr3bData;
  const netIgst  = table4.itcIgst  - table4.reversedIgst  - table4.ineligibleIgst;
  const netCgst  = table4.itcCgst  - table4.reversedCgst  - table4.ineligibleCgst;
  const netSgst  = table4.itcSgst  - table4.reversedSgst  - table4.ineligibleSgst;
  const netTotal = netIgst + netCgst + netSgst + table4.itcCess;
  const ml       = `${MONTHS[period.month-1]} ${period.year}`;

  function downloadExcel() {
    window.open(`/api/export/gstr3b?periodId=${filingPeriodId}`, "_blank");
  }

  function downloadJson() {
    const payload = {
      gstin:      period.gstin,
      fp:         `${String(period.month).padStart(2,"0")}${period.year}`,
      ret_period: ml,
      sup_details: {
        osup_det:      { txval:0, iamt:0, camt:0, samt:0, csamt:0 },
        osup_zero:     { txval:0, iamt:0, csamt:0 },
        osup_nil_exmp: { txval:0 },
        isup_rev:      { txval: gstr3bData.table3_1.inwardRcm, iamt:0, camt:0, samt:0, csamt:0 },
        osup_nongst:   { txval:0 },
      },
      itc_elg: {
        itc_avl: [
          { ty:"IMPG", iamt:0, camt:0, samt:0, csamt:0 },
          { ty:"IMPS", iamt:0, camt:0, samt:0, csamt:0 },
          { ty:"ISRC", iamt:0, camt:0, samt:0, csamt:0 },
          { ty:"ISD",  iamt:0, camt:0, samt:0, csamt:0 },
          { ty:"OTH",  iamt:table4.itcIgst, camt:table4.itcCgst, samt:table4.itcSgst, csamt:table4.itcCess },
        ],
        itc_rev: [
          { ty:"RUL", iamt:0, camt:0, samt:0, csamt:0 },
          { ty:"OTH", iamt:table4.reversedIgst, camt:table4.reversedCgst, samt:table4.reversedSgst, csamt:0 },
        ],
        itc_net:   { iamt:netIgst, camt:netCgst, samt:netSgst, csamt:table4.itcCess },
        itc_inelg: [
          { ty:"RUL", iamt:0, camt:0, samt:0, csamt:0 },
          { ty:"OTH", iamt:table4.ineligibleIgst, camt:table4.ineligibleCgst, samt:table4.ineligibleSgst, csamt:0 },
        ],
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type:"application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `GSTR3B_${period.gstin}_${MONTHS[period.month-1]}_${period.year}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900">Export GSTR-3B</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{periodLabel}</p>
      </div>

      {/* Taxpayer card */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 mb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Taxpayer Details</p>
          <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">Reconciled</span>
        </div>
        <p className="text-base font-semibold text-zinc-900">{period.clientName}</p>
        <p className="text-sm font-mono text-zinc-500 mt-0.5">{period.gstin}</p>
        <p className="text-sm text-zinc-500 mt-1">Period: {ml}</p>
      </div>

      {/* Table 4 */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden mb-5">
        <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50">
          <p className="text-sm font-semibold text-zinc-900">Table 4 — Input Tax Credit</p>
          <p className="text-xs text-zinc-500 mt-0.5">Pre-filled from GSTR-2B reconciliation · 4A(5), 4B(2), 4D(2)</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100">
              <th className="text-left px-6 py-2.5 text-xs font-medium text-zinc-500">Section</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-zinc-500">IGST</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-zinc-500">CGST</th>
              <th className="text-right px-6 py-2.5 text-xs font-medium text-zinc-500">SGST/UTGST</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            <tr className="bg-emerald-50/40">
              <td className="px-6 py-3">
                <p className="text-xs font-medium text-zinc-900">4A(5) ITC Available (Others)</p>
                <p className="text-[10px] text-zinc-400">Matched GSTR-2B entries</p>
              </td>
              <TC v={table4.itcIgst}/><TC v={table4.itcCgst}/><TC v={table4.itcSgst} right/>
            </tr>
            <tr className="bg-amber-50/40">
              <td className="px-6 py-3">
                <p className="text-xs font-medium text-zinc-900">4B(2) ITC Reversed (Others)</p>
                <p className="text-[10px] text-amber-600">Fill manually if applicable</p>
              </td>
              <TC v={0} muted/><TC v={0} muted/><TC v={0} muted right/>
            </tr>
            <tr className="bg-red-50/40">
              <td className="px-6 py-3">
                <p className="text-xs font-medium text-zinc-900">4D(2) Ineligible ITC</p>
                <p className="text-[10px] text-red-500">Blocked credits (ITC=N in 2B)</p>
              </td>
              <TC v={table4.ineligibleIgst} neg/><TC v={table4.ineligibleCgst} neg/><TC v={table4.ineligibleSgst} neg right/>
            </tr>
            <tr className="bg-zinc-50">
              <td className="px-6 py-3 text-xs font-semibold text-zinc-900">Net ITC (4A − 4B − 4D)</td>
              <TC v={netIgst} bold/><TC v={netCgst} bold/><TC v={netSgst} bold right/>
            </tr>
          </tbody>
        </table>
        <div className="px-6 py-4 border-t border-zinc-100 flex items-center justify-between">
          <p className="text-xs text-zinc-500">Total Net ITC (all tax heads)</p>
          <p className="text-lg font-semibold text-emerald-700 tabular-nums">
            ₹{netTotal.toLocaleString("en-IN",{minimumFractionDigits:2})}
          </p>
        </div>
      </div>

      {/* Reconciliation summary */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 mb-6">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Reconciliation Summary</p>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label:"Matched",    v:invoiceSummary.matched,    c:"text-emerald-600 bg-emerald-50" },
            { label:"Partial",    v:invoiceSummary.partial,    c:"text-amber-600 bg-amber-50" },
            { label:"Mismatched", v:invoiceSummary.mismatch,   c:"text-red-600 bg-red-50" },
            { label:"Missing 2B", v:invoiceSummary.missingIn2B,c:"text-red-600 bg-red-50" },
          ].map(s => (
            <div key={s.label} className={`text-center rounded-xl p-3 ${s.c.split(" ")[1]}`}>
              <p className={`text-xl font-semibold tabular-nums ${s.c.split(" ")[0]}`}>{s.v}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Download buttons */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button onClick={downloadExcel}
          className="flex items-center gap-3 p-5 bg-white border border-zinc-200 rounded-xl hover:border-zinc-300 hover:shadow-sm transition-all text-left">
          <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
            <svg width="16" height="16" fill="none" stroke="white" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-900">Download Excel (.xls)</p>
            <p className="text-xs text-zinc-500 mt-0.5">Colour-coded report · Opens in Excel</p>
          </div>
        </button>
        <button onClick={downloadJson}
          className="flex items-center gap-3 p-5 bg-white border border-zinc-200 rounded-xl hover:border-zinc-300 hover:shadow-sm transition-all text-left">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <svg width="16" height="16" fill="none" stroke="white" strokeWidth="1.5" viewBox="0 0 24 24">
              <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-900">Download JSON</p>
            <p className="text-xs text-zinc-500 mt-0.5">GSTN-compatible format · Upload to portal</p>
          </div>
        </button>
      </div>

      {/* Disclaimer */}
      <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
        <p className="font-medium mb-1">Before filing GSTR-3B on the portal</p>
        <ul className="space-y-0.5 text-amber-700 list-disc list-inside">
          <li>Table 3.1 (outward supplies) is NOT pre-filled — add your sales data manually on the portal</li>
          <li>Verify 4B reversals if any ITC needs to be reversed under Rule 42/43</li>
          <li>Reconcile all Partial and Mismatch entries before claiming ITC to avoid notices</li>
          <li>JSON format follows GSTN spec — verify on portal sandbox before live submission</li>
        </ul>
      </div>
    </div>
  );
}

function TC({ v, bold, neg, muted, right }: { v:number; bold?:boolean; neg?:boolean; muted?:boolean; right?:boolean }) {
  return (
    <td className={`${right?"px-6":"px-4"} py-3 text-right tabular-nums text-sm ${bold?"font-semibold text-zinc-900":neg?"text-red-600":muted?"text-zinc-400":"text-zinc-700"}`}>
      ₹{v.toLocaleString("en-IN",{minimumFractionDigits:2})}
    </td>
  );
}