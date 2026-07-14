"use server";

import { prisma, isDatabaseOffline, setDatabaseOffline } from "@/lib/prisma";
import { capitalizeText } from "@/lib/utils";
import {
  parseLegacyDocumentFromObs,
  resolveClientDocument,
  type TipoPessoa,
} from "@/lib/clientDocument";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  assertCompanyAccess,
  getAuthContext,
  requireClientInCompany,
} from "@/lib/auth-guard";
import { createClientSessionToken } from "@/lib/clientSession";
import type { ClientAttachmentDTO } from "@/lib/clientAttachments";
import { labelProjectStatus } from "@/lib/navLabels";
import { labelPaymentMethod } from "@/lib/paymentMethods";
import { findExistingClient, resolveClientContactFields } from "@/lib/clientMatch";

type Origin = 
  | "SITE"
  | "INSTAGRAM"
  | "INDICACAO"
  | "GOOGLE"
  | "WHATSAPP"
  | "FACEBOOK"
  | "FORMULARIO";


// Limpa caracteres não numéricos do CPF
function cleanCpf(cpf: string) {
  return cpf.replace(/\D/g, "");
}

function formatClientRecord(c: {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cidade: string;
  origem: string;
  status: string;
  observacoes: string | null;
  tipo_pessoa?: TipoPessoa | null;
  cpf?: string | null;
  cnpj?: string | null;
  cep?: string | null;
  endereco?: string | null;
  numero?: string | null;
  bairro?: string | null;
  uf?: string | null;
  tipo_imovel?: string | null;
  obs_imovel?: string | null;
  obs_entrega?: string | null;
  lgpd_aceite?: boolean | null;
  lgpd_aceite_em?: Date | string | null;
  marketing_aceite?: boolean | null;
  createdAt?: Date | null;
  projects?: {
    id: string;
    status_geral: string;
    valor_previsto: number | { toNumber?: () => number };
    createdAt?: Date;
    updatedAt?: Date;
    quotes?: { id: string; valor_final: number | { toNumber?: () => number }; versao: number }[];
    briefing?: { score: number | null; estilo: string; faixa_investimento: string | null } | null;
    _count?: { environments: number };
  }[];
}) {
  const doc = resolveClientDocument(c);
  return {
    id: c.id,
    nome: c.nome,
    email: c.email,
    telefone: c.telefone,
    cidade: c.cidade,
    origem: c.origem as Origin,
    status: c.status,
    tipo_pessoa: doc.tipo_pessoa,
    cpf: doc.cpf || "",
    cnpj: doc.cnpj || "",
    observacoes: doc.observacoes,
    lgpd_aceite: Boolean(c.lgpd_aceite),
    lgpd_aceite_em:
      c.lgpd_aceite_em instanceof Date
        ? c.lgpd_aceite_em.toISOString()
        : typeof c.lgpd_aceite_em === "string"
          ? c.lgpd_aceite_em
          : null,
    marketing_aceite: Boolean(c.marketing_aceite),
    cep: c.cep || "",
    endereco: c.endereco || "",
    numero: c.numero || "",
    bairro: c.bairro || "",
    uf: c.uf || "",
    tipo_imovel: c.tipo_imovel || "",
    obs_imovel: c.obs_imovel || "",
    obs_entrega: c.obs_entrega || "",
    createdAt: c.createdAt?.toISOString() ?? null,
    projects: (c.projects ?? []).map((p) => ({
      id: p.id,
      status_geral: p.status_geral,
      valor_previsto:
        typeof p.valor_previsto === "number"
          ? p.valor_previsto
          : Number(p.valor_previsto),
      createdAt: p.createdAt?.toISOString() ?? null,
      updatedAt: p.updatedAt?.toISOString() ?? null,
      quotes: (p.quotes ?? []).map((q) => ({
        id: q.id,
        versao: q.versao,
        valor_final:
          typeof q.valor_final === "number" ? q.valor_final : Number(q.valor_final),
      })),
      briefing: p.briefing
        ? {
            score: p.briefing.score,
            estilo: p.briefing.estilo,
            faixa_investimento: p.briefing.faixa_investimento,
          }
        : null,
      environments_count: p._count?.environments ?? 0,
    })),
  };
}

let legacyDocumentsMigrated = false;

