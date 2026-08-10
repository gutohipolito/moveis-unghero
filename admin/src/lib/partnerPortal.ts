import { prisma } from "@/lib/prisma";
import type { PartnerType, ProjectStatus, PartnerCommissionStatus } from "@prisma/client";
import {
  ensureCatalogShareCode,
  resolveCatalogPublicUrl,
} from "@/lib/catalogShare";

import {
  backfillProjectPartnerFromClients,
  partnerOwnedProjectsWhere,
} from "@/lib/partnerAttribution";
import { buildQuotePdfShortUrl } from "@/lib/quotePdfShare";
import { toISODateBR } from "@/lib/brazilDate";
import type { PartnerCommissionReceiptDTO } from "@/app/actions/partnerCommissions";

function partnerProductImagePath(productId: string, index: number) {
  return `/api/parceiro/produto-imagem?productId=${encodeURIComponent(productId)}&i=${index}`;
}

/**
 * Valor comercial no portal do arquiteto: só a partir da aprovação
 * (não precisa esperar chão de fábrica).
 */
export function partnerProjectValueVisible(status: string): boolean {
  return (
    status === "APROVADO" ||
    status === "CONFERENCIA_TECNICA" ||
    status === "PRODUCAO" ||
    status === "INSTALACAO" ||
    status === "FINALIZADO"
  );
}

export interface PartnerPortalProject {
  id: string;
  valor_previsto: number;
  status_geral: ProjectStatus;
  updatedAt: string;
  client: {
    id: string;
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
  cep: string | null;
  endereco: string | null;
  escritorio: string | null;
  registro_profissional: string | null;
  portfolioUrl: string | null;
  /** Só mostra a aba Comissões quando há ao menos um lançamento. */
  hasCommissions: boolean;
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
      cep: true,
      endereco: true,
      escritorio: true,
      registro_profissional: true,
      portfolioUrl: true,
      ativo: true,
    },
  });

  if (!partner || !partner.ativo) return null;

  await backfillProjectPartnerFromClients(partnerId);

  const [projects, commissionCount] = await Promise.all([
    prisma.project.findMany({
      where: partnerOwnedProjectsWhere(partnerId),
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        valor_previsto: true,
        status_geral: true,
        updatedAt: true,
        client: {
          select: {
            id: true,
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
    }),
    prisma.partnerCommission.count({
      where: {
        partner_id: partnerId,
        company_id: partner.company_id,
      },
    }),
  ]);

  return {
    id: partner.id,
    company_id: partner.company_id,
    nome: partner.nome,
    tipo: partner.tipo,
    email: partner.email,
    telefone: partner.telefone,
    fotoUrl: partner.fotoUrl,
    cidade: partner.cidade,
    cep: partner.cep,
    endereco: partner.endereco,
    escritorio: partner.escritorio,
    registro_profissional: partner.registro_profissional,
    portfolioUrl: partner.portfolioUrl,
    hasCommissions: commissionCount > 0,
    projects: projects.map((project) => {
      const visible = partnerProjectValueVisible(project.status_geral);
      return {
        id: project.id,
        valor_previsto: visible ? Number(project.valor_previsto) : 0,
        status_geral: project.status_geral,
        updatedAt: project.updatedAt.toISOString(),
        client: {
          id: project.client.id,
          nome: project.client.nome,
          cidade: project.client.cidade,
        },
        environments: project.environments.map((env) => ({
          id: env.id,
          nome: env.nome,
          tipo: env.tipo,
          status: env.status,
        })),
      };
    }),
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
      where: partnerOwnedProjectsWhere(partnerId),
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
        AND: [
          partnerOwnedProjectsWhere(partnerId),
          { client_id: { in: referred.map((c) => c.id) } },
        ],
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

export interface PartnerProjectNoteDTO {
  id: string;
  body: string;
  partnerId: string;
  partnerNome: string;
  createdAt: string;
}

export interface PartnerProjectFileDTO {
  id: string;
  nome: string;
  mime_type: string;
  url: string;
  size_bytes: number | null;
  partnerId: string;
  partnerNome: string;
  createdAt: string;
}

export interface PartnerProjectQuoteItemDTO {
  id: string;
  descricao: string;
  quantidade: number;
  valor_total: number;
  status: string;
}

export interface PartnerProjectQuoteDTO {
  id: string;
  versao: number;
  codigo: string | null;
  subtotal: number;
  desconto: number;
  valor_final: number;
  validade: string;
  aprovado_em: string | null;
  publicUrl: string | null;
  items: PartnerProjectQuoteItemDTO[];
}

export interface PartnerProjectDetail {
  id: string;
  valor_previsto: number;
  status_geral: ProjectStatus;
  updatedAt: string;
  data_entrega_prevista: string | null;
  client: {
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
  };
  environments: Array<{
    id: string;
    nome: string;
    tipo: string;
    status: string;
  }>;
  quotes: PartnerProjectQuoteDTO[];
  notes: PartnerProjectNoteDTO[];
  files: PartnerProjectFileDTO[];
}

/** Garante que o projeto pertence ao parceiro (direto ou via cliente indicado). */
export async function assertPartnerOwnsProject(
  partnerId: string,
  projectId: string
): Promise<{ ok: true; companyId: string } | { ok: false }> {
  const partner = await prisma.professionalPartner.findFirst({
    where: { id: partnerId, ativo: true },
    select: { id: true, company_id: true },
  });
  if (!partner) return { ok: false };

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      AND: [
        partnerOwnedProjectsWhere(partnerId),
        { client: { company_id: partner.company_id } },
      ],
    },
    select: { id: true },
  });
  if (!project) return { ok: false };
  return { ok: true, companyId: partner.company_id };
}

