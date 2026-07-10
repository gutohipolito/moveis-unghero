import { prisma } from "@/lib/prisma";
import { fetchAgendaEvents } from "@/lib/factoryBoard";
import { getSessionCompanyId } from "@/lib/session";
import AgendaClient from "./AgendaClient";
import PageHeader from "@/components/PageHeader";

export default async function AgendaPage() {
  const userCompanyId = await getSessionCompanyId();

  let projects: Array<{ id: string; clientName: string }> = [];
  let agendaSnapshot = { events: [] as Awaited<ReturnType<typeof fetchAgendaEvents>>["events"], version: "" };

  try {
    const [snapshot, projectsResult] = await Promise.all([
      fetchAgendaEvents(userCompanyId),
      prisma.project.findMany({
        where: { client: { company_id: userCompanyId } },
        include: { client: true },
      }),
    ]);

    agendaSnapshot = snapshot;
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
        projects={projects}
        companyId={userCompanyId}
      />
    </div>
  );
}
