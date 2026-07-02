// Skeleton de loading instantâneo para o CRM/Projetos
export default function LoadingCRM() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Topbar de métricas */}
      <div className="h-20 rounded-xl bg-slate-100" />
      {/* Kanban columns */}
      <div className="flex gap-4 overflow-hidden">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-shrink-0 w-80 space-y-3">
            <div className="h-12 rounded-t-xl bg-slate-100" />
            {[1, 2, 3].map((j) => (
              <div key={j} className="h-28 rounded-xl bg-slate-100" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
