"use server";

import { PartnerCommissionStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getModuleAccess, getWriteAccess } from "@/lib/moduleAccess";
import { canManageParceiros, isOpsLimitedRole, isReadOnlyRole } from "@/lib/permissions";
import { formatPartnerRegistro } from "@/lib/partnerTypes";
import { toISODateBR } from "@/lib/brazilDate";

function toNumber(value: Prisma.Decimal | number | string) {
  if (typeof value === "number") return value;
  return Number(value);
}

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

function canWriteCommission(cargo: string | null | undefined): boolean {
  if (isOpsLimitedRole(cargo) || isReadOnlyRole(cargo)) return false;
  return canManageParceiros(cargo) || cargo === "FINANCEIRO" || cargo === "ADMIN";
}

async function requireCommissionWrite() {
  const auth =
    (await getWriteAccess("parceiros")) || (await getWriteAccess("financeiro"));
  if (!auth || !canWriteCommission(auth.cargo)) {
    return null;
  }
  return auth;
}

async function requireCommissionRead() {
  const auth =
    (await getModuleAccess("parceiros")) || (await getModuleAccess("financeiro"));
  if (!auth) return null;
  if (isOpsLimitedRole(auth.cargo)) return null;
  return auth;
}

export type PartnerCommissionDTO = {
  id: string;
  partner_id: string;
  partner_nome: string;
  partner_tipo: string;
  project_id: string;
  cliente_nome: string;
  quote_id: string;
  orcamento_codigo: string | null;
  orcamento_versao: number;
  percentual: number;
  base_valor: number;
  valor_comissao: number;
  status: PartnerCommissionStatus;
  data_pagamento_prevista: string | null;
  data_pagamento_efetiva: string | null;
  observacoes: string | null;
  receipt_id: string | null;
  receipt_numero: number | null;
  createdAt: string;
};

export type PartnerCommissionReceiptDTO = {
  id: string;
  numero: number;
  commission_id: string;
  parceiro_nome: string;
  parceiro_tipo: string;
  parceiro_registro: string | null;
  parceiro_escritorio: string | null;
  cliente_nome: string;
  projeto_ref: string | null;
  orcamento_codigo: string | null;
  orcamento_versao: number | null;
  percentual: number;
  base_valor: number;
  valor_comissao: number;
  data_pagamento_prevista: string | null;
  data_pagamento_efetiva: string | null;
  emitido_por_nome: string | null;
  observacoes: string | null;
  createdAt: string;
};

