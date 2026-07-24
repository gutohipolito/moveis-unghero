"use server";

import { revalidatePath } from "next/cache";
import { ContractStatus, Prisma } from "@prisma/client";
import { prisma, isDatabaseOffline } from "@/lib/prisma";
import { assertCompanyAccess, getAuthContext } from "@/lib/auth-guard";
import { getModuleAccess, getWriteAccess } from "@/lib/moduleAccess";
import { capitalizeText } from "@/lib/utils";
import {
  DEFAULT_CONTRACT_TEMPLATE,
  buildClientAddress,
} from "@/lib/contractTemplates";
import { maybeRedactForViewer } from "@/lib/viewerRedact";

export type ContractTemplateDTO = {
  id: string;
  nome: string;
  titulo: string;
  clausula_local: string;
  clausula_pagamento: string;
  clausula_prazo: string;
  clausula_extra: string | null;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ContractDTO = {
  id: string;
  template_id: string | null;
  client_id: string | null;
  project_id: string | null;
  titulo: string;
  cliente_nome: string;
  cliente_documento: string;
  cliente_endereco: string;
  servicos: string;
  valor: number;
  entrada_pct: number;
  clausula_local: string;
  clausula_pagamento: string;
  clausula_prazo: string;
  clausula_extra: string | null;
  data_entrega: Date | null;
  data_contrato: Date;
  cidade_emissao: string;
  status: ContractStatus;
  observacoes: string | null;
  createdAt: Date;
  updatedAt: Date;
  client?: { id: string; nome: string; telefone?: string | null } | null;
  project?: { id: string; status_geral: string } | null;
  template?: { id: string; nome: string } | null;
};

function toNumber(value: Prisma.Decimal | number | string) {
  if (typeof value === "number") return value;
  return Number(value);
}

function mapContract(c: {
  id: string;
  template_id: string | null;
  client_id: string | null;
  project_id: string | null;
  titulo: string;
  cliente_nome: string;
  cliente_documento: string;
  cliente_endereco: string;
  servicos: string;
  valor: Prisma.Decimal | number;
  entrada_pct: number;
  clausula_local: string;
  clausula_pagamento: string;
  clausula_prazo: string;
  clausula_extra: string | null;
  data_entrega: Date | null;
  data_contrato: Date;
  cidade_emissao: string;
  status: ContractStatus;
  observacoes: string | null;
  createdAt: Date;
  updatedAt: Date;
  client?: { id: string; nome: string; telefone?: string | null } | null;
  project?: { id: string; status_geral: string } | null;
  template?: { id: string; nome: string } | null;
}): ContractDTO {
  return {
    ...c,
    valor: toNumber(c.valor),
    client: c.client ?? null,
    project: c.project ?? null,
    template: c.template ?? null,
  };
}

/** Garante o template padrão da empresa (idempotente). */
export async function ensureDefaultContractTemplate(companyId: string) {
  const auth = await getModuleAccess("contratos");
  if (!auth) return { success: false as const, error: "Não autenticado" };
  try {
    assertCompanyAccess(auth, companyId);
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Acesso negado",
    };
  }

  if (isDatabaseOffline()) {
    return { success: false as const, error: "Banco indisponível" };
  }

  const existing = await prisma.contractTemplate.findFirst({
    where: { company_id: companyId },
    orderBy: { createdAt: "asc" },
  });
  if (existing) {
    return { success: true as const, template: existing };
  }

  const template = await prisma.contractTemplate.create({
    data: {
      company_id: companyId,
      nome: DEFAULT_CONTRACT_TEMPLATE.nome,
      titulo: DEFAULT_CONTRACT_TEMPLATE.titulo,
      clausula_local: DEFAULT_CONTRACT_TEMPLATE.clausula_local,
      clausula_pagamento: DEFAULT_CONTRACT_TEMPLATE.clausula_pagamento,
      clausula_prazo: DEFAULT_CONTRACT_TEMPLATE.clausula_prazo,
      clausula_extra: DEFAULT_CONTRACT_TEMPLATE.clausula_extra,
      ativo: true,
    },
  });

  return { success: true as const, template };
}

