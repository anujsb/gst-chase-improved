// src/components/ui-custom.tsx

import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; class: string }> = {
  pending:          { label: "Pending",          class: "bg-zinc-100 text-zinc-600 border-zinc-200" },
  in_progress:      { label: "In Progress",      class: "bg-amber-50 text-amber-700 border-amber-200" },
  reconciled:       { label: "Reconciled",       class: "bg-blue-50 text-blue-700 border-blue-200" },
  filed:            { label: "Filed",            class: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  matched:          { label: "Matched",          class: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  partial:          { label: "Partial",          class: "bg-amber-50 text-amber-700 border-amber-200" },
  mismatch:         { label: "Mismatch",         class: "bg-red-50 text-red-700 border-red-200" },
  missing_in_2b:    { label: "Missing in 2B",    class: "bg-red-50 text-red-700 border-red-200" },
  missing_in_books: { label: "Missing in Books", class: "bg-orange-50 text-orange-700 border-orange-200" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { label: status, class: "bg-zinc-100 text-zinc-600 border-zinc-200" };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border", config.class)}>
      {config.label}
    </span>
  );
}

export function GstinBadge({ gstin }: { gstin: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-50 border border-zinc-200 font-mono text-xs text-zinc-700">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
      {gstin}
    </span>
  );
}