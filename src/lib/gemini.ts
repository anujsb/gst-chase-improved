// src/lib/gemini.ts

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export interface ExtractedInvoice {
  invoiceNumber: string | null;
  invoiceDate: string | null;
  supplierGstin: string | null;
  supplierName: string | null;
  taxableAmount: number | null;
  igst: number | null;
  cgst: number | null;
  sgst: number | null;
  cess: number | null;
  totalAmount: number | null;
  isRcm: boolean;
  confidence: number;
  rawText: string;
}

const PROMPT = `You are an expert at reading Indian GST purchase invoices.
Extract these fields from the invoice image/document:
- invoiceNumber: Invoice/bill number exactly as printed
- invoiceDate: Date in DD/MM/YYYY format
- supplierGstin: 15-char GSTIN of the SUPPLIER (not buyer)
- supplierName: Legal name of the supplier
- taxableAmount: Taxable value before GST, as a number
- igst: IGST amount as number (0 if not applicable)
- cgst: CGST amount as number (0 if not applicable)
- sgst: SGST/UTGST amount as number (0 if not applicable)
- cess: Cess amount as number (0 if not applicable)
- totalAmount: Total invoice amount including GST
- isRcm: true if Reverse Charge is marked Yes, else false
- confidence: 0-100 confidence in extraction accuracy
- rawText: short summary of what you see (max 80 chars)

Rules:
- Return ONLY valid JSON, no markdown, no explanation.
- Amounts: plain numbers, no commas or symbols (12500.00 not ₹12,500.00).
- Use null for any field you cannot find.
- If multiple invoices visible, extract only the primary one.`;

export async function extractInvoiceFromBase64(base64: string, mimeType: string): Promise<ExtractedInvoice> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: mimeType, data: base64 } }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
    }),
  });

  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  try {
    return JSON.parse(clean) as ExtractedInvoice;
  } catch {
    return {
      invoiceNumber: null, invoiceDate: null, supplierGstin: null, supplierName: null,
      taxableAmount: null, igst: null, cgst: null, sgst: null, cess: null,
      totalAmount: null, isRcm: false, confidence: 0, rawText: text.slice(0, 80),
    };
  }
}

export function isValidGSTIN(gstin: string | null): boolean {
  if (!gstin) return false;
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin);
}