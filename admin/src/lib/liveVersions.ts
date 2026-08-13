import { prisma } from "@/lib/prisma";
import type { LiveEntityKey, LiveVersions } from "@/lib/liveEntities";
import type { Prisma } from "@prisma/client";

function companyProjectWhere(companyId: string) {
  return { client: { company_id: companyId } };
}

/** Versão leve: count + max(updatedAt). Detecta qualquer write sem varrer linhas. */
function versionFromAgg(agg: {
  _count: number | { _all?: number } | true;
  _max: { updatedAt: Date | null };
}) {
  const count =
    typeof agg._count === "number"
      ? agg._count
      : typeof agg._count === "object" && agg._count && "_all" in agg._count
        ? Number(agg._count._all ?? 0)
        : 0;
  return `${count}:${agg._max.updatedAt?.toISOString() ?? ""}`;
}

async function fingerprintProjects(companyId: string) {
  const agg = await prisma.project.aggregate({
    where: companyProjectWhere(companyId),
    _count: true,
    _max: { updatedAt: true },
  });
  return versionFromAgg(agg);
}

async function fingerprintEnvironments(where: Prisma.EnvironmentWhereInput) {
  const agg = await prisma.environment.aggregate({
    where,
    _count: true,
    _max: { updatedAt: true },
  });
  return versionFromAgg(agg);
}

async function fingerprintInstallments(companyId: string) {
  const agg = await prisma.installment.aggregate({
    where: { project: companyProjectWhere(companyId) },
    _count: true,
    _max: { updatedAt: true },
  });
  return versionFromAgg(agg);
}

async function fingerprintClients(companyId: string) {
  const agg = await prisma.client.aggregate({
    where: { company_id: companyId },
    _count: true,
    _max: { updatedAt: true },
  });
  return versionFromAgg(agg);
}

async function fingerprintTasks(companyId: string) {
  const agg = await prisma.task.aggregate({
    where: { project: companyProjectWhere(companyId) },
    _count: true,
    _max: { updatedAt: true },
  });
  return versionFromAgg(agg);
}

async function fingerprintQuotes(companyId: string) {
  const projectWhere = companyProjectWhere(companyId);
  const [quotes, items] = await Promise.all([
    prisma.quote.aggregate({
      where: { project: projectWhere },
      _count: true,
      _max: { updatedAt: true },
      _sum: { valor_final: true },
    }),
    // Itens cobrem aprovação parcial / revisão de preço mesmo quando o Quote não é tocado.
    prisma.quoteItem.groupBy({
      by: ["status"],
      where: { quote: { project: projectWhere } },
      _count: { _all: true },
      _sum: { valor_total: true },
    }),
  ]);

  const itemsSig = items
    .map(
      (row) =>
        `${row.status}:${row._count._all}:${Number(row._sum.valor_total ?? 0)}`
    )
    .sort()
    .join(",");

  return `${versionFromAgg(quotes)}:${Number(quotes._sum.valor_final ?? 0)}|${itemsSig}`;
}

async function fingerprintInventory(companyId: string) {
  const [inventory, suppliers] = await Promise.all([
    prisma.inventoryItem.aggregate({
      where: { company_id: companyId },
      _count: true,
      _max: { updatedAt: true },
    }),
    prisma.supplier.aggregate({
      where: { company_id: companyId },
      _count: true,
      _max: { updatedAt: true },
    }),
  ]);

  return `i:${versionFromAgg(inventory)}|s:${versionFromAgg(suppliers)}`;
}

async function fingerprintCatalog(companyId: string) {
  const agg = await prisma.catalogItem.aggregate({
    where: { group: { company_id: companyId } },
    _count: true,
    _max: { updatedAt: true },
  });
  return versionFromAgg(agg);
}

async function fingerprintPartners(companyId: string) {
  const [agg, timeline] = await Promise.all([
    prisma.professionalPartner.aggregate({
      where: { company_id: companyId },
      _count: true,
      _max: { updatedAt: true },
    }),
    prisma.partnerTimeline.aggregate({
      where: { partner: { company_id: companyId } },
      _count: true,
      _max: { data: true },
    }),
  ]);
  return `${versionFromAgg(agg)}|${timeline._count}:${timeline._max.data?.toISOString() ?? ""}`;
}

