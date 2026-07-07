"use server";

import { revalidatePath } from "next/cache";
import { prisma, isDatabaseOffline } from "@/lib/prisma";
import {
  PRODUCTION_SLA_STAGES,
  type ProductionSlaStageKey,
  type ProjectSlaView,
  getNextStageKey,
  getStageConfig,
  isSlaDueToday,
  isSlaFinished,
  isSlaOverdue,
} from "@/lib/productionSla";
import { logProjectTimeline } from "@/app/actions/timeline";
import {
  assertCompanyAccess,
  getAuthContext,
  requireProjectInCompany,
} from "@/lib/auth-guard";

function mapSlaRow(
  row: {
    project_id: string;
    current_stage: string;
    stage_started_at: Date;
    extension_days: number;
    completed_stages: string[];
    nota_fiscal_emitida: boolean;
    project?: { client?: { nome: string } };
  }
): ProjectSlaView {
  return {
    projectId: row.project_id,
    clientName: row.project?.client?.nome,
    currentStage: row.current_stage as ProductionSlaStageKey,
    stageStartedAt: row.stage_started_at.toISOString(),
    extensionDays: row.extension_days,
    completedStages: row.completed_stages as ProductionSlaStageKey[],
    notaFiscalEmitida: row.nota_fiscal_emitida,
  };
}

export async function ensureProjectSla(projectId: string): Promise<ProjectSlaView | null> {
  const auth = await getAuthContext();
  if (!auth) return null;
  try {
    await requireProjectInCompany(projectId, auth.companyId);
  } catch {
    return null;
  }

  if (isDatabaseOffline()) return null;

  try {
    const existing = await prisma.projectSlaState.findUnique({
      where: { project_id: projectId },
      include: { project: { include: { client: true } } },
    });
    if (existing) return mapSlaRow(existing);

    const created = await prisma.projectSlaState.create({
      data: {
        project_id: projectId,
        current_stage: PRODUCTION_SLA_STAGES[0].key,
      },
      include: { project: { include: { client: true } } },
    });

    await logProjectTimeline(
      projectId,
      `Radar de prazos iniciado — etapa "${PRODUCTION_SLA_STAGES[0].name}" (SLA: ${PRODUCTION_SLA_STAGES[0].slaDays} dias).`,
      true
    );

    return mapSlaRow(created);
  } catch (error) {
    console.error("Erro ao iniciar SLA do projeto:", error);
    return null;
  }
}

export async function getCompanySlaStates(companyId: string): Promise<ProjectSlaView[]> {
  const auth = await getAuthContext();
  if (!auth) return [];
  try {
    assertCompanyAccess(auth, companyId);
  } catch {
    return [];
  }

  if (isDatabaseOffline()) return [];

  try {
    const rows = await prisma.projectSlaState.findMany({
      where: {
        project: {
          client: { company_id: companyId },
          files: { some: { aprovado_producao: true } },
        },
      },
      include: { project: { include: { client: true } } },
    });
    return rows.map(mapSlaRow);
  } catch (error) {
    console.error("Erro ao buscar SLAs:", error);
    return [];
  }
}

export async function getProjectSla(projectId: string): Promise<ProjectSlaView | null> {
  const auth = await getAuthContext();
  if (!auth) return null;
  try {
    await requireProjectInCompany(projectId, auth.companyId);
  } catch {
    return null;
  }

  if (isDatabaseOffline()) return null;

  try {
    const row = await prisma.projectSlaState.findUnique({
      where: { project_id: projectId },
      include: { project: { include: { client: true } } },
    });
    return row ? mapSlaRow(row) : null;
  } catch {
    return null;
  }
}

