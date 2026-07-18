"use server";

import { getClients, getClientDetailsAction } from "@/app/actions/cliente";
import { getColaboradores } from "@/app/actions/colaboradores";
import { getCatalogGroups, getCatalogItemsBySlug } from "@/app/actions/cadastros";
import { getParceiros } from "@/app/actions/parceiros";
import { getInventoryAndSuppliers } from "@/app/actions/estoque";
import { getQuotes } from "@/app/actions/quotes";
import { getProjectDetailsAction } from "@/app/actions/project";
import {
  getOperatorNotesForUser,
  getOperatorRemindersForUser,
} from "@/app/actions/operatorWorkspace";
import { getMyTimeCards, getColaboradorMetrics } from "@/app/actions/ponto";
import { getAuthContext } from "@/lib/auth-guard";
import { fetchCrmProjects } from "@/lib/crmProjects";
import { fetchAgendaEvents, fetchFactoryBoard } from "@/lib/factoryBoard";
import { buildLiveSnapshotVersion } from "@/lib/liveSnapshot";
import { prisma } from "@/lib/prisma";

async function assertCompanyAccess(companyId: string) {
  const auth = await getAuthContext();
  if (!auth || auth.companyId !== companyId) {
    return null;
  }
  return auth;
}

export async function getCrmLiveSnapshot(companyId: string) {
  const auth = await assertCompanyAccess(companyId);
  if (!auth) return { success: false as const, error: "Não autenticado" };

  try {
    const projects = await fetchCrmProjects(auth.companyId);
    const version = buildLiveSnapshotVersion(
      projects.map((project) => ({
        id: project.id,
        status: project.status_geral,
        updatedAt: project.updatedAt ?? "",
      }))
    );
    return { success: true as const, projects, version };
  } catch (error) {
    console.warn("Falha ao sincronizar CRM:", error);
    return { success: false as const, error: "Não foi possível sincronizar o funil." };
  }
}

export async function getFactoryLiveSnapshot(companyId: string) {
  const auth = await assertCompanyAccess(companyId);
  if (!auth) return { success: false as const, error: "Não autenticado" };

  try {
    const snapshot = await fetchFactoryBoard(auth.companyId);
    return { success: true as const, ...snapshot };
  } catch (error) {
    console.warn("Falha ao sincronizar fábrica:", error);
    return { success: false as const, error: "Não foi possível sincronizar a fábrica." };
  }
}

export async function getAgendaLiveSnapshot(companyId: string) {
  const auth = await assertCompanyAccess(companyId);
  if (!auth) return { success: false as const, error: "Não autenticado" };

  try {
    const snapshot = await fetchAgendaEvents(auth.companyId);
    return { success: true as const, ...snapshot };
  } catch (error) {
    console.warn("Falha ao sincronizar agenda:", error);
    return { success: false as const, error: "Não foi possível sincronizar a agenda." };
  }
}

export async function getQuotesLiveSnapshot() {
  const auth = await getAuthContext();
  if (!auth) return { success: false as const, error: "Não autenticado" };

  try {
    const result = await getQuotes();
    if (!result.success) return { success: false as const, error: result.error };
    const version = buildLiveSnapshotVersion(
      (result.data || []).map((quote) => ({
        id: quote.id,
        valor: quote.valor_final,
        validade: String(quote.validade),
      }))
    );
    return { success: true as const, quotes: result.data, version };
  } catch (error) {
    console.warn("Falha ao sincronizar orçamentos:", error);
    return { success: false as const, error: "Não foi possível sincronizar orçamentos." };
  }
}

export async function getClientsLiveSnapshot(companyId: string) {
  const auth = await assertCompanyAccess(companyId);
  if (!auth) return { success: false as const, error: "Não autenticado" };

  try {
    const result = await getClients(auth.companyId);
    if (!result.success) return { success: false as const, error: result.error };
    const version = buildLiveSnapshotVersion(
      result.clients.map((client) => ({
        id: client.id,
        status: client.status,
        nome: client.nome,
      }))
    );
    return { success: true as const, clients: result.clients, version };
  } catch (error) {
    console.warn("Falha ao sincronizar clientes:", error);
    return { success: false as const, error: "Não foi possível sincronizar clientes." };
  }
}

