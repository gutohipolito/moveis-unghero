import PageHeader from "@/components/PageHeader";
import { guardModule } from "@/lib/moduleAccess";
import { getAuthContext } from "@/lib/auth-guard";
import { getSessionCompanyId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { labelProjectStatus } from "@/lib/navLabels";
import { listSupplyTickets } from "@/app/actions/chamados";
import ChamadosClient, { type ChamadoProjectOption } from "./ChamadosClient";

export default async function ChamadosPage() {
  await guardModule("chamados");

  const auth = await getAuthContext();
  const companyId = await getSessionCompanyId();

  const [{ tickets }, projects] = await Promise.all([
    listSupplyTickets(),
    prisma.project
      .findMany({
        where: {
          client: { company_id: companyId },
          status_geral: { notIn: ["FINALIZADO", "PERDIDO"] },
        },
        select: {
          id: true,
          status_geral: true,
          client: { select: { nome: true } },
        },
        orderBy: { createdAt: "desc" },
      })
      .catch(() => []),
  ]);

  const projectOptions: ChamadoProjectOption[] = projects.map((p) => ({
    id: p.id,
    label: `${p.client.nome} · ${labelProjectStatus(p.status_geral)}`,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chamados de Insumos"
        description="Abra chamados sobre falta de insumos. As solicitações são encaminhadas à Diretoria para resolução."
      />
      <ChamadosClient
        initialTickets={tickets}
        projects={projectOptions}
        isAdmin={auth?.cargo === "ADMIN"}
        currentUserId={auth?.userId ?? ""}
      />
    </div>
  );
}
