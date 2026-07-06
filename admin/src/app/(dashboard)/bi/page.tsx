import { prisma } from "@/lib/prisma";
import { getSessionCompanyId } from "@/lib/session";
import BiClient from "./BiClient";
import PrivacyToggle from "@/components/PrivacyToggle";
import PageHeader from "@/components/PageHeader";

export default async function BIPage() {
  const userCompanyId = await getSessionCompanyId();

  let projects: any[] = [];
  try {
    projects = await prisma.project.findMany({
      where: { client: { company_id: userCompanyId } },
      include: { client: true },
    });
  } catch (error) {
    console.warn("Conexão ao banco falhou no carregamento do BI.", error);
  }

  const formattedProjects = projects.map((p) => ({
    id: p.id,
    valor_previsto: Number(p.valor_previsto),
    status_geral: p.status_geral,
    client: {
      id: p.client.id,
      nome: p.client.nome,
      cidade: p.client.cidade,
      origem: p.client.origem,
      telefone: p.client.telefone,
      email: p.client.email,
    },
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description="Análise e inteligência de mercado para a operação comercial da Móveis Unghero."
      >
        <PrivacyToggle />
      </PageHeader>

      <BiClient initialProjects={formattedProjects} />
    </div>
  );
}
