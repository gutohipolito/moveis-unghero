"use server";

import { prisma, isDatabaseOffline } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-guard";

type Preferences = Record<string, unknown>;

/** Lê as preferências de UI do usuário logado. */
export async function getUserPreferences(): Promise<Preferences> {
  const auth = await getAuthContext();
  if (!auth || isDatabaseOffline()) return {};

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { preferences: true },
    });
    const prefs = user?.preferences;
    return prefs && typeof prefs === "object" ? (prefs as Preferences) : {};
  } catch (error) {
    console.warn("Falha ao ler preferências do usuário:", error);
    return {};
  }
}

/** Atualiza (merge) uma preferência de UI do usuário logado. */
export async function updateUserPreference(
  key: string,
  value: unknown
): Promise<{ success: boolean }> {
  const auth = await getAuthContext();
  if (!auth) return { success: false };
  if (isDatabaseOffline()) return { success: false };

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { preferences: true },
    });
    const current =
      user?.preferences && typeof user.preferences === "object"
        ? (user.preferences as Preferences)
        : {};

    const next = { ...current, [key]: value };

    await prisma.user.update({
      where: { id: auth.userId },
      data: { preferences: next },
    });
    return { success: true };
  } catch (error) {
    console.warn("Falha ao salvar preferência do usuário:", error);
    return { success: false };
  }
}