async function migrateLegacyClientDocumentsIfNeeded() {
  if (legacyDocumentsMigrated || isDatabaseOffline()) return;

  try {
    const legacyClients = await prisma.client.findMany({
      where: {
        OR: [
          { observacoes: { startsWith: "[PF - CPF:" } },
          { observacoes: { startsWith: "[PJ - CNPJ:" } },
        ],
      },
      select: { id: true, observacoes: true, cnpj: true },
    });

    if (legacyClients.length === 0) {
      legacyDocumentsMigrated = true;
      return;
    }

    await prisma.$transaction(
      legacyClients.map((client) => {
        const migrated = parseLegacyDocumentFromObs(client.observacoes);
        return prisma.client.update({
          where: { id: client.id },
          data: {
            tipo_pessoa: migrated.tipo_pessoa,
            cpf: migrated.cpf,
            cnpj: migrated.cnpj || client.cnpj,
            observacoes: migrated.observacoes || null,
          },
        });
      })
    );

    legacyDocumentsMigrated = true;
  } catch (error) {
    console.warn("Falha ao migrar documentos legados de clientes:", error);
  }
}

export async function loginCliente(data: { identificador: string; cpf: string }) {
  const cookieStore = await cookies();
  const idLimpo = data.identificador.trim().toLowerCase();
  const cpfLimpo = cleanCpf(data.cpf);
  const isProduction = process.env.NODE_ENV === "production";

  if (isDatabaseOffline()) {
    return { success: false, error: "Serviço temporariamente indisponível. Tente novamente." };
  }

  try {
    const client = await prisma.client.findFirst({
      where: {
        OR: [{ email: idLimpo }, { telefone: idLimpo }],
      },
    });

    if (!client) {
      return { success: false, error: "Cliente não cadastrado no CRM ou dados inválidos." };
    }

    const doc = resolveClientDocument(client);
    const storedCpf = cleanCpf(doc.cpf || "");
    if (!storedCpf) {
      return {
        success: false,
        error: "Portal indisponível para este cadastro. Entre em contato com a loja.",
      };
    }
    if (storedCpf !== cpfLimpo) {
      return { success: false, error: "Cliente não cadastrado no CRM ou dados inválidos." };
    }

    cookieStore.set("cliente-session", createClientSessionToken(client.id), {
      path: "/",
      httpOnly: true,
      secure: isProduction,
      maxAge: 60 * 60 * 24,
    });
    return { success: true, clientId: client.id };
  } catch (error) {
    console.warn("Banco offline no login de cliente.", error);
    setDatabaseOffline(true);
    return { success: false, error: "Serviço temporariamente indisponível. Tente novamente." };
  }
}

export async function logoutCliente() {
  const cookieStore = await cookies();
  cookieStore.delete("cliente-session");
  redirect("/cliente/login");
}

// ─── SERVER ACTIONS PARA GERENCIAMENTO DE CLIENTES / LEADS ───

// 1. Listar Clientes
export async function getClients(companyId: string) {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: "Não autenticado", clients: [] };
  }
  try {
    assertCompanyAccess(auth, companyId);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Acesso negado",
      clients: [],
    };
  }

  if (isDatabaseOffline()) {
    return { success: false, error: "Erro de conexão ao banco de dados", clients: [] };
  }

  try {
    await migrateLegacyClientDocumentsIfNeeded();

    const clients = await prisma.client.findMany({
      where: { company_id: companyId },
      include: {
        projects: {
          select: {
            id: true,
            status_geral: true,
            valor_previsto: true,
          },
        },
      },
      orderBy: { nome: "asc" },
    });

    return { success: true, clients: clients.map((c) => formatClientRecord(c)) };
  } catch (error) {
    console.warn("Falha de conexão na listagem de clientes.", error);
    setDatabaseOffline(true);
    return { success: false, error: "Erro de conexão ao banco de dados", clients: [] };
  }
}

