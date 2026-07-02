export default function LoadingEstoque() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Cabeçalho */}
      <div className="h-16 rounded-xl bg-slate-100" />
      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-24 rounded-2xl bg-slate-100" />
        <div className="h-24 rounded-2xl bg-slate-100" />
        <div className="h-24 rounded-2xl bg-slate-100" />
      </div>
      {/* Barra de Abas e Filtros */}
      <div className="h-14 rounded-xl bg-slate-100" />
      {/* Tabela de Insumos/Fornecedores */}
      <div className="h-[400px] rounded-xl bg-slate-100" />
    </div>
  );
}
