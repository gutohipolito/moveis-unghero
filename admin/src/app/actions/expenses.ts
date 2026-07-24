"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {requireModuleAccess, requireWriteAccess } from "@/lib/moduleAccess";
import { capitalizeText } from "@/lib/utils";
import type {
  ExpenseDTO,
  ExpenseCategory,
  ExpenseNature,
} from "@/lib/expenses";

type ExpenseRow = Prisma.ExpenseGetPayload<{
  include: {
    supplier: { select: { nome: true } };
    project: { select: { id: true; client: { select: { nome: true } } } };
  };
}>;

function mapExpense(row: ExpenseRow): ExpenseDTO {
  return {
    id: row.id,
    descricao: row.descricao,
    categoria: row.categoria as ExpenseCategory,
    natureza: row.natureza as ExpenseNature,
    valor: Number(row.valor),
    data_vencimento: row.data_vencimento.toISOString(),
    data_pagamento: row.data_pagamento ? row.data_pagamento.toISOString() : null,
    status: row.status,
    metodo_pagamento: row.metodo_pagamento ?? null,
    supplier_id: row.supplier_id,
    supplier_nome: row.supplier?.nome ?? null,
    project_id: row.project_id,
    project_label: row.project?.client?.nome ?? null,
    fornecedor_nome: row.fornecedor_nome,
    observacoes: row.observacoes,
    grupo_id: row.grupo_id,
  };
}

const EXPENSE_INCLUDE = {
  supplier: { select: { nome: true } },
  project: { select: { id: true, client: { select: { nome: true } } } },
} as const;

export interface CreateExpenseInput {
  descricao: string;
  categoria: ExpenseCategory;
  natureza: ExpenseNature;
  valor: number;
  data_vencimento: string; // YYYY-MM-DD
  metodo_pagamento?: string | null;
  supplier_id?: string | null;
  project_id?: string | null;
  fornecedor_nome?: string | null;
  observacoes?: string | null;
  recorrencia_meses?: number; // 1 = lançamento único; N = série mensal
  ja_pago?: boolean;
}

export async function listExpenses(): Promise<{
  success: boolean;
  expenses: ExpenseDTO[];
}> {
  const auth = await requireModuleAccess("financeiro");
  try {
    const rows = await prisma.expense.findMany({
      where: { company_id: auth.companyId },
      include: EXPENSE_INCLUDE,
      orderBy: { data_vencimento: "asc" },
    });
    return { success: true, expenses: rows.map(mapExpense) };
  } catch (error) {
    console.error("Erro ao listar despesas:", error);
    return { success: false, expenses: [] };
  }
}

/** Adiciona `n` meses a uma data preservando o dia (com clamp no fim do mês). */
function addMonths(base: Date, n: number): Date {
  const y = base.getFullYear();
  const m = base.getMonth();
  const d = base.getDate();
  const target = new Date(y, m + n, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d, lastDay));
  return target;
}

