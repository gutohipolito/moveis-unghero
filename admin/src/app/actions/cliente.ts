"use server";

import { prisma, isDatabaseOffline, setDatabaseOffline } from "@/lib/prisma";
import { capitalizeText } from "@/lib/utils";
import { normalizeAddressFields } from "@/lib/address";
import {
  parseLegacyDocumentFromObs,
  resolveClientDocument,
  type TipoPessoa,
} from "@/lib/clientDocument";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  assertCompanyAccess,
  getAuthContext,
  requireClientInCompany,
} from "@/lib/auth-guard";
import { createClientSessionToken } from "@/lib/clientSession";
import {
  resolveClientFolders,
  type ClientAttachmentDTO,
} from "@/lib/clientAttachments";
import { labelProjectStatus } from "@/lib/navLabels";
import { labelPaymentMethod } from "@/lib/paymentMethods";
import { findExistingClient, resolveClientContactFields } from "@/lib/clientMatch";
import { resolvePublicCompanyId } from "@/lib/publicCompany";
import { resolveClientLocation } from "@/lib/clientLocation";
import { checkRateLimit, getRequestIp } from "@/lib/rateLimit";
import { getModuleAccess, getWriteAccess } from "@/lib/moduleAccess";
import {
  buildRegistrationTimelineDesc,
  describeClientFieldChanges,
  labelClientOrigin,
  logClientTimeline,
  mapClientTimelineToActivity,
  mapProjectTimelineToActivity,
  type ClientActivityCategory,
} from "@/lib/clientTimeline";
import { canManageClients, isOpsLimitedRole } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";
import { maybeRedactForRole, maybeRedactForViewer } from "@/lib/viewerRedact";

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
  partner_id?: string | null;
  partner?: { id: string; nome: string; tipo: string } | null;
  createdAt?: Date | null;
  projects?: {
    id: string;
    status_geral: string;
    valor_previsto: number | { toNumber?: () => number };
    createdAt?: Date;
    updatedAt?: Date;
    quotes?: { id: string; valor_final: number | { toNumber?: () => number }; versao: number }[];
    briefing?: { score: number | null; estilo: string; faixa_investimento: string | null } | null;
    _count?: { environments?: number; quotes?: number };
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
    partner_id: c.partner_id || null,
    partnerNome: c.partner?.nome || null,
    partnerTipo: c.partner?.tipo || null,
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
      quotes_count:
        typeof p._count?.quotes === "number"
          ? p._count.quotes
          : Array.isArray(p.quotes)
            ? p.quotes.length
            : 0,
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

/** Lista de clientes para Marceneiro: só nome, bairro, cidade e projetos (sem contato/docs). */
function restrictClientListForMarceneiro<T extends Record<string, unknown>>(
  clients: T[],
  cargo: string | null | undefined
): T[] {
  if (cargo !== "PRODUCAO") return clients;
  return clients.map((client) => {
    const projects = Array.isArray(client.projects)
      ? (client.projects as Array<Record<string, unknown>>).map((p) => ({
          id: p.id,
          status_geral: p.status_geral,
          valor_previsto: 0,
          quotes_count: 0,
        }))
      : [];
    return {
      ...client,
      email: "",
      telefone: "",
      origem: "SITE",
      status: "",
      tipo_pessoa: "PF",
      cpf: "",
      cnpj: "",
      observacoes: "",
      cep: "",
      endereco: "",
      numero: "",
      uf: "",
      tipo_imovel: "",
      obs_imovel: "",
      obs_entrega: "",
      lgpd_aceite: false,
      lgpd_aceite_em: null,
      marketing_aceite: false,
      projects,
    } as T;
  });
}

/** Projetista: vê a ficha, mas sem telefone/e-mail do cliente nem valores. */
function restrictClientListForProjetista<T extends Record<string, unknown>>(
  clients: T[],
  cargo: string | null | undefined
): T[] {
  if (cargo !== "PROJETISTA") return clients;
  return clients.map((client) => {
    const projects = Array.isArray(client.projects)
      ? (client.projects as Array<Record<string, unknown>>).map((p) => ({
          ...p,
          valor_previsto: 0,
        }))
      : [];
    return {
      ...client,
      email: "",
      telefone: "",
      origem: "SITE",
      projects,
    } as T;
  });
}

function restrictClientListForOpsRole<T extends Record<string, unknown>>(
  clients: T[],
  cargo: string | null | undefined
): T[] {
  if (cargo === "PRODUCAO") return restrictClientListForMarceneiro(clients, cargo);
  if (cargo === "PROJETISTA") return restrictClientListForProjetista(clients, cargo);
  return clients;
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
  const headerStore = await headers();
  const idLimpo = data.identificador.trim().toLowerCase();
  const cpfLimpo = cleanCpf(data.cpf);
  const isProduction = process.env.NODE_ENV === "production";

  const ip = getRequestIp(headerStore);
  const rate = checkRateLimit(`cliente-login:${ip}:${idLimpo}`, {
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!rate.ok) {
    return {
      success: false,
      error: `Muitas tentativas. Aguarde ${rate.retryAfterSec}s e tente novamente.`,
    };
  }

  if (isDatabaseOffline()) {
    return { success: false, error: "Serviço temporariamente indisponível. Tente novamente." };
  }

  try {
    const companyId = resolvePublicCompanyId();
    const client = await prisma.client.findFirst({
      where: {
        company_id: companyId,
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
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
    });
    return { success: true };
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

const CLIENTS_PAGE_SIZES = [10, 20, 30, 50, 100] as const;
const NEW_CLIENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const CLIENT_LIST_ORIGIN_VALUES = new Set<Origin>([
  "SITE",
  "INSTAGRAM",
  "INDICACAO",
  "GOOGLE",
  "WHATSAPP",
  "FACEBOOK",
  "FORMULARIO",
]);

const EMPTY_CLIENT_FACETS = {
  tipoCounts: { todos: 0, PF: 0, PJ: 0 },
  newClientsCount: 0,
  cidades: [] as string[],
  bairros: [] as string[],
};

export type ClientsListQuery = {
  companyId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  origin?: string;
  cidade?: string;
  bairro?: string;
  tipo?: "todos" | "PF" | "PJ";
  recency?: "all" | "new";
};

export type ClientsListFacets = typeof EMPTY_CLIENT_FACETS;

const CLIENT_LIST_PROJECT_SELECT = {
  id: true,
  status_geral: true,
  valor_previsto: true,
  _count: { select: { quotes: true } },
} as const;

function clientsListSearchMode(cargo: string | null | undefined): "full" | "location" | "name" {
  if (cargo === "PRODUCAO") return "name";
  if (isOpsLimitedRole(cargo)) return "location";
  return "full";
}

function buildClientsListWhere(
  query: ClientsListQuery,
  cargo: string | null | undefined
): Prisma.ClientWhereInput {
  const and: Prisma.ClientWhereInput[] = [{ company_id: query.companyId }];
  const search = (query.search || "").trim();
  const searchMode = clientsListSearchMode(cargo);

  if (search) {
    const searchLower = search;
    const digits = search.replace(/\D/g, "");
    if (searchMode === "name") {
      and.push({ nome: { contains: searchLower, mode: "insensitive" } });
    } else if (searchMode === "location") {
      and.push({
        OR: [
          { nome: { contains: searchLower, mode: "insensitive" } },
          { cidade: { contains: searchLower, mode: "insensitive" } },
          { bairro: { contains: searchLower, mode: "insensitive" } },
        ],
      });
    } else {
      const or: Prisma.ClientWhereInput[] = [
        { nome: { contains: searchLower, mode: "insensitive" } },
        { email: { contains: searchLower, mode: "insensitive" } },
        { telefone: { contains: search } },
        { cidade: { contains: searchLower, mode: "insensitive" } },
        { bairro: { contains: searchLower, mode: "insensitive" } },
      ];
      if (digits) {
        or.push({ telefone: { contains: digits } });
        or.push({ cpf: { contains: digits } });
        or.push({ cnpj: { contains: digits } });
      }
      and.push({ OR: or });
    }
  }

  if (
    canManageClients(cargo) &&
    query.origin &&
    query.origin !== "ALL" &&
    CLIENT_LIST_ORIGIN_VALUES.has(query.origin as Origin)
  ) {
    and.push({ origem: query.origin as Origin });
  }

  const cidade = (query.cidade || "").trim();
  if (cidade && cidade !== "ALL") {
    and.push({
      OR: [
        { cidade: { equals: cidade, mode: "insensitive" } },
        { cidade: { startsWith: `${cidade} - `, mode: "insensitive" } },
        { cidade: { startsWith: `${cidade} – `, mode: "insensitive" } },
        { cidade: { startsWith: `${cidade} · `, mode: "insensitive" } },
      ],
    });
  }

  const bairro = (query.bairro || "").trim();
  if (bairro && bairro !== "ALL") {
    and.push({
      OR: [
        { bairro: { equals: bairro, mode: "insensitive" } },
        { cidade: { endsWith: ` - ${bairro}`, mode: "insensitive" } },
        { cidade: { endsWith: ` – ${bairro}`, mode: "insensitive" } },
        { cidade: { endsWith: ` · ${bairro}`, mode: "insensitive" } },
      ],
    });
  }

  if (cargo !== "PRODUCAO" && query.tipo === "PF") {
    and.push({ tipo_pessoa: "PF" });
  } else if (cargo !== "PRODUCAO" && query.tipo === "PJ") {
    and.push({ tipo_pessoa: "PJ" });
  }

  if (query.recency === "new") {
    and.push({
      createdAt: { gte: new Date(Date.now() - NEW_CLIENT_WINDOW_MS) },
    });
  }

  return { AND: and };
}

function uniqueSortedLocations(
  rows: Array<{ cidade: string; bairro: string | null }>
): { cidades: string[]; bairros: string[] } {
  const cidades = new Set<string>();
  const bairros = new Set<string>();
  for (const row of rows) {
    const location = resolveClientLocation(row);
    if (location.cidade) cidades.add(location.cidade);
    if (location.bairro) bairros.add(location.bairro);
  }
  const collator = (a: string, b: string) => a.localeCompare(b, "pt-BR");
  return {
    cidades: Array.from(cidades).sort(collator),
    bairros: Array.from(bairros).sort(collator),
  };
}

// 1. Listar Clientes (seletor / sync leves — sem projetos aninhados)
export async function getClients(companyId: string) {
  const auth = await getModuleAccess("clientes");
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
      orderBy: { nome: "asc" },
    });

    return {
      success: true,
      clients: restrictClientListForOpsRole(
        maybeRedactForRole(
          clients.map((c) => formatClientRecord(c)),
          auth.cargo
        ),
        auth.cargo
      ),
    };
  } catch (error) {
    console.warn("Falha de conexão na listagem de clientes.", error);
    setDatabaseOffline(true);
    return { success: false, error: "Erro de conexão ao banco de dados", clients: [] };
  }
}

/** Listagem paginada da tela de clientes (filtros + facetas no servidor). */
export async function getClientsPage(query: ClientsListQuery) {
  const empty = {
    success: false as const,
    error: "Não autenticado",
    clients: [] as ReturnType<typeof formatClientRecord>[],
    total: 0,
    page: 1,
    pageSize: 20,
    facets: EMPTY_CLIENT_FACETS,
  };

  const auth = await getModuleAccess("clientes");
  if (!auth) return empty;

  try {
    assertCompanyAccess(auth, query.companyId);
  } catch (error) {
    return {
      ...empty,
      error: error instanceof Error ? error.message : "Acesso negado",
    };
  }

  if (isDatabaseOffline()) {
    return { ...empty, error: "Erro de conexão ao banco de dados" };
  }

  const pageSize = CLIENTS_PAGE_SIZES.includes(
    (query.pageSize || 0) as (typeof CLIENTS_PAGE_SIZES)[number]
  )
    ? (query.pageSize as number)
    : 20;
  const page = Math.max(1, Math.floor(query.page || 1));
  const where = buildClientsListWhere(query, auth.cargo);
  const companyWhere: Prisma.ClientWhereInput = { company_id: query.companyId };
  const cidadeFilter = Boolean(query.cidade && query.cidade !== "ALL");

  try {
    await migrateLegacyClientDocumentsIfNeeded();

    const [clients, total, tipoGroups, newClientsCount, locationRows, bairroRows] =
      await Promise.all([
        prisma.client.findMany({
          where,
          include: { projects: { select: CLIENT_LIST_PROJECT_SELECT } },
          orderBy:
            query.recency === "new"
              ? [{ createdAt: "desc" }, { nome: "asc" }]
              : { nome: "asc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.client.count({ where }),
        prisma.client.groupBy({
          by: ["tipo_pessoa"],
          where: companyWhere,
          _count: { _all: true },
        }),
        prisma.client.count({
          where: {
            company_id: query.companyId,
            createdAt: { gte: new Date(Date.now() - NEW_CLIENT_WINDOW_MS) },
          },
        }),
        prisma.client.findMany({
          where: companyWhere,
          select: { cidade: true, bairro: true },
          distinct: ["cidade", "bairro"],
        }),
        cidadeFilter
          ? prisma.client.findMany({
              where: buildClientsListWhere(
                { companyId: query.companyId, cidade: query.cidade },
                auth.cargo
              ),
              select: { cidade: true, bairro: true },
              distinct: ["cidade", "bairro"],
            })
          : Promise.resolve(null),
      ]);

    const tipoCounts = { todos: 0, PF: 0, PJ: 0 };
    for (const group of tipoGroups) {
      tipoCounts.todos += group._count._all;
      if (group.tipo_pessoa === "PF") tipoCounts.PF += group._count._all;
      else tipoCounts.PJ += group._count._all;
    }

    const { cidades, bairros: allBairros } = uniqueSortedLocations(locationRows);
    const bairros = bairroRows
      ? uniqueSortedLocations(bairroRows).bairros
      : allBairros;

    return {
      success: true as const,
      clients: restrictClientListForOpsRole(
        maybeRedactForRole(
          clients.map((c) => formatClientRecord(c)),
          auth.cargo
        ),
        auth.cargo
      ),
      total,
      page,
      pageSize,
      facets: { tipoCounts, newClientsCount, cidades, bairros },
    };
  } catch (error) {
    console.warn("Falha de conexão na listagem paginada de clientes.", error);
    setDatabaseOffline(true);
    return { ...empty, error: "Erro de conexão ao banco de dados" };
  }
}

/**
 * Contatos enxutos para envio de WhatsApp (Marketing → Mensagens prontas).
 * Mantém telefone também para Projetista — a lista de clientes continua sem contato.
 */
export async function getClientsForWhatsAppMessaging(companyId: string) {
  const auth =
    (await getModuleAccess("marketing")) || (await getModuleAccess("clientes"));
  type Row = { id: string; nome: string; telefone: string; email: string };
  if (!auth) {
    return { success: false as const, error: "Não autenticado", clients: [] as Row[] };
  }
  try {
    assertCompanyAccess(auth, companyId);
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Acesso negado",
      clients: [] as Row[],
    };
  }

  if (isDatabaseOffline()) {
    return {
      success: false as const,
      error: "Erro de conexão ao banco de dados",
      clients: [] as Row[],
    };
  }

  try {
    const clients = await prisma.client.findMany({
      where: { company_id: companyId },
      select: { id: true, nome: true, telefone: true, email: true },
      orderBy: { nome: "asc" },
    });

    return {
      success: true as const,
      clients: clients.map((c) => ({
        id: c.id,
        nome: c.nome,
        telefone: c.telefone || "",
        email: c.email || "",
      })),
    };
  } catch (error) {
    console.warn("Falha ao listar contatos para WhatsApp.", error);
    return {
      success: false as const,
      error: "Erro de conexão ao banco de dados",
      clients: [] as Row[],
    };
  }
}

/** Contatos para compartilhar catálogo (WhatsApp + e-mail). */
export async function getClientsForCatalogShare(companyId: string) {
  const auth =
    (await getModuleAccess("produtos")) || (await getModuleAccess("clientes"));
  type Row = { id: string; nome: string; telefone: string; email: string };
  if (!auth) {
    return { success: false as const, error: "Não autenticado", clients: [] as Row[] };
  }
  try {
    assertCompanyAccess(auth, companyId);
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Acesso negado",
      clients: [] as Row[],
    };
  }

  if (isDatabaseOffline()) {
    return {
      success: false as const,
      error: "Erro de conexão ao banco de dados",
      clients: [] as Row[],
    };
  }

  try {
    const clients = await prisma.client.findMany({
      where: { company_id: companyId },
      select: { id: true, nome: true, telefone: true, email: true },
      orderBy: { nome: "asc" },
    });

    return {
      success: true as const,
      clients: clients.map((c) => ({
        id: c.id,
        nome: c.nome,
        telefone: c.telefone || "",
        email: c.email || "",
      })),
    };
  } catch (error) {
    console.warn("Falha ao listar contatos para catálogo.", error);
    return {
      success: false as const,
      error: "Erro de conexão ao banco de dados",
      clients: [] as Row[],
    };
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
  const auth = await getWriteAccess("clientes");
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  if (auth.cargo === "PRODUCAO" || auth.cargo === "PROJETISTA") {
    return { success: false, error: "Cadastro de clientes não disponível para este cargo." };
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
  const cpf =
    tipoPessoa === "PF" && formData.cpf
      ? formData.cpf.replace(/\D/g, "") || null
      : null;
  const cnpj =
    tipoPessoa === "PJ" && formData.cnpj
      ? formData.cnpj.replace(/\D/g, "") || null
      : null;

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
    const address = normalizeAddressFields({
      cidade: formData.cidade,
      bairro: formData.bairro,
      uf: formData.uf,
      endereco: formData.endereco,
    });

    const client = await prisma.client.create({
      data: {
        nome: capitalizeText(formData.nome),
        email: contact.email,
        telefone: contact.telefone,
        telefone_digits: contact.phoneDigits || null,
        cidade: address.cidade,
        origem: formData.origem,
        status: formData.status,
        observacoes: formData.observacoes || "",
        company_id: auth.companyId,
        tipo_pessoa: tipoPessoa,
        cpf,
        cnpj,
        cep: formData.cep || null,
        endereco: address.endereco || null,
        numero: formData.numero || null,
        bairro: address.bairro || null,
        uf: address.uf,
        tipo_imovel: formData.tipo_imovel || null,
        obs_imovel: formData.obs_imovel || null,
        obs_entrega: formData.obs_entrega || null,
      }
    });

    await logClientTimeline({
      clientId: client.id,
      userId: auth.userId,
      categoria: "CADASTRO",
      titulo: "Cadastro criado",
      descricao: buildRegistrationTimelineDesc(
        client.createdAt,
        labelClientOrigin(formData.origem)
      ),
      macro: true,
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
  const auth = await getWriteAccess("clientes");
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  if (auth.cargo === "PRODUCAO" || auth.cargo === "PROJETISTA") {
    return { success: false, error: "Edição de clientes não disponível para este cargo." };
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
  const cpf =
    tipoPessoa === "PF" && formData.cpf
      ? formData.cpf.replace(/\D/g, "") || null
      : null;
  const cnpj =
    tipoPessoa === "PJ" && formData.cnpj
      ? formData.cnpj.replace(/\D/g, "") || null
      : null;

  if (isDatabaseOffline()) {
    return { success: false, error: "Banco de dados indisponível." };
  }

  try {
    const before = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        nome: true,
        email: true,
        telefone: true,
        cidade: true,
        origem: true,
        status: true,
        tipo_pessoa: true,
        cpf: true,
        cnpj: true,
        cep: true,
        endereco: true,
        numero: true,
        bairro: true,
        uf: true,
        tipo_imovel: true,
        obs_imovel: true,
        obs_entrega: true,
      },
    });
    if (!before) {
      return { success: false, error: "Cliente não encontrado." };
    }

    const contact = resolveClientContactFields(formData.telefone, formData.email);
    const address = normalizeAddressFields({
      cidade: formData.cidade,
      bairro: formData.bairro,
      uf: formData.uf,
      endereco: formData.endereco,
    });

    const updated = await prisma.client.update({
      where: { id: clientId },
      data: {
        nome: capitalizeText(formData.nome),
        email: contact.email,
        telefone: contact.telefone,
        telefone_digits: contact.phoneDigits || null,
        cidade: address.cidade,
        origem: formData.origem,
        status: formData.status,
        observacoes: formData.observacoes || "",
        tipo_pessoa: tipoPessoa,
        cpf,
        cnpj,
        cep: formData.cep !== undefined ? formData.cep : undefined,
        endereco:
          formData.endereco !== undefined ? address.endereco || null : undefined,
        numero: formData.numero !== undefined ? formData.numero : undefined,
        bairro:
          formData.bairro !== undefined ? address.bairro || null : undefined,
        uf: formData.uf !== undefined ? address.uf : undefined,
        tipo_imovel: formData.tipo_imovel !== undefined ? formData.tipo_imovel : undefined,
        obs_imovel: formData.obs_imovel !== undefined ? formData.obs_imovel : undefined,
        obs_entrega: formData.obs_entrega !== undefined ? formData.obs_entrega : undefined,
      },
      select: {
        nome: true,
        email: true,
        telefone: true,
        cidade: true,
        origem: true,
        status: true,
        tipo_pessoa: true,
        cpf: true,
        cnpj: true,
        cep: true,
        endereco: true,
        numero: true,
        bairro: true,
        uf: true,
        tipo_imovel: true,
        obs_imovel: true,
        obs_entrega: true,
      },
    });

    const changes = describeClientFieldChanges(before, updated);
    if (changes.length > 0) {
      await logClientTimeline({
        clientId,
        userId: auth.userId,
        categoria: "CADASTRO",
        titulo: "Ficha atualizada",
        descricao: changes.join("\n"),
        macro: true,
      });
    }

    revalidatePath("/clientes");
    revalidatePath(`/clientes/${clientId}`);
    return { success: true };
  } catch (error) {
    console.warn("Falha ao editar cliente no banco:", error);
    return { success: false, error: "Não foi possível atualizar o cliente." };
  }
}

// 4. Excluir Cliente
export async function deleteClientAction(clientId: string) {
  const auth = await getWriteAccess("clientes");
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  if (auth.cargo === "PRODUCAO" || auth.cargo === "PROJETISTA") {
    return { success: false, error: "Exclusão de clientes não disponível para este cargo." };
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
  const auth = await getWriteAccess("clientes");
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
  categoria?: ClientActivityCategory;
  macro?: boolean;
  projectId?: string;
  origem?: "client" | "project";
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
  metodoCodigo?: string;
  tipo: "ENTRADA" | "PARCELA";
  numeroParcela?: number;
  totalParcelas?: number;
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
    metodoCodigo: inst.metodo_pagamento,
    tipo: inst.tipo === "ENTRADA" ? "ENTRADA" : "PARCELA",
    numeroParcela: inst.numero_parcela ?? undefined,
    totalParcelas: inst.total_parcelas ?? undefined,
  };
}

async function loadClientActivitiesAndPayments(clientId: string) {
  const [clientTimeline, projects] = await Promise.all([
    prisma.clientTimeline.findMany({
      where: { client_id: clientId },
      include: { user: { select: { name: true } } },
      orderBy: { data: "desc" },
      take: 120,
    }),
    prisma.project.findMany({
      where: { client_id: clientId },
      select: {
        id: true,
        status_geral: true,
        createdAt: true,
        timeline: {
          include: { user: { select: { name: true } } },
          orderBy: { data: "desc" },
          take: 40,
        },
        installments: {
          orderBy: { data_vencimento: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const clientActivities = clientTimeline.map(mapClientTimelineToActivity);
  const projectActivities = projects.flatMap((project) =>
    project.timeline.map((entry) =>
      mapProjectTimelineToActivity({
        id: entry.id,
        data: entry.data,
        acao: entry.acao,
        project_id: project.id,
        user: entry.user,
      })
    )
  );

  const activities = [...clientActivities, ...projectActivities].sort(
    (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
  );

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
  const auth = await getModuleAccess("clientes");
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
    if (isOpsLimitedRole(auth.cargo)) {
      return { success: false, payments: [], error: "Acesso financeiro restrito." };
    }
    const { payments } = await loadClientActivitiesAndPayments(clientId);
    return {
      success: true,
      payments: maybeRedactForViewer(payments, auth.cargo),
    };
  } catch (error) {
    console.error("Erro ao carregar parcelas do cliente:", error);
    return { success: false, payments: [], error: "Não foi possível carregar as parcelas." };
  }
}

async function loadClientAttachments(clientId: string): Promise<ClientAttachmentDTO[]> {
  const rows = await prisma.clientAttachment.findMany({
    where: { client_id: clientId, project_id: null },
    orderBy: { createdAt: "desc" },
    include: { uploaded_by: { select: { name: true } } },
  });

  return rows.map((row) => ({
    id: row.id,
    nome: row.nome,
    mime_type: row.mime_type,
    url: row.url,
    tipo: row.tipo,
    folder: row.folder || "Residência",
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
  const auth = await getModuleAccess("clientes");
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
        partner: {
          select: { id: true, nome: true, tipo: true },
        },
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
    const opsLimited = isOpsLimitedRole(auth.cargo);
    const { activities, payments, earliestProjectAt } = opsLimited
      ? { activities: [] as Activity[], payments: [] as Payment[], earliestProjectAt: null as Date | null }
      : await loadClientActivitiesAndPayments(clientId);
    const attachments = await loadClientAttachments(clientId);
    const attachmentFolders = resolveClientFolders(client.attachment_folders, attachments);

    const cadastroEm = client.createdAt ?? earliestProjectAt;
    const origemLabel = labelClientOrigin(client.origem);

    const hasRegistration = activities.some(
      (activity) => activity.categoria === "cadastro" || activity.tipo === "cadastro"
    );
    const activitiesWithRegistration =
      opsLimited || !cadastroEm || hasRegistration
        ? activities
        : [
            ...activities,
            buildRegistrationActivity(clientId, cadastroEm, origemLabel),
          ];
    const roleSafeClient = maybeRedactForRole(formattedClient, auth.cargo);
    const [opsRestrictedClient] = restrictClientListForOpsRole(
      [roleSafeClient],
      auth.cargo
    );
    const safeClient = opsLimited
      ? {
          ...opsRestrictedClient,
          projects: opsRestrictedClient.projects.map((project) => ({
            ...project,
            valor_previsto: 0,
            quotes: [],
            quotes_count: 0,
            briefing: null,
          })),
        }
      : roleSafeClient;

    return {
      success: true,
      client: safeClient,
      activities: activitiesWithRegistration,
      payments: maybeRedactForRole(payments, auth.cargo),
      attachments,
      attachmentFolders,
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
  const auth = await getWriteAccess("clientes");
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  if (isOpsLimitedRole(auth.cargo)) {
    return { success: false, error: "Linha do tempo não disponível para este cargo." };
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
    await prisma.timeline.create({
      data: {
        project_id: project.id,
        user_id: userId,
        acao,
        interno_sotamente: false,
      },
    });

    const clientEntry = await logClientTimeline({
      clientId,
      userId,
      categoria: "COMERCIAL",
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      projectId: project.id,
      macro: true,
    });

    revalidatePath(`/clientes/${clientId}`);
    revalidatePath(`/projects/${project.id}`);

    return {
      success: true,
      activity: mapClientTimelineToActivity(clientEntry),
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
  const auth = await getWriteAccess("clientes");
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
    const before = await prisma.client.findUnique({
      where: { id: clientId },
      select: { observacoes: true },
    });
    if (!before) {
      return { success: false, error: "Cliente não encontrado." };
    }

    await prisma.client.update({
      where: { id: clientId },
      data: { observacoes: value || null },
    });

    const prev = (before.observacoes ?? "").trim();
    if (prev !== value) {
      await logClientTimeline({
        clientId,
        userId: auth.userId,
        categoria: "NOTAS",
        titulo: "Notas permanentes atualizadas",
        descricao: value
          ? value.length > 240
            ? `${value.slice(0, 240)}…`
            : value
          : "Notas removidas.",
        macro: false,
      });
    }

    revalidatePath(`/clientes/${clientId}`);
    return { success: true, observacoes: value };
  } catch (error) {
    console.error("Erro ao salvar observações do cliente:", error);
    return { success: false, error: "Não foi possível salvar as notas." };
  }
}

