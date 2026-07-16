import { prisma } from "@/lib/prisma";
import { getSessionCompanyId } from "@/lib/session";
import { guardModule } from "@/lib/moduleAccess";
import BiClient from "./BiClient";
import PrivacyToggle from "@/components/PrivacyToggle";
import PageHeader from "@/components/PageHeader";
import { TooltipBody } from "@/components/ui/InfoTooltip";

export default async function BIPage() {
  await guardModule("bi");
  const userCompanyId = await getSessionCompanyId();

  let projects: Awaited<ReturnType<typeof loadBiProjects>> = [];
  try {
    projects = await loadBiProjects(userCompanyId);
  } catch (error) {
    console.warn("Falha ao se conectar com banco de dados no BI.", error);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description="Análise e inteligência de mercado para a operação comercial da Móveis Unghero."
        help={
          <TooltipBody
            title="Inteligência comercial"
            items={[
              "Consolida projetos, valores e origem dos clientes em indicadores.",
              "Analise desempenho por cidade, canal de origem e parceiros.",
              "Use o modo privado (olho) para ocultar valores em apresentações.",
            ]}
          />
        }
      >
        <PrivacyToggle />
      </PageHeader>

      <BiClient initialProjects={projects} companyId={userCompanyId} />
    </div>
  );
}

async function loadBiProjects(companyId: string) {
  const projects = await prisma.project.findMany({
    where: { client: { company_id: companyId } },
    select: {
      id: true,
      valor_previsto: true,
      status_geral: true,
      partner_id: true,
      partner: {
        select: {
          id: true,
          nome: true,
          cidade: true,
          tipo: true,
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
    },
  });

  return projects.map((p) => ({
    id: p.id,
    valor_previsto: Number(p.valor_previsto),
    status_geral: p.status_geral,
    partner_id: p.partner_id,
    partner: p.partner,
    client: p.client,
  }));
}
