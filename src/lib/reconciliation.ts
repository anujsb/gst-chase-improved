// src/lib/reconciliation.ts
import type { PurchaseInvoice, Gstr2bInvoice } from "@/db/schema";

export type ReconciliationStatus = "matched"|"partial"|"mismatch"|"missing_in_2b"|"missing_in_books";

export interface ReconciliationResult {
  purchaseInvoiceId: string | null;
  gstr2bInvoiceId:   string | null;
  status:            ReconciliationStatus;
  issues:            string[];
  suggestions:       string[];
  purchase?:         PurchaseInvoice;
  gstr2b?:           Gstr2bInvoice;
  taxableDiff?:      number;
  taxDiff?:          number;
  dateDiff?:         number;
}

export interface ReconciliationSummary {
  matched:number; partial:number; mismatch:number; missingIn2B:number; missingInBooks:number;
  totalItcAvailable:number; itcIgst:number; itcCgst:number; itcSgst:number; itcCess:number;
  results: ReconciliationResult[];
}

export function reconcile(purchases: PurchaseInvoice[], gstr2bList: Gstr2bInvoice[]): ReconciliationSummary {
  const results: ReconciliationResult[] = [];
  const matchedG2bIds = new Set<string>();
  const matchedPurchIds = new Set<string>();

  for (const purchase of purchases) {
    const candidates = gstr2bList.filter(g =>
      g.supplierGstin.toUpperCase() === purchase.supplierGstin.toUpperCase() &&
      !matchedG2bIds.has(g.id)
    );

    if (!candidates.length) {
      results.push({
        purchaseInvoiceId:purchase.id, gstr2bInvoiceId:null, status:"missing_in_2b",
        issues:[`Supplier GSTIN ${purchase.supplierGstin} not found in GSTR-2B`],
        suggestions:["Verify GSTIN is correct","Check if supplier has filed GSTR-1","May appear in next month's 2B"],
        purchase,
      });
      continue;
    }

    // Match priority: exact invNo → fuzzy invNo → amount-based
    const norm = (s:string) => s.trim().toUpperCase().replace(/[\s\-\/]/g,"");
    let best = candidates.find(g => norm(g.invoiceNumber)===norm(purchase.invoiceNumber));
    if (!best) best = candidates.find(g => g.invoiceNumber.replace(/\s/g,"").toUpperCase()===purchase.invoiceNumber.replace(/\s/g,"").toUpperCase());
    if (!best) {
      const pAmt = Number(purchase.taxableAmount);
      best = candidates.find(g => Math.abs(Number(g.taxableAmount)-pAmt)/Math.max(pAmt,1) < 0.05);
    }

    if (!best) {
      results.push({
        purchaseInvoiceId:purchase.id, gstr2bInvoiceId:null, status:"missing_in_2b",
        issues:[`Invoice ${purchase.invoiceNumber} not found in GSTR-2B for ${purchase.supplierGstin}`, `${candidates.length} other invoice(s) from this supplier in 2B`],
        suggestions:["Check invoice number matches what supplier reported","Contact supplier to verify GSTR-1"],
        purchase,
      });
      continue;
    }

    matchedG2bIds.add(best.id);
    matchedPurchIds.add(purchase.id);

    const issues:string[] = [], suggestions:string[] = [];
    const pTaxable = Number(purchase.taxableAmount), gTaxable = Number(best.taxableAmount);
    const taxableDiff = Math.abs(pTaxable - gTaxable);
    const taxablePct  = taxableDiff / Math.max(pTaxable, gTaxable, 1);
    const pTax = Number(purchase.igst??0)+Number(purchase.cgst??0)+Number(purchase.sgst??0)+Number(purchase.cess??0);
    const gTax = Number(best.igst??0)+Number(best.cgst??0)+Number(best.sgst??0)+Number(best.cess??0);
    const taxDiff = Math.abs(pTax - gTax);
    const dateDiff = daysDiff(purchase.invoiceDate, best.invoiceDate);

    if (best.itcAvailable==="N") {
      issues.push("ITC NOT AVAILABLE in GSTR-2B");
      suggestions.push("Verify with supplier — may be blocked under Section 17(5)");
    }
    if (best.itcAvailable==="T") {
      issues.push("ITC is TEMPORARY — supplier filed GSTR-1 late");
      suggestions.push("ITC will be available once supplier's GSTR-1 is processed");
    }
    if (purchase.isRcm !== best.isRcm) {
      issues.push(`RCM mismatch: books=${purchase.isRcm?"Yes":"No"}, 2B=${best.isRcm?"Yes":"No"}`);
      suggestions.push("Verify if transaction is under Reverse Charge Mechanism");
    }
    if (taxableDiff > 2 && taxablePct > 0.01) {
      issues.push(`Taxable value: books ₹${pTaxable.toFixed(2)} vs 2B ₹${gTaxable.toFixed(2)} (diff ₹${taxableDiff.toFixed(2)})`);
      suggestions.push(taxablePct>0.1 ? "Significant diff — verify invoice and ask supplier to correct GSTR-1" : "Minor diff — may be rounding");
    }
    if (taxDiff > 2) {
      issues.push(`Tax amount: books ₹${pTax.toFixed(2)} vs 2B ₹${gTax.toFixed(2)}`);
      suggestions.push("Check tax rate applied matches supplier's GSTIN type");
    }
    if (norm(purchase.invoiceNumber) !== norm(best.invoiceNumber)) {
      issues.push(`Invoice number: books "${purchase.invoiceNumber}" vs 2B "${best.invoiceNumber}"`);
      suggestions.push("Ask supplier to correct invoice number in GSTR-1");
    }
    if (dateDiff !== null && dateDiff > 5) {
      issues.push(`Date differs by ${dateDiff} days: books ${purchase.invoiceDate} vs 2B ${best.invoiceDate}`);
      suggestions.push("Date difference may cause ITC reversal risk");
    }

    const hardFail = (taxablePct>0.1 && taxableDiff>10) || issues.some(i=>i.includes("NOT AVAILABLE")||i.includes("RCM mismatch")) || taxDiff>100;
    const status: ReconciliationStatus = hardFail ? "mismatch" : issues.length ? "partial" : "matched";

    results.push({ purchaseInvoiceId:purchase.id, gstr2bInvoiceId:best.id, status, issues, suggestions, purchase, gstr2b:best, taxableDiff, taxDiff, dateDiff:dateDiff??undefined });
  }

  // 2B entries with no match
  for (const g2b of gstr2bList) {
    if (matchedG2bIds.has(g2b.id)) continue;
    results.push({
      purchaseInvoiceId:null, gstr2bInvoiceId:g2b.id, status:"missing_in_books",
      issues:[`Invoice ${g2b.invoiceNumber} from ${g2b.supplierGstin} is in GSTR-2B but NOT in your books`],
      suggestions:["Check if invoice was received but not recorded","May be duplicate/cancelled — verify with supplier","If valid, add to books to claim ITC"],
      gstr2b:g2b,
    });
  }

  // ITC totals from matched/partial entries where ITC available
  let itcIgst=0, itcCgst=0, itcSgst=0, itcCess=0;
  for (const r of results) {
    if ((r.status==="matched"||r.status==="partial") && r.gstr2b?.itcAvailable!=="N") {
      itcIgst += Number(r.gstr2b?.igst??0);
      itcCgst += Number(r.gstr2b?.cgst??0);
      itcSgst += Number(r.gstr2b?.sgst??0);
      itcCess += Number(r.gstr2b?.cess??0);
    }
  }

  return {
    matched:        results.filter(r=>r.status==="matched").length,
    partial:        results.filter(r=>r.status==="partial").length,
    mismatch:       results.filter(r=>r.status==="mismatch").length,
    missingIn2B:    results.filter(r=>r.status==="missing_in_2b").length,
    missingInBooks: results.filter(r=>r.status==="missing_in_books").length,
    totalItcAvailable: itcIgst+itcCgst+itcSgst+itcCess,
    itcIgst, itcCgst, itcSgst, itcCess, results,
  };
}

function parseDate(d: string): Date|null {
  if (!d) return null;
  const p = d.split("/");
  if (p.length===3) return new Date(Number(p[2]), Number(p[1])-1, Number(p[0]));
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
}

function daysDiff(a: string, b: string): number|null {
  const da=parseDate(a), db=parseDate(b);
  if (!da||!db) return null;
  return Math.abs((da.getTime()-db.getTime())/(1000*60*60*24));
}