export async function getFinanceiroLiveSnapshot(companyId: string) {
  const auth = await assertCompanyAccess(companyId);
  if (!auth) return { success: false as const, error: "Não autenticado" };

  try {
    const installments = await prisma.installment.findMany({
      where: { project: { client: { company_id: auth.companyId } } },
      include: { project: { include: { client: true } } },
      orderBy: { data_vencimento: "asc" },
    });

    const formatted = installments.map((ins) => ({
      id: ins.id,
      valor: Number(ins.valor),
      data_vencimento: ins.data_vencimento.toISOString(),
      data_pagamento: ins.data_pagamento ? ins.data_pagamento.toISOString() : null,
      status: ins.status,
      tipo: ins.tipo,
      metodo_pagamento: ins.metodo_pagamento,
      numero_parcela: ins.numero_parcela,
      total_parcelas: ins.total_parcelas,
      projectId: ins.project.id,
      clientName: ins.project.client.nome,
    }));

    const version = buildLiveSnapshotVersion(
      formatted.map((item) => ({ id: item.id, status: item.status, valor: item.valor }))
    );

    return { success: true as const, installments: formatted, version };
  } catch (error) {
    console.warn("Falha ao sincronizar financeiro:", error);
    return { success: false as const, error: "Não foi possível sincronizar financeiro." };
  }
}

export async function getLogisticaLiveSnapshot(companyId: string) {
  const auth = await assertCompanyAccess(companyId);
  if (!auth) return { success: false as const, error: "Não autenticado" };

  try {
    const [projects, veiculosRes] = await Promise.all([
      prisma.project.findMany({
        where: {
          status_geral: { in: ["APROVADO", "PRODUCAO", "INSTALACAO", "FINALIZADO"] },
          client: { company_id: auth.companyId },
        },
        include: { client: true },
      }),
      getCatalogItemsBySlug(auth.companyId, "veiculos"),
    ]);

    const formattedProjects = projects.map((project) => ({
      id: project.id,
      valor_previsto: Number(project.valor_previsto),
      status_geral: project.status_geral,
      client: {
        id: project.client.id,
        nome: project.client.nome,
        cidade: project.client.cidade,
        telefone: project.client.telefone,
        email: project.client.email,
        observacoes: project.client.observacoes,
      },
    }));

    const veiculos = veiculosRes.items.map((item) => ({
      id: item.id,
      label: item.label,
    }));

    const version = buildLiveSnapshotVersion([
      ...formattedProjects.map((project) => ({
        kind: "project",
        id: project.id,
        status: project.status_geral,
      })),
      ...veiculos.map((veiculo) => ({ kind: "veiculo", id: veiculo.id, label: veiculo.label })),
    ]);

    return { success: true as const, projects: formattedProjects, veiculos, version };
  } catch (error) {
    console.warn("Falha ao sincronizar logística:", error);
    return { success: false as const, error: "Não foi possível sincronizar logística." };
  }
}

export async function getEstoqueLiveSnapshot(companyId: string) {
  const auth = await assertCompanyAccess(companyId);
  if (!auth) return { success: false as const, error: "Não autenticado" };

  try {
    const [{ suppliers, inventory }, categoriasRes] = await Promise.all([
      getInventoryAndSuppliers(auth.companyId),
      getCatalogItemsBySlug(auth.companyId, "categorias_estoque"),
    ]);

    const categoryOptions = categoriasRes.items.map((item) => ({
      value: item.slug || item.label,
      label: item.label,
    }));

    const version = buildLiveSnapshotVersion([
      ...inventory.map((item) => ({ kind: "item", id: item.id, qtd: item.quantidade })),
      ...suppliers.map((supplier) => ({ kind: "supplier", id: supplier.id, nome: supplier.nome })),
    ]);

    return {
      success: true as const,
      suppliers,
      inventory,
      categoryOptions,
      version,
    };
  } catch (error) {
    console.warn("Falha ao sincronizar estoque:", error);
    return { success: false as const, error: "Não foi possível sincronizar estoque." };
  }
}

export async function getCadastrosLiveSnapshot(companyId: string) {
  const auth = await assertCompanyAccess(companyId);
  if (!auth) return { success: false as const, error: "Não autenticado" };

  try {
    const result = await getCatalogGroups(auth.companyId);
    const groups = result.groups ?? [];
    const version = buildLiveSnapshotVersion(
      groups.flatMap((group) =>
        group.items.map((item) => ({
          id: item.id,
          label: item.label,
          ativo: item.ativo ? 1 : 0,
        }))
      )
    );
    return { success: true as const, groups, version };
  } catch (error) {
    console.warn("Falha ao sincronizar cadastros:", error);
    return { success: false as const, error: "Não foi possível sincronizar cadastros." };
  }
}

