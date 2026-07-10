import { prisma } from "@/lib/prisma";
import { buildLiveSnapshotVersion } from "@/lib/liveSnapshot";
import type { LiveEntityKey, LiveVersions } from "@/lib/liveEntities";
import type { Prisma } from "@prisma/client";

function companyProjectWhere(companyId: string) {
  return { client: { company_id: companyId } };
}

async function fingerprintEnvironments(where: Prisma.EnvironmentWhereInput) {
  const rows = await prisma.environment.findMany({
    where,
    select: {
      id: true,
      status: true,
      responsavel_id: true,
      ajudante_id: true,
    },
    orderBy: { id: "asc" },
  });

  return buildLiveSnapshotVersion(rows);
}

async function fingerprintProjects(companyId: string) {
  const rows = await prisma.project.findMany({
    where: companyProjectWhere(companyId),
    select: {
      id: true,
      status_geral: true,
      updatedAt: true,
      valor_previsto: true,
      ultimo_contato_em: true,
    },
    orderBy: { id: "asc" },
  });

  return buildLiveSnapshotVersion(
    rows.map((row) => ({
      id: row.id,
      status: row.status_geral,
      updatedAt: row.updatedAt.toISOString(),
      valor: Number(row.valor_previsto),
      contato: row.ultimo_contato_em?.toISOString() ?? "",
    }))
  );
}

async function fingerprintInstallments(companyId: string) {
  const rows = await prisma.installment.findMany({
    where: { project: companyProjectWhere(companyId) },
    select: {
      id: true,
      status: true,
      valor: true,
      data_vencimento: true,
      data_pagamento: true,
    },
    orderBy: { id: "asc" },
  });

  return buildLiveSnapshotVersion(
    rows.map((row) => ({
      id: row.id,
      status: row.status,
      valor: Number(row.valor),
      vencimento: row.data_vencimento.toISOString(),
      pagamento: row.data_pagamento?.toISOString() ?? "",
    }))
  );
}

async function fingerprintClients(companyId: string) {
  const rows = await prisma.client.findMany({
    where: { company_id: companyId },
    select: {
      id: true,
      nome: true,
      status: true,
      cidade: true,
      telefone: true,
      createdAt: true,
    },
    orderBy: { id: "asc" },
  });

  return buildLiveSnapshotVersion(
    rows.map((row) => ({
      id: row.id,
      status: row.status,
      nome: row.nome,
      cidade: row.cidade,
      telefone: row.telefone,
      createdAt: row.createdAt.toISOString(),
    }))
  );
}

async function fingerprintTasks(companyId: string) {
  const rows = await prisma.task.findMany({
    where: { project: companyProjectWhere(companyId) },
    select: {
      id: true,
      status: true,
      data: true,
      titulo: true,
      responsavel: true,
    },
    orderBy: { id: "asc" },
  });

  return buildLiveSnapshotVersion(
    rows.map((row) => ({
      id: row.id,
      status: row.status,
      data: row.data.toISOString(),
      titulo: row.titulo,
      responsavel: row.responsavel,
    }))
  );
}

async function fingerprintQuotes(companyId: string) {
  const rows = await prisma.quote.findMany({
    where: { project: companyProjectWhere(companyId) },
    select: {
      id: true,
      valor_final: true,
      validade: true,
      versao: true,
      _count: { select: { items: true } },
    },
    orderBy: { id: "asc" },
  });

  return buildLiveSnapshotVersion(
    rows.map((row) => ({
      id: row.id,
      valor: Number(row.valor_final),
      validade: row.validade.toISOString(),
      versao: row.versao,
      items: row._count.items,
    }))
  );
}

async function fingerprintInventory(companyId: string) {
  const [inventory, suppliers] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { company_id: companyId },
      select: {
        id: true,
        quantidade: true,
        preco_custo: true,
        ativo: true,
        updatedAt: true,
      },
      orderBy: { id: "asc" },
    }),
    prisma.supplier.findMany({
      where: { company_id: companyId },
      select: {
        id: true,
        ativo: true,
        updatedAt: true,
      },
      orderBy: { id: "asc" },
    }),
  ]);

  return buildLiveSnapshotVersion([
    ...inventory.map((row) => ({
      kind: "item",
      id: row.id,
      qtd: row.quantidade,
      preco: Number(row.preco_custo),
      ativo: row.ativo ? 1 : 0,
      updatedAt: row.updatedAt.toISOString(),
    })),
    ...suppliers.map((row) => ({
      kind: "supplier",
      id: row.id,
      ativo: row.ativo ? 1 : 0,
      updatedAt: row.updatedAt.toISOString(),
    })),
  ]);
}

async function fingerprintCatalog(companyId: string) {
  const rows = await prisma.catalogItem.findMany({
    where: { group: { company_id: companyId } },
    select: {
      id: true,
      label: true,
      slug: true,
      ordem: true,
      ativo: true,
      group_id: true,
    },
    orderBy: [{ group_id: "asc" }, { ordem: "asc" }, { id: "asc" }],
  });

  return buildLiveSnapshotVersion(
    rows.map((row) => ({
      id: row.id,
      label: row.label,
      slug: row.slug ?? "",
      ordem: row.ordem,
      ativo: row.ativo,
      group_id: row.group_id,
    }))
  );
}