// 2. Cadastrar Cliente
export async function createClientAction(formData: {
  nome: string;
  email: string;
  telefone: string;
  cidade: string;
  origem: Origin;
  status: string;
  observacoes?: string;
  company_id: string;
  tipo_pessoa?: TipoPessoa;
  cpf?: string;
  cnpj?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  uf?: string;
  tipo_imovel?: string;
  obs_imovel?: string;
  obs_entrega?: string;
}) {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  try {
    assertCompanyAccess(auth, formData.company_id);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Acesso negado",
    };
  }

  const tipoPessoa = formData.tipo_pessoa || "PF";
  const cpf = tipoPessoa === "PF" ? formData.cpf || null : null;
  const cnpj = tipoPessoa === "PJ" ? formData.cnpj || null : null;

  if (isDatabaseOffline()) {
    return { success: false, error: "Banco de dados indisponível." };
  }

  try {
    const existing = await findExistingClient({
      companyId: auth.companyId,
      telefone: formData.telefone,
      email: formData.email,
      cpf: cpf || undefined,
      cnpj: cnpj || undefined,
    });

    if (existing) {
      return {
        success: false,
        error: "Já existe um cliente com este telefone, e-mail ou documento.",
        existingClientId: existing.id,
      };
    }

    const contact = resolveClientContactFields(formData.telefone, formData.email);

    const client = await prisma.client.create({
      data: {
        nome: capitalizeText(formData.nome),
        email: contact.email || formData.email,
        telefone: contact.telefone,
        telefone_digits: contact.phoneDigits || null,
        cidade: capitalizeText(formData.cidade),
        origem: formData.origem,
        status: formData.status,
        observacoes: formData.observacoes || "",
        company_id: auth.companyId,
        tipo_pessoa: tipoPessoa,
        cpf,
        cnpj,
        cep: formData.cep || null,
        endereco: formData.endereco ? capitalizeText(formData.endereco) : null,
        numero: formData.numero || null,
        bairro: formData.bairro ? capitalizeText(formData.bairro) : null,
        uf: formData.uf || null,
        tipo_imovel: formData.tipo_imovel || null,
        obs_imovel: formData.obs_imovel || null,
        obs_entrega: formData.obs_entrega || null,
      }
    });

    revalidatePath("/clientes");
    return { success: true, client: formatClientRecord({ ...client, projects: [] }) };
  } catch (error) {
    console.warn("Falha ao criar cliente no banco:", error);
    return { success: false, error: "Não foi possível cadastrar o cliente." };
  }
}

// 3. Editar Cliente
export async function updateClientAction(
  clientId: string,
  formData: {
    nome: string;
    email: string;
    telefone: string;
    cidade: string;
    origem: Origin;
    status: string;
    observacoes?: string;
    tipo_pessoa?: TipoPessoa;
    cpf?: string;
    cnpj?: string;
    cep?: string;
    endereco?: string;
    numero?: string;
    bairro?: string;
    uf?: string;
    tipo_imovel?: string;
    obs_imovel?: string;
    obs_entrega?: string;
  }
) {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  try {
    await requireClientInCompany(clientId, auth.companyId);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Acesso negado",
    };
  }

  const tipoPessoa = formData.tipo_pessoa || "PF";
  const cpf = tipoPessoa === "PF" ? formData.cpf || null : null;
  const cnpj = tipoPessoa === "PJ" ? formData.cnpj || null : null;

  if (isDatabaseOffline()) {
    return { success: false, error: "Banco de dados indisponível." };
  }

  try {
    await prisma.client.update({
      where: { id: clientId },
      data: {
        nome: capitalizeText(formData.nome),
        email: formData.email,
        telefone: formData.telefone,
        cidade: capitalizeText(formData.cidade),
        origem: formData.origem,
        status: formData.status,
        observacoes: formData.observacoes || "",
        tipo_pessoa: tipoPessoa,
        cpf,
        cnpj,
        cep: formData.cep !== undefined ? formData.cep : undefined,
        endereco: formData.endereco !== undefined ? (formData.endereco ? capitalizeText(formData.endereco) : null) : undefined,
        numero: formData.numero !== undefined ? formData.numero : undefined,
        bairro: formData.bairro !== undefined ? (formData.bairro ? capitalizeText(formData.bairro) : null) : undefined,
        uf: formData.uf !== undefined ? formData.uf : undefined,
        tipo_imovel: formData.tipo_imovel !== undefined ? formData.tipo_imovel : undefined,
        obs_imovel: formData.obs_imovel !== undefined ? formData.obs_imovel : undefined,
        obs_entrega: formData.obs_entrega !== undefined ? formData.obs_entrega : undefined,
      }
    });

    revalidatePath("/clientes");
    return { success: true };
  } catch (error) {
    console.warn("Falha ao editar cliente no banco:", error);
    return { success: false, error: "Não foi possível atualizar o cliente." };
  }
}

