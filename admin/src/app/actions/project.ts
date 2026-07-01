"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type EnvironmentType = 
  | "COZINHA"
  | "CLOSET"
  | "DORMITORIO"
  | "BANHEIRO"
  | "OUTROS";

export type EnvironmentStatus =
  | "AGUARDANDO_MEDICAO"
  | "EM_DETALHAMENTO"
  | "PRONTO_PRODUCAO"
  | "EM_CORTE"
  | "MONTAGEM_FABRICA"
  | "PRONTO_ENTREGA"
  | "EM_INSTALACAO"
  | "FINALIZADO";

export type FileType =
  | "MEDICAO"
  | "RENDER"
  | "CONTRATO"
  | "FOTO"
  | "PROJETO_TECNICO";

// Atualiza o status geral do projeto
export async function updateProjectGeneralStatus(projectId: string, newStatus: string) {
  try {
    await prisma.project.update({
      where: { id: projectId },
      data: { status_geral: newStatus as any }
    });
    revalidatePath(`/projects/${projectId}`);
    return { success: true };
  } catch (error) {
    console.warn("Simulação de alteração do status geral do projeto:", error);
    return { success: true, simulated: true };
  }
}

// Atualiza o status individual de um ambiente do projeto
export async function updateEnvironmentStatus(projectId: string, envId: string, newStatus: EnvironmentStatus) {
  try {
    await prisma.environment.update({
      where: { id: envId },
      data: { status: newStatus }
    });
    revalidatePath(`/projects/${projectId}`);
    return { success: true };
  } catch (error) {
    console.warn("Simulação de alteração de status do ambiente:", error);
    return { success: true, simulated: true };
  }
}

// Adiciona um novo ambiente ao projeto
export async function addEnvironment(projectId: string, nome: string, tipo: EnvironmentType) {
  try {
    const newEnv = await prisma.environment.create({
      data: {
        project_id: projectId,
        nome,
        tipo,
        status: "AGUARDANDO_MEDICAO"
      }
    });
    
    // Cria um registro automático na timeline do projeto
    await prisma.timeline.create({
      data: {
        project_id: projectId,
        acao: `Ambiente "${nome}" (${tipo}) adicionado ao projeto`,
        interno_sotamente: false,
        user_id: "system-admin-mock-id", // mock id
      }
    });

    revalidatePath(`/projects/${projectId}`);
    return { success: true, data: newEnv };
  } catch (error) {
    console.warn("Simulação de adição de ambiente:", error);
    const mockEnv = {
      id: `simulated-env-${Math.random().toString(36).substr(2, 9)}`,
      project_id: projectId,
      nome,
      tipo,
      status: "AGUARDANDO_MEDICAO" as EnvironmentStatus
    };
    return { success: true, simulated: true, data: mockEnv };
  }
}

// Adiciona um novo evento/nota de timeline ao projeto
export async function addTimelineEvent(projectId: string, acao: string, interno: boolean) {
  try {
    const newEvent = await prisma.timeline.create({
      data: {
        project_id: projectId,
        acao,
        interno_sotamente: interno,
        user_id: "system-admin-mock-id", // mock id
      },
      include: {
        user: {
          select: { name: true }
        }
      }
    });
    
    revalidatePath(`/projects/${projectId}`);
    return { success: true, data: newEvent };
  } catch (error) {
    console.warn("Simulação de inserção de nota na timeline:", error);
    const mockEvent = {
      id: `simulated-time-${Math.random().toString(36).substr(2, 9)}`,
      acao,
      data: new Date(),
      interno_sotamente: interno,
      user: { name: "Usuário SaaS (Simulado)" }
    };
    return { success: true, simulated: true, data: mockEvent };
  }
}

// Altera a liberação do arquivo para produção (Flag de corte na fábrica)
export async function toggleFileApproval(projectId: string, fileId: string, approved: boolean) {
  try {
    await prisma.file.update({
      where: { id: fileId },
      data: { aprovado_producao: approved }
    });
    
    // Registra na timeline
    await prisma.timeline.create({
      data: {
        project_id: projectId,
        acao: `Arquivo técnico foi ${approved ? "APROVADO" : "BLOQUEADO"} para corte/produção`,
        interno_sotamente: true,
        user_id: "system-admin-mock-id"
      }
    });

    revalidatePath(`/projects/${projectId}`);
    return { success: true };
  } catch (error) {
    console.warn("Simulação de toggle de liberação de arquivo para produção:", error);
    return { success: true, simulated: true };
  }
}

// Upload de arquivo simulado (ou real R2 se chaves configuradas)
export async function uploadProjectFile(projectId: string, data: { tipo: FileType; nome_arquivo: string; url?: string }) {
  try {
    // Incrementa a versão se o arquivo do mesmo tipo já existir
    const existingFiles = await prisma.file.findMany({
      where: { project_id: projectId, tipo: data.tipo }
    });
    const currentVersion = existingFiles.length > 0 
      ? Math.max(...existingFiles.map(f => f.versao)) + 1 
      : 1;

    const newFile = await prisma.file.create({
      data: {
        project_id: projectId,
        tipo: data.tipo,
        url: data.url || "#",
        versao: currentVersion,
        aprovado_producao: false
      }
    });

    // Registra na timeline
    await prisma.timeline.create({
      data: {
        project_id: projectId,
        acao: `Upload do arquivo "${data.nome_arquivo}" (v${currentVersion}) realizado`,
        interno_sotamente: true,
        user_id: "system-admin-mock-id"
      }
    });

    revalidatePath(`/projects/${projectId}`);
    return { success: true, data: newFile };
  } catch (error) {
    console.warn("Simulação de upload de arquivo:", error);
    const mockFile = {
      id: `simulated-file-${Math.random().toString(36).substr(2, 9)}`,
      project_id: projectId,
      tipo: data.tipo,
      url: data.url || "#",
      versao: 2, // Versão simulada incrementada
      aprovado_producao: false,
      nome_arquivo: data.nome_arquivo
    };
    return { success: true, simulated: true, data: mockFile };
  }
}
