// src/lib/gemini.ts
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export interface ExtractedInvoice {
  invoiceNumber:  string | null;
  invoiceDate:    string | null;
  supplierGstin:  string | null;
  supplierName:   string | null;
  taxableAmount:  number | null;
  igst:           number | null;
  cgst:           number | null;
  sgst:           number | null;
  cess:           number | null;
  totalAmount:    number | null;
  isRcm:          boolean;
  confidence:     number;
  rawText:        string;
}

const PROMPT = `You are an expert at reading Indian GST purchase invoices.
Extract these fields and return ONLY a valid JSON object — no markdown, no explanation:
{
  "invoiceNumber": string | null,
  "invoiceDate": "DD/MM/YYYY" | null,
  "supplierGstin": "15-char GSTIN of SUPPLIER (not buyer)" | null,
  "supplierName": string | null,
  "taxableAmount": number | null,
  "igst": number | null,
  "cgst": number | null,
  "sgst": number | null,
  "cess": number | null,
  "totalAmount": number | null,
  "isRcm": boolean,
  "confidence": 0-100,
  "rawText": "short summary max 80 chars"
}
Rules: amounts as plain numbers (12500.00 not ₹12,500). Use null if not found. isRcm=true only if Reverse Charge=Yes on invoice.`;

export async function extractInvoiceFromBase64(base64: string, mimeType: string): Promise<ExtractedInvoice> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set in .env.local");

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: mimeType, data: base64 } }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
    }),
  });

  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const clean = text.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim();

  try {
    return JSON.parse(clean) as ExtractedInvoice;
  } catch {
    return {
      invoiceNumber:null, invoiceDate:null, supplierGstin:null, supplierName:null,
      taxableAmount:null, igst:null, cgst:null, sgst:null, cess:null,
      totalAmount:null, isRcm:false, confidence:0, rawText:text.slice(0,80),
    };
  }
}

export function isValidGSTIN(gstin: string | null): boolean {
  if (!gstin) return false;
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin);
}