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
import EmailRichEditor, {
  htmlToPlainText,
  plainTextToEditorHtml,
} from "@/components/EmailRichEditor";
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
  const [bodyHtml, setBodyHtml] = useState("");
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
                onClick={() => setMailboxId(box.id)}
                className={`min-w-0 max-w-full sm:max-w-[280px] text-left rounded-[var(--radius-sm)] px-3.5 py-2.5 transition-colors cursor-pointer border ${
                  mailboxId === box.id
                    ? "bg-amber-500/15 border-amber-500/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
                    : "bg-white border-border/50 hover:bg-slate-50"
                }`}
              >
                <p className="text-xs font-bold text-foreground truncate">{box.areaLabel}</p>
                <p className="text-[11px] text-muted-foreground truncate">{box.address}</p>
              </button>
            ))}
          </div>

          {/* Inbox 25% · Corpo 75% */}
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,25%)_minmax(0,75%)] gap-3 flex-1 min-h-0">
            <section className="rounded-xl border border-border/50 bg-white overflow-hidden flex flex-col min-h-[320px] md:min-h-0 md:h-full">
              <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border/40 bg-slate-50/80 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Inbox className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-semibold truncate">
                    Inbox · {selectedMailbox?.displayName || selectedMailbox?.areaLabel}
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
                  <div className="px-4 py-3 border-b border-border/40 space-y-1 shrink-0">
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
                                href={`/api/emails/attachment?mailboxId=${encodeURIComponent(mailboxId)}&uid=${detail.uid}&index=${a.index}`}
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
