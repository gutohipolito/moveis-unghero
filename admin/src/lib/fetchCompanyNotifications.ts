import { prisma, isDatabaseOffline } from "@/lib/prisma";
import {
  buildInvoiceNotifications,
  buildSlaNotifications,
  buildBriefingNotifications,
  buildSupplyTicketNotifications,
  buildQuoteExpiringNotifications,
  buildCardNoteNotifications,
  mergeNotifications,
  type AppNotification,
} from "@/lib/notifications";
import { buildInstallmentDueNotifications } from "@/lib/installmentDueAlerts";
import { getSlaAlertProjects, getInvoicePendingProjects } from "@/app/actions/productionSla";
import { isOpsLimitedRole } from "@/lib/permissions";
import type { Role } from "@prisma/client";

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

  // Notificações derivadas (SLA, parcelas, vencimento de proposta, etc.).
  // Follow-up comercial (proposta parada / lead sem orçamento) ficou de fora
  // do sino de propósito — evita ruído e o operador ignorar o que importa.
  // TTL curto evita várias consultas por navegação; live-sync atualiza o cliente.
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

  const commercialStatuses = ["LEAD", "ORCAMENTO", "NEGOCIACAO", "CONFERENCIA_TECNICA"] as const;
  const expiringUntil = new Date();
  expiringUntil.setHours(23, 59, 59, 999);
  expiringUntil.setDate(expiringUntil.getDate() + 2);

  const [
    slaAlerts,
    invoicePending,
    briefings,
    pendingInstallments,
    expiringQuotes,
  ] = await Promise.all([
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
    prisma.quote.findMany({
      where: {
        aprovado_em: null,
        validade: { lte: expiringUntil },
        project: {
          status_geral: { in: [...commercialStatuses] },
          client: { company_id: companyId },
        },
        items: { some: { status: "PENDENTE" } },
      },
      select: {
        id: true,
        project_id: true,
        codigo: true,
        validade: true,
        project: { select: { client: { select: { nome: true } } } },
        _count: { select: { items: { where: { status: "PENDENTE" } } } },
      },
      orderBy: { validade: "asc" },
      take: 40,
    }),
  ]);

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

  const quoteExpiringNotifications = buildQuoteExpiringNotifications(
    expiringQuotes.map((q) => ({
      id: q.id,
      project_id: q.project_id,
      codigo: q.codigo,
      validade: q.validade,
      clientName: q.project.client.nome,
      pendingCount: q._count.items,
    }))
  );

  const merged = mergeNotifications(
    slaNotifications,
    invoiceNotifications,
    briefingNotifications,
    installmentNotifications,
    supplyNotifications,
    quoteExpiringNotifications
  );

  notifCache.set(cacheKey, { at: Date.now(), data: merged });
  return merged;
}

/** Observações de card não lidas — por usuário (fora do cache compartilhado). */
export async function fetchUnreadCardNoteNotifications(
  companyId: string,
  userId: string,
  viewerRole?: Role | string
): Promise<AppNotification[]> {
  if (isDatabaseOffline()) return [];
  if (viewerRole && isOpsLimitedRole(viewerRole as Role)) return [];
  if (viewerRole === "VIEWER") return [];

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const projects = await prisma.project.findMany({
    where: {
      client: { company_id: companyId },
      obs_updated_at: { not: null, gte: since },
      OR: [
        { obs_updated_by_id: null },
        { obs_updated_by_id: { not: userId } },
      ],
      status_geral: {
        in: ["LEAD", "ORCAMENTO", "NEGOCIACAO", "APROVADO", "CONFERENCIA_TECNICA"],
      },
    },
    select: {
      id: true,
      obs_updated_at: true,
      obs_updated_by_name: true,
      client: { select: { nome: true } },
      noteReads: {
        where: { user_id: userId },
        select: { seen_at: true },
        take: 1,
      },
    },
    orderBy: { obs_updated_at: "desc" },
    take: 40,
  });

  const unread = projects.filter((p) => {
    if (!p.obs_updated_at) return false;
    const seenAt = p.noteReads[0]?.seen_at;
    return !seenAt || seenAt < p.obs_updated_at;
  });

  return buildCardNoteNotifications(
    unread.map((p) => ({
      id: p.id,
      clientName: p.client.nome,
      obs_updated_at: p.obs_updated_at!,
      obs_updated_by_name: p.obs_updated_by_name,
    }))
  );
}
