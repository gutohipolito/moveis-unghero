"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { ActionDialogHost, useActionDialog } from "@/components/ActionDialogHost";
import {
  Search,
  Plus,
  Wallet,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Trash2,
  Loader2,
  RotateCcw,
  ArrowUpRight,
  Repeat,
} from "lucide-react";
import { PAYMENT_METHOD_OPTIONS, labelPaymentMethod } from "@/lib/paymentMethods";
import {
  EXPENSE_CATEGORY_OPTIONS,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_NATURE_LABELS,
  CATEGORY_DEFAULT_NATURE,
  isExpenseOverdue,
  type ExpenseDTO,
  type ExpenseCategory,
  type ExpenseNature,
} from "@/lib/expenses";
import {
  listExpenses,
  createExpense,
  payExpense,
  reopenExpense,
  deleteExpense,
} from "@/app/actions/expenses";

interface Props {
  initialExpenses: ExpenseDTO[];
  suppliers: { id: string; nome: string }[];
  projects: { id: string; label: string }[];
}

const STATUS_FILTERS = [
  { id: "ALL", label: "Todas" },
  { id: "PENDENTE", label: "Em aberto" },
  { id: "ATRASADO", label: "Vencidas" },
  { id: "PAGO", label: "Pagas" },
  { id: "CANCELADO", label: "Canceladas" },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["id"];

const todayMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", {
    month: "short",
    year: "numeric",
  });
};

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

const emptyForm = {
  descricao: "",
  valor: "",
  categoria: "OUTROS" as ExpenseCategory,
  natureza: "VARIAVEL" as ExpenseNature,
  data_vencimento: new Date().toISOString().slice(0, 10),
  metodo_pagamento: "",
  supplier_id: "",
  fornecedor_nome: "",
  project_id: "",
  observacoes: "",
  recorrente: false,
  meses: 12,
  ja_pago: false,
};

