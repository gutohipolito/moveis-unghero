export default function LoadingAgenda() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-14 rounded-xl bg-slate-100" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-[600px] rounded-xl bg-slate-100" />
        <div className="h-[600px] rounded-xl bg-slate-100" />
      </div>
    </div>
  );
}
