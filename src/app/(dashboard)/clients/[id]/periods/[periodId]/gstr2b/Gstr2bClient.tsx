// src/app/(dashboard)/clients/[id]/periods/[periodId]/gstr2b/Gstr2bClient.tsx
"use client";
import { useRef, useState, useTransition } from "react";
import { uploadGstr2b, getGstr2bInvoices } from "@/lib/actions/gstr2b";
import type { Gstr2bInvoice } from "@/db/schema";

interface Props {
  filingPeriodId: string;
  clientId: string;
  periodLabel: string;
  existingCount: number;
  existingFileName: string | null;
  existingInvoices: Gstr2bInvoice[];
}

// Fix: declare XLSX type properly to avoid TS2352
declare global {
  interface Window {
    XLSX?: {
      read: (data: ArrayBuffer, opts: object) => { SheetNames: string[]; Sheets: Record<string, unknown> };
      utils: { sheet_to_json: (sheet: unknown, opts: object) => Record<string, string>[] };
    };
  }
}

export default function Gstr2bClient({ filingPeriodId, clientId, periodLabel, existingCount, existingFileName, existingInvoices }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Gstr2bInvoice[]>(existingInvoices);
  const [uploadedFile, setUploadedFile] = useState<string | null>(existingFileName);

  async function handleFile(file: File) {
    setError(null);
    const isJson  = file.type === "application/json" || file.name.endsWith(".json");
    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
    if (!isJson && !isExcel) { setError("Please upload a .json or .xlsx/.xls file"); return; }

    startTransition(async () => {
      let content: string;
      if (isJson) {
        content = await file.text();
      } else {
        try { content = await parseExcel(file); }
        catch (e) { setError(`Excel parse error: ${e instanceof Error ? e.message : "Unknown"}. Try uploading the JSON version instead.`); return; }
      }

      const res = await uploadGstr2b(filingPeriodId, clientId, {
        name: file.name,
        type: isJson ? "application/json" : "application/vnd.ms-excel",
        content,
      });

      if ("error" in res && res.error) {
        setError(res.error);
      } else if ("success" in res && res.success) {
        setUploadedFile(file.name);
        const updated = await getGstr2bInvoices(filingPeriodId);
        setInvoices(updated);
      }
    });
  }

  // Fix: remove useCallback to avoid exhaustive-deps / memoization warning
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  const bySupplier = invoices.reduce<Record<string, { name: string | null; count: number; taxable: number; tax: number; itcN: number }>>((acc, inv) => {
    const k = inv.supplierGstin;
    if (!acc[k]) acc[k] = { name: inv.supplierName, count: 0, taxable: 0, tax: 0, itcN: 0 };
    acc[k].count++;
    acc[k].taxable += Number(inv.taxableAmount ?? 0);
    acc[k].tax     += Number(inv.igst ?? 0) + Number(inv.cgst ?? 0) + Number(inv.sgst ?? 0);
    if (inv.itcAvailable === "N") acc[k].itcN++;
    return acc;
  }, {});

  const totTaxable = invoices.reduce((s, i) => s + Number(i.taxableAmount ?? 0), 0);
  const totTax     = invoices.reduce((s, i) => s + Number(i.igst ?? 0) + Number(i.cgst ?? 0) + Number(i.sgst ?? 0), 0);

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900">GSTR-2B Upload</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{periodLabel}</p>
      </div>

      <div className="mb-6 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-start gap-2">
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="mt-0.5 shrink-0">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <div>
          <p className="font-medium mb-0.5">How to download GSTR-2B</p>
          <p className="text-blue-700">Login to gst.gov.in → Returns → View Returns/Forms → GSTR-2B → Select period → Download JSON or Excel. Available from 14th of the following month.</p>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors mb-6 ${
          dragging ? "border-zinc-400 bg-zinc-50" : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".json,.xlsx,.xls"
          aria-label="Upload GSTR-2B file"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        {isPending ? (
          <div className="flex flex-col items-center gap-3">
            <svg className="animate-spin w-8 h-8 text-zinc-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <p className="text-sm text-zinc-500">Parsing GSTR-2B data…</p>
          </div>
        ) : invoices.length > 0 ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-emerald-600"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <p className="text-sm font-medium text-zinc-900">{invoices.length} invoices loaded</p>
            <p className="text-xs text-zinc-400">{uploadedFile} · Click to replace</p>
          </div>
        ) : (
          <>
            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center mx-auto mb-3">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-zinc-500">
                <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-zinc-700 mb-1">Drop GSTR-2B JSON or Excel here</p>
            <p className="text-xs text-zinc-400">.json (official portal) or .xlsx (Excel export)</p>
          </>
        )}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {invoices.length > 0 && (
        <>
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { label: "Suppliers", value: Object.keys(bySupplier).length },
              { label: "Invoices",  value: invoices.length },
              { label: "Taxable",   value: `₹${totTaxable.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` },
              { label: "Total Tax", value: `₹${totTax.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-zinc-200 rounded-xl p-4 text-center">
                <p className="text-xs text-zinc-500 mb-1">{s.label}</p>
                <p className="text-lg font-semibold text-zinc-900 tabular-nums">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="mb-6">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">By Supplier</p>
            <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50">
                    <th className="text-left px-4 py-2.5 text-zinc-500 font-medium">GSTIN</th>
                    <th className="text-left px-4 py-2.5 text-zinc-500 font-medium">Name</th>
                    <th className="text-right px-4 py-2.5 text-zinc-500 font-medium">Invoices</th>
                    <th className="text-right px-4 py-2.5 text-zinc-500 font-medium">Taxable</th>
                    <th className="text-right px-4 py-2.5 text-zinc-500 font-medium">Tax</th>
                    <th className="text-center px-4 py-2.5 text-zinc-500 font-medium">ITC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {Object.entries(bySupplier).map(([gstin, s]) => (
                    <tr key={gstin} className="hover:bg-zinc-50/50">
                      <td className="px-4 py-2.5 font-mono text-zinc-600">{gstin}</td>
                      <td className="px-4 py-2.5 text-zinc-700 max-w-[180px] truncate">{s.name ?? "—"}</td>
                      <td className="px-4 py-2.5 text-right text-zinc-700 tabular-nums">{s.count}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-zinc-700">₹{s.taxable.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-zinc-700">₹{s.tax.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                      <td className="px-4 py-2.5 text-center">
                        {s.itcN > 0 ? <span className="text-red-500 font-medium">{s.itcN} blocked</span> : <span className="text-emerald-500">✓ Available</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <a href={`/clients/${clientId}/periods/${filingPeriodId}/reconcile`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors">
              Next: Reconcile →
            </a>
          </div>
        </>
      )}
    </div>
  );
}

async function parseExcel(file: File): Promise<string> {
  if (!window.XLSX) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load SheetJS from CDN. Try uploading JSON instead."));
      document.head.appendChild(script);
    });
  }
  const XLSX = window.XLSX!;
  const buf  = await file.arrayBuffer();
  const wb   = XLSX.read(buf, { type: "array" });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
  return JSON.stringify(rows);
}