export default function HeaderSkeleton() {
  return (
    <div className="dashboard-topbar sticky top-0 z-40 shrink-0 animate-pulse">
      <div className="flex items-center justify-between gap-4 min-h-[3.25rem] px-[var(--space-4)] sm:px-[var(--space-5)] md:px-[var(--space-6)]">
        <div className="hidden sm:flex gap-3">
          <div className="h-5 w-16 rounded bg-muted" />
          <div className="h-5 w-24 rounded bg-muted" />
        </div>
        <div className="flex gap-2 ml-auto">
          <div className="h-9 w-9 rounded-lg bg-muted" />
          <div className="h-9 w-9 rounded-lg bg-muted" />
          <div className="h-9 w-24 rounded-lg bg-muted hidden sm:block" />
        </div>
      </div>
    </div>
  );
}
