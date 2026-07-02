export default function LoadingProject() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Botão voltar */}
      <div className="h-8 w-28 rounded-lg bg-slate-100" />
      {/* Card principal */}
      <div className="h-44 rounded-xl bg-slate-100" />
      {/* Radar SLA */}
      <div className="h-32 rounded-xl bg-slate-100" />
      {/* Tabs */}
      <div className="h-10 rounded-xl bg-slate-100" />
      {/* Grid ambientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-36 rounded-xl bg-slate-100" />
        ))}
      </div>
    </div>
  );
}
