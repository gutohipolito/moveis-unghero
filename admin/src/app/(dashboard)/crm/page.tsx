import { prisma } from "@/lib/prisma";
import { getClients } from "@/app/actions/cliente";
import { getSessionCompanyId } from "@/lib/session";
import KanbanBoard from "@/components/KanbanBoard";
import PrivacyToggle from "@/components/PrivacyToggle";
import PageHeader from "@/components/PageHeader";

export default async function CRMPage() {
  const userCompanyId = await getSessionCompanyId();

  let projects: any[] = [];
  try {
    projects = await prisma.project.findMany({
      where: {
        client: { company_id: userCompanyId },
      },
      include: { client: true },
    });
  } catch (error) {
    console.warn("Conexão ao banco falhou no carregamento do CRM.", error);
  }

  const formattedProjects = projects.map((p) => ({
    id: p.id,
    valor_previsto: Number(p.valor_previsto),
    status_geral: p.status_geral,
    ultimo_contato_em: p.ultimo_contato_em
      ? new Date(p.ultimo_contato_em).toISOString()
      : null,
    createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
    motivo_perda: p.motivo_perda || null,
    client: {
      id: p.client.id,
      nome: p.client.nome,
      cidade: p.client.cidade,
      origem: p.client.origem,
      telefone: p.client.telefone,
      email: p.client.email,
    },
  }));

  const clientResponse = await getClients(userCompanyId);
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
