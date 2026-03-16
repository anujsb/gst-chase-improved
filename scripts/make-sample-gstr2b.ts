// scripts/make-sample-gstr2b.ts
// Generates a sample GSTR-2B JSON file for Mehta Electronics (Feb 2025)
// Upload this on the GSTR-2B page to test the full reconciliation flow.
// Run with: npx tsx scripts/make-sample-gstr2b.ts

import * as fs from "fs";
import * as path from "path";

const gstr2b = {
  data: {
    gstin: "27AADCM4567B1Z3",
    fp:    "022025",
    docdata: {
      b2b: [
        {
          ctin:  "27AABCS5678C1Z6",
          trdnm: "Samsung India Electronics",
          inv: [{
            inum: "SIE/MUM/3456",
            idt:  "03/02/2025",
            itcavl: "Y",
            rchrg: "N",
            items: [{ txval: 320000, igst: 0, cgst: 28800, sgst: 28800, cess: 0 }]
          }]
        },
        {
          ctin:  "27AACCK7890D1Z4",
          trdnm: "Keventers Components Ltd",
          inv: [{
            inum: "KCL-2025-0567",
            idt:  "07/02/2025",
            itcavl: "Y",
            rchrg: "N",
            // ← Deliberate: ₹5000 more than books to trigger partial match
            items: [{ txval: 150000, igst: 0, cgst: 13500, sgst: 13500, cess: 0 }]
          }]
        },
        {
          ctin:  "07AABCA9012E1Z2",
          trdnm: "Anand Components Delhi",
          inv: [{
            inum: "ACD/FEB/1123",
            idt:  "11/02/2025",
            itcavl: "Y",
            rchrg: "N",
            items: [{ txval: 78000, igst: 14040, cgst: 0, sgst: 0, cess: 0 }]
          }]
        },
        {
          ctin:  "27AADCL1234F1Z1",
          trdnm: "Lokhandwala Electronics",
          inv: [{
            inum: "LE/25/0089",
            idt:  "17/02/2025",
            itcavl: "Y",
            rchrg: "N",
            items: [{ txval: 55000, igst: 0, cgst: 4950, sgst: 4950, cess: 0 }]
          }]
        },
        {
          ctin:  "27AABCM3456G1Z9",
          trdnm: "Mumbai Cable House",
          inv: [{
            inum: "MCH-789",
            idt:  "24/02/2025",
            itcavl: "Y",
            rchrg: "N",
            items: [{ txval: 18500, igst: 0, cgst: 1665, sgst: 1665, cess: 0 }]
          }]
        },
        {
          // ← This supplier/invoice is NOT in books → will show as "Missing in Books"
          ctin:  "27AABCN5678H1Z7",
          trdnm: "National Parts Corporation",
          inv: [{
            inum: "NPC/2025/0034",
            idt:  "20/02/2025",
            itcavl: "Y",
            rchrg: "N",
            items: [{ txval: 35000, igst: 0, cgst: 3150, sgst: 3150, cess: 0 }]
          }]
        }
      ],
      cdnr: [],
      impg: []
    }
  }
};

const outPath = path.join(process.cwd(), "GSTR2B_27AADCM4567B1Z3_022025.json");
fs.writeFileSync(outPath, JSON.stringify(gstr2b, null, 2));
console.log(`✅ Sample GSTR-2B JSON written to: ${outPath}`);
console.log();
console.log("Upload this file on the GSTR-2B page for Mehta Electronics → Feb 2025");
console.log("Expected reconciliation result:");
console.log("  ✓ 4 matched (Samsung, Anand, Lokhandwala, Mumbai Cable)");
console.log("  ~ 1 partial  (Keventers — ₹5000 taxable value diff)");
console.log("  ? 1 missing in books (National Parts — in 2B but not recorded)");