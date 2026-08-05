import { prisma } from "@/lib/prisma";
import type { PartnerType, ProjectStatus } from "@prisma/client";
import {
  ensureCatalogShareCode,
  resolveCatalogPublicUrl,
} from "@/lib/catalogShare";

function partnerProductImagePath(productId: string, index: number) {
  return `/api/parceiro/produto-imagem?productId=${encodeURIComponent(productId)}&i=${index}`;
}
export interface PartnerPortalProject {
  id: string;
  valor_previsto: number;
  status_geral: ProjectStatus;
  updatedAt: string;
  client: {
    nome: string;
    cidade: string;
  };
  environments: Array<{
    id: string;
    nome: string;
    tipo: string;
    status: string;
  }>;
}

export interface PartnerPortalData {
  id: string;
  company_id: string;
  nome: string;
  tipo: PartnerType;
  email: string | null;
  telefone: string | null;
  fotoUrl: string | null;
  cidade: string | null;
  endereco: string | null;
  escritorio: string | null;
  registro_profissional: string | null;
  portfolioUrl: string | null;
  projects: PartnerPortalProject[];
}

export interface PartnerPortalProduct {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  imagem_url: string | null;
  imagens: string[];
  supplier_id: string | null;
  supplierNome: string | null;
  supplierLogoUrl: string | null;
}

export interface PartnerPortalCatalog {
  id: string;
  titulo: string;
  descricao: string | null;
  marca: string | null;
  mime_type: string;
  arquivo_nome: string;
  capa_url: string | null;
  supplier_id: string | null;
  supplierNome: string | null;
  supplierLogoUrl: string | null;
  /** Link público curto em moveisunghero.com.br — nunca Blob/admin. */
  publicUrl: string;
  /** Proxy autenticado com marca d'água. */
  downloadPath: string;
}

function partnerCatalogDownloadPath(catalogId: string) {
  return `/api/parceiro/catalogo-arquivo?id=${encodeURIComponent(catalogId)}`;
}

export interface PartnerPortalClient {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  endereco: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string;
  uf: string | null;
  cep: string | null;
  projectsCount: number;
  /** Quando o vínculo direto com o parceiro foi gravado (cadastro /a). */
  partnerAttributedAt: string | null;
  createdAt: string;
}

type CrmUpload = { tipo?: string; url?: string };

function extractLogoUrl(crmUploads: unknown): string | null {
  if (!Array.isArray(crmUploads)) return null;
  const logo = crmUploads.find(
    (entry): entry is CrmUpload =>
      !!entry &&
      typeof entry === "object" &&
      (entry as CrmUpload).tipo === "Logo" &&
      typeof (entry as CrmUpload).url === "string"
  );
  return logo?.url ?? null;
}

function formatAddressLine(client: {
  endereco: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string;
  uf: string | null;
  cep: string | null;
}): string {
  const street = [client.endereco, client.numero].filter(Boolean).join(", ");
  const cityUf = [client.cidade, client.uf].filter(Boolean).join(" / ");
  const parts = [street, client.bairro, cityUf, client.cep ? `CEP ${client.cep}` : null].filter(
    Boolean
  );
  return parts.join(" · ") || "Endereço não informado";
}

