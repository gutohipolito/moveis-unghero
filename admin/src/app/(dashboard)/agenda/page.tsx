import { prisma } from "@/lib/prisma";
import { guardModule } from "@/lib/moduleAccess";
import { fetchAgendaEvents, fetchAgendaDerivedEvents } from "@/lib/factoryBoard";
import { getSessionCompanyId } from "@/lib/session";
import type { DerivedAgendaEvent } from "@/lib/agendaEvents";
import AgendaClient from "./AgendaClient";
import PageHeader from "@/components/PageHeader";

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
