"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth, getAuthContext, assertCanWrite } from "@/lib/auth-guard";
import { checkRateLimitAsync } from "@/lib/rateLimit";
import { isOpsLimitedRole } from "@/lib/permissions";
import { OPS_CRM_STATUS_SET, OPS_CRM_STATUSES } from "@/lib/crmOpsAccess";
import {
  PROJECT_CHAT_BODY_MAX,
  PROJECT_CHAT_SEARCH_MIN,
  canCloseProjectChat,
  canWriteProjectChat,
  previewChatBody,
  projectChatAvatarInitials,
  projectChatStatusFilter,
  roleLabelForChat,
  type ProjectChatClientDTO,
  type ProjectChatClientProjectDTO,
  type ProjectChatMessageDTO,
  type ProjectChatThreadDTO,
} from "@/lib/projectChat";
import { Prisma, type Role } from "@prisma/client";

function mapMessage(
  row: {
    id: string;
    author_id: string | null;
    author_name: string;
    author_role: string;
    body: string;
    createdAt: Date;
  },
  userId: string
): ProjectChatMessageDTO {
  return {
    id: row.id,
    authorId: row.author_id,
    authorName: row.author_name,
    authorRole: row.author_role,
    authorRoleLabel: roleLabelForChat(row.author_role),
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    mine: row.author_id === userId,
  };
}

async function loadVisibleProject(projectId: string, companyId: string, role: Role) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      client: { company_id: companyId },
    },
    select: {
      id: true,
      status_geral: true,
      client: { select: { nome: true } },
    },
  });
  if (!project) return null;
  if (isOpsLimitedRole(role) && !OPS_CRM_STATUS_SET.has(project.status_geral)) {
    return null;
  }
  return project;
}

async function markThreadRead(threadId: string, userId: string) {
  await prisma.projectChatRead.upsert({
    where: { thread_id_user_id: { thread_id: threadId, user_id: userId } },
    create: { thread_id: threadId, user_id: userId, lastReadAt: new Date() },
    update: { lastReadAt: new Date() },
  });
}

export async function listProjectChats(options?: {
  query?: string;
  includeClosed?: boolean;
}): Promise<{ success: boolean; threads: ProjectChatThreadDTO[]; unreadTotal: number }> {
  const auth = await getAuthContext();
  if (!auth) return { success: false, threads: [], unreadTotal: 0 };
  const query = (options?.query ?? "").trim();
  const statusFilter = projectChatStatusFilter(auth.cargo);

  const where: Prisma.ProjectChatThreadWhereInput = {
    company_id: auth.companyId,
    lastMessageAt: { not: null },
    project: statusFilter ? { status_geral: statusFilter } : undefined,
  };

  if (!options?.includeClosed) {
    where.closedAt = null;
  }

  if (query.length >= PROJECT_CHAT_SEARCH_MIN) {
    where.OR = [
      { project: { client: { nome: { contains: query, mode: "insensitive" } } } },
      { lastMessagePreview: { contains: query, mode: "insensitive" } },
      { messages: { some: { body: { contains: query, mode: "insensitive" } } } },
    ];
  }

  try {
    const rows = await prisma.projectChatThread.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      take: 80,
      select: {
        id: true,
        project_id: true,
        closedAt: true,
        lastMessageAt: true,
        lastMessagePreview: true,
        project: {
          select: {
            status_geral: true,
            client: { select: { nome: true } },
          },
        },
        reads: {
          where: { user_id: auth.userId },
          select: { lastReadAt: true },
          take: 1,
        },
      },
    });

    const unreadByThread = new Map<string, number>();
    if (rows.length > 0) {
      const unreadRows = await prisma.$queryRaw<Array<{ thread_id: string; count: bigint }>>`
        SELECT m.thread_id, COUNT(*)::bigint AS count
        FROM "ProjectChatMessage" m
        LEFT JOIN "ProjectChatRead" r
          ON r.thread_id = m.thread_id AND r.user_id = ${auth.userId}
        WHERE m.thread_id IN (${Prisma.join(rows.map((row) => row.id))})
          AND (m.author_id IS NULL OR m.author_id <> ${auth.userId})
          AND (r."lastReadAt" IS NULL OR m."createdAt" > r."lastReadAt")
        GROUP BY m.thread_id
      `;
      for (const item of unreadRows) {
        unreadByThread.set(item.thread_id, Number(item.count));
      }
    }

    const threads: ProjectChatThreadDTO[] = [];
    let unreadTotal = 0;

    for (const row of rows) {
      const unreadCount = unreadByThread.get(row.id) ?? 0;
      unreadTotal += unreadCount;
      const clientName = row.project.client.nome;
      threads.push({
        id: row.id,
        projectId: row.project_id,
        clientName,
        clientInitials: projectChatAvatarInitials(clientName),
        status: row.project.status_geral,
        closed: Boolean(row.closedAt),
        closedAt: row.closedAt?.toISOString() ?? null,
        lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
        lastMessagePreview: row.lastMessagePreview,
        unreadCount,
      });
    }

    return { success: true, threads, unreadTotal };
  } catch (error) {
    console.error("Erro ao listar chats do projeto:", error);
    return { success: false, threads: [], unreadTotal: 0 };
  }
}

