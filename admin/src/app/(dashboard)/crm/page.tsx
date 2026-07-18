import { getClients } from "@/app/actions/cliente";
import { guardModule } from "@/lib/moduleAccess";
import { fetchCrmProjects } from "@/lib/crmProjects";
import { getSessionCompanyId } from "@/lib/session";
import KanbanBoard from "@/components/KanbanBoard";
import PageHeader from "@/components/PageHeader";
import { TooltipBody } from "@/components/ui/InfoTooltip";

export default async function CRMPage() {
  await guardModule("crm");
  const userCompanyId = await getSessionCompanyId();

  const [formattedProjects, clientResponse] = await Promise.all([
    fetchCrmProjects(userCompanyId),
    getClients(userCompanyId),
  ]);

  const clientsList = clientResponse.success ? clientResponse.clients : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Funil Comercial"
        description="Gerencie as etapas de negociação e fabricação dos móveis sob medida."
        help={
          <TooltipBody
            title="Funil de vendas"
            items={[
              "Arraste os cards entre as colunas para avançar cada negócio de etapa.",
              "No mobile, use o botão de avançar dentro do card.",
              "O topo de cada coluna mostra o total em negociação daquela etapa.",
              "Totais e telefone começam ocultos; o olho revela por 30s e volta a ocultar.",
              "Indicadores do funil ficam em Relatórios.",
            ]}
          />
        }
      />

      <KanbanBoard
        initialProjects={formattedProjects}
        companyId={userCompanyId}
        clients={clientsList as any}
      />
    </div>
  );
}
