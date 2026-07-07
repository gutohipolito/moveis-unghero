"use server";

import { prisma, isDatabaseOffline } from "@/lib/prisma";
import {
  buildFollowUpNotifications,
  buildInvoiceNotifications,
  buildSlaNotifications,
  mergeNotifications,
  type AppNotification,
} from "@/lib/notifications";
import { getSlaAlertProjects, getInvoicePendingProjects } from "@/app/actions/productionSla";
import { assertCompanyAccess, getAuthContext } from "@/lib/auth-guard";

export async function getNotifications(companyId: string): Promise<{
  success: boolean;
  notifications: AppNotification[];
}> {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, notifications: [] };
  }
  try {
    assertCompanyAccess(auth, companyId);
  } catch {
    return { success: false, notifications: [] };
  }

  if (isDatabaseOffline()) {
    return { success: true, notifications: [] };
  }

  try {
    const [projects, slaAlerts, invoicePending, briefings] = await Promise.all([
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
            client: { company_id: companyId }
          }
        },
        include: {
          project: {
            include: {
              client: { select: { nome: true } }
            }
          }
        },
        orderBy: { createdAt: "desc" }
      })
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

    const briefingNotifications: AppNotification[] = briefings.map((b) => ({
      id: `briefing-${b.id}`,
      type: "info" as const,
      priority: "high" as const,
      title: "Solicitação de Orçamento",
      message: `${b.project.client.nome} enviou um novo briefing.`,
      href: `/crm?briefing=${b.project_id}`,
      createdAt: b.createdAt.toISOString()
    }));

    const notifications = mergeNotifications(
      followUp,
      slaNotifications,
      invoiceNotifications,
      briefingNotifications
    );

    return { success: true, notifications };
  } catch (error) {
    console.error("Erro ao buscar notificações:", error);
    return { success: false, notifications: [] };
  }
}