async function fingerprintColaboradores(companyId: string) {
  const agg = await prisma.user.aggregate({
    where: { company_id: companyId },
    _count: true,
    _max: { updatedAt: true },
  });
  return versionFromAgg(agg);
}

async function fingerprintLogistica(companyId: string) {
  const agg = await prisma.project.aggregate({
    where: {
      ...companyProjectWhere(companyId),
      status_geral: { in: ["APROVADO", "PRODUCAO", "INSTALACAO", "FINALIZADO"] },
    },
    _count: true,
    _max: { updatedAt: true },
  });
  return versionFromAgg(agg);
}

async function fingerprintSla(companyId: string) {
  const agg = await prisma.projectSlaState.aggregate({
    where: { project: companyProjectWhere(companyId) },
    _count: true,
    _max: { updatedAt: true },
  });
  return versionFromAgg(agg);
}

async function fingerprintPortal(userId: string) {
  const [envs, timeCards] = await Promise.all([
    prisma.environment.aggregate({
      where: { responsavel_id: userId },
      _count: true,
      _max: { updatedAt: true },
    }),
    prisma.timeCard.aggregate({
      where: { user_id: userId },
      _count: true,
      _max: { data: true },
    }),
  ]);

  return `e:${versionFromAgg(envs)}|t:${timeCards._count}:${timeCards._max.data?.toISOString() ?? ""}`;
}

async function fingerprintWorkspace(userId: string, companyId: string) {
  const [notes, reminders] = await Promise.all([
    prisma.operatorNote.aggregate({
      where: { user_id: userId, company_id: companyId },
      _count: true,
      _max: { updatedAt: true },
    }),
    prisma.operatorReminder.aggregate({
      where: { user_id: userId, company_id: companyId },
      _count: true,
      _max: { updatedAt: true },
    }),
  ]);

  return `n:${versionFromAgg(notes)}|r:${versionFromAgg(reminders)}`;
}

/** Versões leves por domínio — agregados (count + max updatedAt), sem varrer linhas. */
export async function getCompanyLiveVersions(
  companyId: string,
  userId?: string
): Promise<LiveVersions> {
  const projectWhere = companyProjectWhere(companyId);

  const [
    projects,
    crmTimeline,
    factoryEnvs,
    factorySla,
    agendaTasks,
    quotes,
    clients,
    financeiro,
    logistica,
    estoque,
    cadastros,
    parceiros,
    colaboradores,
    portal,
    workspace,
  ] = await Promise.all([
    fingerprintProjects(companyId),
    prisma.timeline
      .aggregate({
        where: { project: projectWhere },
        _count: true,
        _max: { data: true },
      })
      .then((agg) => `${agg._count}:${agg._max.data?.toISOString() ?? ""}`),
    fingerprintEnvironments({
      project: {
        ...projectWhere,
        status_geral: { in: ["PRODUCAO", "INSTALACAO"] },
      },
    }),
    fingerprintSla(companyId),
    fingerprintTasks(companyId),
    fingerprintQuotes(companyId),
    fingerprintClients(companyId),
    fingerprintInstallments(companyId),
    fingerprintLogistica(companyId),
    fingerprintInventory(companyId),
    fingerprintCatalog(companyId),
    fingerprintPartners(companyId),
    fingerprintColaboradores(companyId),
    userId ? fingerprintPortal(userId) : "0",
    userId ? fingerprintWorkspace(userId, companyId) : "0",
  ]);

  const versions: LiveVersions = {
    crm: `${projects}|${crmTimeline}`,
    factory: `${factoryEnvs}|${factorySla}`,
    agenda: agendaTasks,
    quotes,
    projects,
    clients,
    financeiro,
    logistica,
    estoque,
    cadastros,
    parceiros,
    colaboradores,
    bi: `${projects}|${parceiros}`,
    portal,
    workspace,
  };

  return versions;
}

export function getChangedLiveEntities(
  previous: Partial<LiveVersions>,
  next: LiveVersions
): LiveEntityKey[] {
  return (Object.keys(next) as LiveEntityKey[]).filter(
    (entity) => previous[entity] !== next[entity]
  );
}
