export default function ClienteDetailsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-muted" />
        <div className="h-4 w-36 rounded bg-muted" />
      </div>
      <div className="h-40 rounded-xl bg-muted" />
      <div className="h-11 rounded-xl bg-muted" />
      <div className="h-72 rounded-xl bg-muted" />
    </div>
  );
}
