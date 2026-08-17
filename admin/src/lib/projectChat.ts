import type { Role } from "@prisma/client";
import { isOpsLimitedRole, isReadOnlyRole, ROLE_LABELS } from "@/lib/permissions";
import { OPS_CRM_STATUSES } from "@/lib/crmOpsAccess";
import { clientNameInitials } from "@/lib/quoteCodigo";

export const PROJECT_CHAT_BODY_MAX = 4_000;
export const PROJECT_CHAT_SEARCH_MIN = 2;

export function canWriteProjectChat(role: Role | string | null | undefined): boolean {
  return !isReadOnlyRole(role);
}

export function canCloseProjectChat(role: Role | string | null | undefined): boolean {
  return role === "ADMIN" || role === "COMERCIAL";
}

export function projectChatStatusFilter(role: Role | string | null | undefined) {
  if (isOpsLimitedRole(role)) {
    return { in: OPS_CRM_STATUSES };
  }
  return undefined;
}

/** Duas letras para o FAB (primeiro e último nome significativos). */
export function projectChatAvatarInitials(nome: string): string {
  const full = clientNameInitials(nome);
  if (full.length <= 2) return full || "CL";
  return `${full[0]}${full[full.length - 1]}`;
}

export function previewChatBody(body: string, max = 140): string {
  const compact = body.replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 1)}…`;
}

export function roleLabelForChat(role: string | null | undefined): string {
  if (role && role in ROLE_LABELS) {
    return ROLE_LABELS[role as Role];
  }
  return "Equipe";
}

export type ProjectChatMessageDTO = {
  id: string;
  authorId: string | null;
  authorName: string;
  authorRole: string;
  authorRoleLabel: string;
  body: string;
  createdAt: string;
  mine: boolean;
};

export type ProjectChatThreadDTO = {
  id: string;
  projectId: string;
  clientName: string;
  clientInitials: string;
  status: string;
  closed: boolean;
  closedAt: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
};

export type ProjectChatFocus = {
  projectId: string;
  clientName: string;
};
