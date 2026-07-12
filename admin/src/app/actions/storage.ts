"use server";

import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export interface StorageUsage {
  totalBytes: number;
  fileCount: number;
  imageCount: number;
  docCount: number;
}

export type StorageUsageResult =
  | { success: true; usage: StorageUsage }
  | { success: false; error: string };

export async function getStorageUsageAction(): Promise<StorageUsageResult> {
  let companyId: string;
  try {
    const auth = await requireAdmin();
    companyId = auth.companyId;
  } catch {
    return { success: false, error: "Acesso restrito a administradores." };
  }

  const [agg, imageCount, docCount] = await Promise.all([
    prisma.clientAttachment.aggregate({
      where: { company_id: companyId },
      _sum: { size_bytes: true },
      _count: true,
    }),
    prisma.clientAttachment.count({
      where: { company_id: companyId, tipo: "FOTO" },
    }),
    prisma.clientAttachment.count({
      where: { company_id: companyId, tipo: "DOCUMENTO" },
    }),
  ]);

  return {
    success: true,
    usage: {
      totalBytes: agg._sum.size_bytes ?? 0,
      fileCount: agg._count,
      imageCount,
      docCount,
    },
  };
}
