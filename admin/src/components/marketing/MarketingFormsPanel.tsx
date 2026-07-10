"use client";

import { useMemo, useState } from "react";
import {
  Check,
  ClipboardList,
  Copy,
  ExternalLink,
  Link2,
  MessageCircle,
  PenTool,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  buildMarketingFormMessage,
  getMarketingFormAdminUrl,
  getMarketingFormShortUrl,
  MARKETING_FORMS,
  type MarketingForm,
} from "@/lib/marketingForms";
import { buildWhatsAppUrl } from "@/lib/google-review";

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

function FormIcon({ form }: { form: MarketingForm }) {
  const Icon = form.id === "projetistas-arquitetos" ? PenTool : ClipboardList;
  return (
    <div className="rounded-xl bg-primary/10 p-3 text-primary shrink-0">
      <Icon className="h-5 w-5" />
    </div>
  );
}

function MarketingFormCard({ form }: { form: MarketingForm }) {
  const shortUrl = getMarketingFormShortUrl(form);
  const adminUrl = getMarketingFormAdminUrl(form);
  const [selectedMessageId, setSelectedMessageId] = useState(form.messages[0]?.id ?? "");
  const [linkCopied, setLinkCopied] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState("");

  const messageText = useMemo(
    () => buildMarketingFormMessage(form, selectedMessageId),
    [form, selectedMessageId]
  );

  const whatsappUrl = useMemo(() => {
    if (!messageText) return "";
    return buildWhatsAppUrl(whatsappPhone, messageText);
  }, [messageText, whatsappPhone]);

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      window.prompt("Copie o link:", shortUrl);
    }
  }

  return (
    <Card className="p-5 glass-card space-y-5">
      <div className="flex items-start gap-4">
        <FormIcon form={form} />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-foreground">{form.title}</h3>
            <span className="text-[10px] font-bold uppercase tracking-wide rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
              {form.audience}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{form.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Link2 className="h-4 w-4 text-primary" />
            Link para compartilhar
          </div>
          <p className="text-[11px] text-muted-foreground">
            Use o link curto no domínio <strong className="text-foreground">moveisunghero.com.br</strong> — mais fácil de enviar no WhatsApp.
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
            Selecione um modelo, copie ou envie direto no WhatsApp com o link já inserido.
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
      </div>

      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <MessageCircle className="h-4 w-4 text-emerald-600" />
          Enviar no WhatsApp
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="tel"
            placeholder="Telefone do destinatário (com DDD)"
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
    </Card>
  );
}

export default function MarketingFormsPanel() {
  return (
    <div className="space-y-6">
      <Card className="p-5 border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
        <p className="text-sm font-semibold text-foreground">
          Central de formulários públicos
        </p>
        <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
          Copie o link curto ou escolha uma mensagem pré-pronta para enviar ao cliente ou parceiro.
          Os formulários preenchidos entram automaticamente no funil comercial ou na base de projetistas.
        </p>
      </Card>

      <div className="space-y-5">
        {MARKETING_FORMS.map((form) => (
          <MarketingFormCard key={form.id} form={form} />
        ))}
      </div>
    </div>
  );
}
