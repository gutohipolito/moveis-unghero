import { prisma } from "@/lib/prisma";
import { getSessionCompanyId } from "@/lib/session";
import BiClient from "./BiClient";
import PrivacyToggle from "@/components/PrivacyToggle";
import PageHeader from "@/components/PageHeader";

export default async function BIPage() {
  const userCompanyId = await getSessionCompanyId();

  let projects: any[] = [];
  let partners: any[] = [];
  try {
    projects = await prisma.project.findMany({
      where: { client: { company_id: userCompanyId } },
      select: {
        id: true,
        valor_previsto: true,
        status_geral: true,
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
      },
    });

    partners = await prisma.professionalPartner.findMany({
      where: { company_id: userCompanyId, ativo: true },
      select: {
        id: true,
        nome: true,
        cidade: true,
        tipo: true,
      },
      orderBy: { nome: "asc" }
    });
  } catch (error) {
    console.warn("Falha ao se conectar com banco de dados no BI.", error);
  }

  const formattedProjects = projects.map((p) => ({
    id: p.id,
    valor_previsto: Number(p.valor_previsto),
    status_geral: p.status_geral,
    client: p.client,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description="Análise e inteligência de mercado para a operação comercial da Móveis Unghero."
      >
        <PrivacyToggle />
      </PageHeader>

      <BiClient initialProjects={formattedProjects} initialPartners={partners} companyId={userCompanyId} />
    </div>
  );
}
