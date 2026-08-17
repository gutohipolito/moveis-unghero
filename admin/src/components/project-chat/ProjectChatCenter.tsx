"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2, MessagesSquare, Search } from "lucide-react";
import { useProjectChat } from "@/context/ProjectChatContext";
import {
  getApprovedClientChatUnread,
  listApprovedClientChats,
} from "@/app/actions/projectChat";
import {
  PROJECT_CHAT_SEARCH_MIN,
  type ProjectChatClientDTO,
} from "@/lib/projectChat";
import { PROJECT_STATUS_LABELS } from "@/lib/navLabels";
import { cn } from "@/lib/utils";

const BADGE_POLL_VISIBLE_MS = 20_000;
const BADGE_POLL_HIDDEN_MS = 2 * 60_000;

interface ProjectChatCenterProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function formatWhen(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const sameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  if (sameDay) {
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function statusLabel(status: string) {
  return PROJECT_STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

export default function ProjectChatCenter({
  isOpen,
  onOpenChange,
}: ProjectChatCenterProps) {
  const { openProject } = useProjectChat();
  const [internalOpen, setInternalOpen] = useState(false);
  const [clients, setClients] = useState<ProjectChatClientDTO[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | null>(null);
  const open = isOpen ?? internalOpen;
  const setOpen = (value: boolean) => {
    if (onOpenChange) onOpenChange(value);
    else setInternalOpen(value);
  };

  const refreshList = useCallback(async (search: string) => {
    setLoading(true);
    const result = await listApprovedClientChats({ query: search });
    setLoading(false);
    if (!result.success) return;
    setClients(result.clients);
    setUnreadTotal(result.unreadTotal);
  }, []);

  const refreshBadge = useCallback(async () => {
    const result = await getApprovedClientChatUnread();
    if (result.success) setUnreadTotal(result.unreadTotal);
  }, []);

  useEffect(() => {
    if (!open) return;
    void refreshList(query);
    // Busca digitada dispara refreshList via debounce, não por este efeito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, refreshList]);

  useEffect(() => {
    let timer: number | undefined;
    const tick = () => {
      if (document.visibilityState === "visible") void refreshBadge();
    };
    const arm = () => {
      if (timer) window.clearInterval(timer);
      timer = window.setInterval(
        tick,
        document.visibilityState === "visible" ? BADGE_POLL_VISIBLE_MS : BADGE_POLL_HIDDEN_MS
      );
    };
    arm();
    void refreshBadge();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshBadge();
      arm();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      if (timer) window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshBadge]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  function onSearch(value: string) {
    setQuery(value);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void refreshList(value);
    }, 280);
  }

  function openClientChat(client: ProjectChatClientDTO) {
    if (client.projects.length === 1) {
      const project = client.projects[0];
      openProject(project.projectId, client.clientName);
      setOpen(false);
      return;
    }
    setExpandedId((current) => (current === client.clientId ? null : client.clientId));
  }

  function openProjectChat(projectId: string, clientName: string) {
    openProject(projectId, clientName);
    setOpen(false);
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="notification-trigger"
        aria-label={
          unreadTotal > 0
            ? `Conversas internas, ${unreadTotal} não lida${unreadTotal === 1 ? "" : "s"}`
            : "Conversas internas por cliente"
        }
        aria-expanded={open}
        title="Conversas internas"
      >
        <MessagesSquare className="h-4 w-4" />
        {unreadTotal > 0 && (
          <span className="notification-badge">
            {unreadTotal > 9 ? "9+" : unreadTotal}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <div className="notification-panel-heading">
              <p className="notification-panel-title">Conversas internas</p>
              <p className="notification-panel-subtitle">
                Clientes com orçamento aprovado.
              </p>
            </div>
            {unreadTotal > 0 && (
              <div className="notification-panel-meta">
                <span className="notification-panel-count">
                  {unreadTotal} não lida{unreadTotal === 1 ? "" : "s"}
                </span>
              </div>
            )}
          </div>

          <div className="border-b border-border/60 px-3 py-2">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Buscar cliente…"
                className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
          </div>

          {loading && clients.length === 0 ? (
            <div className="notification-empty">
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : clients.length === 0 ? (
            <div className="notification-empty">
              <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MessagesSquare className="h-5 w-5" />
              </span>
              <p className="text-sm font-semibold text-foreground">
                {query.trim().length >= PROJECT_CHAT_SEARCH_MIN
                  ? "Nenhum cliente encontrado"
                  : "Nenhum aprovado ainda"}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {query.trim().length >= PROJECT_CHAT_SEARCH_MIN
                  ? "Tente outro nome."
                  : "A lista mostra clientes com orçamento aprovado."}
              </p>
            </div>
          ) : (
            <ul className="max-h-[min(24rem,70vh)] overflow-y-auto">
              {clients.map((client) => {
                const expanded = expandedId === client.clientId;
                const preview =
                  client.lastMessagePreview ||
                  (client.projectCount > 1
                    ? `${client.projectCount} projetos`
                    : client.projects[0]?.rooms ||
                      statusLabel(client.projects[0]?.status ?? ""));
                return (
                  <li key={client.clientId} className="border-b border-border/60 last:border-b-0">
                    <button
                      type="button"
                      onClick={() => openClientChat(client)}
                      className={cn(
                        "flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/50",
                        client.unreadCount > 0 && "bg-primary/[0.04]"
                      )}
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold tracking-wide text-white">
                        {client.clientInitials}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-xs font-bold text-foreground">
                            {client.clientName}
                          </span>
                          {client.lastMessageAt && (
                            <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                              {formatWhen(client.lastMessageAt)}
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1.5">
                          <span className="truncate text-[11px] text-muted-foreground">
                            {preview}
                          </span>
                          {client.projectCount > 1 && (
                            <ChevronDown
                              className={cn(
                                "ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                                expanded && "rotate-180"
                              )}
                            />
                          )}
                        </span>
                      </span>
                      {client.unreadCount > 0 && (
                        <span className="mt-1 flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                          {client.unreadCount > 9 ? "9+" : client.unreadCount}
                        </span>
                      )}
                    </button>
                    {expanded && client.projects.length > 1 && (
                      <ul className="border-t border-border/40 bg-muted/20 pb-1.5 pl-11 pr-3 pt-1">
                        {client.projects.map((project) => (
                          <li key={project.projectId}>
                            <button
                              type="button"
                              onClick={() =>
                                openProjectChat(project.projectId, client.clientName)
                              }
                              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted/60"
                            >
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[11px] font-semibold text-foreground">
                                  {project.rooms || statusLabel(project.status)}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {project.rooms
                                    ? statusLabel(project.status)
                                    : project.lastMessagePreview || "Ainda sem mensagens"}
                                </span>
                              </span>
                              {project.unreadCount > 0 && (
                                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                                  {project.unreadCount > 9 ? "9+" : project.unreadCount}
                                </span>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