// 4. Excluir Cliente
export async function deleteClientAction(clientId: string) {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  try {
    await requireClientInCompany(clientId, auth.companyId);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Acesso negado",
    };
  }

  if (isDatabaseOffline()) {
    return { success: false, error: "Banco de dados indisponível." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const projects = await tx.project.findMany({
        where: { client_id: clientId },
        select: { id: true },
      });
      const projectIds = projects.map((p) => p.id);

      if (projectIds.length > 0) {
        const quotes = await tx.quote.findMany({
          where: { project_id: { in: projectIds } },
          select: { id: true },
        });
        const quoteIds = quotes.map((q) => q.id);

        // QuoteItem tem FK RESTRICT — precisa sair antes do Quote
        if (quoteIds.length > 0) {
          await tx.quoteItem.deleteMany({ where: { quote_id: { in: quoteIds } } });
        }
        await tx.quote.deleteMany({ where: { project_id: { in: projectIds } } });
        await tx.installment.deleteMany({ where: { project_id: { in: projectIds } } });
        await tx.task.deleteMany({ where: { project_id: { in: projectIds } } });
        await tx.file.deleteMany({ where: { project_id: { in: projectIds } } });
        await tx.timeline.deleteMany({ where: { project_id: { in: projectIds } } });
        await tx.environment.deleteMany({ where: { project_id: { in: projectIds } } });
        // ProjectSlaState / LeadBriefing: CASCADE no banco
        // SupplyTicket / Expense / ClientAttachment.project_id: SET NULL
        await tx.project.deleteMany({ where: { client_id: clientId } });
      }

      // ClientAttachment: CASCADE no banco
      await tx.client.delete({ where: { id: clientId } });
    });

    revalidatePath("/clientes");
    return { success: true };
  } catch (error) {
    console.warn("Falha ao excluir cliente no banco:", error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Não foi possível excluir o cliente.";
    return {
      success: false,
      error: message.includes("Foreign key") || message.includes("Restrict")
        ? "Este cliente possui registros vinculados que impedem a exclusão. Remova orçamentos/projetos associados ou tente novamente."
        : "Não foi possível excluir o cliente.",
    };
  }
}

// 5. Importar Clientes em Lote
export async function importClientsAction(
  clients: Array<{
    nome: string;
    email: string;
    telefone: string;
    cidade: string;
    origem: Origin;
    status: string;
    observacoes?: string;
    tipo_pessoa?: TipoPessoa;
    cpf?: string;
    cnpj?: string;
  }>,
  companyId: string
) {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  try {
    assertCompanyAccess(auth, companyId);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Acesso negado",
    };
  }

  if (isDatabaseOffline()) {
    return { success: false, error: "Banco de dados indisponível." };
  }

  try {
    await prisma.$transaction(
      clients.map((c) => {
        const legacy = parseLegacyDocumentFromObs(c.observacoes);
        const tipoPessoa = c.tipo_pessoa || legacy.tipo_pessoa;
        const cpf = c.cpf || legacy.cpf;
        const cnpj = c.cnpj || legacy.cnpj;
        const observacoes = legacy.observacoes || c.observacoes || "";

        return prisma.client.create({
          data: {
            nome: capitalizeText(c.nome),
            email: c.email,
            telefone: c.telefone,
            cidade: capitalizeText(c.cidade),
            origem: c.origem,
            status: c.status,
            observacoes,
            company_id: companyId,
            tipo_pessoa: tipoPessoa,
            cpf: tipoPessoa === "PF" ? cpf : null,
            cnpj: tipoPessoa === "PJ" ? cnpj : null,
          },
        });
      })
    );

    revalidatePath("/clientes");
    return { success: true, count: clients.length };
  } catch (error) {
    console.warn("Falha ao importar contatos no banco:", error);
    return { success: false, error: "Não foi possível importar os contatos." };
  }
}

export interface Activity {
  id: string;
  data: string;
  titulo: string;
  descricao: string;
  autor: string;
  tipo?: "cadastro" | "nota";
}

export interface Payment {
  id: string;
  projectId: string;
  projectStatus: string;
  descricao: string;
  valor: number;
  vencimento: string;
  status: "PAGO" | "PENDENTE" | "ATRASADO";
  pagoEm?: string;
  metodo?: string;
  tipo: "ENTRADA" | "PARCELA";
  numeroParcela?: number;
  totalParcelas?: number;
}


function mapTimelineToActivity(entry: {
  id: string;
  data: Date;
  acao: string;
  user: { name: string };
}): Activity {
  const separator = " — ";
  const idx = entry.acao.indexOf(separator);
  if (idx === -1) {
    return {
      id: entry.id,
      data: entry.data.toISOString(),
      titulo: entry.acao,
      descricao: "",
      autor: entry.user.name,
    };
  }

  return {
    id: entry.id,
    data: entry.data.toISOString(),
    titulo: entry.acao.slice(0, idx),
    descricao: entry.acao.slice(idx + separator.length),
    autor: entry.user.name,
  };
}