export async function loadPartnerProjectDetail(
  partnerId: string,
  projectId: string
): Promise<PartnerProjectDetail | null> {
  await backfillProjectPartnerFromClients(partnerId);

  const ownership = await assertPartnerOwnsProject(partnerId, projectId);
  if (!ownership.ok) return null;

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ...partnerOwnedProjectsWhere(partnerId),
    },
    select: {
      id: true,
      valor_previsto: true,
      status_geral: true,
      updatedAt: true,
      data_entrega_prevista: true,
      client: {
        select: {
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
        },
      },
      environments: {
        orderBy: { nome: "asc" },
        select: { id: true, nome: true, tipo: true, status: true },
      },
      quotes: {
        orderBy: { versao: "desc" },
        select: {
          id: true,
          versao: true,
          codigo: true,
          subtotal: true,
          desconto: true,
          valor_final: true,
          validade: true,
          aprovado_em: true,
          pdf_share_code: true,
          pdf_share_url: true,
          items: {
            orderBy: { descricao: "asc" },
            select: {
              id: true,
              descricao: true,
              quantidade: true,
              valor_total: true,
              status: true,
            },
          },
        },
      },
      partnerNotes: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          body: true,
          partner_id: true,
          createdAt: true,
          partner: { select: { nome: true } },
        },
      },
      partnerFiles: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          nome: true,
          mime_type: true,
          url: true,
          size_bytes: true,
          partner_id: true,
          createdAt: true,
          partner: { select: { nome: true } },
        },
      },
    },
  });

  if (!project) return null;

  const valueVisible = partnerProjectValueVisible(project.status_geral);

  return {
    id: project.id,
    valor_previsto: valueVisible ? Number(project.valor_previsto) : 0,
    status_geral: project.status_geral,
    updatedAt: project.updatedAt.toISOString(),
    data_entrega_prevista: project.data_entrega_prevista?.toISOString() ?? null,
    client: project.client,
    environments: project.environments.map((env) => ({
      id: env.id,
      nome: env.nome,
      tipo: env.tipo,
      status: env.status,
    })),
    quotes: project.quotes.map((q) => ({
      id: q.id,
      versao: q.versao,
      codigo: q.codigo,
      subtotal: valueVisible ? Number(q.subtotal) : 0,
      desconto: valueVisible ? Number(q.desconto) : 0,
      valor_final: valueVisible ? Number(q.valor_final) : 0,
      validade: q.validade.toISOString(),
      aprovado_em: q.aprovado_em?.toISOString() ?? null,
      publicUrl: valueVisible
        ? q.pdf_share_code
          ? buildQuotePdfShortUrl(q.pdf_share_code)
          : q.pdf_share_url
        : null,
      items: q.items.map((item) => ({
        id: item.id,
        descricao: item.descricao,
        quantidade: item.quantidade,
        valor_total: valueVisible ? Number(item.valor_total) : 0,
        status: item.status,
      })),
    })),
    notes: project.partnerNotes.map((n) => ({
      id: n.id,
      body: n.body,
      partnerId: n.partner_id,
      partnerNome: n.partner.nome,
      createdAt: n.createdAt.toISOString(),
    })),
    files: project.partnerFiles.map((f) => ({
      id: f.id,
      nome: f.nome,
      mime_type: f.mime_type,
      url: f.url,
      size_bytes: f.size_bytes,
      partnerId: f.partner_id,
      partnerNome: f.partner.nome,
      createdAt: f.createdAt.toISOString(),
    })),
  };
}

