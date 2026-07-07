"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  MessageCircle,
  QrCode,
  Search,
  Star,
  User,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  buildGoogleReviewWhatsAppMessage,
  buildWhatsAppUrl,
  formatPhoneForWhatsApp,
  getGoogleReviewShortUrl,
  GOOGLE_REVIEW_URL,
  type GoogleReviewClientOption,
} from "@/lib/google-review";

interface GoogleReviewLinkCardProps {
  clients: GoogleReviewClientOption[];
}

interface LinkRowProps {
  label: string;
  description: string;
  url: string;
  recommended?: boolean;
}

function LinkRow({ label, description, url, recommended }: LinkRowProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copie o link:", url);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{label}</p>
            {recommended ? (
              <span className="text-[10px] font-bold uppercase tracking-wide rounded-full bg-primary/10 text-primary px-2 py-0.5">
                Recomendado
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Abrir
          </a>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
      </div>
      <code className="block text-xs break-all rounded-lg bg-slate-950 text-slate-100 px-3 py-2">
        {url}
      </code>
    </div>
  );
}

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
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copiado" : label}
    </button>
  );
}

export default function GoogleReviewLinkCard({ clients }: GoogleReviewLinkCardProps) {
  const shortUrl = getGoogleReviewShortUrl();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? null,
    [clients, selectedClientId]
  );

  const filteredClients = useMemo(() => {
    const query = clientSearch.trim().toLowerCase();
    if (!query) return clients.slice(0, 8);

    return clients
      .filter(
        (client) =>
          client.nome.toLowerCase().includes(query) ||
          client.telefone.replace(/\D/g, "").includes(query.replace(/\D/g, ""))
      )
      .slice(0, 8);
  }, [clientSearch, clients]);

  const whatsappMessage = useMemo(
    () =>
      buildGoogleReviewWhatsAppMessage({
        clientName: selectedClient?.nome,
        reviewUrl: shortUrl,
      }),
    [selectedClient?.nome, shortUrl]
  );

  const whatsappUrl = useMemo(() => {
    if (!selectedClient?.telefone) return "";
    return buildWhatsAppUrl(selectedClient.telefone, whatsappMessage);
  }, [selectedClient?.telefone, whatsappMessage]);

  const formattedPhone = selectedClient
    ? formatPhoneForWhatsApp(selectedClient.telefone)
    : "";

  useEffect(() => {
    let active = true;

    QRCode.toDataURL(shortUrl, {
      width: 280,
      margin: 2,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl(null);
      });

    return () => {
      active = false;
    };
  }, [shortUrl]);

  function handleSelectClient(client: GoogleReviewClientOption) {
    setSelectedClientId(client.id);
    setClientSearch("");
  }

  function handleClearClient() {
    setSelectedClientId(null);
    setClientSearch("");
  }

  function handleDownloadQr() {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = "avaliar-moveis-unghero.png";
    link.click();
  }

  return (
    <Card className="p-[var(--space-5)] space-y-[var(--space-5)]">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-600">
          <Star className="h-5 w-5 fill-current" />
        </div>
        <div className="space-y-1">
          <h2 className="text-headline text-foreground">Avaliação no Google</h2>
          <p className="text-caption text-muted-foreground max-w-2xl">
            Envie para clientes após a entrega ou instalação. O link abre direto na tela de
            comentário e estrelas do Google.
          </p>
        </div>
      </div>

      <div className="space-y-[var(--space-3)]">
        <LinkRow
          label="Link curto da Móveis Unghero"
          description="Usa o domínio da empresa e redireciona para a avaliação no Google."
          url={shortUrl}
          recommended
        />

        <LinkRow
          label="Link direto do Google"
          description="Atalho oficial compartilhado pelo Google Business Profile."
          url={GOOGLE_REVIEW_URL}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--space-4)]">
        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
          <div className="flex items-start gap-2">
            <QrCode className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">QR Code</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Imprima e deixe na entrega ou no ambiente instalado para o cliente escanear.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt="QR Code para avaliação no Google"
                className="rounded-xl border border-border bg-white p-3"
                width={280}
                height={280}
              />
            ) : (
              <div className="h-[280px] w-[280px] rounded-xl border border-dashed border-border bg-muted animate-pulse" />
            )}

            <p className="text-xs text-muted-foreground text-center break-all">{shortUrl}</p>

            <button
              type="button"
              onClick={handleDownloadQr}
              disabled={!qrDataUrl}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              Baixar PNG
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
          <div className="flex items-start gap-2">
            <MessageCircle className="h-5 w-5 text-[#25D366] mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">Mensagem no WhatsApp</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Selecione um cliente para preencher o número e personalizar a mensagem.
              </p>
            </div>
          </div>

          {selectedClient ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{selectedClient.nome}</p>
                <p className="text-xs text-muted-foreground">{selectedClient.telefone}</p>
              </div>
              <button
                type="button"
                onClick={handleClearClient}
                className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Remover cliente selecionado"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={clientSearch}
                  onChange={(event) => setClientSearch(event.target.value)}
                  placeholder="Buscar cliente por nome ou telefone..."
                  className="w-full rounded-lg border border-input bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
                />
              </div>

              {filteredClients.length > 0 ? (
                <ul className="max-h-44 overflow-y-auto rounded-lg border border-border bg-card divide-y divide-border">
                  {filteredClients.map((client) => (
                    <li key={client.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectClient(client)}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/60 transition-colors"
                      >
                        <div className="rounded-full bg-muted p-1.5 text-muted-foreground">
                          <User className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{client.nome}</p>
                          <p className="text-xs text-muted-foreground">{client.telefone}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground px-1">
                  Nenhum cliente encontrado. Cadastre em Clientes ou refine a busca.
                </p>
              )}
            </div>
          )}

          <textarea
            readOnly
            value={whatsappMessage}
            rows={9}
            className="w-full rounded-lg border border-input bg-card px-3 py-2 text-xs leading-relaxed text-foreground resize-none"
          />

          <div className="flex flex-wrap gap-2">
            <CopyButton text={whatsappMessage} label="Copiar mensagem" />

            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1ebe57] transition-colors"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Abrir WhatsApp
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366]/50 px-4 py-2 text-xs font-semibold text-white cursor-not-allowed"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Selecione um cliente
              </button>
            )}
          </div>

          {selectedClient && !formattedPhone ? (
            <p className="text-xs text-destructive">
              O telefone deste cliente é inválido. Atualize o cadastro em Clientes.
            </p>
          ) : null}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Dica: prefira o link curto em mensagens ao cliente. Se o Google atualizar o link oficial,
        basta alterar a configuração no sistema — o endereço curto e o QR Code continuam os mesmos.
      </p>
    </Card>
  );
}
