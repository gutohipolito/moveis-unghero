import { prisma } from "@/lib/prisma";
import { resolveStageEntryAt } from "@/lib/crmStageDate";

export const CRM_PROJECT_SELECT = {
  id: true,
  valor_previsto: true,
  status_geral: true,
  ultimo_contato_em: true,
  createdAt: true,
  updatedAt: true,
  motivo_perda: true,
  observacoes: true,
  conf_tecnica_resp1_id: true,
  conf_tecnica_resp2_id: true,
  conf_tecnica_resp1: { select: { id: true, name: true } },
  conf_tecnica_resp2: { select: { id: true, name: true } },
  quotes: {
    where: { aprovado_em: { not: null } },
    select: { aprovado_em: true },
    orderBy: { aprovado_em: "asc" as const },
    take: 1,
  },
  timeline: {
    select: {
      id: true,
      acao: true,
      data: true,
      user: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      data: "desc" as const,
    },
  },
  client: {
    select: {
      id: true,
      nome: true,
      cidade: true,
      origem: true,
      telefone: true,
      email: true,
    },
  },
  briefing: {
    select: {
      id: true,
      ambientes: true,
      tipo_imovel: true,
      fase_projeto: true,
      pronto: true,
      data_chaves: true,
      tem_projeto: true,
      estilo: true,
      faixa_investimento: true,
      prazo_inicio: true,
      pinterest_link: true,
      referencia_url: true,
      origem_lead: true,
      utm_source: true,
      utm_medium: true,
      utm_campaign: true,
      gclid: true,
      fbclid: true,
      ip: true,
      user_agent: true,
      dispositivo: true,
      os: true,
      resolution: true,
      idioma: true,
      tempo_preenchimento: true,
      score: true,
      roteiro_sugerido: true,
      createdAt: true,
    },
  },
} as const;

export async function fetchCrmProjects(companyId: string) {
  const projectsResult = await prisma.project
    .findMany({
      where: {
        client: { company_id: companyId },
        OR: [{ quotes: { some: {} } }, { briefing: { isNot: null } }],
      },
      select: CRM_PROJECT_SELECT,
    })
    .catch((error) => {
      console.warn("Conexão ao banco falhou no carregamento do CRM.", error);
      return [];
    });

  return projectsResult.map((project) => {
    const timeline = project.timeline
      ? project.timeline.map((entry) => ({
          id: entry.id,
          acao: entry.acao,
          data: entry.data ? new Date(entry.data).toISOString() : new Date().toISOString(),
          user: entry.user,
        }))
      : [];
    const firstQuoteApprovedAt = project.quotes[0]?.aprovado_em
      ? new Date(project.quotes[0].aprovado_em).toISOString()
      : null;

    return {
    id: project.id,
    valor_previsto: Number(project.valor_previsto),
    status_geral: project.status_geral,
    ultimo_contato_em: project.ultimo_contato_em
      ? new Date(project.ultimo_contato_em).toISOString()
      : null,
    createdAt: project.createdAt ? new Date(project.createdAt).toISOString() : null,
    updatedAt: project.updatedAt ? new Date(project.updatedAt).toISOString() : null,
    motivo_perda: project.motivo_perda || null,
    observacoes: project.observacoes || null,
    conf_tecnica_resp1_id: project.conf_tecnica_resp1_id || null,
    conf_tecnica_resp1Nome: project.conf_tecnica_resp1?.name || null,
    conf_tecnica_resp2_id: project.conf_tecnica_resp2_id || null,
    conf_tecnica_resp2Nome: project.conf_tecnica_resp2?.name || null,
    stage_entered_at: resolveStageEntryAt(
      project.status_geral,
      timeline,
      firstQuoteApprovedAt
    ),
    timeline,
    client: project.client,
    briefing: project.briefing
      ? {
          ...project.briefing,
          createdAt: project.briefing.createdAt
            ? new Date(project.briefing.createdAt).toISOString()
            : null,
        }
      : null,
  };
  });
}
