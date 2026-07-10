import { prisma } from "@/lib/prisma";

export const CRM_PROJECT_SELECT = {
  id: true,
  valor_previsto: true,
  status_geral: true,
  ultimo_contato_em: true,
  createdAt: true,
  updatedAt: true,
  motivo_perda: true,
  observacoes: true,
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

  return projectsResult.map((project) => ({
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
    timeline: project.timeline
      ? project.timeline.map((entry) => ({
          id: entry.id,
          acao: entry.acao,
          data: entry.data ? new Date(entry.data).toISOString() : new Date().toISOString(),
          user: entry.user,
        }))
      : [],
    client: project.client,
    briefing: project.briefing
      ? {
          ...project.briefing,
          createdAt: project.briefing.createdAt
            ? new Date(project.briefing.createdAt).toISOString()
            : null,
        }
      : null,
  }));
}
