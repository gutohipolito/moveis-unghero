import type { Prisma, Role } from "@prisma/client";
import { isOpsLimitedRole } from "@/lib/permissions";
import { stripConsentFromObservacoes } from "@/lib/clientConsent";
import {
  summarizeEnvironmentAttachments,
  type EnvironmentAttachmentSummary,
} from "@/lib/factoryEnvironment";

export type ProjectEnvironmentPayload = {
  id: string;
  nome: string;
  tipo: string;
  status: string;
} & EnvironmentAttachmentSummary;

export type ProjectDetailsPayload = {
  id: string;
  valor_previsto: number;
  status_geral: string;
  client: {
    id: string;
    nome: string;
    cidade?: string;
    origem?: string;
    telefone?: string;
    email?: string;
    observacoes?: string | null;
    lgpd_aceite?: boolean;
    lgpd_aceite_em?: string | Date | null;
    marketing_aceite?: boolean;
  };
  data_entrega_prevista: string | null;
  responsavel_id: string | null;
  responsavelNome: string | null;
  conf_tecnica_resp1_id: string | null;
  conf_tecnica_resp1Nome: string | null;
  conf_tecnica_resp2_id: string | null;
  conf_tecnica_resp2Nome: string | null;
  observacoes: string;
  environments: ProjectEnvironmentPayload[];
  files: Array<{
    id: string;
    tipo: string;
    url: string;
    versao: number;
    aprovado_producao: boolean;
    nome_arquivo: string;
  }>;
  timeline: Array<{
    id: string;
    acao: string;
    data: string;
    interno_sotamente: boolean;
    user: { name: string };
  }>;
  quotes: Array<{
    id: string;
    versao: number;
    codigo?: string | null;
    template_tipo?: string;
    subtotal: number;
    desconto: number;
    valor_final: number;
    validade: string;
    observacoes: string | null;
    aprovado_em: string | null;
    pdf_shared_at?: string | null;
    pdf_view_count?: number;
    pdf_first_viewed_at?: string | null;
    pdf_last_viewed_at?: string | null;
    pdf_last_device?: string | null;
    pdf_last_os?: string | null;
    items: Array<{
      id: string;
      descricao: string;
      quantidade: number;
      tipo_custo?: string;
      valor_unitario: number;
      valor_total: number;
      status: string;
      aprovado_em: string | null;
      subitens?: string[];
      showcase_product_id?: string | null;
    }>;
  }>;
  tasks: Array<{
    id: string;
    titulo: string;
    descricao: string;
    responsavel: string;
    data: string;
    status: string;
    tipo: string;
  }>;
  installments: Array<{
    id: string;
    valor: number;
    data_vencimento: string;
    data_pagamento: string | null;
    status: string;
    tipo: string;
    metodo_pagamento?: string;
    numero_parcela?: number | null;
    total_parcelas?: number | null;
  }>;
  briefing: {
    id: string;
    ambientes: string;
    tipo_imovel: string;
    fase_projeto: string;
    pronto: string;
    data_chaves: string | null;
    tem_projeto: string;
    estilo: string;
    faixa_investimento: string | null;
    prazo_inicio: string;
    pinterest_link: string | null;
    referencia_url: string | null;
    origem_lead: string;
    score: number | null;
    roteiro_sugerido: string | null;
    createdAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

const projectInclude = {
  client: true,
  environments: {
    orderBy: { nome: "asc" as const },
    include: {
      _count: { select: { attachments: true } },
      attachments: {
        select: {
          id: true,
          url: true,
          mime_type: true,
          categoria: true,
        },
        orderBy: { createdAt: "desc" as const },
        take: 20,
      },
    },
  },
  files: true,
  quotes: {
    orderBy: { versao: "desc" as const },
    include: {
      items: {
        orderBy: { id: "asc" as const },
        select: {
          id: true,
          descricao: true,
          quantidade: true,
          tipo_custo: true,
          valor_unitario: true,
          valor_total: true,
          status: true,
          aprovado_em: true,
          subitens: true,
          showcase_product_id: true,
        },
      },
    },
  },
  tasks: true,
  installments: true,
  responsavel: true,
  conf_tecnica_resp1: { select: { id: true, name: true } },
  conf_tecnica_resp2: { select: { id: true, name: true } },
  briefing: true,
  timeline: {
    include: { user: { select: { name: true } } },
    orderBy: { data: "desc" as const },
    take: 60,
  },
} satisfies Prisma.ProjectInclude;

export type ProjectWithDetails = Prisma.ProjectGetPayload<{ include: typeof projectInclude }>;

export function formatProjectDetails(project: ProjectWithDetails): ProjectDetailsPayload {
  return {
    id: project.id,
    valor_previsto: Number(project.valor_previsto),
    status_geral: project.status_geral,
    client: {
      id: project.client.id,
      nome: project.client.nome,
      cidade: project.client.cidade,
      origem: project.client.origem,
      telefone: project.client.telefone,
      email: project.client.email,
      observacoes: project.client.observacoes,
      lgpd_aceite: Boolean(project.client.lgpd_aceite),
      lgpd_aceite_em: project.client.lgpd_aceite_em
        ? project.client.lgpd_aceite_em.toISOString()
        : null,
      marketing_aceite: Boolean(project.client.marketing_aceite),
    },
    data_entrega_prevista: project.data_entrega_prevista
      ? project.data_entrega_prevista.toISOString()
      : null,
    responsavel_id: project.responsavel_id || null,
    responsavelNome: project.responsavel?.name || null,
    conf_tecnica_resp1_id: project.conf_tecnica_resp1_id || null,
    conf_tecnica_resp1Nome: project.conf_tecnica_resp1?.name || null,
    conf_tecnica_resp2_id: project.conf_tecnica_resp2_id || null,
    conf_tecnica_resp2Nome: project.conf_tecnica_resp2?.name || null,
    observacoes: project.observacoes || "",
    environments: project.environments.map((env) => {
      const summary = summarizeEnvironmentAttachments({
        capa_attachment_id: env.capa_attachment_id,
        attachments: env.attachments,
        attachmentCount: env._count.attachments,
      });
      return {
        id: env.id,
        nome: env.nome,
        tipo: env.tipo,
        status: env.status,
        ...summary,
      };
    }),
    files: project.files.map((file) => ({
      id: file.id,
      tipo: file.tipo,
      url: file.url,
      versao: file.versao,
      aprovado_producao: file.aprovado_producao,
      nome_arquivo: `Arquivo_${file.tipo}_v${file.versao}.pdf`,
    })),
    timeline: project.timeline.map((t) => ({
      id: t.id,
      acao: t.acao,
      data: t.data.toISOString(),
      interno_sotamente: t.interno_sotamente,
      user: t.user || { name: "Usuário" },
    })),
    quotes: project.quotes.map((q) => ({
      id: q.id,
      versao: q.versao,
      codigo: q.codigo,
      template_tipo: q.template_tipo,
      subtotal: Number(q.subtotal),
      desconto: Number(q.desconto),
      valor_final: Number(q.valor_final),
      validade: q.validade.toISOString(),
      observacoes: q.observacoes,
      aprovado_em: q.aprovado_em ? q.aprovado_em.toISOString() : null,
      pdf_shared_at: q.pdf_shared_at ? q.pdf_shared_at.toISOString() : null,
      pdf_view_count: q.pdf_view_count ?? 0,
      pdf_first_viewed_at: q.pdf_first_viewed_at
        ? q.pdf_first_viewed_at.toISOString()
        : null,
      pdf_last_viewed_at: q.pdf_last_viewed_at
        ? q.pdf_last_viewed_at.toISOString()
        : null,
      pdf_last_device: q.pdf_last_device ?? null,
      pdf_last_os: q.pdf_last_os ?? null,
      items: (q.items || []).map((item) => ({
        id: item.id,
        descricao: item.descricao,
        quantidade: item.quantidade,
        tipo_custo: item.tipo_custo,
        valor_unitario: Number(item.valor_unitario),
        valor_total: Number(item.valor_total),
        status: item.status,
        aprovado_em: item.aprovado_em ? item.aprovado_em.toISOString() : null,
        subitens: Array.isArray(item.subitens)
          ? item.subitens.filter((entry): entry is string => typeof entry === "string")
          : [],
        showcase_product_id: item.showcase_product_id ?? null,
      })),
    })),
    tasks: project.tasks.map((t) => ({
      id: t.id,
      titulo: t.titulo || "Compromisso",
      descricao: t.descricao || "",
      responsavel: t.responsavel,
      data: t.data.toISOString(),
      status: t.status,
      tipo: t.tipo || "OUTROS",
    })),
    installments: project.installments.map((ins) => ({
      id: ins.id,
      valor: Number(ins.valor),
      data_vencimento: ins.data_vencimento.toISOString(),
      data_pagamento: ins.data_pagamento ? ins.data_pagamento.toISOString() : null,
      status: ins.status,
      tipo: ins.tipo,
      metodo_pagamento: ins.metodo_pagamento,
      numero_parcela: ins.numero_parcela,
      total_parcelas: ins.total_parcelas,
    })),
    briefing: project.briefing
      ? {
          id: project.briefing.id,
          ambientes: project.briefing.ambientes,
          tipo_imovel: project.briefing.tipo_imovel,
          fase_projeto: project.briefing.fase_projeto,
          pronto: project.briefing.pronto,
          data_chaves: project.briefing.data_chaves,
          tem_projeto: project.briefing.tem_projeto,
          estilo: project.briefing.estilo,
          faixa_investimento: project.briefing.faixa_investimento,
          prazo_inicio: project.briefing.prazo_inicio,
          pinterest_link: project.briefing.pinterest_link,
          referencia_url: project.briefing.referencia_url,
          origem_lead: project.briefing.origem_lead,
          score: project.briefing.score,
          roteiro_sugerido: project.briefing.roteiro_sugerido,
          createdAt: project.briefing.createdAt.toISOString(),
        }
      : null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

/**
 * Payload mínimo do projeto para Projetista/Fábrica.
 * A proteção acontece antes da serialização RSC/Server Action: abas ocultas
 * também não deixam orçamento, briefing, histórico ou financeiro no navegador.
 */
export function restrictProjectDetailsForRole(
  project: ProjectDetailsPayload,
  role: Role | string | null | undefined
): ProjectDetailsPayload {
  if (!isOpsLimitedRole(role)) return project;

  const common: ProjectDetailsPayload = {
    ...project,
    valor_previsto: 0,
    quotes: [],
    briefing: null,
    timeline: [],
    installments: [],
  };

  if (role === "PRODUCAO") {
    return {
      ...common,
      client: {
        id: project.client.id,
        nome: project.client.nome,
      },
    };
  }

  return {
    ...common,
    client: {
      id: project.client.id,
      nome: project.client.nome,
      cidade: project.client.cidade,
      // Projetista: sem telefone/e-mail do cliente (mesmo padrão operacional).
      observacoes: stripConsentFromObservacoes(project.client.observacoes),
    },
  };
}

export { projectInclude };
