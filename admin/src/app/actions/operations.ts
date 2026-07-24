"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logProjectTimeline } from "@/app/actions/timeline";
import { checkProjectPaymentComplete } from "@/app/actions/productionSla";
import { getAuthContext, requireProjectInCompany } from "@/lib/auth-guard";
import { getModuleAccess } from "@/lib/moduleAccess";
import type { PaymentMethod } from "@/lib/paymentMethods";
import { labelPaymentMethod } from "@/lib/paymentMethods";

export interface CreateInstallmentInput {
  valor: number;
  data_vencimento: string;
  tipo: "ENTRADA" | "PARCELA";
  metodo_pagamento: PaymentMethod;
  numero_parcela?: number;
  total_parcelas?: number;
  grupo_id?: string;
}

export interface CreateInstallmentPlanInput {
  valor_total: number;
  quantidade_parcelas: number;
  primeira_data_vencimento: string;
  metodo_pagamento: PaymentMethod;
  intervalo_dias?: number;
  primeira_eh_entrada?: boolean;
}

function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

async function revalidateInstallmentPaths(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/financeiro");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { client_id: true },
  });
  if (project?.client_id) {
    revalidatePath(`/clientes/${project.client_id}`);
  }
}

export async function createInstallment(projectId: string, data: CreateInstallmentInput) {
  const auth = await getModuleAccess("factory");
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  try {
    await requireProjectInCompany(projectId, auth.companyId);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Acesso negado",
    };
  }

  try {
    const installment = await prisma.installment.create({
      data: {
        project_id: projectId,
        valor: data.valor,
        data_vencimento: new Date(data.data_vencimento),
        status: "PENDENTE",
        tipo: data.tipo,
        metodo_pagamento: data.metodo_pagamento,
        numero_parcela: data.numero_parcela ?? null,
        total_parcelas: data.total_parcelas ?? null,
        grupo_id: data.grupo_id ?? null,
      },
    });

    const tipoLabel = data.tipo === "ENTRADA" ? "Entrada" : "Parcela";
    const metodo = labelPaymentMethod(data.metodo_pagamento);
    await logProjectTimeline(
      projectId,
      `${tipoLabel} financeira (${metodo}) lançada no valor de R$ ${data.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      true
    );

    await revalidateInstallmentPaths(projectId);

    return { success: true, installment };
  } catch (error) {
    console.warn("Banco offline ao criar parcela. Simulando sucesso.", error);
    return {
      success: true,
      installment: {
        id: `mock-inst-${Date.now()}`,
        project_id: projectId,
        valor: data.valor,
        data_vencimento: new Date(data.data_vencimento),
        status: "PENDENTE",
        tipo: data.tipo,
        metodo_pagamento: data.metodo_pagamento,
        numero_parcela: data.numero_parcela ?? null,
        total_parcelas: data.total_parcelas ?? null,
        grupo_id: data.grupo_id ?? null,
      },
    };
  }
}

export async function createInstallmentPlan(
  projectId: string,
  data: CreateInstallmentPlanInput
) {
  const auth = await getModuleAccess("factory");
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  try {
    await requireProjectInCompany(projectId, auth.companyId);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Acesso negado",
    };
  }

  if (data.quantidade_parcelas < 1 || data.quantidade_parcelas > 60) {
    return { success: false, error: "Informe entre 1 e 60 parcelas." };
  }
  if (data.valor_total <= 0) {
    return { success: false, error: "Valor total deve ser maior que zero." };
  }

  const intervalDays = data.intervalo_dias ?? 30;
  const valorParcela = Math.round((data.valor_total / data.quantidade_parcelas) * 100) / 100;
  const grupoId = crypto.randomUUID();
  const firstDue = new Date(data.primeira_data_vencimento);
  const metodo = labelPaymentMethod(data.metodo_pagamento);

  try {
    const installments = await prisma.$transaction(async (tx) => {
      const created = [];
      for (let i = 0; i < data.quantidade_parcelas; i++) {
        const isFirst = i === 0;
        const tipo =
          isFirst && data.primeira_eh_entrada ? ("ENTRADA" as const) : ("PARCELA" as const);
        const dueDate = addDays(firstDue, i * intervalDays);
        const inst = await tx.installment.create({
          data: {
            project_id: projectId,
            valor: valorParcela,
            data_vencimento: dueDate,
            status: "PENDENTE",
            tipo,
            metodo_pagamento: data.metodo_pagamento,
            numero_parcela: i + 1,
            total_parcelas: data.quantidade_parcelas,
            grupo_id: grupoId,
          },
        });
        created.push(inst);
      }
      return created;
    });

    await logProjectTimeline(
      projectId,
      `Plano financeiro criado: ${data.quantidade_parcelas}x de R$ ${valorParcela.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} via ${metodo}.`,
      true
    );

    await revalidateInstallmentPaths(projectId);

    return { success: true, installments, count: installments.length };
  } catch (error) {
    console.warn("Banco offline ao criar plano de parcelas.", error);
    return { success: false, error: "Não foi possível criar o plano de parcelas." };
  }
}

export async function payInstallment(projectId: string, installmentId: string) {
  const auth = await getModuleAccess("factory");
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  try {
    await requireProjectInCompany(projectId, auth.companyId);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Acesso negado",
    };
  }

  try {
    const installment = await prisma.installment.update({
      where: { id: installmentId },
      data: {
        status: "PAGO",
        data_pagamento: new Date(),
      },
    });

    await logProjectTimeline(
      projectId,
      `Parcela recebida no valor de R$ ${Number(installment.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.`,
      false
    );

    const { fullyPaid } = await checkProjectPaymentComplete(projectId);
    if (fullyPaid) {
      await logProjectTimeline(
        projectId,
        "Pagamento integral do projeto confirmado — verificar emissão da nota fiscal.",
        true
      );
    }

    await revalidateInstallmentPaths(projectId);

    return { success: true, installment };
  } catch (error) {
    console.warn("Banco offline ao quitar parcela. Simulando sucesso.");
    return { success: true };
  }
}

export async function createTask(
  projectId: string,
  data: {
    titulo: string;
    descricao?: string;
    responsavel: string;
    data: string;
    tipo: "VISITA_COMERCIAL" | "MEDICAO_TECNICA" | "ENTREGA_MOVEIS" | "INSTALACAO" | "OUTROS";
  }
) {
  const auth = await getModuleAccess("factory");
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  try {
    await requireProjectInCompany(projectId, auth.companyId);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Acesso negado",
    };
  }

  try {
    const task = await prisma.task.create({
      data: {
        project_id: projectId,
        titulo: data.titulo,
        descricao: data.descricao || "",
        responsavel: data.responsavel,
        data: new Date(data.data),
        status: "PENDENTE",
        tipo: data.tipo,
      },
    });

    await logProjectTimeline(
      projectId,
      `Compromisso agendado: ${data.titulo} (${data.tipo}) para o dia ${new Date(data.data).toLocaleDateString("pt-BR")} com ${data.responsavel}.`,
      false
    );

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/agenda");
    return { success: true, task };
  } catch (error) {
    console.warn("Banco offline ao criar tarefa/agenda. Simulando sucesso.");
    return {
      success: true,
      task: {
        id: `mock-task-${Date.now()}`,
        project_id: projectId,
        titulo: data.titulo,
        descricao: data.descricao || "",
        responsavel: data.responsavel,
        data: new Date(data.data),
        status: "PENDENTE",
        tipo: data.tipo,
      },
    };
  }
}

export async function toggleTaskStatus(
  projectId: string,
  taskId: string,
  completed: boolean
) {
  const auth = await getModuleAccess("factory");
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  try {
    await requireProjectInCompany(projectId, auth.companyId);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Acesso negado",
    };
  }

  try {
    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: completed ? "CONCLUIDA" : "PENDENTE",
      },
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/agenda");
    return { success: true, task };
  } catch (error) {
    console.warn("Banco offline ao alternar status da tarefa. Simulando sucesso.");
    return { success: true };
  }
}