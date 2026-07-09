import { getColaboradores } from "@/app/actions/colaboradores";
import { ensureProjectSla, getProjectSla } from "@/app/actions/productionSla";
import { prisma } from "@/lib/prisma";
import { getSessionCompanyId } from "@/lib/session";
import { formatProjectDetails, projectInclude } from "@/lib/formatProjectDetails";
import { notFound } from "next/navigation";
import ProjectDetails from "@/components/ProjectDetails";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: RouteParams) {
  const { id } = await params;
  const userCompanyId = await getSessionCompanyId();

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

  const hasProductionApproval = formattedProject.files.some((f) => f.aprovado_producao);
  let initialSla = null;
  if (hasProductionApproval) {
    await ensureProjectSla(id);
    initialSla = await getProjectSla(id);
  }

  return (
    <div className="space-y-6">
      <ProjectDetails
        initialProject={formattedProject as any}
        companyId={userCompanyId}
        colaboradores={colaboradores}
        isMock={false}
        initialSla={initialSla}
      />
    </div>
  );
}
