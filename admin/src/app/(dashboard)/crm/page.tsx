import { getUserPreferences } from "@/app/actions/preferences";
import { guardModule } from "@/lib/moduleAccess";
import { fetchCrmProjects } from "@/lib/crmProjects";
import { getSessionCompanyId } from "@/lib/session";
import { CRM_FOLLOW_UP_SLA_PREF_KEY, resolveFollowUpSla } from "@/lib/crmFollowUpPrefs";
import type { FollowUpSlaConfig } from "@/lib/followUp";
import KanbanBoard from "@/components/KanbanBoard";

export default async function CRMPage() {
  await guardModule("crm");
  const userCompanyId = await getSessionCompanyId();

  // Board first — colaboradores carregam no cliente (não bloqueiam o funil).
  const [formattedProjects, preferences] = await Promise.all([
    fetchCrmProjects(userCompanyId),
    getUserPreferences(),
  ]);

  const initialFollowUpSla = resolveFollowUpSla(
    (preferences?.[CRM_FOLLOW_UP_SLA_PREF_KEY] as Partial<FollowUpSlaConfig> | undefined) ?? null
  );

  return (
    <div className="md:h-[calc(100vh-var(--dashboard-chrome-offset))] md:flex md:flex-col md:overflow-hidden space-y-[var(--space-3)] print:p-0 print:h-auto print:overflow-visible">
      <KanbanBoard
        initialProjects={formattedProjects}
        companyId={userCompanyId}
        initialFollowUpSla={initialFollowUpSla}
      />
    </div>
  );
}