/** Contribuições do parceiro para o CRM (somente leitura). */
export async function loadPartnerContributionsForProject(projectId: string): Promise<{
  notes: PartnerProjectNoteDTO[];
  files: PartnerProjectFileDTO[];
}> {
  const [notes, files] = await Promise.all([
    prisma.partnerProjectNote.findMany({
      where: { project_id: projectId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        body: true,
        partner_id: true,
        createdAt: true,
        partner: { select: { nome: true } },
      },
    }),
    prisma.partnerProjectFile.findMany({
      where: { project_id: projectId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        nome: true,
        mime_type: true,
        url: true,
        size_bytes: true,
        partner_id: true,
        createdAt: true,
        partner: { select: { nome: true } },
      },
    }),
  ]);

  return {
    notes: notes.map((n) => ({
      id: n.id,
      body: n.body,
      partnerId: n.partner_id,
      partnerNome: n.partner.nome,
      createdAt: n.createdAt.toISOString(),
    })),
    files: files.map((f) => ({
      id: f.id,
      nome: f.nome,
      mime_type: f.mime_type,
      url: f.url,
      size_bytes: f.size_bytes,
      partnerId: f.partner_id,
      partnerNome: f.partner.nome,
      createdAt: f.createdAt.toISOString(),
    })),
  };
}

export type PartnerPortalCommission = {
  id: string;
  project_id: string;
  cliente_nome: string;
  orcamento_codigo: string | null;
  orcamento_versao: number;
  percentual: number;
  base_valor: number;
  valor_comissao: number;
  status: PartnerCommissionStatus;
  data_pagamento_prevista: string | null;
  data_pagamento_efetiva: string | null;
  receipt_id: string | null;
  receipt_numero: number | null;
  createdAt: string;
};

export type PartnerPortalCommissionsBundle = {
  commissions: PartnerPortalCommission[];
  pendente: number;
  pago: number;
};

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

