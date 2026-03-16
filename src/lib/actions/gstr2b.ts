// src/lib/actions/gstr2b.ts
"use server";
import { db, gstr2bInvoices, filingPeriods, purchaseInvoices } from "@/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { parseGstr2bJson, parseGstr2bExcel } from "@/lib/gstr2b-parser";
import { reconcile } from "@/lib/reconciliation";

export async function uploadGstr2b(
  filingPeriodId: string,
  clientId: string,
  fileData: { name:string; type:string; content:string }
) {
  await db.delete(gstr2bInvoices).where(eq(gstr2bInvoices.filingPeriodId, filingPeriodId));

  let entries;
  try {
    if (fileData.type==="application/json" || fileData.name.endsWith(".json")) {
      entries = parseGstr2bJson(JSON.parse(fileData.content));
    } else {
      entries = parseGstr2bExcel(JSON.parse(fileData.content) as Record<string,string>[]);
    }
  } catch(e) {
    return { error:`Failed to parse: ${e instanceof Error ? e.message : "Unknown"}` };
  }

  if (!entries.length) return { error:"No invoice data found. Check the file format." };

  await db.insert(gstr2bInvoices).values(entries.map(e => ({
    filingPeriodId,
    supplierGstin:     e.supplierGstin,
    supplierName:      e.supplierName,
    supplierTradeName: e.supplierTradeName,
    invoiceNumber:     e.invoiceNumber,
    invoiceDate:       e.invoiceDate,
    invoiceType:       e.invoiceType,
    taxableAmount:     String(e.taxableAmount),
    igst:              String(e.igst),
    cgst:              String(e.cgst),
    sgst:              String(e.sgst),
    cess:              String(e.cess),
    totalAmount:       String(e.totalAmount),
    itcAvailable:      e.itcAvailable,
    itcReason:         e.itcReason,
    isRcm:             e.isRcm,
    sourceSection:     e.sourceSection,
  })));

  await db.update(filingPeriods).set({
    totalInvoicesIn2B: entries.length,
    gstr2bFileName:    fileData.name,
    gstr2bUploadedAt:  new Date(),
    status:            "in_progress",
    updatedAt:         new Date(),
  }).where(eq(filingPeriods.id, filingPeriodId));

  revalidatePath(`/clients/${clientId}/periods/${filingPeriodId}`);
  return { success:true, count:entries.length };
}

export async function runReconciliation(filingPeriodId: string, clientId: string) {
  const [purchases, gstr2b] = await Promise.all([
    db.query.purchaseInvoices.findMany({ where:eq(purchaseInvoices.filingPeriodId, filingPeriodId) }),
    db.query.gstr2bInvoices.findMany({ where:eq(gstr2bInvoices.filingPeriodId, filingPeriodId) }),
  ]);

  if (!purchases.length) return { error:"No purchase invoices found." };
  if (!gstr2b.length)    return { error:"No GSTR-2B data found." };

  const summary = reconcile(purchases, gstr2b);

  // Persist reconciliation status on each invoice
  for (const r of summary.results) {
    if (r.purchaseInvoiceId) {
      await db.update(purchaseInvoices).set({
        reconciliationStatus: r.status as "matched"|"partial"|"mismatch"|"missing_in_2b"|"missing_in_books",
        reconciliationNotes:  r.issues.join(" | "),
        matched2bId:          r.gstr2bInvoiceId ?? undefined,
        updatedAt:            new Date(),
      }).where(eq(purchaseInvoices.id, r.purchaseInvoiceId));
    }
    if (r.gstr2bInvoiceId) {
      await db.update(gstr2bInvoices).set({
        reconciliationStatus: r.status as "matched"|"partial"|"mismatch"|"missing_in_2b"|"missing_in_books",
        matchedPurchaseId:    r.purchaseInvoiceId ?? undefined,
      }).where(eq(gstr2bInvoices.id, r.gstr2bInvoiceId));
    }
  }

  await db.update(filingPeriods).set({
    matchedCount:  summary.matched,
    partialCount:  summary.partial,
    mismatchCount: summary.mismatch + summary.missingIn2B + summary.missingInBooks,
    itcIgst:       String(summary.itcIgst.toFixed(2)),
    itcCgst:       String(summary.itcCgst.toFixed(2)),
    itcSgst:       String(summary.itcSgst.toFixed(2)),
    itcCess:       String(summary.itcCess.toFixed(2)),
    status:        "reconciled",
    updatedAt:     new Date(),
  }).where(eq(filingPeriods.id, filingPeriodId));

  revalidatePath(`/clients/${clientId}/periods/${filingPeriodId}`);
  return { success:true, summary };
}

export async function getGstr2bInvoices(filingPeriodId: string) {
  return db.query.gstr2bInvoices.findMany({
    where: eq(gstr2bInvoices.filingPeriodId, filingPeriodId),
    orderBy: (t, { asc }) => [asc(t.supplierGstin)],
  });
}