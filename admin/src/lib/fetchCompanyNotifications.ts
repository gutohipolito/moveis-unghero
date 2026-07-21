import { prisma, isDatabaseOffline } from "@/lib/prisma";
import {
  buildFollowUpNotifications,
  buildInvoiceNotifications,
  buildSlaNotifications,
  buildBriefingNotifications,
  buildSupplyTicketNotifications,
  mergeNotifications,
  type AppNotification,
} from "@/lib/notifications";
import { buildInstallmentDueNotifications } from "@/lib/installmentDueAlerts";
import { getSlaAlertProjects, getInvoicePendingProjects } from "@/app/actions/productionSla";

const NOTIF_TTL_MS = 30_000;
type NotifCacheEntry = { at: number; data: AppNotification[] };
const notifCache = new Map<string, NotifCacheEntry>();

/** Invalida o cache de notificações de uma empresa (após mudanças relevantes). */
export function invalidateCompanyNotifications(companyId?: string) {
  if (companyId) {
    for (const key of notifCache.keys()) {
      if (key.startsWith(`${companyId}:`)) notifCache.delete(key);
    }
  } else {
    notifCache.clear();
  }
}

export async function fetchCompanyNotifications(
  companyId: string,
  viewerRole?: string
): Promise<AppNotification[]> {
  if (isDatabaseOffline()) {
    return [];
  }

  // As notificações são derivadas (follow-up, SLA, parcelas) e não precisam ser
  // recalculadas a cada navegação. Um TTL curto evita ~6 consultas por página,
  // enquanto o live-sync mantém o cliente atualizado.
  const cacheKey = `${companyId}:${viewerRole ?? ""}`;
  const cached = notifCache.get(cacheKey);
  if (cached && Date.now() - cached.at < NOTIF_TTL_MS) {
    return cached.data;
  }

  // Chamados de insumos são direcionados à Diretoria (ADMIN).
  const supplyTickets =
    viewerRole === "ADMIN"
      ? await prisma.supplyTicket
          .findMany({
            where: {
              company_id: companyId,
              status: { in: ["ABERTO", "EM_ANDAMENTO"] },
            },
            select: {
              id: true,
              titulo: true,
              prioridade: true,
              createdAt: true,
              requester: { select: { name: true } },
            },
            orderBy: { createdAt: "desc" },
          })
          .catch(() => [])
      : [];

  const [projects, slaAlerts, invoicePending, briefings, pendingInstallments] =
    await Promise.all([
      prisma.project.findMany({
        where: {
          status_geral: { in: ["LEAD", "ORCAMENTO", "NEGOCIACAO"] },
          client: { company_id: companyId },
        },
        select: {
          id: true,
          status_geral: true,
          ultimo_contato_em: true,
          createdAt: true,
          client: { select: { nome: true } },
        },
      }),
      getSlaAlertProjects(companyId),
      getInvoicePendingProjects(companyId),
      prisma.leadBriefing.findMany({
        where: {
          project: {
            status_geral: "LEAD",
            client: { company_id: companyId },
          },
        },
        include: {
          project: {
            include: {
              client: { select: { nome: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.installment.findMany({
        where: {
          status: { in: ["PENDENTE", "ATRASADO"] },
          project: { client: { company_id: companyId } },
        },
        include: {
          project: {
            include: { client: { select: { id: true, nome: true } } },
          },
        },
        orderBy: { data_vencimento: "asc" },
      }),
    ]);

  const followUp = buildFollowUpNotifications(
    projects.map((p) => ({
      id: p.id,
      status_geral: p.status_geral,
      ultimo_contato_em: p.ultimo_contato_em,
      createdAt: p.createdAt,
      client: p.client,
    }))
  );

  const slaNotifications = buildSlaNotifications(
    slaAlerts.map((s) => ({
      ...s,
      clientName: s.clientName ?? "Projeto",
    }))
  );

  const invoiceNotifications = buildInvoiceNotifications(
    invoicePending.map((p) => ({ id: p.id, client: p.client }))
  );

  const briefingNotifications = buildBriefingNotifications(briefings);

  const installmentNotifications = buildInstallmentDueNotifications(
    pendingInstallments.map((inst) => ({
      id: inst.id,
      valor: Number(inst.valor),
      data_vencimento: inst.data_vencimento,
      status: inst.status,
      metodo_pagamento: inst.metodo_pagamento,
      numero_parcela: inst.numero_parcela,
      total_parcelas: inst.total_parcelas,
      project: {
        id: inst.project.id,
        client: inst.project.client,
      },
    }))
  );

  const supplyNotifications = buildSupplyTicketNotifications(
    supplyTickets.map((t) => ({
      id: t.id,
      titulo: t.titulo,
      prioridade: t.prioridade,
      requesterName: t.requester?.name ?? "Colaborador",
      createdAt: t.createdAt,
    }))
  );

  const merged = mergeNotifications(
    followUp,
    slaNotifications,
    invoiceNotifications,
    briefingNotifications,
    installmentNotifications,
    supplyNotifications
  );

  notifCache.set(cacheKey, { at: Date.now(), data: merged });
  return merged;
}
