export default function LoadingFactory() {
  return (
    <div className="flex-1 min-h-0 flex gap-3 overflow-hidden animate-pulse">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="h-full min-h-96 w-72 shrink-0 rounded-xl bg-slate-100" />
      ))}
    </div>
  );
}
