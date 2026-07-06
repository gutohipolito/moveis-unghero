"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionSafe } from "@/lib/auth";

export async function logProjectTimeline(
  projectId: string,
  acao: string,
  interno = true
) {
  try {
    const session = await getSessionSafe(await headers());
    const userId =
      session?.user?.id ||
      (await prisma.user.findFirst({ select: { id: true } }))?.id ||
      "system-admin-mock-id";

    await prisma.timeline.create({
      data: {
        project_id: projectId,
        user_id: userId,
        acao,
        interno_sotamente: interno,
      },
    });
    return { success: true };
  } catch (error) {
    console.warn("Falha ao registrar timeline:", error);
    return { success: false };
  }
}