export async function verifySlaStage(
  projectId: string,
  completed: boolean,
  extraDays?: number
): Promise<{ success: boolean; error?: string; sla?: ProjectSlaView }> {
  const auth = await getAuthContext();
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

  const sla = (await getProjectSla(projectId)) ?? (await ensureProjectSla(projectId));
  if (!sla) return { success: false, error: "SLA não encontrado." };

  const stage = getStageConfig(sla.currentStage);

  if (completed) {
    const next = getNextStageKey(sla.currentStage);
    const completedStages = [...sla.completedStages, sla.currentStage];
    const finished = !next;

    await prisma.projectSlaState.update({
      where: { project_id: projectId },
      data: {
        completed_stages: completedStages,
        current_stage: next ?? sla.currentStage,
        stage_started_at: new Date(),
        extension_days: 0,
      },
    });

    const nextConfig = next ? getStageConfig(next) : null;
    await logProjectTimeline(
      projectId,
      finished
        ? `Etapa "${stage.name}" concluída — todas as etapas do radar de prazos foram finalizadas.`
        : `Etapa "${stage.name}" concluída. Próxima etapa: "${nextConfig?.name}" (SLA: ${nextConfig?.slaDays} dias, independente).`,
      true
    );
  } else {
    const days = extraDays ?? 0;
    if (days < 1) {
      return { success: false, error: "Informe quantos dias adicionais de SLA são necessários." };
    }

    await prisma.projectSlaState.update({
      where: { project_id: projectId },
      data: { extension_days: sla.extensionDays + days },
    });

    await logProjectTimeline(
      projectId,
      `Etapa "${stage.name}" não concluída no prazo. Acréscimo de ${days} dia${days !== 1 ? "s" : ""} de SLA (total extra: ${sla.extensionDays + days}d).`,
      true
    );
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/factory");

  const updated = await getProjectSla(projectId);
  return { success: true, sla: updated ?? undefined };
}

export async function updateProjectSlaStage(
  projectId: string,
  stageKey: ProductionSlaStageKey
): Promise<{ success: boolean; sla?: ProjectSlaView; error?: string }> {
  const auth = await getAuthContext();
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

  const config = getStageConfig(stageKey);
  await ensureProjectSla(projectId);

  const stageIdx = PRODUCTION_SLA_STAGES.findIndex((s) => s.key === stageKey);
  const completedStages = PRODUCTION_SLA_STAGES.slice(0, stageIdx).map((s) => s.key);

  try {
    await prisma.projectSlaState.update({
      where: { project_id: projectId },
      data: {
        current_stage: stageKey,
        stage_started_at: new Date(),
        extension_days: 0,
        completed_stages: completedStages,
      },
    });
  } catch (error) {
    console.error("Erro ao atualizar etapa SLA:", error);
    return { success: false, error: "Não foi possível atualizar a etapa de SLA." };
  }

  await logProjectTimeline(
    projectId,
    `Etapa de SLA definida manualmente para "${config.name}" (prazo: ${config.slaDays} dias, independente).`,
    true
  );

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/factory");

  const updated = await getProjectSla(projectId);
  return { success: true, sla: updated ?? undefined };
}

export async function markNotaFiscalEmitida(projectId: string) {
  const auth = await getAuthContext();
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

  if (isDatabaseOffline()) {
    return { success: false, error: "Banco de dados indisponível." };
  }

  await prisma.projectSlaState.upsert({
      where: { project_id: projectId },
      create: {
        project_id: projectId,
        current_stage: PRODUCTION_SLA_STAGES[0].key,
        nota_fiscal_emitida: true,
        nota_fiscal_emitida_em: new Date(),
      },
      update: {
        nota_fiscal_emitida: true,
        nota_fiscal_emitida_em: new Date(),
      },
  });

  await logProjectTimeline(projectId, "Nota fiscal emitida e registrada no projeto.", false);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/factory");
  return { success: true };
}

export async function checkProjectPaymentComplete(projectId: string) {
  const auth = await getAuthContext();
  if (!auth) return { fullyPaid: false };
  try {
    await requireProjectInCompany(projectId, auth.companyId);
  } catch {
    return { fullyPaid: false };
  }

  if (isDatabaseOffline()) return { fullyPaid: false };

  try {
    const installments = await prisma.installment.findMany({
      where: { project_id: projectId },
    });
    if (installments.length === 0) return { fullyPaid: false };
    const fullyPaid = installments.every((i) => i.status === "PAGO");
    return { fullyPaid };
  } catch {
    return { fullyPaid: false };
  }
}

export async function getSlaAlertProjects(companyId: string) {
  const auth = await getAuthContext();
  if (!auth) return [];
  try {
    assertCompanyAccess(auth, companyId);
  } catch {
    return [];
  }

  const states = await getCompanySlaStates(companyId);
  return states.filter((s) => !isSlaFinished(s) && (isSlaDueToday(s) || isSlaOverdue(s)));
}

export async function getInvoicePendingProjects(companyId: string) {
  const auth = await getAuthContext();
  if (!auth) return [];
  try {
    assertCompanyAccess(auth, companyId);
  } catch {
    return [];
  }

  if (isDatabaseOffline()) return [];

  try {
    const projects = await prisma.project.findMany({
      where: {
        client: { company_id: companyId },
        installments: { some: {} },
        OR: [
          { slaState: { nota_fiscal_emitida: false } },
          { slaState: null },
        ],
      },
      include: {
        client: { select: { nome: true } },
        installments: true,
        slaState: true,
      },
    });

    return projects.filter((p) => {
      const allPaid = p.installments.length > 0 && p.installments.every((i) => i.status === "PAGO");
      const nfPending = !p.slaState?.nota_fiscal_emitida;
      return allPaid && nfPending;
    });
  } catch {
    return [];
  }
}
