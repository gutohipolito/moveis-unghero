"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Search,
  TrendingUp,
  Wallet,
  Target,
  Percent,
  ArrowUpRight,
  Info,
  ArrowUpDown,
} from "lucide-react";
import type { ProfitabilityData, ProjectProfitRow } from "@/app/actions/profitability";

const PROJECT_STATUS_LABELS: Record<string, string> = {
  LEAD: "Lead",
  ORCAMENTO: "Orçamento",
  NEGOCIACAO: "Negociação",
  CONFERENCIA_TECNICA: "Conf. Técnica",
  APROVADO: "Aprovado",
  PRODUCAO: "Produção",
  INSTALACAO: "Instalação",
  FINALIZADO: "Finalizado",
  PERDIDO: "Perdido",
};

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

const formatPct = (val: number) => `${val.toFixed(1).replace(".", ",")}%`;

type SortKey = "receita" | "custo" | "margem" | "margemPct";

function marginTone(pct: number, hasCost: boolean) {
  if (!hasCost) return "text-slate-400";
  if (pct < 0) return "text-rose-600";
  if (pct < 25) return "text-amber-600";
  return "text-emerald-600";
}

export default function RentabilidadeClient({ data }: { data: ProfitabilityData }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<SortKey>("receita");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  const statuses = useMemo(() => {
    const set = new Set<string>();
    for (const r of data.rows) set.add(r.status);
    return Array.from(set);
  }, [data.rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = data.rows.filter((r) => {
      const matchesSearch = !q || r.clientName.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
    return list.sort((a, b) => {
      const va = a[sortBy];
      const vb = b[sortBy];
      return order === "asc" ? va - vb : vb - va;
    });
  }, [data.rows, search, statusFilter, sortBy, order]);

  const totalMargemPct =
    data.totalReceita > 0 ? (data.totalMargem / data.totalReceita) * 100 : 0;

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setOrder("desc");
    }
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 glass-card border-border flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
              Receita contratada
            </span>
            <strong className="text-lg text-foreground font-extrabold privacy-value">
              {formatCurrency(data.totalReceita)}
            </strong>
          </div>
        </Card>
        <Card className="p-5 glass-card border-border flex items-center gap-4">
          <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
              Custo total
            </span>
            <strong className="text-lg text-foreground font-extrabold privacy-value">
              {formatCurrency(data.totalCusto)}
            </strong>
          </div>
        </Card>
        <Card className="p-5 glass-card border-border flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
              Margem total
            </span>
            <strong
              className={`text-lg font-extrabold privacy-value ${
                data.totalMargem >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {formatCurrency(data.totalMargem)}
            </strong>
          </div>
        </Card>
        <Card className="p-5 glass-card border-border flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
            <Percent className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
              Margem média
            </span>
            <strong className="text-lg text-foreground font-extrabold">
              {formatPct(totalMargemPct)}
            </strong>
          </div>
        </Card>
      </div>

      <p className="text-[11px] text-muted-foreground inline-flex items-start gap-1.5">
        <Info className="h-3.5 w-3.5 text-slate-400 mt-px shrink-0" />
        <span>
          <strong className="text-slate-600">Receita</strong> = valor do orçamento aprovado (ou previsto).{" "}
          <strong className="text-slate-600">Custo</strong> = despesas vinculadas à obra em Contas a Pagar.
          Vincule as despesas ao projeto para a margem ficar precisa.
        </span>
      </p>

      {/* Filtros */}
      <Card className="p-4 glass-card border-border flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-100"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-100 text-xs h-9 md:w-52"
        >
          <option value="ALL">Todos os status</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {PROJECT_STATUS_LABELS[s] ?? s}
            </option>
          ))}
        </Select>
      </Card>

      {/* Tabela */}
      <Card className="glass-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 text-muted-foreground text-xs uppercase font-bold bg-slate-50">
                <th className="p-4">Obra / Cliente</th>
                <th className="p-4">Status</th>
                <SortableTh label="Receita" active={sortBy === "receita"} order={order} onClick={() => toggleSort("receita")} />
                <SortableTh label="Custo" active={sortBy === "custo"} order={order} onClick={() => toggleSort("custo")} />
                <SortableTh label="Margem" active={sortBy === "margem"} order={order} onClick={() => toggleSort("margem")} />
                <SortableTh label="Margem %" active={sortBy === "margemPct"} order={order} onClick={() => toggleSort("margemPct")} />
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 text-foreground">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">
                    Nenhuma obra com receita ou custo registrado.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => <ProfitRow key={r.projectId} r={r} />)
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function SortableTh({
  label,
  active,
  order,
  onClick,
}: {
  label: string;
  active: boolean;
  order: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <th className="p-4 text-right">
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1 cursor-pointer hover:text-slate-700 ${
          active ? "text-slate-800" : ""
        }`}
      >
        {label}
        <ArrowUpDown className={`h-3 w-3 ${active ? "opacity-100" : "opacity-30"}`} />
      </button>
    </th>
  );
}

function ProfitRow({ r }: { r: ProjectProfitRow }) {
  const hasCost = r.custo > 0;
  const tone = marginTone(r.margemPct, hasCost);
  return (
    <tr className="hover:bg-slate-100 transition-colors">
      <td className="p-4">
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-foreground">{r.clientName}</span>
          {!r.temAprovado && (
            <span className="text-[10px] text-amber-600 font-semibold">
              Sem orçamento aprovado (valor previsto)
            </span>
          )}
        </div>
      </td>
      <td className="p-4">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
          {PROJECT_STATUS_LABELS[r.status] ?? r.status}
        </span>
      </td>
      <td className="p-4 text-right font-semibold privacy-value">{formatCurrency(r.receita)}</td>
      <td className="p-4 text-right privacy-value">
        <div className="flex flex-col items-end">
          <span className="font-semibold text-slate-700">{formatCurrency(r.custo)}</span>
          {r.custo > 0 && r.custoPago < r.custo && (
            <span className="text-[10px] text-muted-foreground">
              pago {formatCurrency(r.custoPago)}
            </span>
          )}
        </div>
      </td>
      <td className={`p-4 text-right font-black privacy-value ${tone}`}>
        {formatCurrency(r.margem)}
      </td>
      <td className={`p-4 text-right font-bold ${tone}`}>
        {hasCost ? formatPct(r.margemPct) : "—"}
      </td>
      <td className="p-4 text-right">
        <Link
          href={`/projects/${r.projectId}`}
          className="text-[11px] text-primary hover:underline inline-flex items-center"
        >
          Abrir <ArrowUpRight className="h-3 w-3 ml-0.5" />
        </Link>
      </td>
    </tr>
  );
}
