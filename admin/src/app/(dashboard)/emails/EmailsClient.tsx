"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Inbox,
  Loader2,
  Mail,
  MailOpen,
  Paperclip,
  PencilLine,
  RefreshCw,
  Reply,
  Send,
  Settings2,
  ShieldAlert,
  Trash2,
  Undo2,
  FileText,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { TooltipBody } from "@/components/ui/InfoTooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { ActionDialogHost, useActionDialog } from "@/components/ActionDialogHost";
import EmailRichEditor, {
  htmlToPlainText,
  plainTextToEditorHtml,
} from "@/components/EmailRichEditor";
import type { EmailMailboxDTO } from "@/app/actions/emailMailboxes";
import {
  getMailboxMessage,
  listMailboxFolder,
  markMailboxMessageSeen,
  moveMailboxMessageToInbox,
  moveMailboxMessageToSpam,
  moveMailboxMessageToTrash,
  moveMailboxMessagesToTrash,
  sendMailboxEmail,
} from "@/app/actions/emailInbox";
import {
  EMAIL_MAX_ATTACHMENT_BYTES,
  type EmailListItem,
  type MailFolderKey,
} from "@/lib/emailAreas";
import { usePermissions } from "@/context/PermissionsContext";
import { cn } from "@/lib/utils";

type MessageDetail = {
  uid: number;
  subject: string;
  from: string;
  fromAddress: string;
  to: string;
  date: string | null;
  text: string;
  html: string | null;
  messageId: string | null;
  inReplyTo: string | null;
  references: string[];
  attachments: Array<{
    filename: string;
    contentType: string;
    size: number;
    index: number;
  }>;
};

interface EmailsClientProps {
  initialMailboxes: EmailMailboxDTO[];
  isAdmin: boolean;
}

const FOLDER_NAV: {
  id: MailFolderKey;
  label: string;
  icon: typeof Inbox;
}[] = [
  { id: "inbox", label: "Entrada", icon: Inbox },
  { id: "unread", label: "Não lidos", icon: Mail },
  { id: "spam", label: "Spam", icon: ShieldAlert },
  { id: "trash", label: "Lixeira", icon: Trash2 },
];

function formatMsgDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function displayFrom(from: string) {
  const name = from.replace(/<[^>]+>/g, "").trim();
  return name || from;
}

