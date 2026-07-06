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
} as const;

export default async function CRMPage() {
  const userCompanyId = await getSessionCompanyId();

  const [projectsResult, clientResponse] = await Promise.all([
    prisma.project
      .findMany({
        where: { client: { company_id: userCompanyId } },
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
    client: p.client,
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