/** Comissões do parceiro logado — somente leitura, sem observações internas. */
export async function loadPartnerCommissions(
  partnerId: string
): Promise<PartnerPortalCommissionsBundle> {
  const partner = await prisma.professionalPartner.findFirst({
    where: { id: partnerId, ativo: true },
    select: { id: true, company_id: true },
  });
  if (!partner) {
    return { commissions: [], pendente: 0, pago: 0 };
  }

  const rows = await prisma.partnerCommission.findMany({
    where: {
      partner_id: partner.id,
      company_id: partner.company_id,
    },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      project_id: true,
      quote_id: true,
      percentual: true,
      base_valor: true,
      valor_comissao: true,
      status: true,
      data_pagamento_prevista: true,
      data_pagamento_efetiva: true,
      createdAt: true,
      project: { select: { client: { select: { nome: true } } } },
      quote: { select: { id: true, codigo: true, versao: true } },
      receipts: {
        select: { id: true, numero: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  let pendente = 0;
  let pago = 0;
  const commissions: PartnerPortalCommission[] = rows.map((row) => {
    const valor = Number(row.valor_comissao);
    if (row.status === "PAGA") pago += valor;
    else if (row.status === "PENDENTE" || row.status === "AGENDADA") pendente += valor;

    const codigo =
      row.quote.codigo?.trim()?.toUpperCase() ||
      (row.quote.id || row.quote_id
        ? `ORC-${(row.quote.id || row.quote_id).substring(0, 5).toUpperCase()}`
        : null);
    const latest = row.receipts[0] ?? null;

    return {
      id: row.id,
      project_id: row.project_id,
      cliente_nome: row.project.client.nome,
      orcamento_codigo: codigo,
      orcamento_versao: row.quote.versao,
      percentual: Number(row.percentual),
      base_valor: Number(row.base_valor),
      valor_comissao: valor,
      status: row.status,
      data_pagamento_prevista: row.data_pagamento_prevista
        ? toISODateBR(row.data_pagamento_prevista)
        : null,
      data_pagamento_efetiva: row.data_pagamento_efetiva
        ? toISODateBR(row.data_pagamento_efetiva)
        : null,
      receipt_id: latest?.id ?? null,
      receipt_numero: latest?.numero ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  });

  return {
    commissions,
    pendente: roundMoney(pendente),
    pago: roundMoney(pago),
  };
}

/** Comprovante emitido — só se pertencer ao parceiro da sessão. */
export async function loadPartnerCommissionReceiptForPartner(
  partnerId: string,
  receiptId: string
): Promise<PartnerCommissionReceiptDTO | null> {
  const partner = await prisma.professionalPartner.findFirst({
    where: { id: partnerId, ativo: true },
    select: { id: true, company_id: true },
  });
  if (!partner) return null;

  const row = await prisma.partnerCommissionReceipt.findFirst({
    where: {
      id: receiptId,
      company_id: partner.company_id,
      commission: { partner_id: partner.id },
    },
    select: {
      id: true,
      numero: true,
      commission_id: true,
      parceiro_nome: true,
      parceiro_tipo: true,
      parceiro_registro: true,
      parceiro_escritorio: true,
      parceiro_email: true,
      parceiro_telefone: true,
      cliente_nome: true,
      projeto_ref: true,
      orcamento_codigo: true,
      orcamento_versao: true,
      percentual: true,
      base_valor: true,
      valor_comissao: true,
      data_pagamento_prevista: true,
      data_pagamento_efetiva: true,
      nota_fiscal_numero: true,
      nota_fiscal_emitida_em: true,
      emitido_por_nome: true,
      observacoes: true,
      createdAt: true,
      commission: { select: { status: true, project_id: true } },
    },
  });

  if (!row) return null;

  return {
    id: row.id,
    numero: row.numero,
    commission_id: row.commission_id,
    commission_status: row.commission?.status,
    project_id: row.commission?.project_id ?? null,
    parceiro_nome: row.parceiro_nome,
    parceiro_tipo: row.parceiro_tipo,
    parceiro_registro: row.parceiro_registro,
    parceiro_escritorio: row.parceiro_escritorio,
    parceiro_email: row.parceiro_email ?? null,
    parceiro_telefone: row.parceiro_telefone ?? null,
    cliente_nome: row.cliente_nome,
    projeto_ref: row.projeto_ref,
    orcamento_codigo: row.orcamento_codigo,
    orcamento_versao: row.orcamento_versao,
    percentual: Number(row.percentual),
    base_valor: Number(row.base_valor),
    valor_comissao: Number(row.valor_comissao),
    data_pagamento_prevista: row.data_pagamento_prevista
      ? toISODateBR(row.data_pagamento_prevista)
      : null,
    data_pagamento_efetiva: row.data_pagamento_efetiva
      ? toISODateBR(row.data_pagamento_efetiva)
      : null,
    nota_fiscal_numero: row.nota_fiscal_numero ?? null,
    nota_fiscal_emitida_em: row.nota_fiscal_emitida_em
      ? toISODateBR(row.nota_fiscal_emitida_em)
      : null,
    emitido_por_nome: row.emitido_por_nome,
    observacoes: row.observacoes,
    createdAt: row.createdAt.toISOString(),
  };
}
