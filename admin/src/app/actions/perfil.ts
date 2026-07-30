"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { capitalizeText } from "@/lib/utils";

export type PerfilResult =
  | { success: true }
  | { success: false; error: string };

export async function updateMyProfileAction(data: {
  name: string;
  image?: string | null;
}): Promise<PerfilResult> {
  try {
    await requireAuth();
  } catch {
    return { success: false, error: "Não autenticado." };
  }

  const name = capitalizeText(data.name);
  if (!name || name.length < 2) {
    return { success: false, error: "Informe um nome válido." };
  }

  try {
    await auth.api.updateUser({
      headers: await headers(),
      body: {
        name,
        ...(data.image !== undefined ? { image: data.image } : {}),
      },
    });
  } catch (error) {
    console.warn("Falha ao atualizar perfil via better-auth:", error);
    // Fallback direto no Prisma (sessão cookie pode precisar de refresh)
    const authCtx = await requireAuth();
    await prisma.user.update({
      where: { id: authCtx.userId },
      data: {
        name,
        ...(data.image !== undefined ? { image: data.image } : {}),
      },
    });
  }

  revalidatePath("/", "layout");
  revalidatePath("/perfil");
  return { success: true };
}

export async function changeMyPasswordAction(data: {
  currentPassword: string;
  newPassword: string;
}): Promise<PerfilResult> {
  try {
    await requireAuth();
  } catch {
    return { success: false, error: "Não autenticado." };
  }

  if (!data.currentPassword || !data.newPassword) {
    return { success: false, error: "Preencha a senha atual e a nova senha." };
  }
  if (data.newPassword.length < 8) {
    return { success: false, error: "A nova senha deve ter pelo menos 8 caracteres." };
  }

  try {
    await auth.api.changePassword({
      headers: await headers(),
      body: {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        revokeOtherSessions: false,
      },
    });
    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível alterar a senha.";
    if (/password|senha|incorrect|inválid/i.test(message)) {
      return { success: false, error: "Senha atual incorreta." };
    }
    console.warn("Falha ao alterar senha:", error);
    return { success: false, error: "Não foi possível alterar a senha. Tente novamente." };
  }
}
