"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import { requireModuleAccess } from "@/lib/moduleAccess";
import { capitalizeText } from "@/lib/utils";
import { labelProjectStatus } from "@/lib/navLabels";
import type {
  SupplyTicketDTO,
  SupplyTicketPriority,
  SupplyTicketStatus,
} from "@/lib/chamados";

type TicketRow = {
  id: string;
  titulo: string;
  descricao: string;
  status: SupplyTicketStatus;
  prioridade: SupplyTicketPriority;
  project_id: string | null;
  resolucao: string | null;
  imagens: string[];
  createdAt: Date;
  resolvedAt: Date | null;
  requested_by: string;
  requester: { name: string } | null;
  resolver: { name: string } | null;
  project: { id: string; status_geral: string; client: { nome: string } } | null;
};

function mapTicket(row: TicketRow): SupplyTicketDTO {
  return {
    id: row.id,
    titulo: row.titulo,
    descricao: row.descricao,
    status: row.status,
    prioridade: row.prioridade,
    projectId: row.project_id,
    projectLabel: row.project
      ? `${row.project.client.nome} · ${labelProjectStatus(row.project.status_geral)}`
      : null,
    requesterId: row.requested_by,
    requesterName: row.requester?.name ?? "—",
    resolverName: row.resolver?.name ?? null,
    resolucao: row.resolucao,
    imagens: row.imagens ?? [],
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
  };
}

const TICKET_INCLUDE = {
  requester: { select: { name: true } },
  resolver: { select: { name: true } },
  project: {
    select: { id: true, status_geral: true, client: { select: { nome: true } } },
  },
} as const;

export interface CreateSupplyTicketInput {
  titulo: string;
  descricao: string;
  prioridade?: SupplyTicketPriority;
  projectId?: string | null;
  imagens?: string[];
}

export type SupplyTicketResult =
  | { success: true; ticket: SupplyTicketDTO }
  | { success: false; error: string };

export async function listSupplyTickets(): Promise<{
  success: boolean;
  tickets: SupplyTicketDTO[];
}> {
  const auth = await requireModuleAccess("chamados");
  try {
    const rows = await prisma.supplyTicket.findMany({
      where: { company_id: auth.companyId },
      include: TICKET_INCLUDE,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
    return { success: true, tickets: rows.map((r) => mapTicket(r as TicketRow)) };
  } catch (error) {
    console.error("Erro ao listar chamados:", error);
    return { success: false, tickets: [] };
  }
}

export async function createSupplyTicket(
  input: CreateSupplyTicketInput
): Promise<SupplyTicketResult> {
  const auth = await requireModuleAccess("chamados");

  const titulo = capitalizeText((input.titulo ?? "").trim());
  const descricao = (input.descricao ?? "").trim();
  if (!titulo) return { success: false, error: "Informe o título do chamado." };
  if (!descricao) return { success: false, error: "Descreva o insumo em falta." };

  let projectId: string | null = null;
  if (input.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: input.projectId, client: { company_id: auth.companyId } },
      select: { id: true },
    });
    if (!project) return { success: false, error: "Projeto inválido." };
    projectId = project.id;
  }

  const prioridade: SupplyTicketPriority = input.prioridade ?? "MEDIA";

  const imagens = Array.isArray(input.imagens)
    ? input.imagens
        .filter((u): u is string => typeof u === "string" && u.includes("blob.vercel-storage.com"))
        .slice(0, 6)
    : [];

  try {
    const row = await prisma.supplyTicket.create({
      data: {
        company_id: auth.companyId,
        titulo,
        descricao,
        prioridade,
        project_id: projectId,
        requested_by: auth.userId,
        imagens,
      },
      include: TICKET_INCLUDE,
    });
    revalidatePath("/chamados");
    revalidatePath("/", "layout");
    return { success: true, ticket: mapTicket(row as TicketRow) };
  } catch (error) {
    console.error("Erro ao criar chamado:", error);
    return { success: false, error: "Não foi possível abrir o chamado." };
  }
}

/** Atualiza o status do chamado (admin). Resolver define quem resolveu. */
export async function setSupplyTicketStatus(
  id: string,
  status: SupplyTicketStatus,
  resolucao?: string
): Promise<SupplyTicketResult> {
  const auth = await requireAdmin();

  const existing = await prisma.supplyTicket.findFirst({
    where: { id, company_id: auth.companyId },
    select: { id: true },
  });
  if (!existing) return { success: false, error: "Chamado não encontrado." };

  const isResolved = status === "RESOLVIDO";
  try {
    const row = await prisma.supplyTicket.update({
      where: { id },
      data: {
        status,
        resolved_by: isResolved ? auth.userId : null,
        resolvedAt: isResolved ? new Date() : null,
        resolucao: isResolved ? (resolucao?.trim() || null) : null,
      },
      include: TICKET_INCLUDE,
    });
    revalidatePath("/chamados");
    revalidatePath("/", "layout");
    return { success: true, ticket: mapTicket(row as TicketRow) };
  } catch (error) {
    console.error("Erro ao atualizar chamado:", error);
    return { success: false, error: "Não foi possível atualizar o chamado." };
  }
}

/** Cancela um chamado. Permitido ao autor (se ainda aberto) ou a um admin. */
export async function cancelSupplyTicket(id: string): Promise<SupplyTicketResult> {
  const auth = await requireModuleAccess("chamados");

  const existing = await prisma.supplyTicket.findFirst({
    where: { id, company_id: auth.companyId },
    select: { id: true, requested_by: true, status: true },
  });
  if (!existing) return { success: false, error: "Chamado não encontrado." };

  const isOwner = existing.requested_by === auth.userId;
  const isAdmin = auth.cargo === "ADMIN";
  if (!isAdmin && !(isOwner && existing.status === "ABERTO")) {
    return { success: false, error: "Sem permissão para cancelar este chamado." };
  }

  try {
    const row = await prisma.supplyTicket.update({
      where: { id },
      data: { status: "CANCELADO", resolved_by: null, resolvedAt: null, resolucao: null },
      include: TICKET_INCLUDE,
    });
    revalidatePath("/chamados");
    revalidatePath("/", "layout");
    return { success: true, ticket: mapTicket(row as TicketRow) };
  } catch (error) {
    console.error("Erro ao cancelar chamado:", error);
    return { success: false, error: "Não foi possível cancelar o chamado." };
  }
}
