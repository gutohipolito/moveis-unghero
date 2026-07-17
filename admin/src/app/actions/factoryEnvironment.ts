"use server";

import { del } from "@vercel/blob";
import type { EnvironmentAttachmentCategory } from "@prisma/client";
import { getAuthContext, requireEnvironmentInCompany } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import {
  countTechSheetFields,
  type EnvironmentAttachmentDTO,
  type EnvironmentTechSheet,
} from "@/lib/factoryEnvironment";

function mapAttachment(record: {
  id: string;
  nome: string;
  mime_type: string;
  url: string;
  size_bytes: number | null;
  categoria: EnvironmentAttachmentCategory;
  createdAt: Date;
  uploaded_by: { name: string } | null;
}): EnvironmentAttachmentDTO {
  return {
    id: record.id,
    nome: record.nome,
    mime_type: record.mime_type,
    url: record.url,
    size_bytes: record.size_bytes,
    categoria: record.categoria,
    createdAt: record.createdAt.toISOString(),
    uploaded_by: record.uploaded_by?.name ?? null,
  };
}

export async function getEnvironmentTechSheet(environmentId: string) {
  const auth = await getAuthContext();
  if (!auth) return { success: false as const, error: "Não autenticado" };

  try {
    await requireEnvironmentInCompany(environmentId, auth.companyId);
  } catch {
    return { success: false as const, error: "Acesso negado" };
  }

  const environment = await prisma.environment.findFirst({
    where: {
      id: environmentId,
      project: { client: { company_id: auth.companyId } },
    },
    select: {
      id: true,
      nome: true,
      materiais: true,
      ferragens: true,
      acabamentos: true,
      medidas_observacoes: true,
      observacoes_fabrica: true,
      capa_attachment_id: true,
    },
  });

  if (!environment) {
    return { success: false as const, error: "Cômodo não encontrado" };
  }

  const tech: EnvironmentTechSheet = {
    materiais: environment.materiais ?? "",
    ferragens: environment.ferragens ?? "",
    acabamentos: environment.acabamentos ?? "",
    medidas_observacoes: environment.medidas_observacoes ?? "",
    observacoes_fabrica: environment.observacoes_fabrica ?? "",
    capa_attachment_id: environment.capa_attachment_id,
  };

  return {
    success: true as const,
    tech,
    fill: countTechSheetFields(environment),
  };
}

export async function saveEnvironmentTechSheet(
  environmentId: string,
  data: {
    materiais?: string;
    ferragens?: string;
    acabamentos?: string;
    medidas_observacoes?: string;
    observacoes_fabrica?: string;
  }
) {
  const auth = await getAuthContext();
  if (!auth) return { success: false as const, error: "Não autenticado" };

  try {
    await requireEnvironmentInCompany(environmentId, auth.companyId);
  } catch {
    return { success: false as const, error: "Acesso negado" };
  }

  const normalize = (value: string | undefined) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  try {
    const updated = await prisma.environment.update({
      where: { id: environmentId },
      data: {
        ...(data.materiais !== undefined ? { materiais: normalize(data.materiais) } : {}),
        ...(data.ferragens !== undefined ? { ferragens: normalize(data.ferragens) } : {}),
        ...(data.acabamentos !== undefined ? { acabamentos: normalize(data.acabamentos) } : {}),
        ...(data.medidas_observacoes !== undefined
          ? { medidas_observacoes: normalize(data.medidas_observacoes) }
          : {}),
        ...(data.observacoes_fabrica !== undefined
          ? { observacoes_fabrica: normalize(data.observacoes_fabrica) }
          : {}),
      },
      select: {
        materiais: true,
        ferragens: true,
        acabamentos: true,
        medidas_observacoes: true,
        observacoes_fabrica: true,
        capa_attachment_id: true,
      },
    });

    return {
      success: true as const,
      tech: {
        materiais: updated.materiais ?? "",
        ferragens: updated.ferragens ?? "",
        acabamentos: updated.acabamentos ?? "",
        medidas_observacoes: updated.medidas_observacoes ?? "",
        observacoes_fabrica: updated.observacoes_fabrica ?? "",
        capa_attachment_id: updated.capa_attachment_id,
      } satisfies EnvironmentTechSheet,
      fill: countTechSheetFields(updated),
    };
  } catch (error) {
    console.error("Erro ao salvar ficha técnica do cômodo:", error);
    return { success: false as const, error: "Não foi possível salvar a ficha técnica." };
  }
}