export async function getContractTemplates(companyId: string) {
  const auth = await getModuleAccess("contratos");
  if (!auth) {
    return { success: false as const, error: "Não autenticado", templates: [] as ContractTemplateDTO[] };
  }
  try {
    assertCompanyAccess(auth, companyId);
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Acesso negado",
      templates: [] as ContractTemplateDTO[],
    };
  }

  if (isDatabaseOffline()) {
    return { success: false as const, error: "Banco indisponível", templates: [] as ContractTemplateDTO[] };
  }

  await ensureDefaultContractTemplate(companyId);

  const templates = await prisma.contractTemplate.findMany({
    where: { company_id: companyId },
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
  });

  return { success: true as const, templates: templates as ContractTemplateDTO[] };
}

export async function createContractTemplate(
  companyId: string,
  data: {
    nome: string;
    titulo: string;
    clausula_local: string;
    clausula_pagamento: string;
    clausula_prazo: string;
    clausula_extra?: string | null;
  }
) {
  const auth = await getWriteAccess("contratos");
  if (!auth) return { success: false as const, error: "Não autenticado" };
  try {
    assertCompanyAccess(auth, companyId);
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Acesso negado",
    };
  }

  if (!data.nome.trim()) {
    return { success: false as const, error: "Informe o nome do template." };
  }

  const template = await prisma.contractTemplate.create({
    data: {
      company_id: companyId,
      nome: data.nome.trim(),
      titulo: data.titulo.trim() || DEFAULT_CONTRACT_TEMPLATE.titulo,
      clausula_local: data.clausula_local.trim() || DEFAULT_CONTRACT_TEMPLATE.clausula_local,
      clausula_pagamento:
        data.clausula_pagamento.trim() || DEFAULT_CONTRACT_TEMPLATE.clausula_pagamento,
      clausula_prazo: data.clausula_prazo.trim() || DEFAULT_CONTRACT_TEMPLATE.clausula_prazo,
      clausula_extra: data.clausula_extra?.trim() || null,
      ativo: true,
    },
  });

  revalidatePath("/contratos");
  return { success: true as const, template };
}

export async function updateContractTemplate(
  id: string,
  data: {
    nome?: string;
    titulo?: string;
    clausula_local?: string;
    clausula_pagamento?: string;
    clausula_prazo?: string;
    clausula_extra?: string | null;
    ativo?: boolean;
  }
) {
  const auth = await getWriteAccess("contratos");
  if (!auth) return { success: false as const, error: "Não autenticado" };

  const existing = await prisma.contractTemplate.findFirst({
    where: { id, company_id: auth.companyId },
  });
  if (!existing) {
    return { success: false as const, error: "Template não encontrado." };
  }

  const template = await prisma.contractTemplate.update({
    where: { id },
    data: {
      ...(data.nome !== undefined ? { nome: data.nome.trim() } : {}),
      ...(data.titulo !== undefined ? { titulo: data.titulo.trim() } : {}),
      ...(data.clausula_local !== undefined ? { clausula_local: data.clausula_local.trim() } : {}),
      ...(data.clausula_pagamento !== undefined
        ? { clausula_pagamento: data.clausula_pagamento.trim() }
        : {}),
      ...(data.clausula_prazo !== undefined ? { clausula_prazo: data.clausula_prazo.trim() } : {}),
      ...(data.clausula_extra !== undefined
        ? { clausula_extra: data.clausula_extra?.trim() || null }
        : {}),
      ...(data.ativo !== undefined ? { ativo: data.ativo } : {}),
    },
  });

  revalidatePath("/contratos");
  return { success: true as const, template };
}

export async function deleteContractTemplate(id: string) {
  const auth = await getWriteAccess("contratos");
  if (!auth) return { success: false as const, error: "Não autenticado" };

  const existing = await prisma.contractTemplate.findFirst({
    where: { id, company_id: auth.companyId },
  });
  if (!existing) {
    return { success: false as const, error: "Template não encontrado." };
  }

  const inUse = await prisma.contract.count({ where: { template_id: id } });
  if (inUse > 0) {
    await prisma.contractTemplate.update({
      where: { id },
      data: { ativo: false },
    });
    revalidatePath("/contratos");
    return {
      success: true as const,
      deactivated: true,
      message: "Template em uso — desativado em vez de excluído.",
    };
  }

  await prisma.contractTemplate.delete({ where: { id } });
  revalidatePath("/contratos");
  return { success: true as const, deactivated: false };
}

