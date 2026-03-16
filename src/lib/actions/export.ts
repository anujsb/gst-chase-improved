// src/lib/actions/export.ts
"use server";
import { db, filingPeriods, purchaseInvoices, gstr2bInvoices } from "@/db";
import { eq } from "drizzle-orm";

export interface Gstr3bData {
  period: { month:number; year:number; clientName:string; gstin:string };
  table3_1: { taxableOutward:number; inwardRcm:number };
  table4: {
    itcIgst:number; itcCgst:number; itcSgst:number; itcCess:number;
    reversedIgst:number; reversedCgst:number; reversedSgst:number;
    ineligibleIgst:number; ineligibleCgst:number; ineligibleSgst:number;
  };
  invoiceSummary: { matched:number; partial:number; mismatch:number; missingIn2B:number; total:number };
  rawInvoices: Array<{
    supplierGstin:string; supplierName:string|null; invoiceNumber:string;
    invoiceDate:string; taxableAmount:number; igst:number; cgst:number; sgst:number;
    cess:number; totalAmount:number; reconciliationStatus:string|null; itcAvailable:string; isRcm:boolean;
  }>;
}

export async function getGstr3bData(filingPeriodId: string): Promise<Gstr3bData | null> {
  // Fixed: use correct with clause to load client relation
  const period = await db.query.filingPeriods.findFirst({
    where: eq(filingPeriods.id, filingPeriodId),
    with: { client: true },
  });
  if (!period) return null;

  const [purchases, gstr2b] = await Promise.all([
    db.query.purchaseInvoices.findMany({ where:eq(purchaseInvoices.filingPeriodId, filingPeriodId) }),
    db.query.gstr2bInvoices.findMany({ where:eq(gstr2bInvoices.filingPeriodId, filingPeriodId) }),
  ]);

  // ITC from matched/partial 2B entries where ITC is not blocked
  const eligible = gstr2b.filter(g =>
    g.itcAvailable !== "N" &&
    (g.reconciliationStatus === "matched" || g.reconciliationStatus === "partial" || !g.reconciliationStatus)
  );

  const itcIgst = eligible.reduce((s,g) => s + Number(g.igst??0), 0);
  const itcCgst = eligible.reduce((s,g) => s + Number(g.cgst??0), 0);
  const itcSgst = eligible.reduce((s,g) => s + Number(g.sgst??0), 0);
  const itcCess = eligible.reduce((s,g) => s + Number(g.cess??0), 0);

  const blocked = gstr2b.filter(g => g.itcAvailable === "N");
  const ineligibleIgst = blocked.reduce((s,g) => s + Number(g.igst??0), 0);
  const ineligibleCgst = blocked.reduce((s,g) => s + Number(g.cgst??0), 0);
  const ineligibleSgst = blocked.reduce((s,g) => s + Number(g.sgst??0), 0);

  const inwardRcm = purchases.filter(p => p.isRcm).reduce((s,p) => s + Number(p.taxableAmount??0), 0);

  return {
    period: { month:period.month, year:period.year, clientName:period.client.name, gstin:period.client.gstin },
    table3_1: { taxableOutward:0, inwardRcm },
    table4: {
      itcIgst, itcCgst, itcSgst, itcCess,
      reversedIgst:0, reversedCgst:0, reversedSgst:0,
      ineligibleIgst, ineligibleCgst, ineligibleSgst,
    },
    invoiceSummary: {
      matched:     purchases.filter(p => p.reconciliationStatus==="matched").length,
      partial:     purchases.filter(p => p.reconciliationStatus==="partial").length,
      mismatch:    purchases.filter(p => p.reconciliationStatus==="mismatch").length,
      missingIn2B: purchases.filter(p => p.reconciliationStatus==="missing_in_2b").length,
      total:       purchases.length,
    },
    rawInvoices: gstr2b.map(g => ({
      supplierGstin:        g.supplierGstin,
      supplierName:         g.supplierName,
      invoiceNumber:        g.invoiceNumber,
      invoiceDate:          g.invoiceDate,
      taxableAmount:        Number(g.taxableAmount),
      igst:                 Number(g.igst),
      cgst:                 Number(g.cgst),
      sgst:                 Number(g.sgst),
      cess:                 Number(g.cess),
      totalAmount:          Number(g.totalAmount),
      reconciliationStatus: g.reconciliationStatus,
      itcAvailable:         g.itcAvailable ?? "Y",
      isRcm:                g.isRcm ?? false,
    })),
  };
}