async function unreadCountsForThreads(
  userId: string,
  threadIds: string[]
): Promise<Map<string, number>> {
  const unreadByThread = new Map<string, number>();
  if (threadIds.length === 0) return unreadByThread;
  const unreadRows = await prisma.$queryRaw<Array<{ thread_id: string; count: bigint }>>`
    SELECT m.thread_id, COUNT(*)::bigint AS count
    FROM "ProjectChatMessage" m
    LEFT JOIN "ProjectChatRead" r
      ON r.thread_id = m.thread_id AND r.user_id = ${userId}
    WHERE m.thread_id IN (${Prisma.join(threadIds)})
      AND (m.author_id IS NULL OR m.author_id <> ${userId})
      AND (r."lastReadAt" IS NULL OR m."createdAt" > r."lastReadAt")
    GROUP BY m.thread_id
  `;
  for (const item of unreadRows) {
    unreadByThread.set(item.thread_id, Number(item.count));
  }
  return unreadByThread;
}

function approvedClientProjectWhere(
  companyId: string,
  role: Role,
  query: string
): Prisma.ProjectWhereInput {
  const nameFilter =
    query.length >= PROJECT_CHAT_SEARCH_MIN
      ? { nome: { contains: query, mode: "insensitive" as const } }
      : undefined;

  if (isOpsLimitedRole(role)) {
    return {
      status_geral: { in: OPS_CRM_STATUSES },
      client: { company_id: companyId, ...(nameFilter ? nameFilter : {}) },
    };
  }

  return {
    status_geral: { not: "PERDIDO" },
    client: { company_id: companyId, ...(nameFilter ? { nome: nameFilter.nome } : {}) },
    OR: [
      { status_geral: { in: OPS_CRM_STATUSES } },
      { quotes: { some: { aprovado_em: { not: null } } } },
    ],
  };
}

