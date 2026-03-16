// src/app/api/export/gstr3b/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getGstr3bData } from "@/lib/actions/export";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function esc(s: string): string { return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function amt(n: number): string { return n.toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2}); }
function bg(s: string|null): string {
  switch(s){
    case "matched":          return "#f0fdf4";
    case "partial":          return "#fffbeb";
    case "mismatch":         return "#fef2f2";
    case "missing_in_2b":    return "#fef2f2";
    case "missing_in_books": return "#fff7ed";
    default:                 return "#ffffff";
  }
}
function lbl(s: string|null): string {
  switch(s){
    case "matched":          return "✓ Matched";
    case "partial":          return "⚠ Partial";
    case "mismatch":         return "✗ Mismatch";
    case "missing_in_2b":    return "✗ Not in 2B";
    case "missing_in_books": return "⚠ Not in Books";
    default:                 return "Pending";
  }
}

export async function GET(req: NextRequest) {
  const periodId = req.nextUrl.searchParams.get("periodId");
  if (!periodId) return NextResponse.json({ error:"Missing periodId" }, { status:400 });

  const data = await getGstr3bData(periodId);
  if (!data) return NextResponse.json({ error:"Not found" }, { status:404 });

  const { period, table4, invoiceSummary, rawInvoices } = data;
  const ml = `${MONTHS[period.month-1]} ${period.year}`;
  const netIgst = table4.itcIgst - table4.reversedIgst - table4.ineligibleIgst;
  const netCgst = table4.itcCgst - table4.reversedCgst - table4.ineligibleCgst;
  const netSgst = table4.itcSgst - table4.reversedSgst - table4.ineligibleSgst;

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"/><style>
td,th{font-family:Arial;font-size:11px;padding:4px 8px;}
.hdr{background:#1a1a1a;color:white;font-weight:bold;}
.grn{background:#f0fdf4;} .amb{background:#fffbeb;} .red{background:#fef2f2;}
.bold{font-weight:bold;} .mono{font-family:Courier New;font-size:10px;}
.right{text-align:right;} .center{text-align:center;}
</style></head>
<body>
<table border="1" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
  <tr><td colspan="6" class="hdr" style="font-size:14px;padding:8px;">GSTR-3B PRE-FILL · ${esc(period.clientName)} · ${esc(period.gstin)} · ${ml}</td></tr>
  <tr><td colspan="6" style="height:8px;border:none;"></td></tr>

  <tr><td colspan="6" class="hdr">TABLE 4 — INPUT TAX CREDIT</td></tr>
  <tr style="background:#f5f5f5;">
    <th>Section</th><th>Description</th><th class="right">IGST (₹)</th><th class="right">CGST (₹)</th><th class="right">SGST/UTGST (₹)</th><th class="right">Cess (₹)</th>
  </tr>
  <tr class="grn">
    <td>4A(5)</td><td>ITC Available — Others (from GSTR-2B)</td>
    <td class="right">${amt(table4.itcIgst)}</td><td class="right">${amt(table4.itcCgst)}</td><td class="right">${amt(table4.itcSgst)}</td><td class="right">${amt(table4.itcCess)}</td>
  </tr>
  <tr class="amb">
    <td>4B(2)</td><td>ITC Reversed — Others (fill manually)</td>
    <td class="right">0.00</td><td class="right">0.00</td><td class="right">0.00</td><td class="right">0.00</td>
  </tr>
  <tr class="red">
    <td>4D(2)</td><td>Ineligible ITC (blocked in GSTR-2B)</td>
    <td class="right">${amt(table4.ineligibleIgst)}</td><td class="right">${amt(table4.ineligibleCgst)}</td><td class="right">${amt(table4.ineligibleSgst)}</td><td class="right">0.00</td>
  </tr>
  <tr style="background:#e8f4e8;">
    <td class="bold" colspan="2">NET ITC AVAILABLE (4A − 4B − 4D)</td>
    <td class="right bold">${amt(netIgst)}</td><td class="right bold">${amt(netCgst)}</td><td class="right bold">${amt(netSgst)}</td><td class="right bold">${amt(table4.itcCess)}</td>
  </tr>
  <tr><td colspan="6" style="height:8px;border:none;"></td></tr>

  <tr><td colspan="6" class="hdr">RECONCILIATION SUMMARY</td></tr>
  <tr class="grn"><td class="bold" colspan="5">✓ Matched</td><td class="right bold">${invoiceSummary.matched}</td></tr>
  <tr class="amb"><td class="bold" colspan="5">⚠ Partial Match</td><td class="right bold">${invoiceSummary.partial}</td></tr>
  <tr class="red"><td class="bold" colspan="5">✗ Mismatch / Issues</td><td class="right bold">${invoiceSummary.mismatch}</td></tr>
  <tr class="red"><td class="bold" colspan="5">✗ Not Found in GSTR-2B</td><td class="right bold">${invoiceSummary.missingIn2B}</td></tr>
  <tr style="background:#f5f5f5;"><td class="bold" colspan="5">Total Invoices</td><td class="right bold">${invoiceSummary.total}</td></tr>
  <tr><td colspan="6" style="height:8px;border:none;"></td></tr>

  <tr><td colspan="6" class="hdr">GSTR-2B INVOICE DETAILS</td></tr>
  <tr style="background:#f5f5f5;">
    <th>Supplier GSTIN</th><th>Supplier Name</th><th>Invoice No.</th><th>Invoice Date</th><th class="right">Taxable + IGST / CGST / SGST</th><th>Status</th>
  </tr>
  ${rawInvoices.map(inv => `
  <tr style="background:${bg(inv.reconciliationStatus)};">
    <td class="mono">${esc(inv.supplierGstin)}</td>
    <td>${esc(inv.supplierName??"")} ${inv.isRcm?"<b>(RCM)</b>":""}</td>
    <td class="mono">${esc(inv.invoiceNumber)}</td>
    <td>${esc(inv.invoiceDate)}</td>
    <td class="right">
      ₹${amt(inv.taxableAmount)} + 
      ${inv.igst>0?`IGST ₹${amt(inv.igst)} `:""}
      ${inv.cgst>0?`CGST ₹${amt(inv.cgst)} `:""}
      ${inv.sgst>0?`SGST ₹${amt(inv.sgst)}`:""}
      = <b>₹${amt(inv.totalAmount)}</b>
      ${inv.itcAvailable==="N"?"<br/><span style='color:red;font-size:9px;'>ITC BLOCKED</span>":""}
    </td>
    <td>${lbl(inv.reconciliationStatus)}</td>
  </tr>`).join("")}
</table>
</body></html>`;

  const fileName = `GSTR3B_${period.gstin}_${MONTHS[period.month-1]}_${period.year}.xls`;
  return new NextResponse(Buffer.from(html,"utf-8"), {
    headers: {
      "Content-Type": "application/vnd.ms-excel",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}