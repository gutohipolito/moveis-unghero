"use server";

import { getAuthContext } from "@/lib/auth-guard";
import { fetchAgendaEvents, fetchFactoryBoard } from "@/lib/factoryBoard";
import { fetchCrmProjects } from "@/lib/crmProjects";
import { buildLiveSnapshotVersion } from "@/lib/liveSnapshot";

async function assertCompanyAccess(companyId: string) {
  const auth = await getAuthContext();
  if (!auth || auth.companyId !== companyId) {
    return null;
  }
  return auth;
}

export async function getCrmLiveSnapshot(companyId: string) {
  const auth = await assertCompanyAccess(companyId);
  if (!auth) {
    return { success: false as const, error: "Não autenticado" };
  }

  try {
    const projects = await fetchCrmProjects(auth.companyId);
    const version = buildLiveSnapshotVersion(
      projects.map((project) => ({
        id: project.id,
        status: project.status_geral,
        updatedAt: project.updatedAt ?? "",
        ultimo_contato_em: project.ultimo_contato_em ?? "",
        valor_previsto: project.valor_previsto,
        timelineCount: project.timeline?.length ?? 0,
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
  if (!auth) {
    return { success: false as const, error: "Não autenticado" };
  }

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
  if (!auth) {
    return { success: false as const, error: "Não autenticado" };
  }

  try {
    const snapshot = await fetchAgendaEvents(auth.companyId);
    return { success: true as const, ...snapshot };
  } catch (error) {
    console.warn("Falha ao sincronizar agenda:", error);
    return { success: false as const, error: "Não foi possível sincronizar a agenda." };
  }
}