export async function listApprovedClientChats(options?: {
  query?: string;
}): Promise<{ success: boolean; clients: ProjectChatClientDTO[]; unreadTotal: number }> {
  const auth = await getAuthContext();
  if (!auth) return { success: false, clients: [], unreadTotal: 0 };
  const query = (options?.query ?? "").trim();

  try {
    const projects = await prisma.project.findMany({
      where: approvedClientProjectWhere(auth.companyId, auth.cargo, query),
      orderBy: { updatedAt: "desc" },
      take: 180,
      select: {
        id: true,
        client_id: true,
        status_geral: true,
        client: { select: { nome: true } },
        environments: {
          select: { nome: true },
          orderBy: { createdAt: "asc" },
          take: 3,
        },
        chatThread: {
          select: {
            id: true,
            closedAt: true,
            lastMessageAt: true,
            lastMessagePreview: true,
          },
        },
      },
    });

    const threadIds = projects
      .map((project) => project.chatThread?.id)
      .filter((id): id is string => Boolean(id));
    const unreadByThread = await unreadCountsForThreads(auth.userId, threadIds);

    const byClient = new Map<
      string,
      {
        clientId: string;
        clientName: string;
        projects: ProjectChatClientProjectDTO[];
      }
    >();

    for (const project of projects) {
      const rooms = project.environments
        .map((item) => item.nome.trim())
        .filter(Boolean)
        .join(", ");
      const thread = project.chatThread;
      const unreadCount = thread ? unreadByThread.get(thread.id) ?? 0 : 0;
      const row: ProjectChatClientProjectDTO = {
        projectId: project.id,
        status: project.status_geral,
        rooms,
        lastMessageAt: thread?.lastMessageAt?.toISOString() ?? null,
        lastMessagePreview: thread?.lastMessagePreview ?? null,
        unreadCount,
        closed: Boolean(thread?.closedAt),
      };

      const existing = byClient.get(project.client_id);
      if (existing) {
        existing.projects.push(row);
      } else {
        byClient.set(project.client_id, {
          clientId: project.client_id,
          clientName: project.client.nome,
          projects: [row],
        });
      }
    }

    const clients: ProjectChatClientDTO[] = [];
    let unreadTotal = 0;

    for (const group of byClient.values()) {
      group.projects.sort((a, b) => {
        if ((a.unreadCount > 0) !== (b.unreadCount > 0)) {
          return a.unreadCount > 0 ? -1 : 1;
        }
        if ((a.status === "FINALIZADO") !== (b.status === "FINALIZADO")) {
          return a.status === "FINALIZADO" ? 1 : -1;
        }
        const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return bTime - aTime;
      });

      const unreadCount = group.projects.reduce((sum, item) => sum + item.unreadCount, 0);
      unreadTotal += unreadCount;
      const latest = group.projects.find((item) => item.lastMessageAt) ?? group.projects[0];

      clients.push({
        clientId: group.clientId,
        clientName: group.clientName,
        clientInitials: projectChatAvatarInitials(group.clientName),
        unreadCount,
        lastMessageAt: latest?.lastMessageAt ?? null,
        lastMessagePreview: latest?.lastMessagePreview ?? null,
        projectCount: group.projects.length,
        projects: group.projects,
      });
    }

    clients.sort((a, b) => {
      if ((a.unreadCount > 0) !== (b.unreadCount > 0)) {
        return a.unreadCount > 0 ? -1 : 1;
      }
      const aDone = a.projects.every((item) => item.status === "FINALIZADO");
      const bDone = b.projects.every((item) => item.status === "FINALIZADO");
      if (aDone !== bDone) return aDone ? 1 : -1;
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      if (aTime !== bTime) return bTime - aTime;
      return a.clientName.localeCompare(b.clientName, "pt-BR");
    });

    return { success: true, clients, unreadTotal };
  } catch (error) {
    console.error("Erro ao listar conversas por cliente:", error);
    return { success: false, clients: [], unreadTotal: 0 };
  }
}

export async function getApprovedClientChatUnread(): Promise<{
  success: boolean;
  unreadTotal: number;
}> {
  const auth = await getAuthContext();
  if (!auth) return { success: false, unreadTotal: 0 };
  try {
    const threads = await prisma.projectChatThread.findMany({
      where: {
        company_id: auth.companyId,
        lastMessageAt: { not: null },
        closedAt: null,
        project: approvedClientProjectWhere(auth.companyId, auth.cargo, ""),
      },
      select: { id: true },
      take: 180,
    });
    const unreadByThread = await unreadCountsForThreads(
      auth.userId,
      threads.map((thread) => thread.id)
    );
    let unreadTotal = 0;
    for (const count of unreadByThread.values()) unreadTotal += count;
    return { success: true, unreadTotal };
  } catch (error) {
    console.error("Erro ao contar não lidas do chat por cliente:", error);
    return { success: false, unreadTotal: 0 };
  }
}

export async function getProjectChatBadge(): Promise<{
  success: boolean;
  unreadTotal: number;
  items: ProjectChatThreadDTO[];
}> {
  const listed = await listProjectChats({ includeClosed: false });
  return {
    success: listed.success,
    unreadTotal: listed.unreadTotal,
    items: listed.threads.filter((thread) => thread.unreadCount > 0),
  };
}

