// scripts/seed.ts
// Run with: npx tsx scripts/seed.ts
//
// Seeds 3 CA clients with:
//   - Filing periods for Feb 2025
//   - Purchase invoices (books)
//   - GSTR-2B invoices with deliberate mismatches to test reconciliation
//   - One client fully reconciled, one in-progress, one fresh

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/db/schema";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sql  = neon(process.env.DATABASE_URL!);
const db   = drizzle(sql, { schema });

// ─── Helpers ─────────────────────────────────────────────────────────────────

function amt(n: number) { return String(n.toFixed(2)); }

// ─── Seed data ────────────────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 Seeding database…\n");

  // ── Client 1: Sharma Textiles — reconciled period ─────────────────────────
  console.log("Creating Sharma Textiles…");
  const existingSharma = await db.query.clients.findFirst({
    where: eq(schema.clients.gstin, "27AAICS1234A1Z5"),
  });

  const [sharma] = existingSharma
    ? [existingSharma]
    : await db.insert(schema.clients).values({
        name:             "Sharma Textiles Pvt Ltd",
        gstin:            "27AAICS1234A1Z5",
        tradeName:        "Sharma Textiles",
        email:            "accounts@sharmatextiles.com",
        whatsappNumber:   "9876543210",
        phone:            "9876543210",
        address:          "Plot 45, MIDC, Bhiwandi, Thane, Maharashtra 421302",
        stateCode:        "27",
        registrationType: "regular",
        notes:            "Long-standing client. Pays on time. Mostly B2B purchases.",
      }).returning();

  const [sharmaFP] = await db.insert(schema.filingPeriods).values({
    clientId:             sharma.id,
    month:                2,
    year:                 2025,
    status:               "reconciled",
    totalInvoicesInBooks: 6,
    totalInvoicesIn2B:    6,
    matchedCount:         4,
    partialCount:         1,
    mismatchCount:        1,
    itcIgst:              "0.00",
    itcCgst:              "15750.00",
    itcSgst:              "15750.00",
    itcCess:              "0.00",
    gstr2bFileName:       "GSTR2B_27AAICS1234A1Z5_022025.json",
    gstr2bUploadedAt:     new Date("2025-03-15"),
  }).returning();

  // Purchase invoices for Sharma
  const sharmaInvoices = [
    { supplierGstin:"27AABCF1234D1Z8", supplierName:"Reliance Fabrics Ltd",    invoiceNumber:"RFL/2025/1234",   invoiceDate:"05/02/2025", taxableAmount:175000, igst:0,     cgst:15750, sgst:15750, totalAmount:206500, reconciliationStatus:"matched"   as const, ocrConfidence:94 },
    { supplierGstin:"27AADCE5678F1Z2", supplierName:"Cotton Kings Exports",     invoiceNumber:"CKE-0892",        invoiceDate:"08/02/2025", taxableAmount:85000,  igst:0,     cgst:7650,  sgst:7650,  totalAmount:100300, reconciliationStatus:"matched"   as const, ocrConfidence:88 },
    { supplierGstin:"06AABCP9012G1Z1", supplierName:"Punjab Poly Pack",         invoiceNumber:"PPP/FEB/445",     invoiceDate:"12/02/2025", taxableAmount:42000,  igst:7560,  cgst:0,     sgst:0,     totalAmount:49560,  reconciliationStatus:"matched"   as const, ocrConfidence:91 },
    { supplierGstin:"27AACCE3456H1Z3", supplierName:"Maharashtra Dye Works",    invoiceNumber:"MDW/25/789",      invoiceDate:"15/02/2025", taxableAmount:28500,  igst:0,     cgst:2565,  sgst:2565,  totalAmount:33630,  reconciliationStatus:"partial"   as const, ocrConfidence:76, reconciliationNotes:"Taxable value mismatch: books ₹28500.00 vs 2B ₹28000.00 (diff ₹500.00)" },
    { supplierGstin:"27AADCF7890I1Z9", supplierName:"Bhiwandi Yarn Traders",    invoiceNumber:"BYT-2025-156",    invoiceDate:"18/02/2025", taxableAmount:62000,  igst:0,     cgst:5580,  sgst:5580,  totalAmount:73160,  reconciliationStatus:"matched"   as const, ocrConfidence:95 },
    { supplierGstin:"29AABCG2345J1Z7", supplierName:"Bangalore Loom Works",     invoiceNumber:"BLW/0234",        invoiceDate:"22/02/2025", taxableAmount:95000,  igst:17100, cgst:0,     sgst:0,     totalAmount:112100, reconciliationStatus:"mismatch"  as const, ocrConfidence:82, reconciliationNotes:"ITC NOT AVAILABLE in GSTR-2B | Invoice number differs: books \"BLW/0234\" vs 2B \"BLW/0235\"" },
  ];

  for (const inv of sharmaInvoices) {
    await db.insert(schema.purchaseInvoices).values({
      filingPeriodId:       sharmaFP.id,
      supplierGstin:        inv.supplierGstin,
      supplierName:         inv.supplierName,
      invoiceNumber:        inv.invoiceNumber,
      invoiceDate:          inv.invoiceDate,
      taxableAmount:        amt(inv.taxableAmount),
      igst:                 amt(inv.igst),
      cgst:                 amt(inv.cgst),
      sgst:                 amt(inv.sgst),
      cess:                 "0.00",
      totalAmount:          amt(inv.totalAmount),
      itcEligible:          true,
      isRcm:                false,
      extractedByAi:        true,
      ocrConfidence:        String(inv.ocrConfidence),
      reconciliationStatus: inv.reconciliationStatus,
      reconciliationNotes:  (inv as { reconciliationNotes?: string }).reconciliationNotes ?? null,
      sourceFile:           `invoice_${inv.invoiceNumber.replace(/\//g,"_")}.pdf`,
    });
  }

  // GSTR-2B invoices for Sharma — with deliberate mismatches
  const sharma2B = [
    { supplierGstin:"27AABCF1234D1Z8", invoiceNumber:"RFL/2025/1234",   invoiceDate:"05/02/2025", taxableAmount:175000, igst:0,     cgst:15750, sgst:15750, itcAvailable:"Y", reconciliationStatus:"matched"  as const },
    { supplierGstin:"27AADCE5678F1Z2", invoiceNumber:"CKE-0892",        invoiceDate:"08/02/2025", taxableAmount:85000,  igst:0,     cgst:7650,  sgst:7650,  itcAvailable:"Y", reconciliationStatus:"matched"  as const },
    { supplierGstin:"06AABCP9012G1Z1", invoiceNumber:"PPP/FEB/445",     invoiceDate:"12/02/2025", taxableAmount:42000,  igst:7560,  cgst:0,     sgst:0,     itcAvailable:"Y", reconciliationStatus:"matched"  as const },
    { supplierGstin:"27AACCE3456H1Z3", invoiceNumber:"MDW/25/789",      invoiceDate:"15/02/2025", taxableAmount:28000,  igst:0,     cgst:2520,  sgst:2520,  itcAvailable:"Y", reconciliationStatus:"partial"  as const }, // ← amount mismatch
    { supplierGstin:"27AADCF7890I1Z9", invoiceNumber:"BYT-2025-156",    invoiceDate:"18/02/2025", taxableAmount:62000,  igst:0,     cgst:5580,  sgst:5580,  itcAvailable:"Y", reconciliationStatus:"matched"  as const },
    { supplierGstin:"29AABCG2345J1Z7", invoiceNumber:"BLW/0235",        invoiceDate:"22/02/2025", taxableAmount:95000,  igst:17100, cgst:0,     sgst:0,     itcAvailable:"N", itcReason:"Section 17(5) block", reconciliationStatus:"mismatch" as const }, // ← ITC blocked + invoice no. diff
  ];

  for (const inv of sharma2B) {
    await db.insert(schema.gstr2bInvoices).values({
      filingPeriodId:       sharmaFP.id,
      supplierGstin:        inv.supplierGstin,
      invoiceNumber:        inv.invoiceNumber,
      invoiceDate:          inv.invoiceDate,
      invoiceType:          "b2b",
      taxableAmount:        amt(inv.taxableAmount),
      igst:                 amt(inv.igst),
      cgst:                 amt(inv.cgst),
      sgst:                 amt(inv.sgst),
      cess:                 "0.00",
      totalAmount:          amt(inv.taxableAmount + inv.igst + inv.cgst + inv.sgst),
      itcAvailable:         inv.itcAvailable,
      itcReason:            (inv as { itcReason?: string }).itcReason ?? null,
      isRcm:                false,
      sourceSection:        "b2b",
      reconciliationStatus: inv.reconciliationStatus,
    });
  }

  console.log(`  ✓ ${sharma.name} — 6 invoices, reconciled\n`);

  // ── Client 2: Mehta Electronics — in_progress, 2B uploaded, not yet reconciled ──
  console.log("Creating Mehta Electronics…");
  const existingMehta = await db.query.clients.findFirst({
    where: eq(schema.clients.gstin, "27AADCM4567B1Z3"),
  });

  const [mehta] = existingMehta
    ? [existingMehta]
    : await db.insert(schema.clients).values({
        name:             "Mehta Electronics & Components",
        gstin:            "27AADCM4567B1Z3",
        tradeName:        "Mehta Electronics",
        email:            "gst@mehtaelectronics.in",
        whatsappNumber:   "9823456789",
        phone:            "9823456789",
        address:          "Shop 12, Lamington Road, Mumbai, Maharashtra 400007",
        stateCode:        "27",
        registrationType: "regular",
        notes:            "Electronics importer. Mix of B2B and import purchases.",
      }).returning();

  const [mehtaFP] = await db.insert(schema.filingPeriods).values({
    clientId:             mehta.id,
    month:                2,
    year:                 2025,
    status:               "in_progress",
    totalInvoicesInBooks: 5,
    totalInvoicesIn2B:    6,
    matchedCount:         0,
    partialCount:         0,
    mismatchCount:        0,
    gstr2bFileName:       "GSTR2B_27AADCM4567B1Z3_022025.json",
    gstr2bUploadedAt:     new Date("2025-03-14"),
  }).returning();

  const mehtaInvoices = [
    { supplierGstin:"27AABCS5678C1Z6", supplierName:"Samsung India Electronics",  invoiceNumber:"SIE/MUM/3456",  invoiceDate:"03/02/2025", taxableAmount:320000, igst:0,      cgst:28800, sgst:28800, totalAmount:377600, ocrConfidence:97 },
    { supplierGstin:"27AACCK7890D1Z4", supplierName:"Keventers Components Ltd",   invoiceNumber:"KCL-2025-0567", invoiceDate:"07/02/2025", taxableAmount:145000, igst:0,      cgst:13050, sgst:13050, totalAmount:171100, ocrConfidence:89 },
    { supplierGstin:"07AABCA9012E1Z2", supplierName:"Anand Components Delhi",     invoiceNumber:"ACD/FEB/1123",  invoiceDate:"11/02/2025", taxableAmount:78000,  igst:14040,  cgst:0,     sgst:0,     totalAmount:92040,  ocrConfidence:92 },
    { supplierGstin:"27AADCL1234F1Z1", supplierName:"Lokhandwala Electronics",    invoiceNumber:"LE/25/0089",    invoiceDate:"17/02/2025", taxableAmount:55000,  igst:0,      cgst:4950,  sgst:4950,  totalAmount:64900,  ocrConfidence:85 },
    { supplierGstin:"27AABCM3456G1Z9", supplierName:"Mumbai Cable House",         invoiceNumber:"MCH-789",       invoiceDate:"24/02/2025", taxableAmount:18500,  igst:0,      cgst:1665,  sgst:1665,  totalAmount:21830,  ocrConfidence:78 },
  ];

  for (const inv of mehtaInvoices) {
    await db.insert(schema.purchaseInvoices).values({
      filingPeriodId: mehtaFP.id,
      supplierGstin:  inv.supplierGstin,
      supplierName:   inv.supplierName,
      invoiceNumber:  inv.invoiceNumber,
      invoiceDate:    inv.invoiceDate,
      taxableAmount:  amt(inv.taxableAmount),
      igst:           amt(inv.igst),
      cgst:           amt(inv.cgst),
      sgst:           amt(inv.sgst),
      cess:           "0.00",
      totalAmount:    amt(inv.totalAmount),
      itcEligible:    true,
      isRcm:          false,
      extractedByAi:  true,
      ocrConfidence:  String(inv.ocrConfidence),
      sourceFile:     `invoice_${inv.invoiceNumber.replace(/\//g,"_")}.jpg`,
    });
  }

  // 2B has 6 entries — one extra that's not in books (missing_in_books), one with wrong amount
  const mehta2B = [
    { supplierGstin:"27AABCS5678C1Z6", invoiceNumber:"SIE/MUM/3456",  invoiceDate:"03/02/2025", taxableAmount:320000, igst:0,     cgst:28800, sgst:28800, itcAvailable:"Y" },
    { supplierGstin:"27AACCK7890D1Z4", invoiceNumber:"KCL-2025-0567", invoiceDate:"07/02/2025", taxableAmount:150000, igst:0,     cgst:13500, sgst:13500, itcAvailable:"Y" }, // ← amount diff ₹5000
    { supplierGstin:"07AABCA9012E1Z2", invoiceNumber:"ACD/FEB/1123",  invoiceDate:"11/02/2025", taxableAmount:78000,  igst:14040, cgst:0,     sgst:0,     itcAvailable:"Y" },
    { supplierGstin:"27AADCL1234F1Z1", invoiceNumber:"LE/25/0089",    invoiceDate:"17/02/2025", taxableAmount:55000,  igst:0,     cgst:4950,  sgst:4950,  itcAvailable:"Y" },
    { supplierGstin:"27AABCM3456G1Z9", invoiceNumber:"MCH-789",       invoiceDate:"24/02/2025", taxableAmount:18500,  igst:0,     cgst:1665,  sgst:1665,  itcAvailable:"Y" },
    { supplierGstin:"27AABCN5678H1Z7", invoiceNumber:"NPC/2025/0034", invoiceDate:"20/02/2025", taxableAmount:35000,  igst:0,     cgst:3150,  sgst:3150,  itcAvailable:"Y" }, // ← not in books!
  ];

  for (const inv of mehta2B) {
    await db.insert(schema.gstr2bInvoices).values({
      filingPeriodId: mehtaFP.id,
      supplierGstin:  inv.supplierGstin,
      invoiceNumber:  inv.invoiceNumber,
      invoiceDate:    inv.invoiceDate,
      invoiceType:    "b2b",
      taxableAmount:  amt(inv.taxableAmount),
      igst:           amt(inv.igst),
      cgst:           amt(inv.cgst),
      sgst:           amt(inv.sgst),
      cess:           "0.00",
      totalAmount:    amt(inv.taxableAmount + inv.igst + inv.cgst + inv.sgst),
      itcAvailable:   inv.itcAvailable,
      isRcm:          false,
      sourceSection:  "b2b",
    });
  }

  console.log(`  ✓ ${mehta.name} — 5 invoices in books, 6 in 2B, ready to reconcile\n`);

  // ── Client 3: Patel Pharma — fresh, only period created ───────────────────
  console.log("Creating Patel Pharma…");
  const existingPatel = await db.query.clients.findFirst({
    where: eq(schema.clients.gstin, "24AADCP8901C1Z8"),
  });

  const [patel] = existingPatel
    ? [existingPatel]
    : await db.insert(schema.clients).values({
        name:             "Patel Pharmaceuticals Ltd",
        gstin:            "24AADCP8901C1Z8",
        tradeName:        "Patel Pharma",
        email:            "finance@patelpharma.com",
        whatsappNumber:   "9712345678",
        phone:            "9712345678",
        address:          "Unit 7, GIDC Phase 2, Ankleshwar, Gujarat 393002",
        stateCode:        "24",
        registrationType: "regular",
        notes:            "Pharmaceutical manufacturer. High volume of inter-state purchases.",
      }).returning();

  await db.insert(schema.filingPeriods).values({
    clientId: patel.id,
    month:    2,
    year:     2025,
    status:   "pending",
  });

  // Also add a filed period from Jan 2025 for history
  const [patelJanFP] = await db.insert(schema.filingPeriods).values({
    clientId:             patel.id,
    month:                1,
    year:                 2025,
    status:               "filed",
    totalInvoicesInBooks: 8,
    totalInvoicesIn2B:    8,
    matchedCount:         7,
    partialCount:         1,
    mismatchCount:        0,
    itcIgst:              "124500.00",
    itcCgst:              "0.00",
    itcSgst:              "0.00",
    itcCess:              "0.00",
  }).returning();

  console.log(`  ✓ ${patel.name} — Feb pending, Jan filed\n`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("✅ Seed complete!\n");
  console.log("Clients created:");
  console.log(`  1. ${sharma.name} (${sharma.gstin}) — Feb 2025 RECONCILED`);
  console.log(`     • 4 matched, 1 partial, 1 mismatch (ITC blocked)`);
  console.log(`     • Net ITC: ₹31,500 CGST + ₹31,500 SGST + ₹7,560 IGST`);
  console.log();
  console.log(`  2. ${mehta.name} (${mehta.gstin}) — Feb 2025 IN PROGRESS`);
  console.log(`     • 5 invoices in books, 6 in GSTR-2B`);
  console.log(`     • Hit Reconcile to see: 1 amount diff, 1 missing in books`);
  console.log();
  console.log(`  3. ${patel.name} (${patel.gstin}) — Feb 2025 PENDING`);
  console.log(`     • Ready to upload invoices from scratch`);
  console.log(`     • Jan 2025 filed period visible for history`);
  console.log();
  console.log("Test GSTR-2B JSON file: run `npx tsx scripts/make-sample-gstr2b.ts` to generate");
}

seed().catch((e) => { console.error(e); process.exit(1); });