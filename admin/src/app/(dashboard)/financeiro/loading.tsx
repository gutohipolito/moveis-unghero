export default function LoadingFinanceiro() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-slate-100" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-slate-100" />
        ))}
      </div>
      <div className="h-12 rounded-xl bg-slate-100" />
      <div className="h-80 rounded-xl bg-slate-100" />
    </div>
  );
}
