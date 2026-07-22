import { getClients } from "@/app/actions/cliente";
import { getColaboradores } from "@/app/actions/colaboradores";
import { getUserPreferences } from "@/app/actions/preferences";
import { guardModule } from "@/lib/moduleAccess";
import { fetchCrmProjects } from "@/lib/crmProjects";
import { getSessionCompanyId } from "@/lib/session";
import { CRM_FOLLOW_UP_SLA_PREF_KEY, resolveFollowUpSla } from "@/lib/crmFollowUpPrefs";
import type { FollowUpSlaConfig } from "@/lib/followUp";
import KanbanBoard from "@/components/KanbanBoard";
import PageHeader from "@/components/PageHeader";
import { TooltipBody } from "@/components/ui/InfoTooltip";

export default async function CRMPage() {
  await guardModule("crm");
  const userCompanyId = await getSessionCompanyId();

  const [formattedProjects, clientResponse, preferences, colaboradoresRes] = await Promise.all([
    fetchCrmProjects(userCompanyId),
    getClients(userCompanyId),
    getUserPreferences(),
    getColaboradores(userCompanyId),
  ]);

  const clientsList = clientResponse.success ? clientResponse.clients : [];
  const colaboradores =
    colaboradoresRes.success && colaboradoresRes.colaboradores
      ? colaboradoresRes.colaboradores.map((c) => ({
          id: c.id,
          name: c.name,
          cargo: String(c.cargo),
          image: c.image ?? null,
        }))
      : [];
  const initialFollowUpSla = resolveFollowUpSla(
    (preferences?.[CRM_FOLLOW_UP_SLA_PREF_KEY] as Partial<FollowUpSlaConfig> | undefined) ?? null
  );

  return (
    <div className="md:h-[calc(100vh-125px)] md:flex md:flex-col md:overflow-hidden space-y-[var(--space-3)] print:p-0 print:h-auto print:overflow-visible">
      <div className="shrink-0 print:hidden">
        <PageHeader
          title="Funil Comercial"
          description="Gerencie as etapas de negociação e fabricação dos móveis sob medida."
          help={
            <TooltipBody
              title="Funil de vendas"
              items={[
                "Arraste os cards entre as colunas para avançar cada negócio de etapa.",
                "Em Aprovados, atribua até 2 responsáveis pela conferência técnica.",
                "Só ao entrar em Produção o projeto aparece na fila do chão de fábrica.",
                "No mobile, use o botão de avançar dentro do card.",
                "Totais e telefone começam ocultos; o olho revela por 30s e volta a ocultar.",
                "Na engrenagem, configure os prazos de aviso, alerta e perdas do follow-up.",
              ]}
            />
          }
        />
      </div>

      <KanbanBoard
        initialProjects={formattedProjects}
        companyId={userCompanyId}
        clients={clientsList as any}
        colaboradores={colaboradores}
        initialFollowUpSla={initialFollowUpSla}
      />
    </div>
  );
}