export async function listEnvironmentAttachments(environmentId: string) {
  const auth = await getAuthContext();
  if (!auth) return { success: false as const, error: "Não autenticado" };

  try {
    await requireEnvironmentInCompany(environmentId, auth.companyId);
  } catch {
    return { success: false as const, error: "Acesso negado" };
  }

  const [attachments, environment] = await Promise.all([
    prisma.environmentAttachment.findMany({
      where: { environment_id: environmentId, company_id: auth.companyId },
      include: { uploaded_by: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.environment.findFirst({
      where: { id: environmentId },
      select: { capa_attachment_id: true },
    }),
  ]);

  return {
    success: true as const,
    attachments: attachments.map(mapAttachment),
    capaAttachmentId: environment?.capa_attachment_id ?? null,
  };
}

export async function deleteEnvironmentAttachment(environmentId: string, attachmentId: string) {
  const auth = await getAuthContext();
  if (!auth) return { success: false as const, error: "Não autenticado" };

  try {
    await requireEnvironmentInCompany(environmentId, auth.companyId);
  } catch {
    return { success: false as const, error: "Acesso negado" };
  }

  const attachment = await prisma.environmentAttachment.findFirst({
    where: {
      id: attachmentId,
      environment_id: environmentId,
      company_id: auth.companyId,
    },
  });

  if (!attachment) {
    return { success: false as const, error: "Arquivo não encontrado" };
  }

  try {
    if (process.env.BLOB_READ_WRITE_TOKEN && attachment.url.includes("blob.vercel-storage.com")) {
      await del(attachment.url, { token: process.env.BLOB_READ_WRITE_TOKEN });
    }

    await prisma.$transaction(async (tx) => {
      const env = await tx.environment.findFirst({
        where: { id: environmentId },
        select: { capa_attachment_id: true },
      });

      if (env?.capa_attachment_id === attachmentId) {
        await tx.environment.update({
          where: { id: environmentId },
          data: { capa_attachment_id: null },
        });
      }

      await tx.environmentAttachment.delete({ where: { id: attachment.id } });
    });

    return { success: true as const };
  } catch (error) {
    console.error("Erro ao excluir anexo do cômodo:", error);
    return { success: false as const, error: "Não foi possível excluir o arquivo." };
  }
}

export async function setEnvironmentCoverAttachment(
  environmentId: string,
  attachmentId: string | null
) {
  const auth = await getAuthContext();
  if (!auth) return { success: false as const, error: "Não autenticado" };

  try {
    await requireEnvironmentInCompany(environmentId, auth.companyId);
  } catch {
    return { success: false as const, error: "Acesso negado" };
  }

  if (attachmentId) {
    const attachment = await prisma.environmentAttachment.findFirst({
      where: {
        id: attachmentId,
        environment_id: environmentId,
        company_id: auth.companyId,
      },
      select: { id: true, mime_type: true },
    });
    if (!attachment) {
      return { success: false as const, error: "Arquivo não encontrado" };
    }
    if (!attachment.mime_type.startsWith("image/")) {
      return { success: false as const, error: "A capa precisa ser uma imagem." };
    }
  }

  try {
    await prisma.environment.update({
      where: { id: environmentId },
      data: { capa_attachment_id: attachmentId },
    });
    return { success: true as const, capaAttachmentId: attachmentId };
  } catch (error) {
    console.error("Erro ao definir capa do cômodo:", error);
    return { success: false as const, error: "Não foi possível atualizar a capa." };
  }
}
