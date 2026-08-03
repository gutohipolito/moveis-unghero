"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronRight,
  ClipboardList,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  Mail,
  MessageCircle,
  Package,
  PenTool,
  Send,
  UserPlus,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  buildMarketingFormMessage,
  getMarketingFormAdminUrl,
  getMarketingFormShortUrl,
  MARKETING_FORMS,
  type MarketingForm,
} from "@/lib/marketingForms";
import {
  buildWhatsAppUrl,
  type GoogleReviewClientOption,
} from "@/lib/google-review";
import type { EmailMailboxDTO } from "@/app/actions/emailMailboxes";
import { sendMailboxEmail } from "@/app/actions/emailInbox";
import {
  buildMarketingFormEmailHtml,
  buildMarketingFormEmailSubject,
} from "@/lib/marketingEmail";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copie o texto:", text);
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleCopy} className="text-xs font-semibold gap-1.5">
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copiado" : label}
    </Button>
  );
}

function formIcon(form: MarketingForm) {
  if (form.id === "projetistas-arquitetos") return PenTool;
  if (form.id === "cadastro-cliente") return UserPlus;
  if (form.id === "cadastro-fornecedor") return Package;
  return ClipboardList;
}

function FormIconBox({ form, size = "md" }: { form: MarketingForm; size?: "md" | "lg" }) {
  const Icon = formIcon(form);
  return (
    <div
      className={`rounded-xl bg-primary/10 text-primary shrink-0 ${
        size === "lg" ? "p-3.5" : "p-3"
      }`}
    >
      <Icon className={size === "lg" ? "h-6 w-6" : "h-5 w-5"} />
    </div>
  );
}

