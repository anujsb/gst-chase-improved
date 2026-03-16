// src/app/(dashboard)/clients/[id]/periods/[periodId]/page.tsx

import { notFound } from "next/navigation";
import Link from "next/link";
import { db, filingPeriods } from "@/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const FULL_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default async function PeriodDetailPage({ params }: { params: { id: string; periodId: string } }) {
  const period = await db.query.filingPeriods.findFirst({
    where: eq(filingPeriods.id, params.periodId),
    with: { client: true },
  });

  if (!period || period.clientId !== params.id) notFound();

  const steps = [
    {
      label: "Upload Invoices",
      desc: "Drop purchase invoices (photos/PDFs). AI extracts all data automatically.",
      href: `/clients/${params.id}/periods/${params.periodId}/invoices`,
      done: (period.totalInvoicesInBooks ?? 0) > 0,
      count: period.totalInvoicesInBooks ?? 0,
      countLabel: "invoices",
      disabled: false,
    },
    {
      label: "Upload GSTR-2B",
      desc: "Upload the GSTR-2B JSON or Excel downloaded from the GST portal.",
      href: `/clients/${params.id}/periods/${params.periodId}/gstr2b`,
      done: (period.totalInvoicesIn2B ?? 0) > 0,
      count: period.totalInvoicesIn2B ?? 0,
      countLabel: "entries",
      disabled: false,
    },
    {
      label: "Reconcile & Review",
      desc: "AI matches invoices against GSTR-2B. Green / Yellow / Red results with fix suggestions.",
      href: `/clients/${params.id}/periods/${params.periodId}/reconcile`,
      done: period.status === "reconciled" || period.status === "filed",
      count: (period.matchedCount ?? 0) + (period.partialCount ?? 0) + (period.mismatchCount ?? 0),
      countLabel: "reviewed",
      disabled: (period.totalInvoicesInBooks ?? 0) === 0 || (period.totalInvoicesIn2B ?? 0) === 0,
    },
    {
      label: "Export GSTR-3B",
      desc: "Pre-filled ITC figures. Download as Excel or JSON for direct portal upload.",
      href: `/clients/${params.id}/periods/${params.periodId}/export`,
      done: period.status === "filed",
      count: null,
      countLabel: null,
      disabled: period.status !== "reconciled" && period.status !== "filed",
    },
  ];

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-zinc-400 mb-6">
        <Link href="/clients" className="hover:text-zinc-700 transition-colors">Clients</Link>
        <span>/</span>
        <Link href={`/clients/${params.id}`} className="hover:text-zinc-700 transition-colors">{period.client.name}</Link>
        <span>/</span>
        <span className="text-zinc-700">{FULL_MONTHS[period.month - 1]} {period.year}</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-zinc-900">{MONTHS[period.month - 1]} {period.year}</h1>
          <span className={`text-xs px-2 py-1 rounded-md border ${
            period.status === "filed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
            period.status === "reconciled" ? "bg-blue-50 text-blue-700 border-blue-200" :
            period.status === "in_progress" ? "bg-amber-50 text-amber-700 border-amber-200" :
            "bg-zinc-50 text-zinc-600 border-zinc-200"
          }`}>{period.status.replace("_", " ")}</span>
        </div>
        <p className="text-sm text-zinc-500 mt-1">{period.client.name} · {period.client.gstin}</p>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, i) => {
          const inner = (
            <>
              {/* Step number / check */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-semibold ${
                step.done ? "bg-emerald-50 border border-emerald-200 text-emerald-600" :
                step.disabled ? "bg-zinc-100 border border-zinc-200 text-zinc-300" :
                "bg-zinc-100 border border-zinc-200 text-zinc-500"
              }`}>
                {step.done
                  ? <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                  : i + 1
                }
              </div>

              {/* Text */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-medium ${step.disabled ? "text-zinc-400" : "text-zinc-900"}`}>{step.label}</p>
                  {step.done && step.count !== null && step.count > 0 && (
                    <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                      {step.count} {step.countLabel}
                    </span>
                  )}
                </div>
                <p className={`text-xs mt-0.5 ${step.disabled ? "text-zinc-300" : "text-zinc-500"}`}>{step.desc}</p>
              </div>

              {!step.disabled && (
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-zinc-300 group-hover:text-zinc-500 transition-colors shrink-0">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              )}
            </>
          );

          return step.disabled ? (
            <div key={step.label} className="flex items-center gap-4 bg-white border border-zinc-200 rounded-xl px-6 py-4 opacity-40 cursor-not-allowed">
              {inner}
            </div>
          ) : (
            <Link key={step.label} href={step.href} className="group flex items-center gap-4 bg-white border border-zinc-200 rounded-xl px-6 py-4 hover:border-zinc-300 hover:shadow-sm transition-all">
              {inner}
            </Link>
          );
        })}
      </div>

      {/* ITC Summary when reconciled */}
      {(period.status === "reconciled" || period.status === "filed") && (
        <div className="mt-6 bg-white border border-zinc-200 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-zinc-900 mb-4">ITC Summary for GSTR-3B</h3>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "IGST", value: period.itcIgst },
              { label: "CGST", value: period.itcCgst },
              { label: "SGST/UTGST", value: period.itcSgst },
              { label: "Cess", value: period.itcCess },
            ].map((item) => (
              <div key={item.label} className="text-center bg-zinc-50 rounded-lg p-3">
                <p className="text-xs text-zinc-500 mb-1">{item.label}</p>
                <p className="text-base font-semibold text-zinc-900 tabular-nums">
                  ₹{Number(item.value ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}