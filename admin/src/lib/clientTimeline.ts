import type { ClientTimelineCategory, Origin, Prisma, TipoPessoa } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ClientActivityCategory =
  | "cadastro"
  | "arquivo"
  | "contato"
  | "comercial"
  | "projeto"
  | "notas";

export type ClientActivity = {
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
};

const ORIGIN_LABELS: Record<string, string> = {
  SITE: "Site Institucional",
  INSTAGRAM: "Instagram",
  INDICACAO: "Indicação",
  GOOGLE: "Busca Google",
  WHATSAPP: "WhatsApp Comercial",
  FACEBOOK: "Campanha Facebook",
};

const CLIENT_FIELD_LABELS: Record<string, string> = {
  nome: "Nome",
  email: "E-mail",
  telefone: "Telefone",
  cidade: "Cidade",
  origem: "Origem",
  status: "Status",
  tipo_pessoa: "Tipo de pessoa",
  cpf: "CPF",
  cnpj: "CNPJ",
  cep: "CEP",
  endereco: "Endereço",
  numero: "Número",
  bairro: "Bairro",
  uf: "UF",
  tipo_imovel: "Tipo de imóvel",
  obs_imovel: "Obs. do imóvel",
  obs_entrega: "Obs. de entrega",
};

function categoryToActivity(categoria: ClientTimelineCategory): ClientActivityCategory {
  return categoria.toLowerCase() as ClientActivityCategory;
}

function formatFieldValue(key: string, value: unknown): string {
  if (value == null || value === "") return "—";
  if (key === "origem" && typeof value === "string") {
    return ORIGIN_LABELS[value] ?? value;
  }
  if (key === "tipo_pessoa" && typeof value === "string") {
    return value === "PJ" ? "Pessoa Jurídica" : "Pessoa Física";
  }
  if ((key === "cpf" || key === "cnpj") && typeof value === "string" && value.length > 0) {
    return "••• alterado";
  }
  return String(value);
}

type ClientSnapshot = {
  nome: string;
  email: string;
  telefone: string;
  cidade: string;
  origem: Origin;
  status: string;
  tipo_pessoa: TipoPessoa;
  cpf: string | null;
  cnpj: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  bairro: string | null;
  uf: string | null;
  tipo_imovel: string | null;
  obs_imovel: string | null;
  obs_entrega: string | null;
};

export function describeClientFieldChanges(
  before: ClientSnapshot,
  after: ClientSnapshot
): string[] {
  const lines: string[] = [];
  for (const key of Object.keys(CLIENT_FIELD_LABELS)) {
    const prev = before[key as keyof ClientSnapshot];
    const next = after[key as keyof ClientSnapshot];
    const prevNorm = prev == null || prev === "" ? null : String(prev);
    const nextNorm = next == null || next === "" ? null : String(next);
    if (prevNorm === nextNorm) continue;
    const label = CLIENT_FIELD_LABELS[key];
    lines.push(
      `${label}: ${formatFieldValue(key, prevNorm)} → ${formatFieldValue(key, nextNorm)}`
    );
  }
  return lines;
}

export function mapClientTimelineToActivity(entry: {
  id: string;
  data: Date;
  titulo: string;
  descricao: string | null;
  categoria: ClientTimelineCategory;
  macro: boolean;
  project_id: string | null;
  user: { name: string } | null;
}): ClientActivity {
  const categoria = categoryToActivity(entry.categoria);
  return {
    id: entry.id,
    data: entry.data.toISOString(),
    titulo: entry.titulo,
    descricao: entry.descricao ?? "",
    autor: entry.user?.name ?? "Sistema",
    tipo: categoria === "cadastro" ? "cadastro" : undefined,
    categoria,
    macro: entry.macro,
    projectId: entry.project_id ?? undefined,
    origem: "client",
  };
}

export function mapProjectTimelineToActivity(entry: {
  id: string;
  data: Date;
  acao: string;
  project_id: string;
  user: { name: string };
}): ClientActivity {
  const separator = " — ";
  const idx = entry.acao.indexOf(separator);
  const titulo = idx === -1 ? entry.acao : entry.acao.slice(0, idx);
  const descricao = idx === -1 ? "" : entry.acao.slice(separator.length);

  return {
    id: `project-${entry.id}`,
    data: entry.data.toISOString(),
    titulo,
    descricao,
    autor: entry.user.name,
    categoria: "projeto",
    macro: true,
    projectId: entry.project_id,
    origem: "project",
  };
}

type LogClientTimelineInput = {
  clientId: string;
  userId?: string | null;
  categoria: ClientTimelineCategory;
  titulo: string;
  descricao?: string | null;
  projectId?: string | null;
  macro?: boolean;
  tx?: Prisma.TransactionClient;
};

export async function logClientTimeline(input: LogClientTimelineInput) {
  const db = input.tx ?? prisma;
  return db.clientTimeline.create({
    data: {
      client_id: input.clientId,
      user_id: input.userId ?? null,
      categoria: input.categoria,
      titulo: input.titulo,
      descricao: input.descricao?.trim() || null,
      project_id: input.projectId ?? null,
      macro: input.macro ?? true,
    },
    include: { user: { select: { name: true } } },
  });
}

export function buildRegistrationTimelineDesc(cadastroEm: Date, origem: string): string {
  const formatted = cadastroEm.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `Cliente registrado na base em ${formatted}. Origem: ${origem}.`;
}

export function labelClientOrigin(origem: string): string {
  return ORIGIN_LABELS[origem] ?? origem;
}

export const CLIENT_ACTIVITY_CATEGORY_LABELS: Record<ClientActivityCategory, string> = {
  cadastro: "Cadastro",
  arquivo: "Arquivos",
  contato: "Contatos",
  comercial: "Comercial",
  projeto: "Projetos",
  notas: "Notas",
};