function MarketingFormSummaryCard({
  form,
  onOpen,
}: {
  form: MarketingForm;
  onOpen: () => void;
}) {
  const shortUrl = getMarketingFormShortUrl(form);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group text-left w-full h-full rounded-[var(--radius-md)] border border-border/60 bg-card p-5 flex flex-col gap-4 transition-all hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <FormIconBox form={form} size="lg" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <h3 className="text-sm font-bold text-foreground leading-snug">{form.title}</h3>
          <span className="inline-block text-[10px] font-bold uppercase tracking-wide rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
            {form.audience}
          </span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 flex-1">
        {form.description}
      </p>

      <div className="flex items-center justify-between gap-2 pt-1">
        <code className="text-[10px] font-semibold text-muted-foreground truncate">
          {shortUrl.replace(/^https?:\/\//, "")}
        </code>
        <span className="inline-flex items-center gap-1 text-xs font-bold text-primary shrink-0">
          Abrir
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </button>
  );
}

function MarketingFormDetail({
  form,
  clients,
  mailboxes,
}: {
  form: MarketingForm;
  clients: GoogleReviewClientOption[];
  mailboxes: EmailMailboxDTO[];
}) {
  const shortUrl = getMarketingFormShortUrl(form);
  const adminUrl = getMarketingFormAdminUrl(form);
  const [selectedMessageId, setSelectedMessageId] = useState(form.messages[0]?.id ?? "");
  const [linkCopied, setLinkCopied] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [mailboxId, setMailboxId] = useState(mailboxes[0]?.id || "");
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) ?? null,
    [clients, selectedClientId]
  );

  const filteredClients = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    const list = !q
      ? clients
      : clients.filter(
          (c) =>
            c.nome.toLowerCase().includes(q) ||
            (c.email || "").toLowerCase().includes(q) ||
            (digits.length > 0 && c.telefone.replace(/\D/g, "").includes(digits))
        );
    return { items: list.slice(0, 80), total: list.length };
  }, [clients, clientQuery]);

  const messageText = useMemo(
    () => buildMarketingFormMessage(form, selectedMessageId),
    [form, selectedMessageId]
  );

  const whatsappUrl = useMemo(() => {
    if (!messageText) return "";
    return buildWhatsAppUrl(whatsappPhone, messageText);
  }, [messageText, whatsappPhone]);

  useEffect(() => {
    setEmailSubject(buildMarketingFormEmailSubject(form.title));
  }, [form.title]);

  useEffect(() => {
    if (selectedClient?.email) setEmailTo(selectedClient.email);
    if (selectedClient?.telefone) setWhatsappPhone(selectedClient.telefone);
  }, [selectedClient]);

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      window.prompt("Copie o link:", shortUrl);
    }
  }

  const canSendEmail =
    Boolean(mailboxId) &&
    Boolean(emailTo.trim().includes("@")) &&
    Boolean(emailSubject.trim()) &&
    Boolean(messageText.trim()) &&
    !sendingEmail;

  async function handleSendEmail() {
    if (!canSendEmail || !mailboxId) return;
    setSendingEmail(true);
    setEmailFeedback(null);
    const res = await sendMailboxEmail({
      mailboxId,
      to: emailTo.trim(),
      subject: emailSubject.trim(),
      text: messageText.trim(),
      html: buildMarketingFormEmailHtml({
        bodyText: messageText,
        ctaUrl: shortUrl,
        ctaLabel: "Abrir formulário",
      }),
    });
    setSendingEmail(false);
    if (!res.success) {
      setEmailFeedback({
        type: "err",
        text: res.error || "Falha ao enviar e-mail.",
      });
      return;
    }
    setEmailFeedback({ type: "ok", text: "E-mail enviado." });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3.5 border-b border-border/60 pb-4">
        <FormIconBox form={form} size="lg" />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-foreground">{form.title}</h2>
            <span className="text-[10px] font-bold uppercase tracking-wide rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
              {form.audience}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{form.description}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Link2 className="h-4 w-4 text-primary" />
          Link para compartilhar
        </div>
        <p className="text-[11px] text-muted-foreground">
          Use o link curto no domínio <strong className="text-foreground">moveisunghero.com.br</strong> — mais fácil de enviar no WhatsApp ou e-mail.
        </p>
        <code className="block text-[11px] break-all rounded-lg bg-slate-950 text-slate-100 px-2.5 py-2">
          {shortUrl}
        </code>
        <div className="flex flex-wrap gap-2">
          <a
            href={shortUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Abrir link curto
          </a>
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {linkCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {linkCopied ? "Copiado" : "Copiar link"}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Link direto (admin):{" "}
          <a href={adminUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
            {adminUrl}
          </a>
        </p>
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <MessageCircle className="h-4 w-4 text-primary" />
          Mensagem pré-pronta
        </div>
        <p className="text-[11px] text-muted-foreground">
          Selecione um modelo, copie ou envie direto no WhatsApp / e-mail com o link já inserido.
        </p>
        <select
          value={selectedMessageId}
          onChange={(event) => setSelectedMessageId(event.target.value)}
          className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm font-medium"
        >
          {form.messages.map((message) => (
            <option key={message.id} value={message.id}>
              {message.label}
            </option>
          ))}
        </select>
        <pre className="text-[11px] whitespace-pre-wrap rounded-lg border border-border bg-background p-3 max-h-44 overflow-y-auto text-foreground leading-relaxed">
          {messageText}
        </pre>
        <div className="flex flex-wrap gap-2">
          <CopyButton text={messageText} label="Copiar mensagem" />
          <CopyButton text={shortUrl} label="Só o link" />
        </div>
      </div>

      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <MessageCircle className="h-4 w-4 text-emerald-600" />
          Enviar no WhatsApp
        </p>
        {clients.length > 0 ? (
          <div className="space-y-2">
            <label className="block text-[11px] font-semibold text-muted-foreground">
              Cliente (opcional)
            </label>
            <input
              type="search"
              value={clientQuery}
              onChange={(e) => setClientQuery(e.target.value)}
              placeholder="Buscar cliente para preencher telefone/e-mail…"
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm"
            />
            <ul className="max-h-28 overflow-y-auto rounded-lg border border-border bg-background divide-y divide-border/60">
              {filteredClients.total === 0 ? (
                <li className="px-3 py-2 text-xs text-muted-foreground">Nenhum cliente.</li>
              ) : (
                <>
                  {filteredClients.items.map((client) => (
                    <li key={client.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClientId(client.id);
                          setClientQuery("");
                        }}
                        className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                          selectedClientId === client.id
                            ? "bg-emerald-50 font-semibold"
                            : "hover:bg-muted/60"
                        }`}
                      >
                        <span className="block font-semibold">{client.nome}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {client.telefone || "Sem telefone"}
                          {client.email ? ` · ${client.email}` : ""}
                        </span>
                      </button>
                    </li>
                  ))}
                  {filteredClients.total > filteredClients.items.length ? (
                    <li className="px-3 py-1.5 text-[10px] text-muted-foreground">
                      Mostrando {filteredClients.items.length} de {filteredClients.total}.
                    </li>
                  ) : null}
                </>
              )}
            </ul>
          </div>
        ) : null}
        <label className="block text-[11px] font-semibold text-muted-foreground">
          Telefone do destinatário (com DDD)
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="tel"
            value={whatsappPhone}
            onChange={(event) => setWhatsappPhone(event.target.value)}
            className="flex-1 h-10 px-3 rounded-md border border-border bg-background text-sm"
          />
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shrink-0"
            >
              <MessageCircle className="h-4 w-4" />
              Abrir WhatsApp
            </a>
          ) : (
            <Button type="button" disabled size="sm" className="shrink-0 text-xs font-bold">
              Informe o telefone
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 space-y-3">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Mail className="h-4 w-4 text-sky-600" />
          Enviar por e-mail
        </p>
        {mailboxes.length === 0 ? (
          <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            Nenhuma caixa de e-mail disponível. Peça à Diretoria para liberar o módulo E-mails.
          </p>
        ) : (
          <>
            <label className="block text-[11px] font-semibold text-muted-foreground">
              Enviar de
            </label>
            <select
              value={mailboxId}
              onChange={(e) => setMailboxId(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm"
            >
              {mailboxes.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.areaLabel} — {m.address}
                </option>
              ))}
            </select>
            <label className="block text-[11px] font-semibold text-muted-foreground">Para</label>
            <input
              type="email"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder="destinatario@email.com"
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm"
            />
            <label className="block text-[11px] font-semibold text-muted-foreground">
              Assunto
            </label>
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              O e-mail inclui a mensagem selecionada e um botão para abrir o formulário.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                className="text-xs font-bold"
                disabled={!canSendEmail}
                onClick={() => void handleSendEmail()}
              >
                {sendingEmail ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                )}
                Enviar e-mail
              </Button>
              {emailFeedback ? (
                <span
                  className={`text-[11px] font-semibold ${
                    emailFeedback.type === "ok" ? "text-emerald-700" : "text-rose-600"
                  }`}
                >
                  {emailFeedback.text}
                </span>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

type Props = {
  clients?: GoogleReviewClientOption[];
  mailboxes?: EmailMailboxDTO[];
};

export default function MarketingFormsPanel({
  clients = [],
  mailboxes = [],
}: Props) {
  const [activeFormId, setActiveFormId] = useState<string | null>(null);
  const activeForm = MARKETING_FORMS.find((f) => f.id === activeFormId) ?? null;

  return (
    <div className="space-y-6">
      <Card className="p-5 border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
        <p className="text-sm font-semibold text-foreground">Central de formulários públicos</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
          Toque em um formulário para ver o link curto e as mensagens prontas. Envie pelo WhatsApp
          ou e-mail — as respostas entram no funil comercial ou na base de projetistas.
        </p>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
        {MARKETING_FORMS.map((form) => (
          <MarketingFormSummaryCard
            key={form.id}
            form={form}
            onOpen={() => setActiveFormId(form.id)}
          />
        ))}
      </div>

      <Dialog isOpen={!!activeForm} onClose={() => setActiveFormId(null)} className="max-w-xl w-full">
        {activeForm ? (
          <MarketingFormDetail
            form={activeForm}
            clients={clients}
            mailboxes={mailboxes}
          />
        ) : null}
      </Dialog>
    </div>
  );
}
