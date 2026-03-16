// src/lib/gstr2b-parser.ts
export interface Gstr2bEntry {
  supplierGstin:string; supplierName:string|null; supplierTradeName:string|null;
  invoiceNumber:string; invoiceDate:string;
  invoiceType:"b2b"|"b2ba"|"cdnr"|"impg"|"isd";
  taxableAmount:number; igst:number; cgst:number; sgst:number; cess:number; totalAmount:number;
  itcAvailable:string; itcReason:string|null; isRcm:boolean; sourceSection:string;
}

export function parseGstr2bJson(raw: unknown): Gstr2bEntry[] {
  const entries: Gstr2bEntry[] = [];
  try {
    const json = raw as Record<string,unknown>;
    const docdata = (json?.data as Record<string,unknown>)?.docdata ?? (json?.docdata as Record<string,unknown>) ?? json;
    const doc = docdata as Record<string,unknown>;

    // B2B
    for (const supplier of (doc?.b2b as unknown[]) ?? []) {
      const s = supplier as Record<string,unknown>;
      const gstin = String(s.ctin ?? s.gstin ?? "");
      const name  = String(s.trdnm ?? s.tradeName ?? "");
      for (const inv of (s.inv as unknown[]) ?? []) {
        const i = inv as Record<string,unknown>;
        const items = (i.items as unknown[]) ?? [i];
        let taxable=0, igst=0, cgst=0, sgst=0, cess=0;
        for (const it of items) {
          const x = it as Record<string,unknown>;
          taxable += n(x.txval ?? x.txvl ?? 0);
          igst    += n(x.igst ?? x.iamt ?? 0);
          cgst    += n(x.cgst ?? x.camt ?? 0);
          sgst    += n(x.sgst ?? x.samt ?? 0);
          cess    += n(x.cess ?? x.csamt ?? 0);
        }
        entries.push({
          supplierGstin:gstin, supplierName:name||null, supplierTradeName:name||null,
          invoiceNumber:String(i.inum ?? i.invNo ?? ""),
          invoiceDate:nd(String(i.idt ?? i.invDt ?? "")),
          invoiceType:"b2b", igst, cgst, sgst, cess,
          taxableAmount:taxable, totalAmount:taxable+igst+cgst+sgst+cess,
          itcAvailable:String(i.itcavl ?? i.itcAval ?? "Y"),
          itcReason:String(i.rsn ?? "") || null,
          isRcm:String(i.rchrg ?? i.rev ?? "N").toUpperCase()==="Y",
          sourceSection:"b2b",
        });
      }
    }

    // CDNR
    for (const supplier of (doc?.cdnr as unknown[]) ?? []) {
      const s = supplier as Record<string,unknown>;
      const gstin = String(s.ctin ?? "");
      for (const note of (s.nt as unknown[]) ?? []) {
        const nt = note as Record<string,unknown>;
        const items = (nt.items as unknown[]) ?? [nt];
        let taxable=0, igst=0, cgst=0, sgst=0, cess=0;
        for (const it of items) {
          const x = it as Record<string,unknown>;
          taxable += n(x.txval ?? 0); igst += n(x.igst ?? 0);
          cgst += n(x.cgst ?? 0); sgst += n(x.sgst ?? 0); cess += n(x.cess ?? 0);
        }
        entries.push({
          supplierGstin:gstin, supplierName:null, supplierTradeName:null,
          invoiceNumber:String(nt.nt_num ?? nt.ntNum ?? ""),
          invoiceDate:nd(String(nt.nt_dt ?? nt.ntDt ?? "")),
          invoiceType:"cdnr", igst, cgst, sgst, cess,
          taxableAmount:taxable, totalAmount:taxable+igst+cgst+sgst+cess,
          itcAvailable:String(nt.itcavl ?? "Y"), itcReason:null, isRcm:false, sourceSection:"cdnr",
        });
      }
    }

    // IMPG
    for (const imp of (doc?.impg as unknown[]) ?? []) {
      const i = imp as Record<string,unknown>;
      const taxable = n(i.txval ?? 0), igst = n(i.igst ?? 0), cess = n(i.cess ?? 0);
      entries.push({
        supplierGstin:"IMPORT", supplierName:String(i.portCode ?? "Import"), supplierTradeName:null,
        invoiceNumber:String(i.beNum ?? i.refDt ?? ""),
        invoiceDate:nd(String(i.refDt ?? "")),
        invoiceType:"impg", igst, cgst:0, sgst:0, cess,
        taxableAmount:taxable, totalAmount:taxable+igst+cess,
        itcAvailable:"Y", itcReason:null, isRcm:false, sourceSection:"impg",
      });
    }
  } catch(e) { console.error("GSTR-2B parse error:", e); }
  return entries;
}

export function parseGstr2bExcel(rows: Record<string,string>[]): Gstr2bEntry[] {
  return rows.map(row => {
    const gstin     = c(row,["GSTIN of Supplier","GSTIN","Supplier GSTIN","ctin"]);
    const invNo     = c(row,["Invoice Number","Invoice No","Invoice No.","inum"]);
    const invDate   = c(row,["Invoice Date","Invoice Dt","idt"]);
    const taxable   = nc(row,["Taxable Value","Taxable Amt","txval"]);
    const igst      = nc(row,["Integrated Tax Amount","IGST","igst"]);
    const cgst      = nc(row,["Central Tax Amount","CGST","cgst"]);
    const sgst      = nc(row,["State/UT Tax Amount","SGST","sgst"]);
    const cess      = nc(row,["Cess Amount","Cess","cess"]);
    const itc       = c(row,["ITC Availability","ITC Available","itcavl"]) || "Y";
    const rcm       = c(row,["Reverse Charge","rchrg"]);
    const name      = c(row,["Trade/Legal Name","Trade Name","Legal Name","trdnm"]);
    if (!gstin || !invNo) return null;
    return {
      supplierGstin:gstin.trim().toUpperCase(), supplierName:name||null, supplierTradeName:name||null,
      invoiceNumber:invNo.trim(), invoiceDate:nd(invDate), invoiceType:"b2b" as const,
      taxableAmount:taxable, igst, cgst, sgst, cess, totalAmount:taxable+igst+cgst+sgst+cess,
      itcAvailable:itc.toUpperCase(), itcReason:null, isRcm:rcm?.toUpperCase()==="Y", sourceSection:"b2b",
    };
  }).filter(Boolean) as Gstr2bEntry[];
}

function n(v: unknown): number { const x=parseFloat(String(v??0)); return isNaN(x)?0:x; }
function nc(row: Record<string,string>, keys: string[]): number { return n(c(row,keys)??0); }
function c(row: Record<string,string>, keys: string[]): string {
  for (const k of keys) if (row[k]!==undefined && row[k]!=="") return String(row[k]);
  return "";
}
export function nd(raw: string): string {
  if (!raw) return "";
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;
  if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) return raw.replace(/-/g,"/");
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) { const [y,m,d]=raw.split("T")[0].split("-"); return `${d}/${m}/${y}`; }
  const serial=parseInt(raw);
  if (!isNaN(serial)&&serial>40000) {
    const dt=new Date((serial-25569)*86400*1000);
    return `${String(dt.getUTCDate()).padStart(2,"0")}/${String(dt.getUTCMonth()+1).padStart(2,"0")}/${dt.getUTCFullYear()}`;
  }
  return raw;
}