export async function getProjectChat(
  projectId: string,
  options?: { markRead?: boolean }
): Promise<{
  success: boolean;
  error?: string;
  canWrite: boolean;
  canClose: boolean;
  project?: {
    id: string;
    clientName: string;
    clientInitials: string;
    status: string;
  };
  thread?: {
    id: string;
    closed: boolean;
    closedAt: string | null;
  } | null;
  messages: ProjectChatMessageDTO[];
}> {
  const auth = await requireAuth();
  try {
    const project = await loadVisibleProject(projectId, auth.companyId, auth.cargo);
  if (!project) {
    return { success: false, error: "Projeto não encontrado.", canWrite: false, canClose: false, messages: [] };
  }

  const thread = await prisma.projectChatThread.findUnique({
    where: { project_id: project.id },
    select: { id: true, closedAt: true },
  });

  let messages: ProjectChatMessageDTO[] = [];
  if (thread) {
    const rows = await prisma.projectChatMessage.findMany({
      where: { thread_id: thread.id },
      orderBy: { createdAt: "asc" },
      take: 300,
    });
    messages = rows.map((row) => mapMessage(row, auth.userId));
    if (options?.markRead !== false) {
      await markThreadRead(thread.id, auth.userId);
    }
  }

  return {
    success: true,
    canWrite: canWriteProjectChat(auth.cargo),
    canClose: canCloseProjectChat(auth.cargo),
    project: {
      id: project.id,
      clientName: project.client.nome,
      clientInitials: projectChatAvatarInitials(project.client.nome),
      status: project.status_geral,
    },
    thread: thread
      ? { id: thread.id, closed: Boolean(thread.closedAt), closedAt: thread.closedAt?.toISOString() ?? null }
      : null,
    messages,
  };
  } catch (error) {
    console.error("Erro ao abrir chat do projeto:", error);
    return { success: false, error: "Não foi possível abrir a conversa.", canWrite: false, canClose: false, messages: [] };
  }
}

export async function postProjectChatMessage(
  projectId: string,
  body: string
): Promise<{ success: boolean; error?: string; message?: ProjectChatMessageDTO }> {
  const auth = await requireAuth();
  assertCanWrite(auth);

  const text = body.replace(/\r\n/g, "\n").trim();
  if (!text) return { success: false, error: "Escreva uma mensagem." };
  if (text.length > PROJECT_CHAT_BODY_MAX) {
    return { success: false, error: `A mensagem pode ter no máximo ${PROJECT_CHAT_BODY_MAX} caracteres.` };
  }

  const limited = await checkRateLimitAsync(`project-chat:${auth.userId}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return { success: false, error: "Muitas mensagens seguidas. Aguarde um instante." };
  }

  const project = await loadVisibleProject(projectId, auth.companyId, auth.cargo);
  if (!project) return { success: false, error: "Projeto não encontrado." };

  const author = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { name: true, cargo: true },
  });

  try {
    const existing = await prisma.projectChatThread.findUnique({
      where: { project_id: project.id },
      select: { id: true, closedAt: true },
    });
    if (existing?.closedAt) {
      return { success: false, error: "Esta conversa foi encerrada. Peça ao comercial para reabrir." };
    }

    const thread =
      existing ??
      (await prisma.projectChatThread.create({
        data: {
          project_id: project.id,
          company_id: auth.companyId,
        },
        select: { id: true, closedAt: true },
      }));

    const row = await prisma.projectChatMessage.create({
      data: {
        thread_id: thread.id,
        author_id: auth.userId,
        author_name: author?.name?.trim() || "Colaborador",
        author_role: author?.cargo ?? auth.cargo,
        body: text,
      },
    });

    await prisma.projectChatThread.update({
      where: { id: thread.id },
      data: {
        lastMessageAt: row.createdAt,
        lastMessagePreview: previewChatBody(text, 180),
      },
    });
    await markThreadRead(thread.id, auth.userId);

    return { success: true, message: mapMessage(row, auth.userId) };
  } catch (error) {
    console.error("Erro ao enviar mensagem do chat:", error);
    return { success: false, error: "Não foi possível enviar a mensagem." };
  }
}

export async function setProjectChatClosed(
  projectId: string,
  closed: boolean
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireAuth();
  assertCanWrite(auth);
  if (!canCloseProjectChat(auth.cargo)) {
    return { success: false, error: "Só comercial e diretoria podem encerrar a conversa." };
  }

  const project = await loadVisibleProject(projectId, auth.companyId, auth.cargo);
  if (!project) return { success: false, error: "Projeto não encontrado." };

  const thread = await prisma.projectChatThread.findUnique({
    where: { project_id: project.id },
    select: { id: true },
  });
  if (!thread) {
    return { success: false, error: "Ainda não há conversa neste projeto." };
  }

  await prisma.projectChatThread.update({
    where: { id: thread.id },
    data: closed
      ? { closedAt: new Date(), closedById: auth.userId }
      : { closedAt: null, closedById: null },
  });

  return { success: true };
}
