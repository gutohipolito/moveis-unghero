import { prisma } from "@/lib/prisma";
import { guardModule } from "@/lib/moduleAccess";
import { fetchAgendaEvents, fetchAgendaDerivedEvents } from "@/lib/factoryBoard";
import { getSessionCompanyId } from "@/lib/session";
import { getAuthContext } from "@/lib/auth-guard";
import { isReadOnlyRole } from "@/lib/permissions";
import { redactPersonName } from "@/lib/viewerRedact";
import type { DerivedAgendaEvent } from "@/lib/agendaEvents";
import AgendaClient from "./AgendaClient";
import PageHeader from "@/components/PageHeader";
import { TooltipBody } from "@/components/ui/InfoTooltip";

function redactAgendaForViewer<T extends { projectName?: string; descricao?: string; href?: string }>(
  events: T[]
): T[] {
  return events.map((event) => ({
    ...event,
    projectName: String(redactPersonName(event.projectName) ?? event.projectName ?? ""),
    descricao: event.descricao
      ? String(event.descricao).replace(
          /de\s+([A-Za-zÀ-ÿ][\wÀ-ÿ]*(?:\s+[A-Za-zÀ-ÿ][\wÀ-ÿ]*)+)/gi,
          (_m, name: string) => `de ${String(redactPersonName(name))}`
        )
      : event.descricao,
    href: undefined,
  }));
}

export default async function AgendaPage() {
  await guardModule("agenda");
  const userCompanyId = await getSessionCompanyId();
  const auth = await getAuthContext();
  const isViewer = isReadOnlyRole(auth?.cargo);

  let projects: Array<{ id: string; clientName: string }> = [];
  let agendaSnapshot = { events: [] as Awaited<ReturnType<typeof fetchAgendaEvents>>["events"], version: "" };
  let derivedEvents: DerivedAgendaEvent[] = [];

  try {
    const [snapshot, projectsResult, derived] = await Promise.all([
      fetchAgendaEvents(userCompanyId),
      isViewer
        ? Promise.resolve([])
        : prisma.project.findMany({
            where: { client: { company_id: userCompanyId } },
            include: { client: true },
          }),
      fetchAgendaDerivedEvents(userCompanyId),
    ]);

    agendaSnapshot = isViewer
      ? {
          ...snapshot,
          events: redactAgendaForViewer(snapshot.events),
        }
      : snapshot;
    derivedEvents = isViewer ? redactAgendaForViewer(derived) : derived;
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
        description={
          isViewer
            ? "Visão dos compromissos (somente leitura)."
            : "Visitas comerciais, medições, entregas e instalações."
        }
        help={
          isViewer ? undefined : (
            <TooltipBody
              title="Compromissos e prazos"
              items={[
                "Registre visitas, medições, entregas e instalações.",
                "Alguns eventos são gerados automaticamente a partir de projetos e leads.",
                "Use os filtros para focar em um tipo de evento ou período.",
              ]}
            />
          )
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
