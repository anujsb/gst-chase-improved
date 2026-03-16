// src/app/(dashboard)/clients/new/NewClientForm.tsx

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/actions/clients";
import { validateGSTIN, GST_STATES } from "@/lib/validators";

const REGISTRATION_TYPES = [
  { value: "regular",      label: "Regular Taxpayer" },
  { value: "composition",  label: "Composition Scheme" },
  { value: "sei",          label: "SEZ / Special Entity" },
  { value: "unregistered", label: "Unregistered" },
];

const inputClass =
  "w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 placeholder:text-zinc-300 transition-colors";

export default function NewClientForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [gstin, setGstin] = useState("");
  const [gstinError, setGstinError] = useState<string | null>(null);
  const [detectedState, setDetectedState] = useState<string | null>(null);

  function handleGstinChange(val: string) {
    const upper = val.toUpperCase().replace(/[^A-Z0-9]/g, "");
    setGstin(upper);
    setDetectedState(upper.length >= 2 ? (GST_STATES[upper.substring(0, 2)] ?? null) : null);
    if (upper.length === 15) {
      setGstinError(validateGSTIN(upper) ? null : "Invalid GSTIN format");
    } else {
      setGstinError(null);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validateGSTIN(gstin)) { setGstinError("Invalid GSTIN format"); return; }
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createClient(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="p-8">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 mb-6 transition-colors"
      >
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
        Back
      </button>

      <div className="max-w-2xl bg-white border border-zinc-200 rounded-2xl overflow-hidden">
        <div className="px-8 py-6 border-b border-zinc-100">
          <h1 className="text-lg font-semibold text-zinc-900">Add New Client</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Enter client details to begin managing their GST filings.</p>
        </div>

        {error && (
          <div className="mx-8 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-6">
          <Section title="Business Identity">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Legal Business Name" required className="col-span-2">
                <input name="name" type="text" required placeholder="As per GST registration" className={inputClass} />
              </Field>
              <Field label="Trade Name">
                <input name="tradeName" type="text" placeholder="DBA / trade name" className={inputClass} />
              </Field>
              <Field label="Registration Type">
                <select name="registrationType" className={inputClass}>
                  {REGISTRATION_TYPES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>

          <Section title="GST Details">
            <Field
              label="GSTIN" required
              hint={detectedState
                ? <span className="text-emerald-600">✓ {detectedState}</span>
                : "15-character GST Identification Number"}
              error={gstinError}
            >
              <input
                name="gstin" type="text" value={gstin}
                onChange={(e) => handleGstinChange(e.target.value)}
                required maxLength={15} placeholder="e.g. 27AABCU9603R1ZM"
                className={`${inputClass} font-mono uppercase tracking-wide ${
                  gstinError ? "border-red-300" :
                  gstin.length === 15 && !gstinError ? "border-emerald-300" : ""
                }`}
              />
            </Field>
          </Section>

          <Section title="Contact Details">
            <div className="grid grid-cols-2 gap-4">
              <Field label="WhatsApp Number" hint="For reports & reminders">
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-zinc-200 bg-zinc-50 text-zinc-500 text-sm">+91</span>
                  <input name="whatsappNumber" type="tel" placeholder="9876543210" maxLength={10} className={`${inputClass} rounded-l-none`} />
                </div>
              </Field>
              <Field label="Phone">
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-zinc-200 bg-zinc-50 text-zinc-500 text-sm">+91</span>
                  <input name="phone" type="tel" placeholder="9876543210" maxLength={10} className={`${inputClass} rounded-l-none`} />
                </div>
              </Field>
              <Field label="Email" className="col-span-2">
                <input name="email" type="email" placeholder="accounts@business.com" className={inputClass} />
              </Field>
            </div>
          </Section>

          <Section title="Address">
            <Field label="Business Address">
              <textarea name="address" rows={3} placeholder="Registered business address" className={`${inputClass} resize-none`} />
            </Field>
          </Section>

          <Section title="Internal Notes" optional>
            <Field label="Notes">
              <textarea name="notes" rows={2} placeholder="Internal notes (not shared with client)" className={`${inputClass} resize-none`} />
            </Field>
          </Section>

          <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
            <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 transition-colors">
              Cancel
            </button>
            <button
              type="submit" disabled={isPending || !!gstinError}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? "Saving…" : "Save Client →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({ title, optional, children }: { title: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{title}</h3>
        {optional && <span className="text-xs text-zinc-300">optional</span>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, required, hint, error, className, children }: {
  label: string; required?: boolean; hint?: React.ReactNode;
  error?: string | null; className?: string; children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-zinc-700 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error
        ? <p className="text-xs text-red-500 mt-1">{error}</p>
        : hint ? <p className="text-xs text-zinc-400 mt-1">{hint}</p>
        : null}
    </div>
  );
}