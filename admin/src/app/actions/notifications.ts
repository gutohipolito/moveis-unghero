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

export async function getNotifications(companyId: string): Promise<{
  success: boolean;
  notifications: AppNotification[];
}> {
  if (isDatabaseOffline()) {
    return { success: true, notifications: [] };
  }

  try {
    const projects = await prisma.project.findMany({
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
    });

    const followUp = buildFollowUpNotifications(
      projects.map((p) => ({
        id: p.id,
        status_geral: p.status_geral,
        ultimo_contato_em: p.ultimo_contato_em,
        createdAt: p.createdAt,
        client: p.client,
      }))
    );

    const slaAlerts = await getSlaAlertProjects(companyId);
    const slaNotifications = buildSlaNotifications(
      slaAlerts.map((s) => ({
        ...s,
        clientName: s.clientName ?? "Projeto",
      }))
    );

    const invoicePending = await getInvoicePendingProjects(companyId);
    const invoiceNotifications = buildInvoiceNotifications(
      invoicePending.map((p) => ({ id: p.id, client: p.client }))
    );

    const notifications = mergeNotifications(
      followUp,
      slaNotifications,
      invoiceNotifications
    );

    return { success: true, notifications };
  } catch (error) {
    console.error("Erro ao buscar notificações:", error);
    return { success: false, notifications: [] };
  }
}
