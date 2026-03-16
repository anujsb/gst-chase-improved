// src/app/(marketing)/page.tsx

import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-zinc-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M7 2l5 5-5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-sm font-semibold text-zinc-900">GSTFlow</span>
        </div>
        <Link href="/dashboard" className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors">
          Open Dashboard →
        </Link>
      </nav>

      <div className="max-w-3xl mx-auto px-8 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-100 rounded-full text-xs text-zinc-600 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
          Built for Indian Chartered Accountants
        </div>
        <h1 className="text-5xl font-semibold text-zinc-900 leading-tight tracking-tight mb-6">
          GST filing,<br />
          <span className="text-zinc-400">without the chaos.</span>
        </h1>
        <p className="text-lg text-zinc-500 max-w-xl mx-auto mb-10">
          Drop your client's invoices. AI reads every PDF and photo, reconciles against GSTR-2B,
          flags mismatches, and pre-fills GSTR-3B. Done in minutes, not hours.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/dashboard" className="px-6 py-3 bg-zinc-900 text-white text-sm font-medium rounded-xl hover:bg-zinc-800 transition-colors">
            Get Started
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 pb-24">
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: "📄", title: "AI Invoice OCR", desc: "Drop photos or PDFs. Gemini extracts invoice number, GSTIN, date, and tax amounts automatically." },
            { icon: "🔁", title: "GSTR-2B Reconciliation", desc: "Green, yellow, red. Every invoice matched against supplier-reported data with fix suggestions." },
            { icon: "📊", title: "GSTR-3B Export", desc: "ITC figures auto-calculated. Export as Excel or JSON ready for portal upload." },
          ].map((f) => (
            <div key={f.title} className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6">
              <div className="text-2xl mb-3">{f.icon}</div>
              <p className="text-sm font-semibold text-zinc-900 mb-1.5">{f.title}</p>
              <p className="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-zinc-100 px-8 py-5 flex items-center justify-between">
        <p className="text-xs text-zinc-400">© 2025 GSTFlow. Built for CAs.</p>
        <p className="text-xs text-zinc-400">GSTN compliant · India</p>
      </div>
    </div>
  );
}