function resolveInstallmentStatus(
  status: string,
  dataVencimento: Date
): Payment["status"] {
  if (status === "PAGO") return "PAGO";
  if (status === "ATRASADO") return "ATRASADO";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dataVencimento);
  due.setHours(0, 0, 0, 0);
  if (due < today) return "ATRASADO";
  return "PENDENTE";
}

function mapInstallmentToPayment(
  inst: {
    id: string;
    tipo: string;
    valor: { toString(): string } | number;
    data_vencimento: Date;
    data_pagamento: Date | null;
    status: string;
    metodo_pagamento: string;
    numero_parcela: number | null;
    total_parcelas: number | null;
  },
  project: { id: string; status_geral: string }
): Payment {
  const tipoBase = inst.tipo === "ENTRADA" ? "Entrada" : "Parcela";
  const parcelRef =
    inst.numero_parcela && inst.total_parcelas
      ? `${tipoBase} ${inst.numero_parcela}/${inst.total_parcelas}`
      : tipoBase;
  const metodo = labelPaymentMethod(inst.metodo_pagamento);
  const projectRef = `#${project.id.slice(0, 8).toUpperCase()} · ${labelProjectStatus(project.status_geral)}`;

  return {
    id: inst.id,
    projectId: project.id,
    projectStatus: project.status_geral,
    descricao: `${parcelRef} (${metodo}) — ${projectRef}`,
    valor: Number(inst.valor),
    vencimento: inst.data_vencimento.toISOString().split("T")[0],
    status: resolveInstallmentStatus(inst.status, inst.data_vencimento),
    pagoEm: inst.data_pagamento
      ? inst.data_pagamento.toISOString().split("T")[0]
      : undefined,
    metodo,
    tipo: inst.tipo === "ENTRADA" ? "ENTRADA" : "PARCELA",
    numeroParcela: inst.numero_parcela ?? undefined,
    totalParcelas: inst.total_parcelas ?? undefined,
  };
}

async function loadClientActivitiesAndPayments(clientId: string) {
  const projects = await prisma.project.findMany({
    where: { client_id: clientId },
    select: {
      id: true,
      status_geral: true,
      createdAt: true,
      timeline: {
        include: { user: { select: { name: true } } },
        orderBy: { data: "desc" },
      },
      installments: {
        orderBy: { data_vencimento: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const activities = projects
    .flatMap((project) => project.timeline)
    .sort((a, b) => b.data.getTime() - a.data.getTime())
    .map(mapTimelineToActivity);

  const payments = projects
    .flatMap((project) =>
      project.installments.map((inst) =>
        mapInstallmentToPayment(inst, {
          id: project.id,
          status_geral: project.status_geral,
        })
      )
    )
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));

  const earliestProjectAt = projects.reduce<Date | null>((min, project) => {
    if (!min || project.createdAt < min) return project.createdAt;
    return min;
  }, null);

  return { activities, payments, earliestProjectAt };
}

export async function getClientPaymentsAction(clientId: string): Promise<{
  success: boolean;
  payments: Payment[];
  error?: string;
}> {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, payments: [], error: "Não autenticado" };
  }
  try {
    await requireClientInCompany(clientId, auth.companyId);
  } catch (error) {
    return {
      success: false,
      payments: [],
      error: error instanceof Error ? error.message : "Acesso negado",
    };
  }

  if (isDatabaseOffline()) {
    return { success: false, payments: [], error: "Banco indisponível" };
  }

  try {
    const { payments } = await loadClientActivitiesAndPayments(clientId);
    return { success: true, payments };
  } catch (error) {
    console.error("Erro ao carregar parcelas do cliente:", error);
    return { success: false, payments: [], error: "Não foi possível carregar as parcelas." };
  }
}

async function loadClientAttachments(clientId: string): Promise<ClientAttachmentDTO[]> {
  const rows = await prisma.clientAttachment.findMany({
    where: { client_id: clientId },
    orderBy: { createdAt: "desc" },
    include: { uploaded_by: { select: { name: true } } },
  });

  return rows.map((row) => ({
    id: row.id,
    nome: row.nome,
    mime_type: row.mime_type,
    url: row.url,
    tipo: row.tipo,
    size_bytes: row.size_bytes,
    createdAt: row.createdAt.toISOString(),
    uploaded_by: row.uploaded_by?.name ?? null,
    project_id: row.project_id ?? null,
  }));
}

function buildRegistrationActivity(
  clientId: string,
  cadastroEm: Date,
  origem: string
): Activity {
  const formatted = cadastroEm.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    id: `registration-${clientId}`,
    data: cadastroEm.toISOString(),
    titulo: "Cadastro criado",
    descricao: `Cliente registrado na base em ${formatted}. Origem: ${origem}.`,
    autor: "Sistema",
    tipo: "cadastro",
  };
}