export async function getContracts(companyId: string) {
  const auth = await getModuleAccess("contratos");
  if (!auth) {
    return { success: false as const, error: "Não autenticado", contracts: [] as ContractDTO[] };
  }
  try {
    assertCompanyAccess(auth, companyId);
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Acesso negado",
      contracts: [] as ContractDTO[],
    };
  }

  if (isDatabaseOffline()) {
    return { success: false as const, error: "Banco indisponível", contracts: [] as ContractDTO[] };
  }

  await ensureDefaultContractTemplate(companyId);

  const contracts = await prisma.contract.findMany({
    where: { company_id: companyId },
    include: {
      client: { select: { id: true, nome: true, telefone: true } },
      project: { select: { id: true, status_geral: true } },
      template: { select: { id: true, nome: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    success: true as const,
    contracts: maybeRedactForViewer(contracts.map(mapContract), auth.cargo),
  };
}

export async function getContractById(id: string) {
  const auth = await getModuleAccess("contratos");
  if (!auth) return { success: false as const, error: "Não autenticado" };

  const contract = await prisma.contract.findFirst({
    where: { id, company_id: auth.companyId },
    include: {
      client: { select: { id: true, nome: true } },
      project: { select: { id: true, status_geral: true } },
      template: { select: { id: true, nome: true } },
    },
  });

  if (!contract) {
    return { success: false as const, error: "Contrato não encontrado." };
  }

  return {
    success: true as const,
    contract: maybeRedactForViewer(mapContract(contract), auth.cargo),
  };
}

export type ContractFormInput = {
  template_id?: string | null;
  client_id?: string | null;
  project_id?: string | null;
  titulo: string;
  cliente_nome: string;
  cliente_documento: string;
  cliente_endereco: string;
  servicos: string;
  valor: number;
  entrada_pct: number;
  clausula_local: string;
  clausula_pagamento: string;
  clausula_prazo: string;
  clausula_extra?: string | null;
  data_entrega?: string | null;
  data_contrato: string;
  cidade_emissao?: string;
  status?: ContractStatus;
  observacoes?: string | null;
};

function parseDateInput(value: string | null | undefined): Date | null {
  if (!value?.trim()) return null;
  const d = new Date(`${value.trim()}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeClauses(data: ContractFormInput) {
  return {
    clausula_local: data.clausula_local.trim(),
    clausula_pagamento: data.clausula_pagamento.trim(),
    clausula_prazo: data.clausula_prazo.trim(),
    clausula_extra: data.clausula_extra?.trim() || null,
  };
}

export async function createContract(companyId: string, data: ContractFormInput) {
  const auth = await getWriteAccess("contratos");
  if (!auth) return { success: false as const, error: "Não autenticado" };
  try {
    assertCompanyAccess(auth, companyId);
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Acesso negado",
    };
  }

  if (!data.cliente_nome.trim()) {
    return { success: false as const, error: "Informe o nome do contratante." };
  }
  if (!data.servicos.trim()) {
    return { success: false as const, error: "Descreva os serviços." };
  }
  if (!data.valor || data.valor <= 0) {
    return { success: false as const, error: "Informe um valor válido." };
  }

  const dataContrato = parseDateInput(data.data_contrato) ?? new Date();
  const clauses = normalizeClauses(data);

  const contract = await prisma.contract.create({
    data: {
      company_id: companyId,
      template_id: data.template_id || null,
      client_id: data.client_id || null,
      project_id: data.project_id || null,
      titulo: data.titulo.trim() || DEFAULT_CONTRACT_TEMPLATE.titulo,
      cliente_nome: capitalizeText(data.cliente_nome),
      cliente_documento: data.cliente_documento.trim(),
      cliente_endereco: data.cliente_endereco.trim(),
      servicos: data.servicos.trim(),
      valor: data.valor,
      entrada_pct: Math.min(100, Math.max(0, data.entrada_pct || 50)),
      ...clauses,
      data_entrega: parseDateInput(data.data_entrega),
      data_contrato: dataContrato,
      cidade_emissao: data.cidade_emissao?.trim() || "Farroupilha",
      status: data.status ?? "RASCUNHO",
      observacoes: data.observacoes?.trim() || null,
    },
    include: {
      client: { select: { id: true, nome: true } },
      project: { select: { id: true, status_geral: true } },
      template: { select: { id: true, nome: true } },
    },
  });

  revalidatePath("/contratos");
  return { success: true as const, contract: mapContract(contract) };
}

export async function updateContract(id: string, data: ContractFormInput) {
  const auth = await getWriteAccess("contratos");
  if (!auth) return { success: false as const, error: "Não autenticado" };

  const existing = await prisma.contract.findFirst({
    where: { id, company_id: auth.companyId },
  });
  if (!existing) {
    return { success: false as const, error: "Contrato não encontrado." };
  }

  if (!data.cliente_nome.trim()) {
    return { success: false as const, error: "Informe o nome do contratante." };
  }
  if (!data.servicos.trim()) {
    return { success: false as const, error: "Descreva os serviços." };
  }
  if (!data.valor || data.valor <= 0) {
    return { success: false as const, error: "Informe um valor válido." };
  }

  const dataContrato = parseDateInput(data.data_contrato) ?? existing.data_contrato;
  const clauses = normalizeClauses(data);

  const contract = await prisma.contract.update({
    where: { id },
    data: {
      template_id: data.template_id || null,
      client_id: data.client_id || null,
      project_id: data.project_id || null,
      titulo: data.titulo.trim() || DEFAULT_CONTRACT_TEMPLATE.titulo,
      cliente_nome: capitalizeText(data.cliente_nome),
      cliente_documento: data.cliente_documento.trim(),
      cliente_endereco: data.cliente_endereco.trim(),
      servicos: data.servicos.trim(),
      valor: data.valor,
      entrada_pct: Math.min(100, Math.max(0, data.entrada_pct || 50)),
      ...clauses,
      data_entrega: parseDateInput(data.data_entrega),
      data_contrato: dataContrato,
      cidade_emissao: data.cidade_emissao?.trim() || "Farroupilha",
      status: data.status ?? existing.status,
      observacoes: data.observacoes?.trim() || null,
    },
    include: {
      client: { select: { id: true, nome: true } },
      project: { select: { id: true, status_geral: true } },
      template: { select: { id: true, nome: true } },
    },
  });

  revalidatePath("/contratos");
  revalidatePath(`/contratos/${id}/print`);
  return { success: true as const, contract: mapContract(contract) };
}

export async function deleteContract(id: string) {
  const auth = await getWriteAccess("contratos");
  if (!auth) return { success: false as const, error: "Não autenticado" };

  const existing = await prisma.contract.findFirst({
    where: { id, company_id: auth.companyId },
  });
  if (!existing) {
    return { success: false as const, error: "Contrato não encontrado." };
  }

  await prisma.contract.delete({ where: { id } });
  revalidatePath("/contratos");
  return { success: true as const };
}

/** Dados leves para autofill no formulário. */
export async function getContractFormOptions(companyId: string) {
  const auth = await getModuleAccess("contratos");
  if (!auth) {
    return {
      success: false as const,
      error: "Não autenticado",
      clients: [],
      projects: [],
    };
  }
  try {
    assertCompanyAccess(auth, companyId);
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Acesso negado",
      clients: [],
      projects: [],
    };
  }

  const [clients, projects] = await Promise.all([
    prisma.client.findMany({
      where: { company_id: companyId },
      select: {
        id: true,
        nome: true,
        cpf: true,
        cnpj: true,
        tipo_pessoa: true,
        endereco: true,
        numero: true,
        bairro: true,
        cidade: true,
        uf: true,
        cep: true,
      },
      orderBy: { nome: "asc" },
      take: 500,
    }),
    prisma.project.findMany({
      where: { client: { company_id: companyId } },
      select: {
        id: true,
        client_id: true,
        valor_previsto: true,
        status_geral: true,
        data_entrega_prevista: true,
        client: { select: { nome: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ]);

  return {
    success: true as const,
    clients: maybeRedactForViewer(
      clients.map((c) => ({
        id: c.id,
        nome: c.nome,
        documento: c.tipo_pessoa === "PJ" ? c.cnpj || "" : c.cpf || "",
        endereco: buildClientAddress(c),
      })),
      auth.cargo
    ),
    projects: maybeRedactForViewer(
      projects.map((p) => ({
        id: p.id,
        client_id: p.client_id,
        client_nome: p.client.nome,
        valor_previsto: toNumber(p.valor_previsto),
        status_geral: p.status_geral,
        data_entrega_prevista: p.data_entrega_prevista,
      })),
      auth.cargo
    ),
  };
}
