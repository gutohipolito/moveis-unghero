"use client";

import React, { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Wallet, Info } from "lucide-react";
import type { DreData } from "@/app/actions/dre";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/expenses";

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

const monthLabel = (ym: string, long = false) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", {
    month: long ? "long" : "short",
    year: "numeric",
  });
};

export default function DreClient({ data }: { data: DreData }) {
  const { months, categoriesByMonth } = data;

  const defaultMonth = months.length ? months[months.length - 1].month : "";
  const [selected, setSelected] = useState(defaultMonth);

  const current = useMemo(
    () => months.find((m) => m.month === selected) ?? months[months.length - 1],
    [months, selected]
  );

  const categories = selected ? categoriesByMonth[selected] ?? [] : [];
  const variaveis = categories.filter((c) => c.natureza === "VARIAVEL");
  const fixas = categories.filter((c) => c.natureza === "FIXA");

  const maxBar = useMemo(
    () => Math.max(1, ...months.map((m) => Math.max(m.receita, m.totalDespesas))),
    [months]
  );

  if (!current) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground glass-card border-border">
        Sem dados financeiros para gerar o DRE.
      </Card>
    );
  }

  const margemPct = current.receita > 0 ? (current.resultado / current.receita) * 100 : 0;
  const lucro = current.resultado >= 0;

  return (
    <div className="space-y-6">
      {/* Aviso regime de caixa + seletor de mês */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5 text-slate-400" />
          Regime de <strong className="text-slate-600">caixa</strong>: considera valores efetivamente
          recebidos e pagos no mês.
        </p>
        <Select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="bg-slate-100 text-xs h-9 w-full sm:w-52"
        >
          {[...months].reverse().map((m) => (
            <option key={m.month} value={m.month}>
              {monthLabel(m.month, true)}
            </option>
          ))}
        </Select>
      </div>

      {/* Cards de topo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 glass-card border-border flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
              Receita recebida
            </span>
            <strong className="text-xl text-foreground font-extrabold privacy-value">
              {formatCurrency(current.receita)}
            </strong>
          </div>
        </Card>

        <Card className="p-5 glass-card border-border flex items-center gap-4">
          <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
            <TrendingDown className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
              Despesas pagas
            </span>
            <strong className="text-xl text-foreground font-extrabold privacy-value">
              {formatCurrency(current.totalDespesas)}
            </strong>
          </div>
        </Card>

        <Card
          className={`p-5 glass-card border-border flex items-center gap-4 ${
            lucro ? "ring-1 ring-emerald-500/20" : "ring-1 ring-rose-500/20"
          }`}
        >
          <div
            className={`p-3 rounded-xl ${
              lucro ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
            }`}
          >
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
              {lucro ? "Lucro do mês" : "Prejuízo do mês"}
            </span>
            <strong
              className={`text-xl font-extrabold privacy-value ${
                lucro ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {formatCurrency(current.resultado)}
            </strong>
            <span className="block text-[10px] text-muted-foreground font-semibold">
              Margem {margemPct.toFixed(1).replace(".", ",")}%
            </span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Demonstrativo (cascata) */}
        <Card className="glass-card border-border overflow-hidden">
          <div className="p-4 border-b border-border/40 bg-slate-50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Demonstrativo — {monthLabel(current.month, true)}
            </h3>
          </div>
          <div className="p-4 space-y-1 text-sm">
            <DreLine label="Receita recebida" value={current.receita} tone="pos" />
            <DreLine label="(−) Custos variáveis" value={-current.custosVariaveis} tone="neg" />
            <DreLine
              label="(=) Margem de contribuição"
              value={current.margemContribuicao}
              subtotal
            />
            <DreLine label="(−) Despesas fixas" value={-current.despesasFixas} tone="neg" />
            <div className="pt-2 mt-1 border-t border-border/50">
              <DreLine
                label={lucro ? "(=) Resultado (lucro)" : "(=) Resultado (prejuízo)"}
                value={current.resultado}
                total
                tone={lucro ? "pos" : "neg"}
              />
            </div>
          </div>
        </Card>

        {/* Detalhamento por categoria */}
        <Card className="glass-card border-border overflow-hidden">
          <div className="p-4 border-b border-border/40 bg-slate-50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Despesas por categoria
            </h3>
          </div>
          <div className="p-4 space-y-4">
            <CategoryGroup title="Variáveis" rows={variaveis} accent="slate" />
            <CategoryGroup title="Fixas" rows={fixas} accent="indigo" />
            {categories.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                Nenhuma despesa paga neste mês.
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Visão dos últimos 12 meses */}
      <Card className="glass-card border-border overflow-hidden">
        <div className="p-4 border-b border-border/40 bg-slate-50 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Últimos 12 meses
          </h3>
          <div className="flex items-center gap-3 text-[10px] font-semibold text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Receita
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-rose-400" /> Despesas
            </span>
          </div>
        </div>
        <div className="p-4 space-y-2.5">
          {months.map((m) => {
            const recW = (m.receita / maxBar) * 100;
            const despW = (m.totalDespesas / maxBar) * 100;
            const pos = m.resultado >= 0;
            return (
              <button
                key={m.month}
                onClick={() => setSelected(m.month)}
                className={`w-full flex items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors cursor-pointer ${
                  m.month === selected ? "bg-slate-100" : "hover:bg-slate-50"
                }`}
              >
                <span className="w-16 shrink-0 text-[11px] font-semibold text-slate-500 capitalize">
                  {monthLabel(m.month)}
                </span>
                <div className="flex-1 space-y-1">
                  <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${recW}%` }} />
                  <div className="h-2 rounded-full bg-rose-400" style={{ width: `${despW}%` }} />
                </div>
                <span
                  className={`w-28 shrink-0 text-right text-xs font-bold privacy-value ${
                    pos ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {formatCurrency(m.resultado)}
                </span>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function DreLine({
  label,
  value,
  tone,
  subtotal,
  total,
}: {
  label: string;
  value: number;
  tone?: "pos" | "neg";
  subtotal?: boolean;
  total?: boolean;
}) {
  const color =
    tone === "pos" ? "text-emerald-600" : tone === "neg" ? "text-rose-600" : "text-slate-700";
  return (
    <div
      className={`flex items-center justify-between gap-3 ${
        total ? "py-1" : "py-1.5"
      } ${subtotal ? "border-t border-border/30 mt-1 pt-2" : ""}`}
    >
      <span
        className={`${total ? "text-sm font-black text-slate-800" : subtotal ? "text-xs font-bold text-slate-600" : "text-xs font-medium text-slate-500"}`}
      >
        {label}
      </span>
      <span
        className={`privacy-value ${total ? "text-base font-black" : "text-sm font-bold"} ${color}`}
      >
        {formatCurrency(value)}
      </span>
    </div>
  );
}

function CategoryGroup({
  title,
  rows,
  accent,
}: {
  title: string;
  rows: { categoria: string; total: number }[];
  accent: "slate" | "indigo";
}) {
  if (rows.length === 0) return null;
  const total = rows.reduce((a, r) => a + r.total, 0);
  const dot = accent === "indigo" ? "bg-indigo-500" : "bg-slate-400";
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 inline-flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${dot}`} /> {title}
        </span>
        <span className="text-xs font-bold text-slate-600 privacy-value">
          {formatCurrency(total)}
        </span>
      </div>
      <div className="space-y-1">
        {rows.map((r) => (
          <div key={r.categoria} className="flex items-center justify-between text-xs">
            <span className="text-slate-500">
              {EXPENSE_CATEGORY_LABELS[r.categoria as keyof typeof EXPENSE_CATEGORY_LABELS] ??
                r.categoria}
            </span>
            <span className="font-semibold text-slate-700 privacy-value">
              {formatCurrency(r.total)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
