"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Loader2,
  Mail,
  Search,
  Send,
  X,
} from "lucide-react";
import { useLiveEntity } from "@/context/LiveSyncContext";
import { useProjectChat } from "@/context/ProjectChatContext";
import {
  getProjectChat,
  getProjectChatBadge,
  listProjectChats,
  postProjectChatMessage,
  setProjectChatClosed,
} from "@/app/actions/projectChat";
import {
  PROJECT_CHAT_BODY_MAX,
  PROJECT_CHAT_SEARCH_MIN,
  projectChatAvatarInitials,
  type ProjectChatMessageDTO,
  type ProjectChatThreadDTO,
} from "@/lib/projectChat";
import { loadNotificationPrefs } from "@/lib/notificationChannels";
import { playNotificationChime } from "@/lib/notificationSound";
import { cn } from "@/lib/utils";

const BADGE_POLL_VISIBLE_MS = 20_000;
const BADGE_POLL_HIDDEN_MS = 2 * 60_000;
const MAX_PEEKS = 2;

const STATUS_LABEL: Record<string, string> = {
  LEAD: "Lead",
  ORCAMENTO: "Orçamento",
  NEGOCIACAO: "Negociação",
  CONFERENCIA_TECNICA: "Conf. Técnica",
  APROVADO: "Aprovado",
  PRODUCAO: "Produção",
  INSTALACAO: "Instalação",
  FINALIZADO: "Finalizado",
  PERDIDO: "Perdido",
};

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

