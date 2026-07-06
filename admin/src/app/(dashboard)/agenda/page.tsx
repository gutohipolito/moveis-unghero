import { prisma } from "@/lib/prisma";
import { getSessionCompanyId } from "@/lib/session";
import AgendaClient from "./AgendaClient";
import PageHeader from "@/components/PageHeader";

export default async function AgendaPage() {
  const userCompanyId = await getSessionCompanyId();

  let tasks: any[] = [];
  let projects: any[] = [];

  try {
    [tasks, projects] = await Promise.all([
      prisma.task.findMany({
        where: { project: { client: { company_id: userCompanyId } } },
        include: { project: { include: { client: true } } },
        orderBy: { data: "asc" },
      }),
      prisma.project.findMany({
        where: { client: { company_id: userCompanyId } },
        include: { client: true },
      }),
    ]);
  } catch (error) {
    console.warn("Falha de conexão com banco de dados na busca da agenda.", error);
  }

  const formattedEvents = tasks.map((t) => ({
    id: t.id,
    titulo: t.titulo || "Compromisso Técnico",
    descricao: t.descricao || "",
    responsavel: t.responsavel,
    data: t.data.toISOString(),
    status: t.status,
    tipo: t.tipo || "OUTROS",
    projectName: t.project?.client?.nome || "Sem Projeto Associado",
    projectId: t.project?.id || "",
  }));

  const formattedProjects = projects.map((p) => ({
    id: p.id,
    clientName: p.client.nome,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agenda"
        description="Visitas comerciais, medições, entregas e instalações."
      />

      <AgendaClient initialEvents={formattedEvents} projects={formattedProjects} />
    </div>
  );
}
