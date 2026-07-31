"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Inbox,
  Loader2,
  Mail,
  Paperclip,
  PencilLine,
  RefreshCw,
  Reply,
  Send,
  Settings2,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { TooltipBody } from "@/components/ui/InfoTooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import type { EmailMailboxDTO } from "@/app/actions/emailMailboxes";
import {
  getMailboxMessage,
  listMailboxInbox,
  sendMailboxEmail,
} from "@/app/actions/emailInbox";
import type { EmailListItem } from "@/lib/emailImap";
import { EMAIL_MAX_ATTACHMENT_BYTES } from "@/lib/emailAreas";
import { usePermissions } from "@/context/PermissionsContext";

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
  attachments: Array<{ filename: string; contentType: string; size: number }>;
};

interface EmailsClientProps {
  initialMailboxes: EmailMailboxDTO[];
  isAdmin: boolean;
}

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

export default function EmailsClient({ initialMailboxes, isAdmin }: EmailsClientProps) {
  const { isReadOnly } = usePermissions();
  const [mailboxes] = useState(initialMailboxes);
  const [mailboxId, setMailboxId] = useState(initialMailboxes[0]?.id || "");
  const [messages, setMessages] = useState<EmailListItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  const [detail, setDetail] = useState<MessageDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeMode, setComposeMode] = useState<"new" | "reply">("new");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [inReplyTo, setInReplyTo] = useState<string | undefined>();
  const [references, setReferences] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<
    Array<{ filename: string; contentBase64: string; contentType?: string }>
  >([]);
  const [sending, setSending] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);

  const selectedMailbox = useMemo(
    () => mailboxes.find((m) => m.id === mailboxId) || null,
    [mailboxes, mailboxId]
  );

  const loadInbox = useCallback(async (id: string) => {
    if (!id) return;
    setLoadingList(true);
    setListError(null);
    setSelectedUid(null);
    setDetail(null);
    const res = await listMailboxInbox(id);
    setLoadingList(false);
    if (!res.success) {
      setListError(res.error || "Falha ao carregar inbox.");
      setMessages([]);
      return;
    }
    setMessages(res.data);
  }, []);

  useEffect(() => {
    if (mailboxId) void loadInbox(mailboxId);
  }, [mailboxId, loadInbox]);

  const openMessage = async (uid: number) => {
    if (!mailboxId) return;
    setSelectedUid(uid);
    setLoadingDetail(true);
    setDetail(null);
    const res = await getMailboxMessage(mailboxId, uid);
    setLoadingDetail(false);
    if (res.success && res.data) {
      setDetail(res.data);
    }
  };

  const openComposeNew = () => {
    setComposeMode("new");
    setTo("");
    setSubject("");
    setBody("");
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
    setBody(
      `\n\n---\nEm ${formatMsgDate(detail.date)}, ${detail.from} escreveu:\n${detail.text.slice(0, 2000)}`
    );
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
    const res = await sendMailboxEmail({
      mailboxId,
      to,
      subject,
      text: body,
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
      <PageHeader
        title="E-mails"
        description="Caixas por área — leia e responda sem usar o webmail."
        help={
          <TooltipBody
            title="E-mails por área"
            items={[
              "Cada caixa (comercial, financeiro, atendimento) é compartilhada pela equipe.",
              "A Diretoria configura IMAP/SMTP em Configurar caixas.",
              "Orçamentos e recibos também podem ser enviados por e-mail nos fluxos respectivos.",
            ]}
          />
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
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
        <div className="rounded-2xl border border-dashed border-border bg-white/70 p-10 text-center">
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
        <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)_minmax(0,1.1fr)] gap-3 min-h-[70vh]">
          <aside className="rounded-xl border border-border/50 bg-white p-3 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">
              Caixas
            </p>
            {mailboxes.map((box) => (
              <button
                key={box.id}
                type="button"
                onClick={() => setMailboxId(box.id)}
                className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors cursor-pointer ${
                  mailboxId === box.id
                    ? "bg-amber-500/15 border border-amber-500/30"
                    : "hover:bg-slate-50 border border-transparent"
                }`}
              >
                <p className="text-xs font-bold text-foreground">{box.areaLabel}</p>
                <p className="text-[11px] text-muted-foreground truncate">{box.address}</p>
              </button>
            ))}
          </aside>

          <section className="rounded-xl border border-border/50 bg-white overflow-hidden flex flex-col min-h-[420px]">
            <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border/40 bg-slate-50/80">
              <div className="flex items-center gap-2 min-w-0">
                <Inbox className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-semibold truncate">
                  Inbox · {selectedMailbox?.displayName}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => void loadInbox(mailboxId)}
                disabled={loadingList}
                title="Atualizar"
              >
                <RefreshCw className={`h-4 w-4 ${loadingList ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {loadingList ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
              </div>
            ) : listError ? (
              <div className="p-4 text-sm text-rose-600">{listError}</div>
            ) : messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-6 text-center">
                Caixa vazia ou sem mensagens recentes.
              </div>
            ) : (
              <ul className="flex-1 overflow-y-auto divide-y divide-border/30">
                {messages.map((msg) => (
                  <li key={msg.uid}>
                    <button
                      type="button"
                      onClick={() => void openMessage(msg.uid)}
                      className={`w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer ${
                        selectedUid === msg.uid ? "bg-amber-50/80" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-xs truncate ${
                            msg.seen ? "text-muted-foreground" : "font-bold text-foreground"
                          }`}
                        >
                          {msg.from}
                        </p>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatMsgDate(msg.date)}
                        </span>
                      </div>
                      <p
                        className={`text-sm truncate mt-0.5 ${
                          msg.seen ? "text-slate-600" : "font-semibold text-foreground"
                        }`}
                      >
                        {msg.subject}
                      </p>
                      {msg.hasAttachments && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                          <Paperclip className="h-3 w-3" /> anexo
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-border/50 bg-white overflow-hidden flex flex-col min-h-[420px]">
            {!selectedUid ? (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-6">
                Selecione uma mensagem para ler.
              </div>
            ) : loadingDetail ? (
              <div className="flex-1 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Abrindo…
              </div>
            ) : !detail ? (
              <div className="p-4 text-sm text-rose-600">Não foi possível abrir a mensagem.</div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-border/40 space-y-1">
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
                    <div className="pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5"
                        onClick={openComposeReply}
                      >
                        <Reply className="h-3.5 w-3.5" /> Responder
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {detail.html ? (
                    <div
                      className="prose prose-sm max-w-none text-slate-800"
                      dangerouslySetInnerHTML={{ __html: detail.html }}
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm text-slate-800 font-sans">
                      {detail.text || "(sem conteúdo)"}
                    </pre>
                  )}
                  {detail.attachments.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-border/40">
                      <p className="text-[11px] font-bold uppercase text-muted-foreground mb-2">
                        Anexos
                      </p>
                      <ul className="space-y-1">
                        {detail.attachments.map((a, i) => (
                          <li
                            key={`${a.filename}-${i}`}
                            className="text-xs text-slate-600 flex items-center gap-1.5"
                          >
                            <Paperclip className="h-3 w-3" />
                            {a.filename}{" "}
                            <span className="text-muted-foreground">
                              ({Math.round(a.size / 1024)} KB)
                            </span>
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
      )}

      <Dialog
        isOpen={composeOpen}
        onClose={() => !sending && setComposeOpen(false)}
        className="max-w-lg"
      >
        <div className="p-5 space-y-4">
          <h3 className="text-lg font-bold">
            {composeMode === "reply" ? "Responder" : "Novo e-mail"}
          </h3>
          <p className="text-xs text-muted-foreground -mt-2">
            De: {selectedMailbox?.address}
          </p>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Para</label>
              <Input value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Assunto</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Mensagem</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="mt-1 w-full min-h-[160px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                Anexos (máx. {Math.round(EMAIL_MAX_ATTACHMENT_BYTES / (1024 * 1024))} MB cada)
              </label>
              <Input
                type="file"
                multiple
                className="h-9 mt-1"
                onChange={(e) => void onPickFiles(e.target.files)}
              />
              {attachments.length > 0 && (
                <ul className="mt-1 text-[11px] text-muted-foreground space-y-0.5">
                  {attachments.map((a) => (
                    <li key={a.filename}>• {a.filename}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          {composeError && (
            <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
              {composeError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setComposeOpen(false)}
              disabled={sending}
            >
              Cancelar
            </Button>
            <Button onClick={() => void handleSend()} disabled={sending} className="gap-1.5">
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Enviar
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
