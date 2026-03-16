// src/app/(dashboard)/dashboard/loading.tsx
export default function Loading() {
  return (
    <div className="p-8">
      <div className="h-8 w-48 bg-zinc-100 rounded-lg animate-pulse mb-2" />
      <div className="h-4 w-32 bg-zinc-100 rounded animate-pulse mb-8" />
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-zinc-100 rounded-xl animate-pulse" />)}
      </div>
      <div className="h-64 bg-zinc-100 rounded-xl animate-pulse" />
    </div>
  );
}