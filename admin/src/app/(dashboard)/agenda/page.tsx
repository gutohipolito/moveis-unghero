import { prisma } from "@/lib/prisma";
import { guardModule } from "@/lib/moduleAccess";
import { fetchAgendaEvents, fetchAgendaDerivedEvents } from "@/lib/factoryBoard";
import { getSessionCompanyId } from "@/lib/session";
import type { DerivedAgendaEvent } from "@/lib/agendaEvents";
import AgendaClient from "./AgendaClient";
import PageHeader from "@/components/PageHeader";
import { TooltipBody } from "@/components/ui/InfoTooltip";

export default async function AgendaPage() {
  await guardModule("agenda");
  const userCompanyId = await getSessionCompanyId();

  let projects: Array<{ id: string; clientName: string }> = [];
  let agendaSnapshot = { events: [] as Awaited<ReturnType<typeof fetchAgendaEvents>>["events"], version: "" };
  let derivedEvents: DerivedAgendaEvent[] = [];

  try {
    const [snapshot, projectsResult, derived] = await Promise.all([
      fetchAgendaEvents(userCompanyId),
      prisma.project.findMany({
        where: { client: { company_id: userCompanyId } },
        include: { client: true },
      }),
      fetchAgendaDerivedEvents(userCompanyId),
    ]);

    agendaSnapshot = snapshot;
    derivedEvents = derived;
    projects = projectsResult.map((project) => ({
      id: project.id,
      clientName: project.client.nome,
    }));
  } catch (error) {
    console.warn("Falha de conexão com banco de dados na busca da agenda.", error);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agenda"
        description="Visitas comerciais, medições, entregas e instalações."
        help={
          <TooltipBody
            title="Compromissos e prazos"
            items={[
              "Registre visitas, medições, entregas e instalações.",
              "Alguns eventos são gerados automaticamente a partir de projetos e leads.",
              "Use os filtros para focar em um tipo de evento ou período.",
            ]}
          />
        }
      />

      <AgendaClient
        initialEvents={agendaSnapshot.events}
        derivedEvents={derivedEvents}
        projects={projects}
        companyId={userCompanyId}
      />
    </div>
  );
}