export async function getClientDetailsAction(clientId: string) {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  try {
    await requireClientInCompany(clientId, auth.companyId);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Acesso negado",
    };
  }

  if (isDatabaseOffline()) {
    return { success: false, error: "Erro de conexão ao banco de dados" };
  }

  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        projects: {
          select: {
            id: true,
            status_geral: true,
            valor_previsto: true,
            createdAt: true,
            updatedAt: true,
            quotes: {
              select: {
                id: true,
                valor_final: true,
                versao: true,
              },
            },
            briefing: {
              select: {
                score: true,
                estilo: true,
                faixa_investimento: true,
              },
            },
            _count: {
              select: { environments: true },
            },
          },
          orderBy: { updatedAt: "desc" },
        },
      },
    });

    if (!client) {
      return { success: false, error: "Cliente não encontrado" };
    }

    const formattedClient = formatClientRecord(client);
    const { activities, payments, earliestProjectAt } =
      await loadClientActivitiesAndPayments(clientId);
    const attachments = await loadClientAttachments(clientId);

    const cadastroEm = client.createdAt ?? earliestProjectAt;
    const originLabels: Record<string, string> = {
      SITE: "Site Institucional",
      INSTAGRAM: "Instagram",
      INDICACAO: "Indicação",
      GOOGLE: "Busca Google",
      WHATSAPP: "WhatsApp Comercial",
      FACEBOOK: "Campanha Facebook",
    };
    const origemLabel = originLabels[client.origem] ?? client.origem;

    const activitiesWithRegistration = cadastroEm
      ? [
          ...activities,
          buildRegistrationActivity(clientId, cadastroEm, origemLabel),
        ]
      : activities;

    return {
      success: true,
      client: formattedClient,
      activities: activitiesWithRegistration,
      payments,
      attachments,
    };
  } catch (e) {
    console.warn("Erro ao carregar detalhes do cliente:", e);
    return { success: false, error: "Erro de conexão ao banco de dados" };
  }
}

export async function addActivityAction(
  clientId: string,
  titulo: string,
  descricao: string
) {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  try {
    await requireClientInCompany(clientId, auth.companyId);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Acesso negado",
    };
  }

  if (isDatabaseOffline()) {
    return { success: false, error: "Banco de dados indisponível." };
  }

  const userId = auth.userId;

  const project = await prisma.project.findFirst({
    where: { client_id: clientId },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  if (!project) {
    return {
      success: false,
      error:
        "Este cliente ainda não possui projeto. Crie um projeto no funil comercial para registrar atividades.",
    };
  }

  const acao = descricao.trim()
    ? `${titulo.trim()} — ${descricao.trim()}`
    : titulo.trim();

  try {
    const entry = await prisma.timeline.create({
      data: {
        project_id: project.id,
        user_id: userId,
        acao,
        interno_sotamente: false,
      },
      include: { user: { select: { name: true } } },
    });

    revalidatePath(`/clientes/${clientId}`);
    revalidatePath(`/projects/${project.id}`);

    return {
      success: true,
      activity: mapTimelineToActivity(entry),
    };
  } catch (error) {
    console.error("Erro ao registrar atividade do cliente:", error);
    return { success: false, error: "Não foi possível salvar a atividade." };
  }
}

export async function updateClientObservacoesAction(
  clientId: string,
  observacoes: string
) {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  try {
    await requireClientInCompany(clientId, auth.companyId);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Acesso negado",
    };
  }

  if (isDatabaseOffline()) {
    return { success: false, error: "Banco de dados indisponível." };
  }

  const value = observacoes.trim();

  try {
    await prisma.client.update({
      where: { id: clientId },
      data: { observacoes: value || null },
    });
    revalidatePath(`/clientes/${clientId}`);
    return { success: true, observacoes: value };
  } catch (error) {
    console.error("Erro ao salvar observações do cliente:", error);
    return { success: false, error: "Não foi possível salvar as notas." };
  }
}