export async function getParceirosLiveSnapshot(companyId: string) {
  const auth = await assertCompanyAccess(companyId);
  if (!auth) return { success: false as const, error: "Não autenticado" };

  try {
    const result = await getParceiros(auth.companyId);
    const parceiros = result.parceiros.map((parceiro) => ({
      ...parceiro,
      createdAt: new Date(parceiro.createdAt),
    }));
    const version = buildLiveSnapshotVersion(
      parceiros.map((parceiro) => ({
        id: parceiro.id,
        nome: parceiro.nome,
        ativo: parceiro.ativo ? 1 : 0,
      }))
    );
    return { success: true as const, parceiros, version };
  } catch (error) {
    console.warn("Falha ao sincronizar parceiros:", error);
    return { success: false as const, error: "Não foi possível sincronizar parceiros." };
  }
}

export async function getColaboradoresLiveSnapshot(companyId: string) {
  const auth = await assertCompanyAccess(companyId);
  if (!auth) return { success: false as const, error: "Não autenticado" };

  try {
    const result = await getColaboradores(auth.companyId);
    const colaboradores =
      result.success && result.colaboradores
        ? result.colaboradores.map((colaborador: { id: string; name: string; email: string; cargo: string; createdAt: Date }) => ({
            id: colaborador.id,
            name: colaborador.name,
            email: colaborador.email,
            cargo: colaborador.cargo,
            createdAt: colaborador.createdAt,
          }))
        : [];

    const version = buildLiveSnapshotVersion(
      colaboradores.map((colaborador) => ({
        id: colaborador.id,
        email: colaborador.email,
        cargo: colaborador.cargo,
      }))
    );

    return { success: true as const, colaboradores, version };
  } catch (error) {
    console.warn("Falha ao sincronizar colaboradores:", error);
    return { success: false as const, error: "Não foi possível sincronizar colaboradores." };
  }
}

export async function getBiLiveSnapshot(companyId: string) {
  const auth = await assertCompanyAccess(companyId);
  if (!auth) return { success: false as const, error: "Não autenticado" };

  try {
    const projects = await prisma.project.findMany({
      where: { client: { company_id: auth.companyId } },
      select: {
        id: true,
        valor_previsto: true,
        status_geral: true,
        partner_id: true,
        partner: {
          select: {
            id: true,
            nome: true,
            cidade: true,
            tipo: true,
          },
        },
        client: {
          select: {
            id: true,
            nome: true,
            cidade: true,
            origem: true,
            telefone: true,
            email: true,
          },
        },
      },
    });

    const formattedProjects = projects.map((project) => ({
      id: project.id,
      valor_previsto: Number(project.valor_previsto),
      status_geral: project.status_geral,
      partner_id: project.partner_id,
      partner: project.partner,
      client: project.client,
    }));

    const quotes = await prisma.quote.findMany({
      where: { project: { client: { company_id: auth.companyId } } },
      select: {
        id: true,
        valor_final: true,
        validade: true,
        aprovado_em: true,
      },
    });

    const formattedQuotes = quotes.map((q) => ({
      id: q.id,
      valor_final: Number(q.valor_final),
      validade: q.validade.toISOString(),
      aprovado_em: q.aprovado_em ? q.aprovado_em.toISOString() : null,
    }));

    const version = buildLiveSnapshotVersion([
      ...formattedProjects.map((project) => ({
        kind: "project",
        id: project.id,
        status: project.status_geral,
        valor: project.valor_previsto,
        partner_id: project.partner_id,
      })),
      ...formattedQuotes.map((quote) => ({
        kind: "quote",
        id: quote.id,
        valor: quote.valor_final,
        validade: quote.validade,
        aprovado_em: quote.aprovado_em,
      })),
    ]);

    return {
      success: true as const,
      projects: formattedProjects,
      quotes: formattedQuotes,
      version,
    };
  } catch (error) {
    console.warn("Falha ao sincronizar BI:", error);
    return { success: false as const, error: "Não foi possível sincronizar relatórios." };
  }
}

