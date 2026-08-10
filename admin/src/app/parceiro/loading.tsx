export default function ParceiroLoading() {
  return (
    <div className="min-h-[60vh] flex flex-col gap-6 px-4 py-10 sm:px-6 animate-pulse">
      <div className="space-y-3 max-w-lg">
        <div className="h-3 w-24 rounded bg-white/10" />
        <div className="h-9 w-56 rounded-lg bg-white/15" />
        <div className="h-4 w-72 max-w-full rounded bg-white/10" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl">
        <div className="h-20 rounded-2xl bg-white/10" />
        <div className="h-20 rounded-2xl bg-white/10" />
        <div className="h-20 rounded-2xl bg-white/10" />
        <div className="h-20 rounded-2xl bg-white/10" />
      </div>
    </div>
  );
}
