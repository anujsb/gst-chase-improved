// src/lib/actions/invoices.ts
"use server";
import { db, purchaseInvoices, uploadedFiles, filingPeriods } from "@/db";
import { eq, sql } from "drizzle-orm";
import { extractInvoiceFromBase64, isValidGSTIN } from "@/lib/gemini";
import { revalidatePath } from "next/cache";

export interface ProcessResult {
  fileId:   string;
  fileName: string;
  status:   "success" | "error" | "low_confidence";
  invoice?: { id:string; invoiceNumber:string|null; supplierName:string|null; totalAmount:number|null; confidence:number; };
  error?:   string;
}

export async function processInvoiceFiles(
  filingPeriodId: string,
  clientId: string,
  files: { name:string; type:string; base64:string; size:number }[]
): Promise<ProcessResult[]> {
  const results: ProcessResult[] = [];

  for (const file of files) {
    const [fileRecord] = await db.insert(uploadedFiles).values({
      filingPeriodId, fileName:file.name, fileType:file.type, fileSize:file.size, purpose:"invoice",
    }).returning();

    try {
      const extracted = await extractInvoiceFromBase64(file.base64, file.type);
      const [invoice] = await db.insert(purchaseInvoices).values({
        filingPeriodId,
        supplierGstin:  extracted.supplierGstin ?? "UNKNOWN",
        supplierName:   extracted.supplierName,
        invoiceNumber:  extracted.invoiceNumber ?? "UNKNOWN",
        invoiceDate:    extracted.invoiceDate ?? "",
        taxableAmount:  String(extracted.taxableAmount ?? 0),
        igst:           String(extracted.igst ?? 0),
        cgst:           String(extracted.cgst ?? 0),
        sgst:           String(extracted.sgst ?? 0),
        cess:           String(extracted.cess ?? 0),
        totalAmount:    String(extracted.totalAmount ?? 0),
        isRcm:          extracted.isRcm,
        ocrConfidence:  String(extracted.confidence),
        extractedByAi:  true,
        rawOcrData:     extracted as Record<string,unknown>,
        sourceFile:     file.name,
        itcEligible:    isValidGSTIN(extracted.supplierGstin),
      }).returning();

      await db.update(uploadedFiles).set({ processedAt:new Date(), extractedCount:1 }).where(eq(uploadedFiles.id, fileRecord.id));

      results.push({
        fileId:   fileRecord.id,
        fileName: file.name,
        status:   extracted.confidence < 50 ? "low_confidence" : "success",
        invoice:  { id:invoice.id, invoiceNumber:invoice.invoiceNumber, supplierName:invoice.supplierName, totalAmount:Number(invoice.totalAmount), confidence:extracted.confidence },
      });
    } catch(err) {
      const message = err instanceof Error ? err.message : "OCR failed";
      await db.update(uploadedFiles).set({ processingError:message }).where(eq(uploadedFiles.id, fileRecord.id));
      results.push({ fileId:fileRecord.id, fileName:file.name, status:"error", error:message });
    }
  }

  await db.update(filingPeriods).set({
    totalInvoicesInBooks: sql`(SELECT COUNT(*) FROM purchase_invoices WHERE filing_period_id = ${filingPeriodId})`,
    status: "in_progress",
    updatedAt: new Date(),
  }).where(eq(filingPeriods.id, filingPeriodId));

  revalidatePath(`/clients/${clientId}/periods/${filingPeriodId}`);
  return results;
}

export async function getInvoicesForPeriod(filingPeriodId: string) {
  return db.query.purchaseInvoices.findMany({
    where: eq(purchaseInvoices.filingPeriodId, filingPeriodId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
}

export async function deleteInvoice(invoiceId: string, filingPeriodId: string, clientId: string) {
  await db.delete(purchaseInvoices).where(eq(purchaseInvoices.id, invoiceId));
  await db.update(filingPeriods).set({
    totalInvoicesInBooks: sql`(SELECT COUNT(*) FROM purchase_invoices WHERE filing_period_id = ${filingPeriodId})`,
    updatedAt: new Date(),
  }).where(eq(filingPeriods.id, filingPeriodId));
  revalidatePath(`/clients/${clientId}/periods/${filingPeriodId}/invoices`);
}