"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/currentUser";

export async function logProjectTimeline(
  projectId: string,
  acao: string,
  interno = true
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.warn("Timeline não registrada: usuário não identificado.");
      return { success: false };
    }

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
