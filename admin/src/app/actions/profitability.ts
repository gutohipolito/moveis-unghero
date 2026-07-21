"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";

export interface ProjectProfitRow {
  projectId: string;
  clientName: string;
  status: string;
  receita: number; // valor do contrato (orçamento aprovado ou valor previsto)
  recebido: number; // parcelas efetivamente pagas
  custo: number; // despesas vinculadas (não canceladas)
  custoPago: number; // despesas vinculadas já pagas
  margem: number; // receita - custo
  margemPct: number;
  temAprovado: boolean;
}

export interface ProfitabilityData {
  rows: ProjectProfitRow[];
  totalReceita: number;
  totalCusto: number;
  totalMargem: number;
  totalRecebido: number;
}

export async function getProjectProfitability(): Promise<{
  success: boolean;
  data: ProfitabilityData;
}> {
  const auth = await requireAuth();
  const empty: ProfitabilityData = {
    rows: [],
    totalReceita: 0,
    totalCusto: 0,
    totalMargem: 0,
    totalRecebido: 0,
  };

  try {
    const projects = await prisma.project.findMany({
      where: { client: { company_id: auth.companyId } },
      select: {
        id: true,
        valor_previsto: true,
        status_geral: true,
        createdAt: true,
        client: { select: { nome: true } },
        installments: { select: { valor: true, status: true } },
        expenses: { select: { valor: true, status: true } },
        quotes: {
          select: {
            valor_final: true,
            aprovado_em: true,
            approvals: { select: { valor_aprovado: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const rows: ProjectProfitRow[] = projects
      .map((p) => {
        const approvalSum = p.quotes.reduce(
          (sum, q) =>
            sum +
            q.approvals.reduce((inner, a) => inner + Number(a.valor_aprovado), 0),
          0
        );
        const approvedLegacy = p.quotes.find((q) => q.aprovado_em);
        const receita =
          approvalSum > 0
            ? approvalSum
            : approvedLegacy
              ? Number(approvedLegacy.valor_final)
              : Number(p.valor_previsto);

        const recebido = p.installments
          .filter((i) => i.status === "PAGO")
          .reduce((a, i) => a + Number(i.valor), 0);

        const custo = p.expenses
          .filter((e) => e.status !== "CANCELADO")
          .reduce((a, e) => a + Number(e.valor), 0);

        const custoPago = p.expenses
          .filter((e) => e.status === "PAGO")
          .reduce((a, e) => a + Number(e.valor), 0);

        const margem = receita - custo;
        const margemPct = receita > 0 ? (margem / receita) * 100 : 0;

        return {
          projectId: p.id,
          clientName: p.client.nome,
          status: p.status_geral,
          receita,
          recebido,
          custo,
          custoPago,
          margem,
          margemPct,
          temAprovado: approvalSum > 0 || !!approvedLegacy,
        };
      })
      // Mostra apenas obras com receita ou custo relevante.
      .filter((r) => r.receita > 0 || r.custo > 0);

    const totalReceita = rows.reduce((a, r) => a + r.receita, 0);
    const totalCusto = rows.reduce((a, r) => a + r.custo, 0);
    const totalRecebido = rows.reduce((a, r) => a + r.recebido, 0);
    const totalMargem = totalReceita - totalCusto;

    return {
      success: true,
      data: { rows, totalReceita, totalCusto, totalMargem, totalRecebido },
    };
  } catch (error) {
    console.error("Erro ao calcular rentabilidade:", error);
    return { success: false, data: empty };
  }
}