export async function createExpense(
  input: CreateExpenseInput
): Promise<{ success: boolean; created?: number; error?: string }> {
  const auth = await requireWriteAccess("financeiro");

  const descricao = capitalizeText((input.descricao ?? "").trim());
  if (!descricao) return { success: false, error: "Informe a descrição da despesa." };

  const valor = Number(input.valor);
  if (!Number.isFinite(valor) || valor <= 0) {
    return { success: false, error: "Informe um valor válido." };
  }

  const baseDate = new Date(`${input.data_vencimento}T00:00:00`);
  if (Number.isNaN(baseDate.getTime())) {
    return { success: false, error: "Informe uma data de vencimento válida." };
  }

  // Valida fornecedor/projeto pertencentes à empresa.
  let supplierId: string | null = null;
  if (input.supplier_id) {
    const s = await prisma.supplier.findFirst({
      where: { id: input.supplier_id, company_id: auth.companyId },
      select: { id: true },
    });
    supplierId = s?.id ?? null;
  }

  let projectId: string | null = null;
  if (input.project_id) {
    const p = await prisma.project.findFirst({
      where: { id: input.project_id, client: { company_id: auth.companyId } },
      select: { id: true },
    });
    projectId = p?.id ?? null;
  }

  const meses = Math.min(Math.max(Math.trunc(input.recorrencia_meses ?? 1), 1), 60);
  const grupoId = meses > 1 ? randomUUID() : null;
  const metodo = (input.metodo_pagamento || null) as
    | Prisma.ExpenseCreateManyInput["metodo_pagamento"]
    | null;
  const jaPago = !!input.ja_pago;

  try {
    const data: Prisma.ExpenseCreateManyInput[] = Array.from({ length: meses }, (_, i) => ({
      company_id: auth.companyId,
      descricao,
      categoria: input.categoria,
      natureza: input.natureza,
      valor,
      data_vencimento: addMonths(baseDate, i),
      // Só marca como pago automaticamente o primeiro lançamento, se solicitado.
      status: jaPago && i === 0 ? "PAGO" : "PENDENTE",
      data_pagamento: jaPago && i === 0 ? new Date() : null,
      metodo_pagamento: metodo ?? undefined,
      supplier_id: supplierId,
      project_id: projectId,
      fornecedor_nome: input.fornecedor_nome?.trim()
        ? capitalizeText(input.fornecedor_nome.trim())
        : null,
      observacoes: input.observacoes?.trim() || null,
      grupo_id: grupoId,
      created_by: auth.userId,
    }));

    await prisma.expense.createMany({ data });
    revalidatePath("/financeiro/contas-a-pagar");
    revalidatePath("/financeiro");
    return { success: true, created: meses };
  } catch (error) {
    console.error("Erro ao criar despesa:", error);
    return { success: false, error: "Não foi possível salvar a despesa." };
  }
}

export async function payExpense(
  id: string,
  metodo_pagamento?: string | null
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireWriteAccess("financeiro");
  const existing = await prisma.expense.findFirst({
    where: { id, company_id: auth.companyId },
    select: { id: true },
  });
  if (!existing) return { success: false, error: "Despesa não encontrada." };

  try {
    await prisma.expense.update({
      where: { id },
      data: {
        status: "PAGO",
        data_pagamento: new Date(),
        ...(metodo_pagamento
          ? { metodo_pagamento: metodo_pagamento as Prisma.ExpenseUpdateInput["metodo_pagamento"] }
          : {}),
      },
    });
    revalidatePath("/financeiro/contas-a-pagar");
    revalidatePath("/financeiro");
    return { success: true };
  } catch (error) {
    console.error("Erro ao pagar despesa:", error);
    return { success: false, error: "Não foi possível registrar o pagamento." };
  }
}

export async function reopenExpense(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireWriteAccess("financeiro");
  const existing = await prisma.expense.findFirst({
    where: { id, company_id: auth.companyId },
    select: { id: true },
  });
  if (!existing) return { success: false, error: "Despesa não encontrada." };

  try {
    await prisma.expense.update({
      where: { id },
      data: { status: "PENDENTE", data_pagamento: null },
    });
    revalidatePath("/financeiro/contas-a-pagar");
    revalidatePath("/financeiro");
    return { success: true };
  } catch (error) {
    console.error("Erro ao reabrir despesa:", error);
    return { success: false, error: "Não foi possível reabrir a despesa." };
  }
}

export async function deleteExpense(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireWriteAccess("financeiro");
  const existing = await prisma.expense.findFirst({
    where: { id, company_id: auth.companyId },
    select: { id: true },
  });
  if (!existing) return { success: false, error: "Despesa não encontrada." };

  try {
    await prisma.expense.delete({ where: { id } });
    revalidatePath("/financeiro/contas-a-pagar");
    revalidatePath("/financeiro");
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir despesa:", error);
    return { success: false, error: "Não foi possível excluir a despesa." };
  }
}
