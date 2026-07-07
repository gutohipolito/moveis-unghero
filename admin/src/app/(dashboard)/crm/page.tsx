import { prisma } from "@/lib/prisma";
import { getClients } from "@/app/actions/cliente";
import { getSessionCompanyId } from "@/lib/session";
import KanbanBoard from "@/components/KanbanBoard";
import PrivacyToggle from "@/components/PrivacyToggle";
import PageHeader from "@/components/PageHeader";

const PROJECT_SELECT = {
  id: true,
  valor_previsto: true,
  status_geral: true,
  ultimo_contato_em: true,
  createdAt: true,
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
    }
  }
} as const;

export default async function CRMPage() {
  const userCompanyId = await getSessionCompanyId();

  const [projectsResult, clientResponse] = await Promise.all([
    prisma.project
      .findMany({
        where: { 
          client: { company_id: userCompanyId },
          OR: [
            { quotes: { some: {} } },
            { briefing: { isNot: null } }
          ]
        },
        select: PROJECT_SELECT,
      })
      .catch((error) => {
        console.warn("Conexão ao banco falhou no carregamento do CRM.", error);
        return [];
      }),
    getClients(userCompanyId),
  ]);

  const formattedProjects = projectsResult.map((p) => ({
    id: p.id,
    valor_previsto: Number(p.valor_previsto),
    status_geral: p.status_geral,
    ultimo_contato_em: p.ultimo_contato_em
      ? new Date(p.ultimo_contato_em).toISOString()
      : null,
    createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
    motivo_perda: p.motivo_perda || null,
    observacoes: p.observacoes || null,
    timeline: p.timeline ? p.timeline.map((t: any) => ({
      id: t.id,
      acao: t.acao,
      data: t.data ? new Date(t.data).toISOString() : new Date().toISOString(),
      user: t.user,
    })) : [],
    client: p.client,
    briefing: p.briefing ? {
      ...p.briefing,
      createdAt: p.briefing.createdAt ? new Date(p.briefing.createdAt).toISOString() : null,
    } : null,
  }));

  const clientsList = clientResponse.success ? clientResponse.clients : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Funil Comercial"
        description="Gerencie as etapas de negociação e fabricação dos móveis sob medida."
      >
        <PrivacyToggle />
      </PageHeader>

      <KanbanBoard
        initialProjects={formattedProjects}
        companyId={userCompanyId}
        clients={clientsList as any}
      />
    </div>
  );
}