export default function ContasPagarClient({ initialExpenses, suppliers, projects }: Props) {
  const [expenses, setExpenses] = useState<ExpenseDTO[]>(initialExpenses);
  const dialog = useActionDialog();
  const { showSuccess, showError, confirmAction } = dialog;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [monthFilter, setMonthFilter] = useState<string>(todayMonth());

  const [busyId, setBusyId] = useState<string | null>(null);

  // Modal nova despesa
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const refresh = async () => {
    const res = await listExpenses();
    if (res.success) setExpenses(res.expenses);
  };

  const monthOptions = useMemo(() => {
    const set = new Set<string>([todayMonth()]);
    for (const e of expenses) set.add(e.data_vencimento.slice(0, 7));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [expenses]);

  // Escopo do mês + busca + categoria (base dos KPIs)
  const monthScoped = useMemo(() => {
    const q = search.trim().toLowerCase();
    return expenses.filter((e) => {
      const matchesMonth = monthFilter === "ALL" || e.data_vencimento.slice(0, 7) === monthFilter;
      const matchesCategory = categoryFilter === "ALL" || e.categoria === categoryFilter;
      const matchesSearch =
        !q ||
        e.descricao.toLowerCase().includes(q) ||
        (e.supplier_nome ?? "").toLowerCase().includes(q) ||
        (e.fornecedor_nome ?? "").toLowerCase().includes(q) ||
        (e.project_label ?? "").toLowerCase().includes(q);
      return matchesMonth && matchesCategory && matchesSearch;
    });
  }, [expenses, monthFilter, categoryFilter, search]);

  const filtered = useMemo(() => {
    return monthScoped.filter((e) => {
      if (statusFilter === "ALL") return true;
      if (statusFilter === "PAGO") return e.status === "PAGO";
      if (statusFilter === "CANCELADO") return e.status === "CANCELADO";
      if (statusFilter === "PENDENTE") return e.status === "PENDENTE";
      if (statusFilter === "ATRASADO") return isExpenseOverdue(e);
      return true;
    });
  }, [monthScoped, statusFilter]);

  // KPIs (sobre o escopo do mês)
  const kpi = useMemo(() => {
    const naoCancelado = monthScoped.filter((e) => e.status !== "CANCELADO");
    const total = naoCancelado.reduce((a, e) => a + e.valor, 0);
    const pago = naoCancelado
      .filter((e) => e.status === "PAGO")
      .reduce((a, e) => a + e.valor, 0);
    const aPagar = naoCancelado
      .filter((e) => e.status === "PENDENTE")
      .reduce((a, e) => a + e.valor, 0);
    const vencido = naoCancelado
      .filter((e) => isExpenseOverdue(e))
      .reduce((a, e) => a + e.valor, 0);
    return { total, pago, aPagar, vencido };
  }, [monthScoped]);

  const handlePay = (e: ExpenseDTO) => {
    confirmAction({
      title: "Registrar pagamento?",
      message: `Marcar "${e.descricao}" (${formatCurrency(e.valor)}) como paga hoje?`,
      confirmLabel: "Confirmar pagamento",
      onConfirm: async () => {
        setBusyId(e.id);
        setExpenses((prev) =>
          prev.map((x) =>
            x.id === e.id ? { ...x, status: "PAGO", data_pagamento: new Date().toISOString() } : x
          )
        );
        const res = await payExpense(e.id);
        setBusyId(null);
        if (res.success) showSuccess("Pagamento registrado", `${e.descricao} marcada como paga.`);
        else {
          showError("Erro", res.error ?? "Não foi possível registrar.");
          refresh();
        }
      },
    });
  };

  const handleReopen = async (e: ExpenseDTO) => {
    setBusyId(e.id);
    setExpenses((prev) =>
      prev.map((x) => (x.id === e.id ? { ...x, status: "PENDENTE", data_pagamento: null } : x))
    );
    const res = await reopenExpense(e.id);
    setBusyId(null);
    if (!res.success) {
      showError("Erro", res.error ?? "Não foi possível reabrir.");
      refresh();
    }
  };

  const handleDelete = (e: ExpenseDTO) => {
    confirmAction({
      title: "Excluir despesa?",
      message: `"${e.descricao}" será removida permanentemente.`,
      confirmLabel: "Sim, excluir",
      onConfirm: async () => {
        setBusyId(e.id);
        const res = await deleteExpense(e.id);
        setBusyId(null);
        if (res.success) {
          setExpenses((prev) => prev.filter((x) => x.id !== e.id));
          showSuccess("Despesa excluída", `${e.descricao} foi removida.`);
        } else {
          showError("Erro", res.error ?? "Não foi possível excluir.");
        }
      },
    });
  };

  const openModal = () => {
    setForm({ ...emptyForm, data_vencimento: new Date().toISOString().slice(0, 10) });
    setFormError(null);
    setIsOpen(true);
  };

  const handleCategoryChange = (categoria: ExpenseCategory) => {
    setForm((f) => ({ ...f, categoria, natureza: CATEGORY_DEFAULT_NATURE[categoria] }));
  };

  const handleSave = async () => {
    if (!form.descricao.trim()) {
      setFormError("Informe a descrição da despesa.");
      return;
    }
    const valor = Number(String(form.valor).replace(",", "."));
    if (!Number.isFinite(valor) || valor <= 0) {
      setFormError("Informe um valor válido.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const res = await createExpense({
      descricao: form.descricao,
      categoria: form.categoria,
      natureza: form.natureza,
      valor,
      data_vencimento: form.data_vencimento,
      metodo_pagamento: form.metodo_pagamento || null,
      supplier_id: form.supplier_id || null,
      fornecedor_nome: form.fornecedor_nome || null,
      project_id: form.project_id || null,
      observacoes: form.observacoes || null,
      recorrencia_meses: form.recorrente ? Math.max(1, Number(form.meses) || 1) : 1,
      ja_pago: form.ja_pago,
    });
    setSaving(false);
    if (res.success) {
      await refresh();
      setIsOpen(false);
      showSuccess(
        "Despesa lançada",
        res.created && res.created > 1
          ? `${res.created} lançamentos mensais criados.`
          : "Conta a pagar registrada com sucesso."
      );
    } else {
      setFormError(res.error ?? "Não foi possível salvar.");
    }
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 glass-card border-border flex items-center gap-4">
          <div className="p-3 bg-slate-500/10 text-slate-500 rounded-xl">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
              Total do período
            </span>
            <strong className="text-xl text-foreground font-extrabold privacy-value">
              {formatCurrency(kpi.total)}
            </strong>
          </div>
        </Card>

        <Card className="p-5 glass-card border-border flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
              Pago
            </span>
            <strong className="text-xl text-foreground font-extrabold privacy-value">
              {formatCurrency(kpi.pago)}
            </strong>
          </div>
        </Card>

        <Card className="p-5 glass-card border-border flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
              A pagar
            </span>
            <strong className="text-xl text-foreground font-extrabold privacy-value">
              {formatCurrency(kpi.aPagar)}
            </strong>
          </div>
        </Card>

        <Card className="p-5 glass-card border-border flex items-center gap-4">
          <div className="p-3 bg-destructive/10 text-destructive/80 rounded-xl">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
              Vencido
            </span>
            <strong className="text-xl text-foreground font-extrabold privacy-value">
              {formatCurrency(kpi.vencido)}
            </strong>
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="p-4 glass-card border-border space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por descrição, fornecedor ou projeto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-slate-100"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="bg-slate-100 text-xs h-9"
            >
              <option value="ALL">Todos os meses</option>
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </Select>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-100 text-xs h-9"
            >
              <option value="ALL">Todas as categorias</option>
              {EXPENSE_CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
            <Button onClick={openModal} className="btn-metallic gap-1.5 shrink-0">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nova despesa</span>
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
                statusFilter === s.id
                  ? "bg-slate-800 border-slate-800 text-white"
                  : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Tabela */}
      <Card className="glass-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 text-muted-foreground text-xs uppercase font-bold bg-slate-50">
                <th className="p-4">Despesa</th>
                <th className="p-4">Categoria</th>
                <th className="p-4 text-center">Vencimento</th>
                <th className="p-4 text-right">Valor</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 text-foreground">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">
                    Nenhuma despesa encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filtered.map((e) => {
                  const overdue = isExpenseOverdue(e);
                  const isPaid = e.status === "PAGO";
                  const isCancelled = e.status === "CANCELADO";
                  const fornecedor = e.supplier_nome || e.fornecedor_nome;

                  return (
                    <tr
                      key={e.id}
                      className={`transition-colors ${
                        overdue ? "bg-rose-500/5 hover:bg-rose-500/10" : "hover:bg-slate-100"
                      }`}
                    >
                      <td className="p-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-foreground">{e.descricao}</span>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                e.natureza === "FIXA"
                                  ? "bg-indigo-500/10 text-indigo-600"
                                  : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              {EXPENSE_NATURE_LABELS[e.natureza]}
                            </span>
                            {fornecedor && (
                              <span className="text-[10px] text-muted-foreground">{fornecedor}</span>
                            )}
                            {e.project_id && (
                              <Link
                                href={`/projects/${e.project_id}`}
                                className="text-[10px] text-primary hover:underline inline-flex items-center"
                              >
                                {e.project_label} <ArrowUpRight className="h-2.5 w-2.5 ml-0.5" />
                              </Link>
                            )}
                            {e.grupo_id && (
                              <span
                                className="inline-flex items-center gap-0.5 text-[9px] text-slate-400"
                                title="Despesa recorrente"
                              >
                                <Repeat className="h-2.5 w-2.5" /> recorrente
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-xs text-muted-foreground">
                        {EXPENSE_CATEGORY_LABELS[e.categoria]}
                      </td>
                      <td className="p-4 text-center font-medium">
                        <span className={overdue ? "text-rose-600 font-bold" : ""}>
                          {formatDate(e.data_vencimento)}
                        </span>
                      </td>
                      <td className="p-4 text-right font-black text-foreground privacy-value">
                        {formatCurrency(e.valor)}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded inline-flex items-center gap-1 ${
                            isCancelled
                              ? "bg-slate-200 text-slate-500"
                              : isPaid
                                ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/20"
                                : overdue
                                  ? "bg-destructive/15 text-destructive/80 border border-destructive/20"
                                  : "bg-amber-500/15 text-amber-600 border border-amber-500/20"
                          }`}
                        >
                          {isCancelled
                            ? "Cancelada"
                            : isPaid
                              ? "Paga"
                              : overdue
                                ? "Vencida"
                                : "Em aberto"}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isPaid && !isCancelled && (
                            <Button
                              onClick={() => handlePay(e)}
                              disabled={busyId === e.id}
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8"
                            >
                              {busyId === e.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                "Pagar"
                              )}
                            </Button>
                          )}
                          {isPaid && (
                            <button
                              onClick={() => handleReopen(e)}
                              disabled={busyId === e.id}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                              title="Reabrir (desfazer pagamento)"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(e)}
                            disabled={busyId === e.id}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Nova Despesa */}
      <Dialog isOpen={isOpen} onClose={() => setIsOpen(false)} className="max-w-lg">
        <div className="space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-black text-slate-800">Nova conta a pagar</h2>
            <p className="text-[11px] text-slate-500 font-medium">
              Registre uma despesa fixa ou variável com vencimento.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Descrição *</label>
              <Input
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                className="bg-slate-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Valor (R$) *</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.valor}
                  onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                  className="bg-slate-50"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Vencimento *</label>
                <Input
                  type="date"
                  value={form.data_vencimento}
                  onChange={(e) => setForm((f) => ({ ...f, data_vencimento: e.target.value }))}
                  className="bg-slate-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Categoria</label>
                <Select
                  value={form.categoria}
                  onChange={(e) => handleCategoryChange(e.target.value as ExpenseCategory)}
                  className="bg-slate-50 h-10"
                >
                  {EXPENSE_CATEGORY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Natureza</label>
                <Select
                  value={form.natureza}
                  onChange={(e) => setForm((f) => ({ ...f, natureza: e.target.value as ExpenseNature }))}
                  className="bg-slate-50 h-10"
                >
                  <option value="FIXA">Fixa</option>
                  <option value="VARIAVEL">Variável</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">
                  Fornecedor (opcional)
                </label>
                <Select
                  value={form.supplier_id}
                  onChange={(e) => setForm((f) => ({ ...f, supplier_id: e.target.value }))}
                  className="bg-slate-50 h-10"
                >
                  <option value="">— Nenhum / avulso</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">
                  Método (opcional)
                </label>
                <Select
                  value={form.metodo_pagamento}
                  onChange={(e) => setForm((f) => ({ ...f, metodo_pagamento: e.target.value }))}
                  className="bg-slate-50 h-10"
                >
                  <option value="">—</option>
                  {PAYMENT_METHOD_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {!form.supplier_id && (
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">
                  Nome do fornecedor avulso (opcional)
                </label>
                <Input
                  value={form.fornecedor_nome}
                  onChange={(e) => setForm((f) => ({ ...f, fornecedor_nome: e.target.value }))}
                  className="bg-slate-50"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">
                Vincular a projeto (opcional)
              </label>
              <Select
                value={form.project_id}
                onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value }))}
                className="bg-slate-50 h-10"
              >
                <option value="">— Nenhum</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 space-y-2.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.recorrente}
                  onChange={(e) => setForm((f) => ({ ...f, recorrente: e.target.checked }))}
                  className="w-4 h-4 rounded cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-600 inline-flex items-center gap-1">
                  <Repeat className="h-3.5 w-3.5 text-slate-400" /> Despesa recorrente (mensal)
                </span>
              </label>
              {form.recorrente && (
                <div className="flex items-center gap-2 pl-6">
                  <span className="text-xs text-slate-500">Gerar</span>
                  <Input
                    type="number"
                    min="2"
                    max="60"
                    value={form.meses}
                    onChange={(e) => setForm((f) => ({ ...f, meses: Number(e.target.value) }))}
                    className="w-20 bg-white h-9 text-center"
                  />
                  <span className="text-xs text-slate-500">meses (1 lançamento por mês)</span>
                </div>
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.ja_pago}
                  onChange={(e) => setForm((f) => ({ ...f, ja_pago: e.target.checked }))}
                  className="w-4 h-4 rounded cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-600">Já está paga</span>
              </label>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">
                Observações (opcional)
              </label>
              <textarea
                value={form.observacoes}
                onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                className="w-full min-h-[60px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-amber-400"
              />
            </div>

            {formError && (
              <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                {formError}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving} className="btn-metallic gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Salvar despesa
            </Button>
          </div>
        </div>
      </Dialog>

      <ActionDialogHost dialog={dialog} />
    </div>
  );
}