export async function loadPartnerPortalData(
  partnerId: string
): Promise<PartnerPortalData | null> {
  const partner = await prisma.professionalPartner.findUnique({
    where: { id: partnerId },
    select: {
      id: true,
      company_id: true,
      nome: true,
      tipo: true,
      email: true,
      telefone: true,
      fotoUrl: true,
      cidade: true,
      endereco: true,
      escritorio: true,
      registro_profissional: true,
      portfolioUrl: true,
      ativo: true,
      projects: {
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          valor_previsto: true,
          status_geral: true,
          updatedAt: true,
          client: {
            select: {
              nome: true,
              cidade: true,
            },
          },
          environments: {
            orderBy: { nome: "asc" },
            select: {
              id: true,
              nome: true,
              tipo: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!partner || !partner.ativo) return null;

  return {
    id: partner.id,
    company_id: partner.company_id,
    nome: partner.nome,
    tipo: partner.tipo,
    email: partner.email,
    telefone: partner.telefone,
    fotoUrl: partner.fotoUrl,
    cidade: partner.cidade,
    endereco: partner.endereco,
    escritorio: partner.escritorio,
    registro_profissional: partner.registro_profissional,
    portfolioUrl: partner.portfolioUrl,
    projects: partner.projects.map((project) => ({
      id: project.id,
      valor_previsto: Number(project.valor_previsto),
      status_geral: project.status_geral,
      updatedAt: project.updatedAt.toISOString(),
      client: {
        nome: project.client.nome,
        cidade: project.client.cidade,
      },
      environments: project.environments.map((env) => ({
        id: env.id,
        nome: env.nome,
        tipo: env.tipo,
        status: env.status,
      })),
    })),
  };
}

export async function loadPartnerPortalProducts(
  companyId: string
): Promise<PartnerPortalProduct[]> {
  const products = await prisma.showcaseProduct.findMany({
    where: { company_id: companyId, ativo: true },
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    select: {
      id: true,
      nome: true,
      descricao: true,
      categoria: true,
      imagem_url: true,
      imagens: true,
      supplier_id: true,
      supplier: {
        select: {
          nome: true,
          nomeFantasia: true,
          crmUploads: true,
        },
      },
    },
  });

  return products.map((p) => {
    const rawImagens = (p.imagens || []).filter(Boolean);
    const rawCover = rawImagens[0] || p.imagem_url;
    const rawList = rawImagens.length > 0 ? rawImagens : rawCover ? [rawCover] : [];
    // Portal nunca recebe URL original — só o proxy com marca d'água nos pixels
    const imagens = rawList.map((_, i) => partnerProductImagePath(p.id, i));
    return {
      id: p.id,
      nome: p.nome,
      descricao: p.descricao,
      categoria: p.categoria,
      imagem_url: imagens[0] ?? null,
      imagens,
      supplier_id: p.supplier_id,
      supplierNome: p.supplier?.nomeFantasia || p.supplier?.nome || null,
      supplierLogoUrl: extractLogoUrl(p.supplier?.crmUploads),
    };
  });
}

/** Catálogos PDF/imagem ativos da empresa — link público + download com marca d'água. */
export async function loadPartnerPortalCatalogs(
  companyId: string
): Promise<PartnerPortalCatalog[]> {
  const rows = await prisma.productCatalog.findMany({
    where: { company_id: companyId, ativo: true },
    orderBy: [{ ordem: "asc" }, { titulo: "asc" }],
    select: {
      id: true,
      titulo: true,
      descricao: true,
      marca: true,
      mime_type: true,
      arquivo_nome: true,
      capa_url: true,
      share_code: true,
      supplier_id: true,
      supplier: {
        select: {
          nome: true,
          nomeFantasia: true,
          crmUploads: true,
        },
      },
    },
  });

  const catalogs: PartnerPortalCatalog[] = [];

  for (const row of rows) {
    let shareCode = row.share_code;
    if (!shareCode) {
      shareCode = await ensureCatalogShareCode(row.id);
    }
    const publicUrl = resolveCatalogPublicUrl(shareCode);
    if (!publicUrl) continue;

    catalogs.push({
      id: row.id,
      titulo: row.titulo,
      descricao: row.descricao,
      marca: row.marca,
      mime_type: row.mime_type,
      arquivo_nome: row.arquivo_nome,
      capa_url: row.capa_url,
      supplier_id: row.supplier_id,
      supplierNome: row.supplier?.nomeFantasia || row.supplier?.nome || null,
      supplierLogoUrl: extractLogoUrl(row.supplier?.crmUploads),
      publicUrl,
      downloadPath: partnerCatalogDownloadPath(row.id),
    });
  }

  return catalogs;
}

/** Clientes do arquiteto: indicação direta (partner_id) + via projetos — sem documentos. */
export async function loadPartnerPortalClients(
  partnerId: string
): Promise<PartnerPortalClient[]> {
  const clientSelect = {
    id: true,
    nome: true,
    telefone: true,
    email: true,
    endereco: true,
    numero: true,
    bairro: true,
    cidade: true,
    uf: true,
    cep: true,
    partner_attributed_at: true,
    createdAt: true,
  } as const;

  const [referred, projects] = await Promise.all([
    prisma.client.findMany({
      where: { partner_id: partnerId },
      select: clientSelect,
    }),
    prisma.project.findMany({
      where: { partner_id: partnerId },
      select: {
        client: { select: clientSelect },
      },
    }),
  ]);

  const byClient = new Map<string, PartnerPortalClient>();

  for (const c of referred) {
    byClient.set(c.id, {
      id: c.id,
      nome: c.nome,
      telefone: c.telefone,
      email: c.email,
      endereco: c.endereco,
      numero: c.numero,
      bairro: c.bairro,
      cidade: c.cidade,
      uf: c.uf,
      cep: c.cep,
      projectsCount: 0,
      partnerAttributedAt: c.partner_attributed_at?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
    });
  }

  for (const project of projects) {
    const c = project.client;
    const existing = byClient.get(c.id);
    if (existing) {
      existing.projectsCount += 1;
      continue;
    }
    byClient.set(c.id, {
      id: c.id,
      nome: c.nome,
      telefone: c.telefone,
      email: c.email,
      endereco: c.endereco,
      numero: c.numero,
      bairro: c.bairro,
      cidade: c.cidade,
      uf: c.uf,
      cep: c.cep,
      projectsCount: 1,
      partnerAttributedAt: c.partner_attributed_at?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
    });
  }

  // Contagem de projetos para referidos que também têm obras
  if (referred.length > 0) {
    const counts = await prisma.project.groupBy({
      by: ["client_id"],
      where: {
        partner_id: partnerId,
        client_id: { in: referred.map((c) => c.id) },
      },
      _count: { _all: true },
    });
    for (const row of counts) {
      const entry = byClient.get(row.client_id);
      if (entry) entry.projectsCount = row._count._all;
    }
  }

  return Array.from(byClient.values()).sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR")
  );
}

export function formatPartnerClientAddress(
  client: Pick<
    PartnerPortalClient,
    "endereco" | "numero" | "bairro" | "cidade" | "uf" | "cep"
  >
): string {
  return formatAddressLine(client);
}
