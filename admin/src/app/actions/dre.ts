"use server";

import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/moduleAccess";
import type { ExpenseCategory, ExpenseNature } from "@/lib/expenses";
import { maybeRedactForViewer } from "@/lib/viewerRedact";

export interface DreMonth {
  month: string; // YYYY-MM
  receita: number; // recebimentos pagos (regime caixa)
  custosVariaveis: number; // despesas pagas de natureza VARIAVEL
  despesasFixas: number; // despesas pagas de natureza FIXA
  totalDespesas: number;
  margemContribuicao: number; // receita - custos variáveis
  resultado: number; // receita - despesas totais
}

export interface DreCategoryRow {
  categoria: ExpenseCategory;
  natureza: ExpenseNature;
  total: number;
}

export interface DreData {
  months: DreMonth[];
  categoriesByMonth: Record<string, DreCategoryRow[]>;
}

const monthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export async function getDreData(
  monthsBack = 12
): Promise<{ success: boolean; data: DreData }> {
  const auth = await requireModuleAccess("financeiro");
  const empty: DreData = { months: [], categoriesByMonth: {} };

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);

  const monthKeys: string[] = [];
  for (let i = 0; i < monthsBack; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    monthKeys.push(monthKey(d));
  }

  try {
    const [installments, expenses] = await Promise.all([
      prisma.installment.findMany({
        where: {
          status: "PAGO",
          data_pagamento: { gte: start },
          project: { client: { company_id: auth.companyId } },
        },
        select: { valor: true, data_pagamento: true },
      }),
      prisma.expense.findMany({
        where: {
          company_id: auth.companyId,
          status: "PAGO",
          data_pagamento: { gte: start },
        },
        select: { valor: true, data_pagamento: true, categoria: true, natureza: true },
      }),
    ]);

    const receita: Record<string, number> = {};
    const variaveis: Record<string, number> = {};
    const fixas: Record<string, number> = {};
    const catByMonth: Record<string, Record<string, DreCategoryRow>> = {};
    for (const k of monthKeys) {
      receita[k] = 0;
      variaveis[k] = 0;
      fixas[k] = 0;
      catByMonth[k] = {};
    }

    for (const inst of installments) {
      if (!inst.data_pagamento) continue;
      const k = monthKey(inst.data_pagamento);
      if (!(k in receita)) continue;
      receita[k] += Number(inst.valor);
    }

    for (const exp of expenses) {
      if (!exp.data_pagamento) continue;
      const k = monthKey(exp.data_pagamento);
      if (!(k in receita)) continue;
      const v = Number(exp.valor);
      if (exp.natureza === "FIXA") fixas[k] += v;
      else variaveis[k] += v;

      const cat = exp.categoria as ExpenseCategory;
      const bucket = catByMonth[k][cat] ?? {
        categoria: cat,
        natureza: exp.natureza as ExpenseNature,
        total: 0,
      };
      bucket.total += v;
      catByMonth[k][cat] = bucket;
    }

    const months: DreMonth[] = monthKeys.map((k) => {
      const rec = receita[k];
      const cv = variaveis[k];
      const df = fixas[k];
      return {
        month: k,
        receita: rec,
        custosVariaveis: cv,
        despesasFixas: df,
        totalDespesas: cv + df,
        margemContribuicao: rec - cv,
        resultado: rec - cv - df,
      };
    });

    const categoriesByMonth: Record<string, DreCategoryRow[]> = {};
    for (const k of monthKeys) {
      categoriesByMonth[k] = Object.values(catByMonth[k]).sort(
        (a, b) => b.total - a.total
      );
    }

    return {
      success: true,
      data: maybeRedactForViewer({ months, categoriesByMonth }, auth.cargo),
    };
  } catch (error) {
    console.error("Erro ao calcular DRE:", error);
    return { success: false, data: empty };
  }
}