async function fingerprintPartners(companyId: string) {
  const rows = await prisma.professionalPartner.findMany({
    where: { company_id: companyId },
    select: {
      id: true,
      nome: true,
      ativo: true,
      updatedAt: true,
    },
    orderBy: { id: "asc" },
  });

  return buildLiveSnapshotVersion(
    rows.map((row) => ({
      id: row.id,
      nome: row.nome,
      ativo: row.ativo ? 1 : 0,
      updatedAt: row.updatedAt.toISOString(),
    }))
  );
}

async function fingerprintColaboradores(companyId: string) {
  const rows = await prisma.user.findMany({
    where: { company_id: companyId },
    select: {
      id: true,
      name: true,
      email: true,
      cargo: true,
      createdAt: true,
    },
    orderBy: { id: "asc" },
  });

  return buildLiveSnapshotVersion(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      cargo: row.cargo,
      createdAt: row.createdAt.toISOString(),
    }))
  );
}

async function fingerprintLogistica(companyId: string) {
  const rows = await prisma.project.findMany({
    where: {
      ...companyProjectWhere(companyId),
      status_geral: { in: ["APROVADO", "PRODUCAO", "INSTALACAO", "FINALIZADO"] },
    },
    select: {
      id: true,
      status_geral: true,
      updatedAt: true,
    },
    orderBy: { id: "asc" },
  });

  return buildLiveSnapshotVersion(
    rows.map((row) => ({
      id: row.id,
      status: row.status_geral,
      updatedAt: row.updatedAt.toISOString(),
    }))
  );
}

async function fingerprintSla(companyId: string) {
  const rows = await prisma.projectSlaState.findMany({
    where: { project: companyProjectWhere(companyId) },
    select: {
      project_id: true,
      current_stage: true,
      stage_started_at: true,
      extension_days: true,
      nota_fiscal_emitida: true,
      updatedAt: true,
    },
    orderBy: { project_id: "asc" },
  });

  return buildLiveSnapshotVersion(
    rows.map((row) => ({
      id: row.project_id,
      stage: row.current_stage,
      started: row.stage_started_at.toISOString(),
      extension: row.extension_days,
      nf: row.nota_fiscal_emitida ? 1 : 0,
      updatedAt: row.updatedAt.toISOString(),
    }))
  );
}

async function fingerprintPortal(userId: string) {
  const [tasks, timeCards] = await Promise.all([
    prisma.environment.findMany({
      where: { responsavel_id: userId },
      select: { id: true, status: true },
      orderBy: { id: "asc" },
    }),
    prisma.timeCard.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        data: true,
        entrada: true,
        almoco_in: true,
        almoco_out: true,
        saida: true,
        horas: true,
      },
      orderBy: { data: "desc" },
      take: 14,
    }),
  ]);

  return buildLiveSnapshotVersion([
    ...tasks.map((row) => ({ kind: "task", id: row.id, status: row.status })),
    ...timeCards.map((row) => ({
      kind: "ponto",
      id: row.id,
      data: row.data.toISOString(),
      entrada: row.entrada?.toISOString() ?? "",
      saida: row.saida?.toISOString() ?? "",
      horas: row.horas ? Number(row.horas) : "",
    })),
  ]);
}

async function fingerprintWorkspace(userId: string, companyId: string) {
  const [notes, reminders] = await Promise.all([
    prisma.operatorNote.findMany({
      where: { user_id: userId, company_id: companyId },
      select: { id: true, pinned: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.operatorReminder.findMany({
      where: { user_id: userId, company_id: companyId },
      select: { id: true, done: true, due_at: true, updatedAt: true },
      orderBy: { due_at: "asc" },
    }),
  ]);

  return buildLiveSnapshotVersion([
    ...notes.map((row) => ({
      kind: "note",
      id: row.id,
      pinned: row.pinned ? 1 : 0,
      updatedAt: row.updatedAt.toISOString(),
    })),
    ...reminders.map((row) => ({
      kind: "reminder",
      id: row.id,
      done: row.done ? 1 : 0,
      due: row.due_at.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
  ]);
}

/** Versões leves por domínio — usadas pelo SSE para detectar mudanças. */
export async function getCompanyLiveVersions(
  companyId: string,
  userId?: string
): Promise<LiveVersions> {
  const projectWhere = companyProjectWhere(companyId);

  const [
    crmProjects,
    crmTimeline,
    factoryEnvs,
    factorySla,
    agendaTasks,
    quotes,
    projects,
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
        OR: [
          { files: { some: { aprovado_producao: true } } },
          { status_geral: "PRODUCAO" },
        ],
      },
    }),
    fingerprintSla(companyId),
    fingerprintTasks(companyId),
    fingerprintQuotes(companyId),
    fingerprintProjects(companyId),
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
    crm: `${crmProjects}|${crmTimeline}`,
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
    bi: `${crmProjects}|${parceiros}`,
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
