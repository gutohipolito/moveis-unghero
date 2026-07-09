import type { AppNotification } from "@/lib/notifications";
import {
  getPaymentMethodAlertDays,
  labelPaymentMethod,
  paymentMethodPrepareHint,
} from "@/lib/paymentMethods";

export interface InstallmentDueInput {
  id: string;
  valor: number;
  data_vencimento: Date;
  status: string;
  metodo_pagamento: string;
  numero_parcela: number | null;
  total_parcelas: number | null;
  project: {
    id: string;
    client: { id: string; nome: string };
  };
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysUntilDue(dueDate: Date, today: Date): number {
  const due = startOfDay(dueDate).getTime();
  const now = startOfDay(today).getTime();
  return Math.round((due - now) / (1000 * 60 * 60 * 24));
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parcelLabel(inst: InstallmentDueInput): string {
  if (inst.numero_parcela && inst.total_parcelas) {
    return `Parcela ${inst.numero_parcela}/${inst.total_parcelas}`;
  }
  return "Parcela";
}

export function buildInstallmentDueNotifications(
  installments: InstallmentDueInput[]
): AppNotification[] {
  const today = new Date();
  const items: AppNotification[] = [];

  for (const inst of installments) {
    if (inst.status === "PAGO") continue;

    const days = daysUntilDue(inst.data_vencimento, today);
    const leadDays = getPaymentMethodAlertDays(inst.metodo_pagamento);
    const metodo = labelPaymentMethod(inst.metodo_pagamento);
    const clientName = inst.project.client.nome;
    const valor = formatCurrency(inst.valor);
    const dueLabel = startOfDay(inst.data_vencimento).toLocaleDateString("pt-BR");
    const parcel = parcelLabel(inst);
    const hint = paymentMethodPrepareHint(inst.metodo_pagamento);

    if (days < 0 || inst.status === "ATRASADO") {
      items.push({
        id: `installment-overdue-${inst.id}`,
        type: "installment_due",
        priority: "high",
        title: "Parcela em atraso",
        message: `${clientName} — ${parcel} de ${valor} (${metodo}), venceu em ${dueLabel}.`,
        href: `/clientes/${inst.project.client.id}?tab=finance`,
        createdAt: inst.data_vencimento.toISOString(),
        meta: {
          projectId: inst.project.id,
          clientName,
        },
      });
      continue;
    }

    if (days === 0) {
      items.push({
        id: `installment-today-${inst.id}`,
        type: "installment_due",
        priority: "high",
        title: "Parcela vence hoje",
        message: `${clientName} — ${parcel} de ${valor} via ${metodo}. ${hint}`,
        href: `/clientes/${inst.project.client.id}?tab=finance`,
        createdAt: inst.data_vencimento.toISOString(),
        meta: {
          projectId: inst.project.id,
          clientName,
        },
      });
      continue;
    }

    if (days <= leadDays) {
      items.push({
        id: `installment-soon-${inst.id}`,
        type: "installment_due",
        priority: days <= 1 ? "high" : "normal",
        title: `Parcela vence em ${days} dia${days === 1 ? "" : "s"}`,
        message: `${clientName} — ${parcel} de ${valor} (${metodo}) em ${dueLabel}. ${hint}`,
        href: `/clientes/${inst.project.client.id}?tab=finance`,
        createdAt: inst.data_vencimento.toISOString(),
        meta: {
          projectId: inst.project.id,
          clientName,
        },
      });
    }
  }

  return items.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority === "high" ? -1 : 1;
    return a.createdAt.localeCompare(b.createdAt);
  });
}
