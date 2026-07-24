import { getCatalogItemsBySlug } from "@/app/actions/cadastros";
import { prisma } from "@/lib/prisma";
import { getSessionCompanyId } from "@/lib/session";
import { guardModule } from "@/lib/moduleAccess";
import { getAuthContext } from "@/lib/auth-guard";
import LogisticaClient from "./LogisticaClient";
import PageHeader from "@/components/PageHeader";
import { TooltipBody } from "@/components/ui/InfoTooltip";
import { maybeRedactForViewer } from "@/lib/viewerRedact";

export default async function LogisticaPage() {
  await guardModule("logistica");
  const userCompanyId = await getSessionCompanyId();

  let projects: any[] = [];
  try {
    projects = await prisma.project.findMany({
      where: {
        status_geral: { in: ["APROVADO", "PRODUCAO", "INSTALACAO", "FINALIZADO"] },
        client: { company_id: userCompanyId },
      },
      include: { client: true },
    });
  } catch (error) {
    console.warn("Conexão ao banco falhou no carregamento da Logística.", error);
  }

  const formattedProjects = projects.map((p) => ({
    id: p.id,
    valor_previsto: Number(p.valor_previsto),
    status_geral: p.status_geral,
    client: {
      id: p.client.id,
      nome: p.client.nome,
      cidade: p.client.cidade,
      telefone: p.client.telefone,
      email: p.client.email,
      observacoes: p.client.observacoes,
    },
  }));

  const auth = await getAuthContext();
  const safeProjects = maybeRedactForViewer(formattedProjects, auth?.cargo);

  const veiculosRes = await getCatalogItemsBySlug(userCompanyId, "veiculos");
  const veiculos = veiculosRes.items.map((item) => ({
    id: item.id,
    label: item.label,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logística e Entrega"
        description="Planejamento de rotas de expedição, equipes de montagem e controle de qualidade técnica."
        help={
          <TooltipBody
            title="Expedição e montagem"
            items={[
              "Lista os projetos aprovados, em produção, instalação e finalizados.",
              "Planeje rotas de entrega e defina o veículo e a equipe de montagem.",
              "Use para organizar a agenda de expedição e o controle de qualidade.",
            ]}
          />
        }
      />

      <LogisticaClient
        initialProjects={safeProjects}
        veiculos={veiculos}
        companyId={userCompanyId}
      />
    </div>
  );
}
