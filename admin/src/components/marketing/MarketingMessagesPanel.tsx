"use client";

import { useMemo, useState } from "react";
import {
  CalendarCheck,
  Check,
  ChevronRight,
  Copy,
  MessageCircle,
  Navigation,
  Search,
  Star,
  User,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  MARKETING_MESSAGES,
  type MarketingMessage,
} from "@/lib/marketingMessages";
import {
  buildWhatsAppUrl,
  formatPhoneForWhatsApp,
  type GoogleReviewClientOption,
} from "@/lib/google-review";

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
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="text-xs font-semibold gap-1.5"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copiado" : label}
    </Button>
  );
}

function messageIcon(message: MarketingMessage) {
  if (message.id === "medicao-a-caminho") return Navigation;
  if (message.id === "conf-tecnica-agendar") return CalendarCheck;
  if (message.id === "google-avaliacao") return Star;
  return MessageCircle;
}

function MessageIconBox({
  message,
  size = "md",
}: {
  message: MarketingMessage;
  size?: "md" | "lg";
}) {
  const Icon = messageIcon(message);
  return (
    <div
      className={`rounded-xl bg-emerald-500/10 text-emerald-700 shrink-0 ${
        size === "lg" ? "p-3.5" : "p-3"
      }`}
    >
      <Icon className={size === "lg" ? "h-6 w-6" : "h-5 w-5"} />
    </div>
  );
}

function MarketingMessageSummaryCard({
  message,
  onOpen,
}: {
  message: MarketingMessage;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group text-left w-full h-full rounded-2xl border border-border/60 bg-card p-5 flex flex-col gap-4 transition-all hover:border-emerald-500/40 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <MessageIconBox message={message} size="lg" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <h3 className="text-sm font-bold text-foreground leading-snug">
            {message.title}
          </h3>
          <span className="inline-block text-[10px] font-bold uppercase tracking-wide rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
            {message.category}
          </span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 flex-1">
        {message.description}
      </p>

      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 group-hover:gap-1.5 transition-all">
        Abrir mensagem
        <ChevronRight className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}

function MarketingMessageDetail({
  message,
  clients,
  onClose,
}: {
  message: MarketingMessage;
  clients: GoogleReviewClientOption[];
  onClose: () => void;
}) {
  const [clientQuery, setClientQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [phoneOverride, setPhoneOverride] = useState("");

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) ?? null,
    [clients, selectedClientId]
  );

  const filteredClients = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    if (!q) return clients.slice(0, 8);
    return clients
      .filter(
        (c) =>
          c.nome.toLowerCase().includes(q) ||
          c.telefone.replace(/\D/g, "").includes(q.replace(/\D/g, ""))
      )
      .slice(0, 8);
  }, [clients, clientQuery]);

  const messageText = useMemo(
    () => message.build({ clientName: selectedClient?.nome }),
    [message, selectedClient]
  );

  const phone = phoneOverride || selectedClient?.telefone || "";
  const phoneReady = Boolean(formatPhoneForWhatsApp(phone));
  const whatsappUrl = phoneReady ? buildWhatsAppUrl(phone, messageText) : "";

  function selectClient(client: GoogleReviewClientOption) {
    setSelectedClientId(client.id);
    setPhoneOverride(client.telefone || "");
    setClientQuery("");
  }

  function clearClient() {
    setSelectedClientId("");
    setPhoneOverride("");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <MessageIconBox message={message} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold tracking-tight text-foreground">
            {message.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {message.description}
          </p>
          <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wide rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
            {message.category}
          </span>
        </div>
      </div>

      {message.tip ? (
        <p className="text-[11px] text-muted-foreground leading-snug rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
          <span className="font-semibold text-foreground">Dica: </span>
          {message.tip}
        </p>
      ) : null}

      <div className="rounded-xl border border-border/60 bg-muted/10 p-4 space-y-3">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <User className="h-4 w-4 text-primary" />
          Personalizar com cliente (opcional)
        </p>
        {selectedClient ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {selectedClient.nome}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {selectedClient.telefone || "Sem telefone"}
              </p>
            </div>
            <button
              type="button"
              onClick={clearClient}
              className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Limpar cliente"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                value={clientQuery}
                onChange={(e) => setClientQuery(e.target.value)}
                placeholder="Buscar cliente por nome ou telefone…"
                className="w-full h-10 pl-9 pr-3 rounded-md border border-border bg-background text-sm"
              />
            </div>
            {clientQuery.trim() ? (
              <ul className="max-h-40 overflow-y-auto rounded-lg border border-border bg-background divide-y divide-border/60">
                {filteredClients.length === 0 ? (
                  <li className="px-3 py-2.5 text-xs text-muted-foreground">
                    Nenhum cliente encontrado.
                  </li>
                ) : (
                  filteredClients.map((client) => (
                    <li key={client.id}>
                      <button
                        type="button"
                        onClick={() => selectClient(client)}
                        className="w-full text-left px-3 py-2.5 hover:bg-muted/60 transition-colors"
                      >
                        <p className="text-sm font-semibold text-foreground truncate">
                          {client.nome}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {client.telefone || "Sem telefone"}
                        </p>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Sem cliente, a mensagem sai genérica (“Olá, tudo bem?”).
              </p>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <MessageCircle className="h-4 w-4 text-primary" />
          Mensagem pré-pronta
        </div>
        <pre className="text-[11px] whitespace-pre-wrap rounded-lg border border-border bg-background p-3 max-h-52 overflow-y-auto text-foreground leading-relaxed">
          {messageText}
        </pre>
        <CopyButton text={messageText} label="Copiar mensagem" />
      </div>

      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <MessageCircle className="h-4 w-4 text-emerald-600" />
          Enviar no WhatsApp
        </p>
        <label className="block text-[11px] font-semibold text-muted-foreground">
          Telefone do destinatário (com DDD)
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhoneOverride(e.target.value)}
            className="flex-1 h-10 px-3 rounded-md border border-border bg-background text-sm"
            placeholder="(54) 99999-9999"
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

      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={onClose} className="text-xs font-bold">
          Fechar
        </Button>
      </div>
    </div>
  );
}

type Props = {
  clients: GoogleReviewClientOption[];
};

export default function MarketingMessagesPanel({ clients }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = MARKETING_MESSAGES.find((m) => m.id === activeId) ?? null;

  return (
    <div className="space-y-6">
      <Card className="p-5 border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent">
        <p className="text-sm font-semibold text-foreground">Biblioteca de mensagens</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-2xl">
          Textos prontos para copiar ou enviar no WhatsApp. Use no funil, pós-entrega ou
          captação — personalize com o nome do cliente quando quiser.
        </p>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {MARKETING_MESSAGES.map((message) => (
          <MarketingMessageSummaryCard
            key={message.id}
            message={message}
            onOpen={() => setActiveId(message.id)}
          />
        ))}
      </div>

      <Dialog
        isOpen={!!active}
        onClose={() => setActiveId(null)}
        className="max-w-lg"
      >
        {active ? (
          <MarketingMessageDetail
            message={active}
            clients={clients}
            onClose={() => setActiveId(null)}
          />
        ) : null}
      </Dialog>
    </div>
  );
}
