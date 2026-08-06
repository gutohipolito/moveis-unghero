import { getColaboradores } from "@/app/actions/colaboradores";
import { ensureProjectSla, getProjectSla } from "@/app/actions/productionSla";
import { prisma } from "@/lib/prisma";
import { getSessionCompanyId } from "@/lib/session";
import { getAuthContext } from "@/lib/auth-guard";
import {
  formatProjectDetails,
  projectInclude,
  restrictProjectDetailsForRole,
} from "@/lib/formatProjectDetails";
import { maybeRedactForViewer } from "@/lib/viewerRedact";
import { guardModule } from "@/lib/moduleAccess";
import { notFound } from "next/navigation";
import ProjectDetails from "@/components/ProjectDetails";
import { loadPartnerContributionsForProject } from "@/lib/partnerPortal";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: RouteParams) {
  await guardModule("crm");
  const { id } = await params;
  const userCompanyId = await getSessionCompanyId();
  const auth = await getAuthContext();

  let project = null;
  try {
    project = await prisma.project.findFirst({
      where: {
        id,
        client: { company_id: userCompanyId },
      },
      include: projectInclude,
    });
  } catch (error) {
    console.warn("Falha de conexão com banco de dados na busca de detalhes do projeto.", error);
  }

  if (!project) {
    notFound();
  }

  const shouldSyncEnvs = [
    "APROVADO",
    "CONFERENCIA_TECNICA",
    "PRODUCAO",
    "INSTALACAO",
    "FINALIZADO",
  ].includes(project.status_geral);

  if (shouldSyncEnvs) {
    const { ensureEnvironmentsFromApprovedQuotes } = await import(
      "@/lib/syncEnvironmentsFromQuotes"
    );
    const sync = await ensureEnvironmentsFromApprovedQuotes(prisma, id);
    if (sync.created.length > 0 || sync.linked > 0) {
      project = await prisma.project.findFirst({
        where: { id, client: { company_id: userCompanyId } },
        include: projectInclude,
      });
      if (!project) notFound();
    }
  }

  const colaboradoresRes = await getColaboradores(userCompanyId);
  const colaboradores =
    colaboradoresRes.success && colaboradoresRes.colaboradores
      ? colaboradoresRes.colaboradores.map((c: { id: string; name: string; cargo: string }) => ({
          id: c.id,
          name: c.name,
          cargo: c.cargo,
        }))
      : [];

  const formattedProject = formatProjectDetails(project);
  const safeProject = restrictProjectDetailsForRole(
    maybeRedactForViewer(formattedProject, auth?.cargo),
    auth?.cargo
  );

  const hasProductionApproval = safeProject.files.some((f) => f.aprovado_producao);
  let initialSla = null;
  if (hasProductionApproval) {
    await ensureProjectSla(id);
    initialSla = await getProjectSla(id);
  }

  let partnerContributions: Awaited<ReturnType<typeof loadPartnerContributionsForProject>> = {
    notes: [],
    files: [],
  };
  try {
    partnerContributions = await loadPartnerContributionsForProject(id);
  } catch (error) {
    console.warn("Falha ao carregar contribuições do parceiro:", error);
  }

  return (
    <div className="space-y-6">
      <ProjectDetails
        initialProject={safeProject as any}
        companyId={userCompanyId}
        colaboradores={colaboradores}
        isMock={false}
        initialSla={initialSla}
        partnerContributions={partnerContributions}
      />
    </div>
  );
}