function mapCommission(row: {
  id: string;
  partner_id: string;
  project_id: string;
  quote_id: string;
  percentual: Prisma.Decimal | number;
  base_valor: Prisma.Decimal | number;
  valor_comissao: Prisma.Decimal | number;
  status: PartnerCommissionStatus;
  data_pagamento_prevista: Date | null;
  data_pagamento_efetiva: Date | null;
  observacoes: string | null;
  createdAt: Date;
  partner: { nome: string; tipo: string };
  project: { client: { nome: string } };
  quote: { codigo: string | null; versao: number };
  receipts: { id: string; numero: number }[];
}): PartnerCommissionDTO {
  const latestReceipt = row.receipts[0] ?? null;
  return {
    id: row.id,
    partner_id: row.partner_id,
    partner_nome: row.partner.nome,
    partner_tipo: row.partner.tipo,
    project_id: row.project_id,
    cliente_nome: row.project.client.nome,
    quote_id: row.quote_id,
    orcamento_codigo: row.quote.codigo,
    orcamento_versao: row.quote.versao,
    percentual: toNumber(row.percentual),
    base_valor: toNumber(row.base_valor),
    valor_comissao: toNumber(row.valor_comissao),
    status: row.status,
    data_pagamento_prevista: row.data_pagamento_prevista
      ? toISODateBR(row.data_pagamento_prevista)
      : null,
    data_pagamento_efetiva: row.data_pagamento_efetiva
      ? toISODateBR(row.data_pagamento_efetiva)
      : null,
    observacoes: row.observacoes,
    receipt_id: latestReceipt?.id ?? null,
    receipt_numero: latestReceipt?.numero ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

const commissionInclude = {
  partner: { select: { nome: true, tipo: true } },
  project: { select: { client: { select: { nome: true } } } },
  quote: { select: { codigo: true, versao: true } },
  receipts: {
    select: { id: true, numero: true },
    orderBy: { createdAt: "desc" as const },
    take: 1,
  },
} satisfies Prisma.PartnerCommissionInclude;

/** Soma das aprovações do orçamento (base da comissão). */
export async function getApprovedQuoteBase(
  quoteId: string
): Promise<
  | { success: true; base: number; quote: { id: string; codigo: string | null; versao: number } }
  | { success: false; error: string }
> {
  const auth = await requireCommissionRead();
  if (!auth) return { success: false, error: "Não autenticado." };

  const quote = await prisma.quote.findFirst({
    where: {
      id: quoteId,
      project: { client: { company_id: auth.companyId } },
    },
    select: {
      id: true,
      codigo: true,
      versao: true,
      approvals: { select: { valor_aprovado: true } },
    },
  });
  if (!quote) return { success: false, error: "Orçamento não encontrado." };

  const base = roundMoney(
    quote.approvals.reduce((sum, a) => sum + toNumber(a.valor_aprovado), 0)
  );
  if (base <= 0) {
    return { success: false, error: "Orçamento sem valor aprovado." };
  }

  return {
    success: true,
    base,
    quote: { id: quote.id, codigo: quote.codigo, versao: quote.versao },
  };
}

/** Orçamentos aprovados do projeto (para escolher a base). */
export async function listApprovedQuotesForProject(projectId: string) {
  const auth = await requireCommissionRead();
  if (!auth) return { success: false as const, error: "Não autenticado.", quotes: [] };

  const project = await prisma.project.findFirst({
    where: { id: projectId, client: { company_id: auth.companyId } },
    select: {
      id: true,
      partner_id: true,
      quotes: {
        where: {
          OR: [{ aprovado_em: { not: null } }, { approvals: { some: {} } }],
        },
        select: {
          id: true,
          codigo: true,
          versao: true,
          aprovado_em: true,
          approvals: { select: { valor_aprovado: true } },
        },
        orderBy: [{ aprovado_em: "desc" }, { updatedAt: "desc" }],
      },
    },
  });

  if (!project) return { success: false as const, error: "Projeto não encontrado.", quotes: [] };

  const quotes = project.quotes
    .map((q) => {
      const base = roundMoney(
        q.approvals.reduce((sum, a) => sum + toNumber(a.valor_aprovado), 0)
      );
      return {
        id: q.id,
        codigo: q.codigo,
        versao: q.versao,
        base_valor: base,
        aprovado_em: q.aprovado_em?.toISOString() ?? null,
      };
    })
    .filter((q) => q.base_valor > 0);

  return {
    success: true as const,
    partner_id: project.partner_id,
    quotes,
  };
}

export async function getProjectCommissions(projectId: string) {
  const auth = await requireCommissionRead();
  if (!auth) return { success: false as const, error: "Não autenticado.", commissions: [] };

  const rows = await prisma.partnerCommission.findMany({
    where: {
      project_id: projectId,
      company_id: auth.companyId,
    },
    include: commissionInclude,
    orderBy: { createdAt: "desc" },
  });

  return {
    success: true as const,
    commissions: rows.map(mapCommission),
  };
}

export async function listPartnerCommissions(filters?: {
  partnerId?: string;
  status?: PartnerCommissionStatus | "ALL";
}) {
  const auth = await requireCommissionRead();
  if (!auth) return { success: false as const, error: "Não autenticado.", commissions: [] };

  const status = filters?.status && filters.status !== "ALL" ? filters.status : undefined;

  const rows = await prisma.partnerCommission.findMany({
    where: {
      company_id: auth.companyId,
      ...(filters?.partnerId ? { partner_id: filters.partnerId } : {}),
      ...(status ? { status } : {}),
    },
    include: commissionInclude,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return {
    success: true as const,
    commissions: rows.map(mapCommission),
  };
}

export async function getPartnerCommissionTotals(partnerId: string) {
  const auth = await requireCommissionRead();
  if (!auth) {
    return { success: false as const, error: "Não autenticado.", pendente: 0, pago: 0 };
  }

  const rows = await prisma.partnerCommission.findMany({
    where: {
      company_id: auth.companyId,
      partner_id: partnerId,
      status: { in: ["PENDENTE", "AGENDADA", "PAGA"] },
    },
    select: { status: true, valor_comissao: true },
  });

  let pendente = 0;
  let pago = 0;
  for (const row of rows) {
    const v = toNumber(row.valor_comissao);
    if (row.status === "PAGA") pago += v;
    else pendente += v;
  }

  return {
    success: true as const,
    pendente: roundMoney(pendente),
    pago: roundMoney(pago),
  };
}

export async function createPartnerCommission(input: {
  projectId: string;
  quoteId: string;
  percentual: number;
  data_pagamento_prevista?: string | null;
  observacoes?: string | null;
}) {
  const auth = await requireCommissionWrite();
  if (!auth) return { success: false as const, error: "Sem permissão para lançar comissão." };

  const percentual = Number(input.percentual);
  if (!Number.isFinite(percentual) || percentual <= 0 || percentual > 100) {
    return { success: false as const, error: "Informe um percentual entre 0 e 100." };
  }

  const project = await prisma.project.findFirst({
    where: {
      id: input.projectId,
      client: { company_id: auth.companyId },
    },
    select: {
      id: true,
      partner_id: true,
      client: { select: { nome: true } },
    },
  });
  if (!project) return { success: false as const, error: "Projeto não encontrado." };
  if (!project.partner_id) {
    return { success: false as const, error: "Projeto sem parceiro vinculado." };
  }

  const quote = await prisma.quote.findFirst({
    where: {
      id: input.quoteId,
      project_id: project.id,
    },
    select: {
      id: true,
      approvals: { select: { valor_aprovado: true } },
    },
  });
  if (!quote) return { success: false as const, error: "Orçamento não encontrado neste projeto." };

  const base_valor = roundMoney(
    quote.approvals.reduce((sum, a) => sum + toNumber(a.valor_aprovado), 0)
  );
  if (base_valor <= 0) {
    return { success: false as const, error: "Orçamento sem valor aprovado." };
  }

  const active = await prisma.partnerCommission.findFirst({
    where: {
      quote_id: quote.id,
      status: { not: "CANCELADA" },
    },
    select: { id: true },
  });
  if (active) {
    return {
      success: false as const,
      error: "Já existe comissão ativa para este orçamento. Cancele a anterior para relançar.",
    };
  }

  const valor_comissao = roundMoney((base_valor * percentual) / 100);
  const hasPrevista = Boolean(input.data_pagamento_prevista);
  const status: PartnerCommissionStatus = hasPrevista ? "AGENDADA" : "PENDENTE";

  const row = await prisma.partnerCommission.create({
    data: {
      company_id: auth.companyId,
      partner_id: project.partner_id,
      project_id: project.id,
      quote_id: quote.id,
      percentual,
      base_valor,
      valor_comissao,
      status,
      data_pagamento_prevista: input.data_pagamento_prevista
        ? new Date(`${input.data_pagamento_prevista}T12:00:00`)
        : null,
      observacoes: input.observacoes?.trim() || null,
      criado_por_id: auth.userId,
    },
    include: commissionInclude,
  });

  revalidatePath("/parceiros");
  revalidatePath(`/crm`);
  return { success: true as const, commission: mapCommission(row) };
}

export async function updatePartnerCommission(input: {
  id: string;
  percentual?: number;
  data_pagamento_prevista?: string | null;
  data_pagamento_efetiva?: string | null;
  observacoes?: string | null;
  status?: PartnerCommissionStatus;
}) {
  const auth = await requireCommissionWrite();
  if (!auth) return { success: false as const, error: "Sem permissão." };

  const existing = await prisma.partnerCommission.findFirst({
    where: { id: input.id, company_id: auth.companyId },
  });
  if (!existing) return { success: false as const, error: "Comissão não encontrada." };

  if (existing.status === "CANCELADA") {
    return { success: false as const, error: "Comissão cancelada não pode ser editada." };
  }

  const data: Prisma.PartnerCommissionUpdateInput = {};

  if (input.status === "CANCELADA") {
    data.status = "CANCELADA";
  } else if (input.status === "PAGA") {
    data.status = "PAGA";
    data.data_pagamento_efetiva = input.data_pagamento_efetiva
      ? new Date(`${input.data_pagamento_efetiva}T12:00:00`)
      : existing.data_pagamento_efetiva ?? new Date();
  } else if (
    (existing.status === "PENDENTE" || existing.status === "AGENDADA") &&
    input.percentual !== undefined
  ) {
    const percentual = Number(input.percentual);
    if (!Number.isFinite(percentual) || percentual <= 0 || percentual > 100) {
      return { success: false as const, error: "Percentual inválido." };
    }
    const base = toNumber(existing.base_valor);
    data.percentual = percentual;
    data.valor_comissao = roundMoney((base * percentual) / 100);
  }

  if (input.data_pagamento_prevista !== undefined) {
    data.data_pagamento_prevista = input.data_pagamento_prevista
      ? new Date(`${input.data_pagamento_prevista}T12:00:00`)
      : null;
    if (
      existing.status !== "PAGA" &&
      input.status !== "PAGA" &&
      input.status !== "CANCELADA"
    ) {
      data.status = input.data_pagamento_prevista ? "AGENDADA" : "PENDENTE";
    }
  }

  if (input.data_pagamento_efetiva !== undefined && input.status !== "PAGA") {
    data.data_pagamento_efetiva = input.data_pagamento_efetiva
      ? new Date(`${input.data_pagamento_efetiva}T12:00:00`)
      : null;
  }

  if (input.observacoes !== undefined) {
    data.observacoes = input.observacoes?.trim() || null;
  }

  const row = await prisma.partnerCommission.update({
    where: { id: existing.id },
    data,
    include: commissionInclude,
  });

  revalidatePath("/parceiros");
  return { success: true as const, commission: mapCommission(row) };
}

export async function issuePartnerCommissionReceipt(commissionId: string) {
  const auth = await requireCommissionWrite();
  if (!auth) return { success: false as const, error: "Sem permissão para emitir comprovante." };

  const commission = await prisma.partnerCommission.findFirst({
    where: { id: commissionId, company_id: auth.companyId },
    include: {
      partner: true,
      project: { include: { client: { select: { nome: true } } } },
      quote: { select: { codigo: true, versao: true } },
      receipts: { select: { id: true, numero: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!commission) return { success: false as const, error: "Comissão não encontrada." };
  if (commission.status === "CANCELADA") {
    return { success: false as const, error: "Não é possível emitir comprovante de comissão cancelada." };
  }

  if (commission.receipts[0]) {
    return {
      success: true as const,
      receiptId: commission.receipts[0].id,
      numero: commission.receipts[0].numero,
      reused: true as const,
    };
  }

  const last = await prisma.partnerCommissionReceipt.findFirst({
    where: { company_id: auth.companyId },
    orderBy: { numero: "desc" },
    select: { numero: true },
  });
  const numero = (last?.numero ?? 0) + 1;

  const emitidoPor = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { name: true },
  });

  const registro = formatPartnerRegistro(
    commission.partner.tipo,
    commission.partner.registro_profissional
  );

  const receipt = await prisma.partnerCommissionReceipt.create({
    data: {
      company_id: auth.companyId,
      commission_id: commission.id,
      numero,
      parceiro_nome: commission.partner.nome,
      parceiro_tipo: commission.partner.tipo,
      parceiro_registro: registro,
      parceiro_escritorio: commission.partner.escritorio,
      cliente_nome: commission.project.client.nome,
      projeto_ref: `Projeto · ${commission.project.client.nome}`,
      orcamento_codigo: commission.quote.codigo,
      orcamento_versao: commission.quote.versao,
      percentual: commission.percentual,
      base_valor: commission.base_valor,
      valor_comissao: commission.valor_comissao,
      data_pagamento_prevista: commission.data_pagamento_prevista,
      data_pagamento_efetiva: commission.data_pagamento_efetiva,
      emitido_por_id: auth.userId,
      emitido_por_nome: emitidoPor?.name || null,
      observacoes: commission.observacoes,
    },
  });

  revalidatePath("/parceiros");
  revalidatePath(`/comissoes/${receipt.id}/print`);

  return {
    success: true as const,
    receiptId: receipt.id,
    numero: receipt.numero,
    reused: false as const,
  };
}

export async function getPartnerCommissionReceipt(receiptId: string) {
  const auth = await requireCommissionRead();
  if (!auth) return { success: false as const, error: "Não autenticado." };

  const row = await prisma.partnerCommissionReceipt.findFirst({
    where: { id: receiptId, company_id: auth.companyId },
    include: {
      commission: { select: { id: true, project_id: true, status: true } },
    },
  });
  if (!row) return { success: false as const, error: "Comprovante não encontrado." };

  const dto: PartnerCommissionReceiptDTO = {
    id: row.id,
    numero: row.numero,
    commission_id: row.commission_id,
    parceiro_nome: row.parceiro_nome,
    parceiro_tipo: row.parceiro_tipo,
    parceiro_registro: row.parceiro_registro,
    parceiro_escritorio: row.parceiro_escritorio,
    cliente_nome: row.cliente_nome,
    projeto_ref: row.projeto_ref,
    orcamento_codigo: row.orcamento_codigo,
    orcamento_versao: row.orcamento_versao,
    percentual: toNumber(row.percentual),
    base_valor: toNumber(row.base_valor),
    valor_comissao: toNumber(row.valor_comissao),
    data_pagamento_prevista: row.data_pagamento_prevista
      ? toISODateBR(row.data_pagamento_prevista)
      : null,
    data_pagamento_efetiva: row.data_pagamento_efetiva
      ? toISODateBR(row.data_pagamento_efetiva)
      : null,
    emitido_por_nome: row.emitido_por_nome,
    observacoes: row.observacoes,
    createdAt: row.createdAt.toISOString(),
  };

  return {
    success: true as const,
    receipt: dto,
    projectId: row.commission.project_id,
    commissionStatus: row.commission.status,
  };
}
