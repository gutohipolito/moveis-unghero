"use server";

import { prisma, isDatabaseOffline } from "@/lib/prisma";
import type { OperatorNote, OperatorReminder } from "@/lib/operatorWorkspace";
import { getAuthContext , assertCanWrite } from "@/lib/auth-guard";

function mapNote(row: {
  id: string;
  content: string;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}): OperatorNote {
  return {
    id: row.id,
    content: row.content,
    pinned: row.pinned,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapReminder(row: {
  id: string;
  title: string;
  due_at: Date;
  done: boolean;
  createdAt: Date;
}): OperatorReminder {
  return {
    id: row.id,
    title: row.title,
    dueAt: row.due_at.toISOString(),
    done: row.done,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getOperatorNotesForUser(
  userId: string,
  companyId: string
): Promise<{ success: boolean; notes: OperatorNote[] }> {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, notes: [] };
  }
  if (userId !== auth.userId || companyId !== auth.companyId) {
    return { success: false, notes: [] };
  }

  if (isDatabaseOffline()) {
    return { success: false, notes: [] };
  }

  try {
    const rows = await prisma.operatorNote.findMany({
      where: { user_id: userId, company_id: companyId },
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    });
    return { success: true, notes: rows.map(mapNote) };
  } catch (error) {
    console.error("Erro ao buscar notas:", error);
    return { success: false, notes: [] };
  }
}

export async function getOperatorRemindersForUser(
  userId: string,
  companyId: string
): Promise<{ success: boolean; reminders: OperatorReminder[] }> {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, reminders: [] };
  }
  if (userId !== auth.userId || companyId !== auth.companyId) {
    return { success: false, reminders: [] };
  }

  if (isDatabaseOffline()) {
    return { success: false, reminders: [] };
  }

  try {
    const rows = await prisma.operatorReminder.findMany({
      where: { user_id: userId, company_id: companyId },
      orderBy: [{ done: "asc" }, { due_at: "asc" }],
    });
    return { success: true, reminders: rows.map(mapReminder) };
  } catch (error) {
    console.error("Erro ao buscar lembretes:", error);
    return { success: false, reminders: [] };
  }
}

export async function getOperatorNotes(): Promise<{
  success: boolean;
  notes: OperatorNote[];
}> {
  if (isDatabaseOffline()) {
    return { success: false, notes: [] };
  }

  try {
    const auth = await getAuthContext();
    if (!auth) {
      return { success: false, notes: [] };
    }
    return getOperatorNotesForUser(auth.userId, auth.companyId);
  } catch (error) {
    console.error("Erro ao buscar notas:", error);
    return { success: false, notes: [] };
  }
}

export async function createOperatorNote(content: string): Promise<{
  success: boolean;
  note?: OperatorNote;
  error?: string;
}> {
  const trimmed = content.trim();
  if (!trimmed) {
    return { success: false, error: "Escreva algo na nota." };
  }

  if (isDatabaseOffline()) {
    return { success: false, error: "Banco de dados indisponível." };
  }

  try {
    const auth = await getAuthContext();
  if (auth) assertCanWrite(auth);
    if (!auth) {
      return { success: false, error: "Não autenticado" };
    }
    const row = await prisma.operatorNote.create({
      data: {
        user_id: auth.userId,
        company_id: auth.companyId,
        content: trimmed,
      },
    });
    return { success: true, note: mapNote(row) };
  } catch (error) {
    console.error("Erro ao criar nota:", error);
    return { success: false, error: "Não foi possível salvar a nota." };
  }
}

export async function deleteOperatorNote(id: string): Promise<{ success: boolean }> {
  if (isDatabaseOffline()) {
    return { success: false };
  }

  try {
    const auth = await getAuthContext();
  if (auth) assertCanWrite(auth);
    if (!auth) {
      return { success: false };
    }
    await prisma.operatorNote.deleteMany({
      where: { id, user_id: auth.userId },
    });
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir nota:", error);
    return { success: false };
  }
}

export async function toggleOperatorNotePin(id: string): Promise<{ success: boolean }> {
  if (isDatabaseOffline()) {
    return { success: false };
  }

  try {
    const auth = await getAuthContext();
  if (auth) assertCanWrite(auth);
    if (!auth) {
      return { success: false };
    }
    const existing = await prisma.operatorNote.findFirst({
      where: { id, user_id: auth.userId },
    });
    if (!existing) return { success: false };

    await prisma.operatorNote.update({
      where: { id },
      data: { pinned: !existing.pinned },
    });
    return { success: true };
  } catch (error) {
    console.error("Erro ao fixar nota:", error);
    return { success: false };
  }
}

export async function getOperatorReminders(): Promise<{
  success: boolean;
  reminders: OperatorReminder[];
}> {
  if (isDatabaseOffline()) {
    return { success: false, reminders: [] };
  }

  try {
    const auth = await getAuthContext();
    if (!auth) {
      return { success: false, reminders: [] };
    }
    return getOperatorRemindersForUser(auth.userId, auth.companyId);
  } catch (error) {
    console.error("Erro ao buscar lembretes:", error);
    return { success: false, reminders: [] };
  }
}

export async function createOperatorReminder(
  title: string,
  dueAtIso: string
): Promise<{ success: boolean; reminder?: OperatorReminder; error?: string }> {
  const trimmed = title.trim();
  if (!trimmed) {
    return { success: false, error: "Informe o título do lembrete." };
  }

  const dueAt = new Date(dueAtIso);
  if (Number.isNaN(dueAt.getTime())) {
    return { success: false, error: "Data ou hora inválida." };
  }

  if (isDatabaseOffline()) {
    return { success: false, error: "Banco de dados indisponível." };
  }

  try {
    const auth = await getAuthContext();
  if (auth) assertCanWrite(auth);
    if (!auth) {
      return { success: false, error: "Não autenticado" };
    }
    const row = await prisma.operatorReminder.create({
      data: {
        user_id: auth.userId,
        company_id: auth.companyId,
        title: trimmed,
        due_at: dueAt,
      },
    });
    return { success: true, reminder: mapReminder(row) };
  } catch (error) {
    console.error("Erro ao criar lembrete:", error);
    return { success: false, error: "Não foi possível salvar o lembrete." };
  }
}

export async function toggleOperatorReminderDone(id: string): Promise<{ success: boolean }> {
  if (isDatabaseOffline()) {
    return { success: false };
  }

  try {
    const auth = await getAuthContext();
  if (auth) assertCanWrite(auth);
    if (!auth) {
      return { success: false };
    }
    const existing = await prisma.operatorReminder.findFirst({
      where: { id, user_id: auth.userId },
    });
    if (!existing) return { success: false };

    await prisma.operatorReminder.update({
      where: { id },
      data: { done: !existing.done },
    });
    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar lembrete:", error);
    return { success: false };
  }
}

export async function deleteOperatorReminder(id: string): Promise<{ success: boolean }> {
  if (isDatabaseOffline()) {
    return { success: false };
  }

  try {
    const auth = await getAuthContext();
  if (auth) assertCanWrite(auth);
    if (!auth) {
      return { success: false };
    }
    await prisma.operatorReminder.deleteMany({
      where: { id, user_id: auth.userId },
    });
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir lembrete:", error);
    return { success: false };
  }
}