function MessageGroup({
  title,
  messages,
  selectedUid,
  checkedUids,
  onOpen,
  onToggle,
  canSelect,
  hideHeader,
}: {
  title: string;
  messages: EmailListItem[];
  selectedUid: number | null;
  checkedUids: Set<number>;
  onOpen: (uid: number) => void;
  onToggle: (uid: number, checked: boolean) => void;
  canSelect: boolean;
  hideHeader?: boolean;
}) {
  return (
    <div>
      {!hideHeader && (
        <div className="sticky top-0 z-10 px-3 py-1.5 bg-slate-100/95 border-b border-border/40 backdrop-blur-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {title}
          </p>
        </div>
      )}
      <ul>
        {messages.map((msg) => {
          const selected = selectedUid === msg.uid;
          const unread = !msg.seen;
          const checked = checkedUids.has(msg.uid);
          return (
            <li key={msg.uid}>
              <div
                className={cn(
                  "relative flex items-stretch border-b border-border/20 transition-colors",
                  selected
                    ? "bg-amber-50"
                    : unread
                      ? "bg-sky-50/70"
                      : "bg-white"
                )}
              >
                {unread && (
                  <span className="absolute left-0 top-0 bottom-0 w-1 bg-sky-500" aria-hidden />
                )}
                {canSelect ? (
                  <label
                    className="flex items-center pl-2.5 pr-1 cursor-pointer shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-slate-300 text-sky-700 accent-sky-700 cursor-pointer"
                      checked={checked}
                      onChange={(e) => onToggle(msg.uid, e.target.checked)}
                      aria-label={`Selecionar ${msg.subject}`}
                    />
                  </label>
                ) : null}
                <button
                  type="button"
                  onClick={() => onOpen(msg.uid)}
                  className={cn(
                    "min-w-0 flex-1 text-left px-3 py-2.5 cursor-pointer",
                    !selected && (unread ? "hover:bg-sky-50" : "hover:bg-slate-50")
                  )}
                >
                  <div className="flex items-start justify-between gap-2 pl-1">
                    <p
                      className={cn(
                        "text-xs truncate",
                        unread ? "font-bold text-slate-900" : "font-medium text-slate-500"
                      )}
                    >
                      {displayFrom(msg.from)}
                    </p>
                    <span
                      className={cn(
                        "text-[10px] shrink-0",
                        unread ? "font-semibold text-sky-700" : "text-muted-foreground"
                      )}
                    >
                      {formatMsgDate(msg.date)}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "text-sm truncate mt-0.5 pl-1",
                      unread ? "font-semibold text-slate-900" : "text-slate-600"
                    )}
                  >
                    {msg.subject}
                  </p>
                  {msg.hasAttachments && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground mt-1 pl-1">
                      <Paperclip className="h-3 w-3" /> anexo
                    </span>
                  )}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function EmailsClient({ initialMailboxes, isAdmin }: EmailsClientProps) {
  const { isReadOnly } = usePermissions();
  const dialog = useActionDialog();
  const { showSuccess, showError, confirmAction } = dialog;
  const [mailboxes] = useState(initialMailboxes);
  const [mailboxId, setMailboxId] = useState(initialMailboxes[0]?.id || "");
  const [folder, setFolder] = useState<MailFolderKey>("inbox");
  const [messages, setMessages] = useState<EmailListItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  const [detail, setDetail] = useState<MessageDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeMode, setComposeMode] = useState<"new" | "reply">("new");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [inReplyTo, setInReplyTo] = useState<string | undefined>();
  const [references, setReferences] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<
    Array<{ filename: string; contentBase64: string; contentType?: string }>
  >([]);
  const [sending, setSending] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [checkedUids, setCheckedUids] = useState<Set<number>>(new Set());
  const loadGenRef = useRef(0);
  const hasListRef = useRef(false);
  const inflightRef = useRef(false);

  const selectedMailbox = useMemo(
    () => mailboxes.find((m) => m.id === mailboxId) || null,
    [mailboxes, mailboxId]
  );

  const unreadCount = useMemo(
    () => messages.filter((m) => !m.seen).length,
    [messages]
  );

  const groupedMessages = useMemo(() => {
    if (folder !== "inbox") {
      return { unread: [] as EmailListItem[], read: messages };
    }
    const unread: EmailListItem[] = [];
    const read: EmailListItem[] = [];
    for (const msg of messages) {
      if (msg.seen) read.push(msg);
      else unread.push(msg);
    }
    return { unread, read };
  }, [folder, messages]);

  const loadFolder = useCallback(
    async (
      id: string,
      nextFolder: MailFolderKey,
      options?: { resetSelection?: boolean; silent?: boolean }
    ) => {
      if (!id) return;
      const silent = Boolean(options?.silent) && hasListRef.current;
      if (silent && inflightRef.current) return;
      const gen = ++loadGenRef.current;
      inflightRef.current = true;
      if (!silent) setLoadingList(true);
      setListError(null);
      if (options?.resetSelection) {
        setSelectedUid(null);
        setDetail(null);
        setCheckedUids(new Set());
      }
      try {
        const res = await listMailboxFolder(id, nextFolder);
        if (gen !== loadGenRef.current) return;
        if (!res.success) {
          hasListRef.current = false;
          setListError(res.error || "Falha ao carregar pasta.");
          setMessages([]);
          return;
        }
        hasListRef.current = true;
        const nextIds = new Set(res.data.map((m) => m.uid));
        setMessages(res.data);
        setCheckedUids((prev) => {
          if (prev.size === 0) return prev;
          const kept = [...prev].filter((uid) => nextIds.has(uid));
          if (kept.length === prev.size) return prev;
          return new Set(kept);
        });
        setSelectedUid((prev) => (prev && !nextIds.has(prev) ? null : prev));
        setDetail((prev) => (prev && !nextIds.has(prev.uid) ? null : prev));
      } finally {
        if (gen === loadGenRef.current) {
          inflightRef.current = false;
          setLoadingList(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    hasListRef.current = false;
    if (mailboxId) void loadFolder(mailboxId, folder, { resetSelection: true });
  }, [mailboxId, folder, loadFolder]);

  useEffect(() => {
    if (!mailboxId) return;

    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") {
        void loadFolder(mailboxId, folder, { silent: true });
      }
    };

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) refreshIfVisible();
    };

    document.addEventListener("visibilitychange", refreshIfVisible);
    window.addEventListener("focus", refreshIfVisible);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", refreshIfVisible);
      window.removeEventListener("focus", refreshIfVisible);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [mailboxId, folder, loadFolder]);

  const openMessage = async (uid: number) => {
    if (!mailboxId) return;
    setSelectedUid(uid);
    setLoadingDetail(true);
    setDetail(null);
    const res = await getMailboxMessage(mailboxId, uid, folder);
    setLoadingDetail(false);
    if (res.success && res.data) {
      setDetail(res.data);
      setMessages((prev) =>
        prev.map((m) => (m.uid === uid ? { ...m, seen: true } : m))
      );
    } else if (!res.success) {
      showError("Falha", res.error || "Não foi possível abrir a mensagem.");
    }
  };

  const clearSelection = () => {
    setSelectedUid(null);
    setDetail(null);
  };

  const removeFromList = (uid: number) => {
    setMessages((prev) => prev.filter((m) => m.uid !== uid));
    setCheckedUids((prev) => {
      if (!prev.has(uid)) return prev;
      const next = new Set(prev);
      next.delete(uid);
      return next;
    });
    if (selectedUid === uid) clearSelection();
  };

  const visibleUids = useMemo(() => messages.map((m) => m.uid), [messages]);
  const checkedCount = checkedUids.size;
  const allVisibleChecked =
    visibleUids.length > 0 && visibleUids.every((uid) => checkedUids.has(uid));

  const toggleChecked = (uid: number, checked: boolean) => {
    setCheckedUids((prev) => {
      const next = new Set(prev);
      if (checked) next.add(uid);
      else next.delete(uid);
      return next;
    });
  };

  const toggleAllVisible = (checked: boolean) => {
    setCheckedUids(checked ? new Set(visibleUids) : new Set());
  };

  const handleBulkTrash = () => {
    if (!mailboxId || isReadOnly || checkedCount === 0) return;
    const uids = [...checkedUids];
    confirmAction({
      title:
        folder === "trash"
          ? `Excluir ${uids.length} mensagem${uids.length === 1 ? "" : "ns"}?`
          : `Excluir ${uids.length} mensagem${uids.length === 1 ? "" : "ns"}?`,
      message:
        folder === "trash"
          ? "As mensagens selecionadas serão removidas da Lixeira."
          : "As mensagens selecionadas serão movidas para a Lixeira da caixa.",
      confirmLabel: "Excluir",
      onConfirm: async () => {
        setActionBusy(true);
        const res = await moveMailboxMessagesToTrash(mailboxId, uids, folder);
        setActionBusy(false);
        if (!res.success) {
          showError("Falha ao excluir", res.error || "Não foi possível excluir.");
          return;
        }
        const removed = new Set(uids);
        setMessages((prev) => prev.filter((m) => !removed.has(m.uid)));
        setCheckedUids(new Set());
        if (selectedUid && removed.has(selectedUid)) clearSelection();
        showSuccess(
          uids.length === 1 ? "Mensagem excluída" : `${uids.length} mensagens excluídas`,
          res.deleted ? "Removidas permanentemente." : "Movidas para a Lixeira."
        );
      },
    });
  };

  const handleMarkUnseen = async () => {
    if (!mailboxId || !selectedUid || isReadOnly) return;
    setActionBusy(true);
    const res = await markMailboxMessageSeen(mailboxId, selectedUid, false, folder);
    setActionBusy(false);
    if (!res.success) {
      showError("Falha", res.error || "Não foi possível marcar como não lida.");
      return;
    }
    setMessages((prev) =>
      prev.map((m) => (m.uid === selectedUid ? { ...m, seen: false } : m))
    );
    showSuccess("Atualizado", "Mensagem marcada como não lida.");
  };

  const handleMoveToTrash = () => {
    if (!mailboxId || !selectedUid || isReadOnly) return;
    const uid = selectedUid;
    confirmAction({
      title: folder === "trash" ? "Excluir permanentemente?" : "Excluir mensagem?",
      message:
        folder === "trash"
          ? "A mensagem será removida da Lixeira."
          : "A mensagem será movida para a Lixeira da caixa.",
      confirmLabel: "Excluir",
      onConfirm: async () => {
        setActionBusy(true);
        const res = await moveMailboxMessageToTrash(mailboxId, uid, folder);
        setActionBusy(false);
        if (!res.success) {
          showError("Falha ao excluir", res.error || "Não foi possível excluir.");
          return;
        }
        removeFromList(uid);
        showSuccess(
          "Mensagem excluída",
          res.deleted ? "Removida permanentemente." : "Movida para a Lixeira."
        );
      },
    });
  };

  const handleMoveToSpam = () => {
    if (!mailboxId || !selectedUid || isReadOnly) return;
    const uid = selectedUid;
    confirmAction({
      title: "Marcar como spam?",
      message: "A mensagem será movida para a pasta Spam/Junk desta caixa.",
      confirmLabel: "Mover para spam",
      onConfirm: async () => {
        setActionBusy(true);
        const res = await moveMailboxMessageToSpam(mailboxId, uid, folder);
        setActionBusy(false);
        if (!res.success) {
          showError("Falha no spam", res.error || "Não foi possível mover.");
          return;
        }
        removeFromList(uid);
        showSuccess("Movida para spam", "A mensagem saiu desta pasta.");
      },
    });
  };

  const handleRestoreToInbox = () => {
    if (!mailboxId || !selectedUid || isReadOnly) return;
    if (folder !== "spam" && folder !== "trash") return;
    const uid = selectedUid;
    confirmAction({
      title: "Restaurar para Entrada?",
      message: "A mensagem voltará para a caixa de entrada.",
      confirmLabel: "Restaurar",
      onConfirm: async () => {
        setActionBusy(true);
        const res = await moveMailboxMessageToInbox(mailboxId, uid, folder);
        setActionBusy(false);
        if (!res.success) {
          showError("Falha", res.error || "Não foi possível restaurar.");
          return;
        }
        removeFromList(uid);
        showSuccess("Restaurada", "Mensagem movida para a Entrada.");
      },
    });
  };

  const openComposeNew = () => {
    setComposeMode("new");
    setTo("");
    setSubject("");
    setBodyHtml("");
    setInReplyTo(undefined);
    setReferences([]);
    setAttachments([]);
    setComposeError(null);
    setComposeOpen(true);
  };

  const openComposeReply = () => {
    if (!detail) return;
    setComposeMode("reply");
    setTo(detail.fromAddress || "");
    setSubject(
      detail.subject.toLowerCase().startsWith("re:")
        ? detail.subject
        : `Re: ${detail.subject}`
    );
    const quote = `\n\n---\nEm ${formatMsgDate(detail.date)}, ${detail.from} escreveu:\n${detail.text.slice(0, 2000)}`;
    setBodyHtml(plainTextToEditorHtml(quote));
    setInReplyTo(detail.messageId || undefined);
    setReferences(
      [...(detail.references || []), detail.messageId].filter(Boolean) as string[]
    );
    setAttachments([]);
    setComposeError(null);
    setComposeOpen(true);
  };

  const onPickFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const next = [...attachments];
    for (const file of Array.from(files)) {
      if (file.size > EMAIL_MAX_ATTACHMENT_BYTES) {
        setComposeError(
          `Arquivo ${file.name} excede ${Math.round(EMAIL_MAX_ATTACHMENT_BYTES / (1024 * 1024))} MB.`
        );
        continue;
      }
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      next.push({
        filename: file.name,
        contentBase64: btoa(binary),
        contentType: file.type || undefined,
      });
    }
    setAttachments(next);
  };

  const handleSend = async () => {
    if (!mailboxId) return;
    setSending(true);
    setComposeError(null);
    const text = htmlToPlainText(bodyHtml);
    const res = await sendMailboxEmail({
      mailboxId,
      to,
      subject,
      text,
      html: bodyHtml,
      inReplyTo,
      references,
      attachments,
    });
    setSending(false);
    if (!res.success) {
      setComposeError(res.error || "Falha ao enviar.");
      return;
    }
    setComposeOpen(false);
  };

  return (
    <div className="space-y-5">
      <ActionDialogHost dialog={dialog} />
      <PageHeader
        title="E-mails"
        description="Caixas por área — leia e responda sem usar o webmail."
        help={
          <TooltipBody
            title="E-mails por área"
            items={[
              "Cada caixa (comercial, financeiro, atendimento) é compartilhada pela equipe.",
              "A Diretoria configura IMAP/SMTP em Configurar caixas.",
              "Orçamentos, recibos e avisos de etapa também saem por e-mail nos fluxos respectivos.",
              "Em Templates você vê e edita os avisos automáticos para cliente e arquiteto.",
            ]}
          />
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/emails/templates">
              <Button variant="outline" className="gap-1.5">
                <FileText className="h-4 w-4" />
                Templates
              </Button>
            </Link>
            {isAdmin && (
              <Link href="/emails/config">
                <Button variant="outline" className="gap-1.5">
                  <Settings2 className="h-4 w-4" />
                  Configurar caixas
                </Button>
              </Link>
            )}
            {!isReadOnly && selectedMailbox && (
              <Button onClick={openComposeNew} className="btn-metallic gap-1.5">
                <PencilLine className="h-4 w-4" />
                Novo e-mail
              </Button>
            )}
          </div>
        }
      />

      {mailboxes.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-dashed border-border bg-white/70 p-10 text-center">
          <Mail className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-bold text-foreground">Nenhuma caixa disponível</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            {isAdmin
              ? "Cadastre as caixas IMAP/SMTP do HostGator em Configurar caixas."
              : "Peça à Diretoria para liberar uma caixa da sua área."}
          </p>
          {isAdmin && (
            <Link href="/emails/config" className="inline-block mt-4">
              <Button className="btn-metallic">Configurar caixas</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3 md:min-h-[calc(100vh-var(--dashboard-chrome-offset)-8rem)]">
          {/* Caixas no topo */}
          <div className="flex flex-wrap gap-2 shrink-0">
            {mailboxes.map((box) => (
              <button
                key={box.id}
                type="button"
                onClick={() => {
                  setMailboxId(box.id);
                  setFolder("inbox");
                }}
                className={cn(
                  "min-w-0 max-w-full sm:max-w-[280px] text-left rounded-[var(--radius-sm)] px-3.5 py-2.5 transition-colors cursor-pointer border",
                  mailboxId === box.id
                    ? "bg-amber-500/15 border-amber-500/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
                    : "bg-white border-border/50 hover:bg-slate-50"
                )}
              >
                <p className="text-xs font-bold text-foreground truncate">{box.areaLabel}</p>
                <p className="text-[11px] text-muted-foreground truncate">{box.address}</p>
              </button>
            ))}
          </div>

          {/* Pastas + lista 25% · Corpo 75% */}
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,28%)_minmax(0,72%)] gap-3 flex-1 min-h-0">
            <section className="rounded-xl border border-border/50 bg-white overflow-hidden flex flex-col min-h-[360px] md:min-h-0 md:h-full">
              <div className="flex items-center justify-between gap-2 px-2.5 py-2 border-b border-border/40 bg-slate-50/80 shrink-0">
                <div className="flex items-center gap-1 min-w-0 overflow-x-auto no-scrollbar">
                  {FOLDER_NAV.map((item) => {
                    const Icon = item.icon;
                    const active = folder === item.id;
                    const badge =
                      item.id === "inbox" && folder === "inbox" && unreadCount > 0
                        ? unreadCount
                        : null;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setFolder(item.id)}
                        className={cn(
                          "inline-flex items-center gap-1 shrink-0 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer",
                          active
                            ? "bg-white text-foreground border border-border/60 shadow-xs"
                            : "text-muted-foreground hover:bg-white/70 border border-transparent"
                        )}
                        title={item.label}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span className="truncate max-w-[4.75rem]">{item.label}</span>
                        {badge ? (
                          <span className="min-w-[1.1rem] h-4 px-1 rounded-full bg-sky-600 text-white text-[9px] font-bold leading-4 text-center">
                            {badge}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!isReadOnly && messages.length > 0 ? (
                    <>
                      <label
                        className="flex items-center gap-1 px-1.5 h-8 cursor-pointer"
                        title="Selecionar todos desta lista"
                      >
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded border-slate-300 accent-sky-700 cursor-pointer"
                          checked={allVisibleChecked}
                          ref={(el) => {
                            if (el) {
                              el.indeterminate = checkedCount > 0 && !allVisibleChecked;
                            }
                          }}
                          onChange={(e) => toggleAllVisible(e.target.checked)}
                          aria-label="Selecionar todos"
                        />
                      </label>
                      {checkedCount > 0 ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 gap-1 text-rose-700 border-rose-200 hover:bg-rose-50"
                          onClick={handleBulkTrash}
                          disabled={actionBusy}
                          title="Excluir selecionados"
                        >
                          {actionBusy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          <span className="text-[11px] font-semibold">{checkedCount}</span>
                        </Button>
                      ) : null}
                    </>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 shrink-0"
                    onClick={() => void loadFolder(mailboxId, folder, { silent: false })}
                    disabled={loadingList}
                    title="Atualizar"
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingList ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>

              {loadingList ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
                </div>
              ) : listError ? (
                <div className="p-4 text-sm text-rose-600">{listError}</div>
              ) : messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-6 text-center">
                  {folder === "unread"
                    ? "Nenhuma mensagem não lida."
                    : folder === "spam"
                      ? "Pasta de spam vazia."
                      : folder === "trash"
                        ? "Lixeira vazia."
                        : "Caixa vazia ou sem mensagens recentes."}
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  {folder === "inbox" ? (
                    <>
                      {groupedMessages.unread.length > 0 && (
                        <MessageGroup
                          title={`Não lidas (${groupedMessages.unread.length})`}
                          messages={groupedMessages.unread}
                          selectedUid={selectedUid}
                          checkedUids={checkedUids}
                          onOpen={(uid) => void openMessage(uid)}
                          onToggle={toggleChecked}
                          canSelect={!isReadOnly}
                        />
                      )}
                      {groupedMessages.read.length > 0 && (
                        <MessageGroup
                          title={
                            groupedMessages.unread.length > 0
                              ? `Lidas (${groupedMessages.read.length})`
                              : "Mensagens"
                          }
                          messages={groupedMessages.read}
                          selectedUid={selectedUid}
                          checkedUids={checkedUids}
                          onOpen={(uid) => void openMessage(uid)}
                          onToggle={toggleChecked}
                          canSelect={!isReadOnly}
                        />
                      )}
                    </>
                  ) : (
                    <MessageGroup
                      title={FOLDER_NAV.find((f) => f.id === folder)?.label || "Mensagens"}
                      messages={messages}
                      selectedUid={selectedUid}
                      checkedUids={checkedUids}
                      onOpen={(uid) => void openMessage(uid)}
                      onToggle={toggleChecked}
                      canSelect={!isReadOnly}
                      hideHeader={folder === "unread"}
                    />
                  )}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-border/50 bg-white overflow-hidden flex flex-col min-h-[360px] md:min-h-0 md:h-full">
              {!selectedUid ? (
                <div className="flex-1 flex flex-col items-center justify-center text-sm text-muted-foreground p-6 gap-2">
                  <Mail className="h-8 w-8 text-slate-300" />
                  <p>Selecione uma mensagem para ler.</p>
                </div>
              ) : loadingDetail ? (
                <div className="flex-1 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Abrindo…
                </div>
              ) : !detail ? (
                <div className="p-4 text-sm text-rose-600">Não foi possível abrir a mensagem.</div>
              ) : (
                <>
                  <div className="px-4 py-3 border-b border-border/40 space-y-2 shrink-0">
                    <h2 className="text-base font-bold text-foreground leading-snug">
                      {detail.subject}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      De: <span className="text-foreground font-medium">{detail.from}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Para: {detail.to || "—"} · {formatMsgDate(detail.date)}
                    </p>
                    {!isReadOnly && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {(folder === "inbox" || folder === "unread") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5"
                            onClick={openComposeReply}
                            disabled={actionBusy}
                          >
                            <Reply className="h-3.5 w-3.5" /> Responder
                          </Button>
                        )}
                        {(folder === "inbox" || folder === "unread") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5"
                            onClick={() => void handleMarkUnseen()}
                            disabled={actionBusy}
                          >
                            <MailOpen className="h-3.5 w-3.5" /> Não lida
                          </Button>
                        )}
                        {(folder === "spam" || folder === "trash") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5"
                            onClick={handleRestoreToInbox}
                            disabled={actionBusy}
                          >
                            <Undo2 className="h-3.5 w-3.5" /> Restaurar
                          </Button>
                        )}
                        {folder !== "spam" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5 text-amber-800 border-amber-200 hover:bg-amber-50"
                            onClick={handleMoveToSpam}
                            disabled={actionBusy}
                          >
                            <ShieldAlert className="h-3.5 w-3.5" /> Spam
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5 text-rose-700 border-rose-200 hover:bg-rose-50"
                          onClick={handleMoveToTrash}
                          disabled={actionBusy}
                        >
                          {actionBusy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          Excluir
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 min-h-0">
                    {detail.html ? (
                      <iframe
                        title={detail.subject}
                        sandbox="allow-popups allow-popups-to-escape-sandbox"
                        srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><base target="_blank" rel="noopener noreferrer"><style>body{margin:0;font-family:system-ui,sans-serif;font-size:14px;line-height:1.55;color:#1e293b;word-wrap:break-word;}img{max-width:100%;height:auto;}a{color:#0369a1;}table{max-width:100%;}</style></head><body>${detail.html.replace(/<\/(script|iframe|object|embed)/gi, "&lt;/$1")}</body></html>`}
                        className="w-full min-h-[320px] border-0 bg-white rounded-md"
                        style={{ height: "min(65vh, 640px)" }}
                      />
                    ) : (
                      <pre className="whitespace-pre-wrap text-sm text-slate-800 font-sans">
                        {detail.text || "(sem conteúdo)"}
                      </pre>
                    )}
                    {detail.attachments.length > 0 && mailboxId && (
                      <div className="mt-4 pt-3 border-t border-border/40">
                        <p className="text-[11px] font-bold uppercase text-muted-foreground mb-2">
                          Anexos
                        </p>
                        <ul className="space-y-1.5">
                          {detail.attachments.map((a) => (
                            <li key={`${a.index}-${a.filename}`}>
                              <a
                                href={`/api/emails/attachment?mailboxId=${encodeURIComponent(mailboxId)}&uid=${detail.uid}&index=${a.index}&folder=${encodeURIComponent(folder === "unread" ? "inbox" : folder)}`}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 hover:text-sky-900 hover:underline"
                              >
                                <Paperclip className="h-3.5 w-3.5" />
                                {a.filename}
                                <span className="text-muted-foreground font-normal">
                                  ({Math.max(1, Math.round(a.size / 1024))} KB)
                                </span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      )}

      <Dialog
        isOpen={composeOpen}
        onClose={() => !sending && setComposeOpen(false)}
        className="max-w-3xl w-[min(920px,calc(100vw-2rem))]"
        bodyClassName="max-h-[min(88vh,820px)]"
      >
        <div className="flex flex-col min-h-[min(72vh,640px)]">
          <div className="px-5 pt-5 pb-3 border-b border-border/50 shrink-0">
            <h3 className="text-lg font-bold font-display tracking-tight">
              {composeMode === "reply" ? "Responder" : "Nova mensagem"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              De: {selectedMailbox?.address}
              {selectedMailbox?.signatureText
                ? " · A assinatura da caixa será adicionada ao enviar."
                : ""}
            </p>
          </div>

          <div className="px-5 pt-3 space-y-0 shrink-0">
            <div className="flex items-center gap-3 border-b border-border/40 py-2">
              <label className="text-xs text-muted-foreground w-14 shrink-0">Para</label>
              <Input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-8 border-0 shadow-none focus-visible:ring-0 px-0"
                placeholder="destinatario@email.com"
              />
            </div>
            <div className="flex items-center gap-3 border-b border-border/40 py-2">
              <label className="text-xs text-muted-foreground w-14 shrink-0">Assunto</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="h-8 border-0 shadow-none focus-visible:ring-0 px-0"
                placeholder="Assunto"
              />
            </div>
          </div>

          <div className="flex-1 px-5 py-3 min-h-0 flex flex-col">
            <EmailRichEditor
              key={`${composeMode}-${composeOpen}-${selectedUid ?? "new"}`}
              valueHtml={bodyHtml}
              onChangeHtml={setBodyHtml}
              onPickFiles={(files) => void onPickFiles(files)}
              disabled={sending}
              className="flex-1"
              minHeightClassName="min-h-[240px]"
            />
            {attachments.length > 0 && (
              <ul className="mt-2 text-[11px] text-muted-foreground space-y-0.5">
                {attachments.map((a) => (
                  <li key={a.filename} className="flex items-center gap-1">
                    <Paperclip className="h-3 w-3" /> {a.filename}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {composeError && (
            <p className="mx-5 mb-2 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
              {composeError}
            </p>
          )}

          <div className="px-5 py-3 border-t border-border/50 flex items-center justify-between gap-3 shrink-0 bg-slate-50/60">
            <div className="flex items-center gap-2">
              <Button onClick={() => void handleSend()} disabled={sending} className="gap-1.5 h-9 px-5">
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Enviar
              </Button>
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                Anexos até {Math.round(EMAIL_MAX_ATTACHMENT_BYTES / (1024 * 1024))} MB
              </span>
            </div>
            <Button
              variant="outline"
              onClick={() => setComposeOpen(false)}
              disabled={sending}
            >
              Descartar
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