export default function ProjectChatDock() {
  const { open, setOpen, focus, activeProjectId, openProject, showInbox } = useProjectChat();
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [threads, setThreads] = useState<ProjectChatThreadDTO[]>([]);
  const [includeClosed, setIncludeClosed] = useState(false);
  const [inboxQuery, setInboxQuery] = useState("");
  const [threadQuery, setThreadQuery] = useState("");
  const [messages, setMessages] = useState<ProjectChatMessageDTO[]>([]);
  const [projectMeta, setProjectMeta] = useState<{
    id: string;
    clientName: string;
    clientInitials: string;
    status: string;
  } | null>(null);
  const [threadClosed, setThreadClosed] = useState(false);
  const [canWrite, setCanWrite] = useState(true);
  const [canClose, setCanClose] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadItems, setUnreadItems] = useState<ProjectChatThreadDTO[]>([]);
  const [dismissedPeeks, setDismissedPeeks] = useState<Set<string>>(() => new Set());
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | undefined>(undefined);
  const knownUnreadRef = useRef<Set<string>>(new Set());
  const badgeReadyRef = useRef(false);

  const viewingProjectId = open ? activeProjectId : null;

  const refreshBadge = useCallback(async () => {
    const result = await getProjectChatBadge();
    if (!result.success) return;

    setUnreadTotal(result.unreadTotal);
    setUnreadItems(result.items);

    const nextKeys = new Set(
      result.items.map((item) => `${item.projectId}:${item.lastMessageAt ?? ""}`)
    );
    if (badgeReadyRef.current) {
      let arrived = false;
      for (const key of nextKeys) {
        if (!knownUnreadRef.current.has(key)) arrived = true;
      }
      if (arrived && !open && loadNotificationPrefs().sound) {
        playNotificationChime({ urgent: true });
      }
    }
    knownUnreadRef.current = nextKeys;
    badgeReadyRef.current = true;
  }, [open]);

  const refreshInbox = useCallback(async (query = inboxQuery, closed = includeClosed) => {
    const result = await listProjectChats({
      query: query.trim().length >= PROJECT_CHAT_SEARCH_MIN ? query : "",
      includeClosed: closed,
    });
    if (result.success) {
      setThreads(result.threads);
    }
  }, [inboxQuery, includeClosed]);

  const refreshThread = useCallback(async (projectId: string) => {
    setLoadingThread(true);
    const result = await getProjectChat(projectId);
    setLoadingThread(false);
    if (!result.success || !result.project) {
      setError(result.error ?? "Não foi possível abrir a conversa.");
      return;
    }
    setError(null);
    setProjectMeta(result.project);
    setMessages(result.messages);
    setThreadClosed(Boolean(result.thread?.closed));
    setCanWrite(result.canWrite);
    setCanClose(result.canClose);
    void refreshBadge();
  }, [refreshBadge]);

  useLiveEntity("projectChat", {
    sync: async () => {
      await Promise.all([refreshBadge(), refreshInbox()]);
      if (viewingProjectId) await refreshThread(viewingProjectId);
    },
    skipInitialSync: true,
  });

  useEffect(() => {
    void refreshBadge();
    void refreshInbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (!focus?.projectId) return;
    if (focus.clientName) {
      setProjectMeta({
        id: focus.projectId,
        clientName: focus.clientName,
        clientInitials: projectChatAvatarInitials(focus.clientName),
        status: projectMeta?.id === focus.projectId ? projectMeta.status : "",
      });
      return;
    }
    void getProjectChat(focus.projectId, { markRead: false }).then((result) => {
      if (result.project) setProjectMeta(result.project);
    }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.projectId, focus?.clientName]);

  useEffect(() => {
    if (!open || !viewingProjectId) return;
    void refreshThread(viewingProjectId);
  }, [open, viewingProjectId, refreshThread]);

  useEffect(() => {
    if (!open || viewingProjectId) return;
    void refreshInbox();
  }, [open, viewingProjectId, refreshInbox]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, open, viewingProjectId]);

  const fabLabel = useMemo(() => {
    if (focus?.clientName) return projectChatAvatarInitials(focus.clientName);
    if (projectMeta && focus?.projectId === projectMeta.id) return projectMeta.clientInitials;
    return null;
  }, [focus, projectMeta]);

  const visibleMessages = useMemo(() => {
    const q = threadQuery.trim().toLowerCase();
    if (q.length < PROJECT_CHAT_SEARCH_MIN) return messages;
    return messages.filter(
      (item) =>
        item.body.toLowerCase().includes(q) || item.authorName.toLowerCase().includes(q)
    );
  }, [messages, threadQuery]);

  function onInboxSearch(value: string) {
    setInboxQuery(value);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void refreshInbox(value, includeClosed);
    }, 280);
  }

  async function handleSend() {
    if (!viewingProjectId || sending) return;
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    setError(null);
    const result = await postProjectChatMessage(viewingProjectId, text);
    setSending(false);
    if (!result.success || !result.message) {
      setError(result.error ?? "Não foi possível enviar.");
      return;
    }
    setDraft("");
    setMessages((prev) => [...prev, result.message!]);
    setThreadClosed(false);
    void refreshInbox();
    void refreshBadge();
  }

  async function handleToggleClosed() {
    if (!viewingProjectId || !canClose) return;
    const result = await setProjectChatClosed(viewingProjectId, !threadClosed);
    if (!result.success) {
      setError(result.error ?? "Não foi possível atualizar a conversa.");
      return;
    }
    setThreadClosed(!threadClosed);
    void refreshInbox();
    void refreshBadge();
  }

  const sortedThreads = useMemo(() => {
    return [...threads].sort((a, b) => {
      if ((a.unreadCount > 0) !== (b.unreadCount > 0)) {
        return a.unreadCount > 0 ? -1 : 1;
      }
      return 0;
    });
  }, [threads]);
  const peekItems = open
    ? []
    : unreadItems.filter(
        (item) => !dismissedPeeks.has(`${item.projectId}:${item.lastMessageAt ?? ""}`)
      );

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          if (focus?.projectId) openProject(focus.projectId, focus.clientName);
          else setOpen(true);
        }}
        aria-label={
          fabUnread > 0
            ? `${fabUnread} conversa${fabUnread === 1 ? "" : "s"} não lida${fabUnread === 1 ? "" : "s"}`
            : focus?.clientName
              ? `Chat interno de ${focus.clientName}`
              : "Conversas internas dos projetos"
        }
        title={
          fabUnread > 0
            ? `${fabUnread} não lida${fabUnread === 1 ? "" : "s"}`
            : focus?.clientName
              ? `Chat · ${focus.clientName}`
              : "Conversas internas"
        }
        data-unread={fabUnread > 0 ? "true" : undefined}
        className={cn(
          "project-chat-fab relative flex h-11 w-11 items-center justify-center rounded-full",
          "bg-slate-900 text-white shadow-lg shadow-slate-900/25",
          "ring-1 ring-white/20 transition-all cursor-pointer",
          "hover:bg-slate-800 active:scale-95"
        )}
      >
        {fabLabel ? (
          <span className="text-[11px] font-bold tracking-wide">{fabLabel}</span>
        ) : (
          <Mail className="h-5 w-5" />
        )}
        {fabUnread > 0 && (
          <span className="notification-badge notification-badge-urgent">
            {fabUnread > 9 ? "9+" : fabUnread}
          </span>
        )}
      </button>

      {!open && peekItems.length > 0 && (
        <div className="project-chat-alert-stack" role="region" aria-label="Mensagens de chat não lidas">
          {peekItems.slice(0, MAX_PEEKS).map((item) => {
            const peekKey = `${item.projectId}:${item.lastMessageAt ?? ""}`;
            return (
              <article
                key={peekKey}
                className="in-app-toast"
                data-priority="high"
                data-accent="chat"
              >
                <button
                  type="button"
                  className="in-app-toast-close"
                  onClick={() =>
                    setDismissedPeeks((prev) => {
                      const next = new Set(prev);
                      next.add(peekKey);
                      return next;
                    })
                  }
                  aria-label="Dispensar aviso"
                >
                  <X className="h-3 w-3" strokeWidth={2.5} />
                </button>
                <div className="in-app-toast-row">
                  <div className="in-app-toast-icon-wrap" aria-hidden>
                    <span className="flex h-full w-full items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-white">
                      {item.clientInitials}
                    </span>
                    <span className="in-app-toast-icon-badge">
                      <Mail className="h-3 w-3" />
                    </span>
                  </div>
                  <div className="in-app-toast-content">
                    <button
                      type="button"
                      className="in-app-toast-main"
                      onClick={() => {
                        setDismissedPeeks((prev) => {
                          const next = new Set(prev);
                          next.add(peekKey);
                          return next;
                        });
                        openProject(item.projectId, item.clientName);
                      }}
                    >
                      <p className="in-app-toast-title">
                        Chat · {item.clientName}
                        {item.unreadCount > 1 ? ` (${item.unreadCount})` : ""}
                      </p>
                      <p className="in-app-toast-message">
                        {item.lastMessagePreview || "Nova mensagem na conversa do projeto."}
                      </p>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {open && (
        <div
          className={cn(
            "project-chat-panel fixed z-50 flex flex-col overflow-hidden",
            "right-3 w-[min(100vw-1.5rem,26rem)]",
            "bottom-[calc(var(--mobile-nav-height)+env(safe-area-inset-bottom)+7.25rem)]",
            "md:right-6 md:bottom-36",
            "h-[min(70vh,36rem)] rounded-2xl border border-border bg-white shadow-2xl"
          )}
          role="dialog"
          aria-label="Chat interno do projeto"
        >
          <header className="flex items-center gap-2 border-b border-border px-3 py-2.5">
            {viewingProjectId ? (
              <button
                type="button"
                onClick={() => showInbox()}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 cursor-pointer"
                title="Todas as conversas"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : (
              <Mail className="h-4 w-4 text-slate-500" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-800">
                {viewingProjectId
                  ? projectMeta?.clientName || focus?.clientName || "Conversa do projeto"
                  : "Conversas internas"}
              </p>
              <p className="truncate text-[11px] font-medium text-slate-500">
                {viewingProjectId
                  ? STATUS_LABEL[projectMeta?.status ?? ""] || "Equipe da Móveis Unghero"
                  : "Um fio por projeto · histórico permanente"}
              </p>
            </div>
            {viewingProjectId && canClose && (
              <button
                type="button"
                onClick={() => void handleToggleClosed()}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 cursor-pointer"
                title={threadClosed ? "Reabrir conversa" : "Encerrar conversa"}
              >
                {threadClosed ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 cursor-pointer"
              aria-label="Fechar chat"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <input
              value={viewingProjectId ? threadQuery : inboxQuery}
              onChange={(e) =>
                viewingProjectId ? setThreadQuery(e.target.value) : onInboxSearch(e.target.value)
              }
              placeholder={viewingProjectId ? "Buscar nesta conversa" : "Buscar cliente ou mensagem"}
              className="h-8 w-full bg-transparent text-xs font-medium text-slate-700 outline-none placeholder:text-slate-400"
            />
            {!viewingProjectId && (
              <label className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeClosed}
                  onChange={(e) => {
                    setIncludeClosed(e.target.checked);
                    void refreshInbox(inboxQuery, e.target.checked);
                  }}
                />
                Encerradas
              </label>
            )}
          </div>

          {viewingProjectId ? (
            <>
              <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-3 space-y-3">
                {loadingThread && messages.length === 0 ? (
                  <div className="flex justify-center py-10 text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : visibleMessages.length === 0 ? (
                  <p className="px-2 py-8 text-center text-xs font-medium text-slate-500">
                    {messages.length === 0
                      ? "Nenhuma mensagem ainda. Comece o histórico interno deste projeto."
                      : "Nenhum resultado nesta conversa."}
                  </p>
                ) : (
                  visibleMessages.map((item) => (
                    <article
                      key={item.id}
                      className={cn(
                        "rounded-xl border px-3 py-2",
                        item.mine ? "ml-6 border-slate-200 bg-slate-50" : "mr-6 border-border bg-white"
                      )}
                    >
                      <div className="mb-1 flex items-baseline justify-between gap-2">
                        <p className="truncate text-[11px] font-bold text-slate-800">
                          {item.authorName}
                          <span className="ml-1 font-semibold text-slate-400">{item.authorRoleLabel}</span>
                        </p>
                        <time className="shrink-0 text-[10px] font-medium text-slate-400">
                          {formatWhen(item.createdAt)}
                        </time>
                      </div>
                      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700">{item.body}</p>
                    </article>
                  ))
                )}
              </div>

              {threadClosed ? (
                <div className="border-t border-border bg-slate-50 px-3 py-3 text-center text-[11px] font-semibold text-slate-500">
                  Conversa encerrada. O histórico continua disponível na busca.
                </div>
              ) : canWrite ? (
                <form
                  className="flex items-end gap-2 border-t border-border p-2.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleSend();
                  }}
                >
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value.slice(0, PROJECT_CHAT_BODY_MAX))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handleSend();
                      }
                    }}
                    rows={2}
                    placeholder="Escreva para a equipe…"
                    className="max-h-28 min-h-[2.5rem] flex-1 resize-none rounded-xl border border-border bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-primary focus:bg-white"
                  />
                  <button
                    type="submit"
                    disabled={sending || !draft.trim()}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white disabled:opacity-40 cursor-pointer"
                    aria-label="Enviar"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </form>
              ) : (
                <div className="border-t border-border bg-slate-50 px-3 py-3 text-center text-[11px] font-semibold text-slate-500">
                  Conta somente leitura — você pode acompanhar o histórico.
                </div>
              )}
            </>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto">
              {threads.length === 0 ? (
                <p className="px-4 py-10 text-center text-xs font-medium text-slate-500">
                  Ainda não há conversas. Abra um projeto e comece pelo botão com as iniciais do cliente.
                </p>
              ) : (
                sortedThreads.map((thread) => (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => openProject(thread.projectId, thread.clientName)}
                    className="flex w-full items-start gap-3 border-b border-border/70 px-3 py-2.5 text-left hover:bg-slate-50 cursor-pointer"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                        thread.unreadCount > 0 ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
                      )}
                    >
                      {thread.clientInitials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-bold text-slate-800">{thread.clientName}</span>
                        <span className="shrink-0 text-[10px] font-medium text-slate-400">
                          {thread.lastMessageAt ? formatWhen(thread.lastMessageAt) : ""}
                        </span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-2">
                        <span className="truncate text-[12px] text-slate-500">
                          {thread.lastMessagePreview || "Sem mensagens"}
                        </span>
                        {thread.closed && (
                          <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-500">
                            Encerrada
                          </span>
                        )}
                        {thread.unreadCount > 0 && (
                          <span className="ml-auto shrink-0 rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                            {thread.unreadCount}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          )}

          {error && (
            <p className="border-t border-rose-100 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-600">
              {error}
            </p>
          )}
        </div>
      )}
    </>
  );
}