export async function getClientDetailsLiveSnapshot(clientId: string) {
  const auth = await getAuthContext();
  if (!auth) return { success: false as const, error: "Não autenticado" };

  try {
    const result = await getClientDetailsAction(clientId);
    if (!result.success || !result.client) {
      return { success: false as const, error: result.error || "Cliente não encontrado" };
    }

    const version = buildLiveSnapshotVersion([
      { id: result.client.id, status: result.client.status, nome: result.client.nome },
      ...(result.activities || []).map((activity) => ({
        kind: "activity",
        id: activity.id,
        data: activity.data,
      })),
      ...(result.payments || []).map((payment) => ({
        kind: "payment",
        id: payment.id,
        status: payment.status,
      })),
      ...(result.attachments || []).map((attachment) => ({
        kind: "attachment",
        id: attachment.id,
        nome: attachment.nome,
      })),
    ]);

    return {
      success: true as const,
      client: result.client,
      activities: result.activities,
      payments: result.payments,
      attachments: result.attachments ?? [],
      version,
    };
  } catch (error) {
    console.warn("Falha ao sincronizar cliente:", error);
    return { success: false as const, error: "Não foi possível sincronizar cliente." };
  }
}

export async function getPortalLiveSnapshot(userId: string) {
  const auth = await getAuthContext();
  if (!auth || auth.userId !== userId) {
    return { success: false as const, error: "Não autenticado" };
  }

  try {
    const [dbTasks, pontoRes, metricsRes] = await Promise.all([
      prisma.environment.findMany({
        where: { responsavel_id: userId },
        include: { project: { include: { client: true } } },
      }),
      getMyTimeCards(userId),
      getColaboradorMetrics(userId),
    ]);

    const tasks = dbTasks.map((task) => ({
      id: task.id,
      nome: task.nome,
      tipo: task.tipo,
      status: task.status,
      projectId: task.project.id,
      clientName: task.project.client.nome,
    }));

    const timeCards = pontoRes.success && pontoRes.cards ? pontoRes.cards : [];
    const metrics =
      metricsRes.success && metricsRes.metrics
        ? metricsRes.metrics
        : { ativos: 0, finalizadosSemana: 0, totalGeral: 0, metaSemanal: 6 };

    const version = buildLiveSnapshotVersion([
      ...tasks.map((task) => ({ kind: "task", id: task.id, status: task.status })),
      ...timeCards.map((card) => ({
        kind: "ponto",
        id: card.id,
        data: card.data.toISOString(),
        saida: card.saida?.toISOString() ?? "",
      })),
      { ativos: metrics.ativos, finalizados: metrics.finalizadosSemana },
    ]);

    return { success: true as const, tasks, timeCards, metrics, version };
  } catch (error) {
    console.warn("Falha ao sincronizar portal:", error);
    return { success: false as const, error: "Não foi possível sincronizar portal." };
  }
}

export async function getWorkspaceLiveSnapshot(companyId: string) {
  const auth = await assertCompanyAccess(companyId);
  if (!auth) return { success: false as const, error: "Não autenticado" };

  try {
    const [notesRes, remindersRes] = await Promise.all([
      getOperatorNotesForUser(auth.userId, auth.companyId),
      getOperatorRemindersForUser(auth.userId, auth.companyId),
    ]);

    const version = buildLiveSnapshotVersion([
      ...notesRes.notes.map((note) => ({
        kind: "note",
        id: note.id,
        pinned: note.pinned ? 1 : 0,
        updatedAt: note.updatedAt,
      })),
      ...remindersRes.reminders.map((reminder) => ({
        kind: "reminder",
        id: reminder.id,
        done: reminder.done ? 1 : 0,
        due: reminder.dueAt,
      })),
    ]);

    return {
      success: true as const,
      notes: notesRes.notes,
      reminders: remindersRes.reminders,
      version,
    };
  } catch (error) {
    console.warn("Falha ao sincronizar workspace:", error);
    return { success: false as const, error: "Não foi possível sincronizar notas/lembretes." };
  }
}

export async function getProjectLiveSnapshot(projectId: string) {
  const auth = await getAuthContext();
  if (!auth) return { success: false as const, error: "Não autenticado" };

  try {
    const result = await getProjectDetailsAction(projectId);
    if (!result.success || !result.project) {
      return { success: false as const, error: result.error || "Projeto não encontrado" };
    }

    return {
      success: true as const,
      project: result.project,
      sla: result.sla ?? null,
    };
  } catch (error) {
    console.warn("Falha ao sincronizar projeto:", error);
    return { success: false as const, error: "Não foi possível sincronizar projeto." };
  }
}
