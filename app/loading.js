export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        {/* header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-56 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-80 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="h-10 w-28 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>

        {/* insights row */}
        <div className="h-32 w-full animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />

        {/* stats row */}
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>

        {/* chart + side */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="h-80 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-80 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800 md:col-span-2" />
        </div>
      </div>
    </div>
  );
}
