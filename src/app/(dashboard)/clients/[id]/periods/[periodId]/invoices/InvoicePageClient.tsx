// src/app/(dashboard)/clients/[id]/periods/[periodId]/invoices/InvoicePageClient.tsx

"use client";

import { useCallback, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { processInvoiceFiles, deleteInvoice, type ProcessResult } from "@/lib/actions/invoices";
import { isValidGSTIN } from "@/lib/gemini";
import type { PurchaseInvoice } from "@/db/schema";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_MB = 10;

interface Props {
  filingPeriodId: string;
  clientId: string;
  periodLabel: string;
  initialInvoices: PurchaseInvoice[];
}

interface QueuedFile {
  id: string;
  file: File;
  status: "queued" | "processing" | "done" | "error";
  result?: ProcessResult;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function InvoicePageClient({ filingPeriodId, clientId, periodLabel, initialInvoices }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>(initialInvoices);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);

  function addFiles(files: FileList | File[]) {
    const valid = Array.from(files).filter(
      (f) => ACCEPTED.includes(f.type) && f.size <= MAX_MB * 1024 * 1024
    );
    setQueue((q) => [...q, ...valid.map((f) => ({ id: Math.random().toString(36).slice(2), file: f, status: "queued" as const }))]);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }, []);

  async function processQueue() {
    const queued = queue.filter((q) => q.status === "queued");
    if (!queued.length || processing) return;
    setProcessing(true);

    for (const q of queued) {
      setQueue((prev) => prev.map((x) => x.id === q.id ? { ...x, status: "processing" } : x));
      const base64 = await fileToBase64(q.file);
      const [result] = await processInvoiceFiles(filingPeriodId, clientId, [
        { name: q.file.name, type: q.file.type, base64, size: q.file.size },
      ]);
      setQueue((prev) => prev.map((x) => x.id === q.id ? { ...x, status: result.status === "error" ? "error" : "done", result } : x));
    }

    router.refresh();
    setProcessing(false);
  }

  async function handleDelete(invoiceId: string) {
    if (!confirm("Delete this invoice?")) return;
    await deleteInvoice(invoiceId, filingPeriodId, clientId);
    setInvoices((prev) => prev.filter((i) => i.id !== invoiceId));
  }

  const queuedCount = queue.filter((q) => q.status === "queued").length;
  const doneCount = queue.filter((q) => q.status === "done").length;
  const errorCount = queue.filter((q) => q.status === "error").length;
  const totalTax = invoices.reduce((s, i) => s + Number(i.igst ?? 0) + Number(i.cgst ?? 0) + Number(i.sgst ?? 0), 0);

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900">Purchase Invoices</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{periodLabel}</p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors mb-6 ${
          dragging ? "border-zinc-400 bg-zinc-50" : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50"
        }`}
      >
        <input ref={inputRef} type="file" multiple accept={ACCEPTED.join(",")} className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)} />
        <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center mx-auto mb-3">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-zinc-500">
            <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
          </svg>
        </div>
        <p className="text-sm font-medium text-zinc-700 mb-1">Drop invoice photos or PDFs here</p>
        <p className="text-xs text-zinc-400">JPG, PNG, WebP, PDF · Max {MAX_MB}MB · AI extracts all fields</p>
        {queuedCount > 0 && (
          <div className="absolute top-3 right-3 bg-zinc-900 text-white text-xs px-2 py-1 rounded-full">{queuedCount} ready</div>
        )}
      </div>

      {/* Queue */}
      {queue.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Queue — {doneCount} done · {errorCount} errors · {queuedCount} waiting
            </p>
            {queuedCount > 0 && (
              <button onClick={processQueue} disabled={processing}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-zinc-900 text-white text-xs font-medium rounded-lg hover:bg-zinc-800 disabled:opacity-50 transition-colors">
                {processing ? (
                  <><svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Processing…</>
                ) : `Process ${queuedCount} file${queuedCount !== 1 ? "s" : ""}`}
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            {queue.map((q) => (
              <div key={q.id} className="flex items-center gap-3 px-4 py-2.5 bg-white border border-zinc-200 rounded-lg">
                {q.status === "queued" && <span className="w-4 h-4 rounded-full border-2 border-zinc-300 shrink-0" />}
                {q.status === "processing" && <svg className="animate-spin w-4 h-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                {q.status === "done" && <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-emerald-500 shrink-0"><polyline points="20 6 9 17 4 12"/></svg>}
                {q.status === "error" && <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-red-500 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}
                <span className="text-xs text-zinc-700 flex-1 truncate">{q.file.name}</span>
                <span className="text-xs text-zinc-400">{(q.file.size / 1024).toFixed(0)} KB</span>
                {q.status === "done" && q.result?.invoice && (
                  <span className="text-xs text-emerald-600 truncate max-w-[180px]">
                    {q.result.invoice.supplierName ?? q.result.invoice.invoiceNumber ?? "Extracted"}
                  </span>
                )}
                {q.status === "error" && (
                  <span className="text-xs text-red-500 truncate max-w-[180px]">{q.result?.error ?? "Failed"}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extracted invoices table */}
      {invoices.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Extracted — {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-4 text-xs text-zinc-500">
              <span>Total Tax: <span className="font-semibold text-zinc-900">₹{totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></span>
              <span>Total: <span className="font-semibold text-zinc-900">₹{invoices.reduce((s, i) => s + Number(i.totalAmount ?? 0), 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></span>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  {["Invoice No.", "Date", "Supplier", "GSTIN", "Taxable", "Tax", "Total", "Conf.", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-zinc-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {invoices.map((inv) => {
                  const tax = Number(inv.igst ?? 0) + Number(inv.cgst ?? 0) + Number(inv.sgst ?? 0) + Number(inv.cess ?? 0);
                  const conf = Number(inv.ocrConfidence ?? 0);
                  const gstinOk = isValidGSTIN(inv.supplierGstin);
                  return (
                    <tr key={inv.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-zinc-700">{inv.invoiceNumber === "UNKNOWN" ? <span className="text-red-400">—</span> : inv.invoiceNumber}</td>
                      <td className="px-4 py-3 text-zinc-600 whitespace-nowrap">{inv.invoiceDate || "—"}</td>
                      <td className="px-4 py-3 text-zinc-700 max-w-[130px] truncate">
                        {inv.supplierName || "—"}
                        {inv.isRcm && <span className="ml-1 text-[10px] bg-orange-100 text-orange-600 px-1 py-0.5 rounded">RCM</span>}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        <span className={gstinOk ? "text-zinc-600" : "text-red-400"}>
                          {inv.supplierGstin === "UNKNOWN" ? "—" : inv.supplierGstin}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-zinc-700">₹{Number(inv.taxableAmount).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 tabular-nums text-zinc-600">₹{tax.toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 tabular-nums font-medium text-zinc-900">₹{Number(inv.totalAmount).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          conf >= 80 ? "bg-emerald-50 text-emerald-700" : conf >= 50 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600"
                        }`}>{conf}%</span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleDelete(inv.id)} className="text-zinc-300 hover:text-red-500 transition-colors">
                          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {invoices.length === 0 && queue.length === 0 && (
        <p className="text-center text-sm text-zinc-400 py-8">No invoices yet. Drop files above to get started.</p>
      )}
    </div>
  );
}