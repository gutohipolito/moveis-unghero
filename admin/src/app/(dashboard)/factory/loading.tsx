export default function LoadingFactory() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-slate-100" />
        ))}
      </div>
      <div className="h-9 rounded-xl bg-slate-100" />
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-96 rounded-xl bg-slate-100" />
        ))}
      </div>
    </div>
  );
}
