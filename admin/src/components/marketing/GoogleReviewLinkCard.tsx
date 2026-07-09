"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Link2,
  MessageCircle,
  QrCode,
  Search,
  Star,
  User,
  X,
} from "lucide-react";
import {
  buildGoogleReviewWhatsAppMessage,
  buildWhatsAppUrl,
  formatPhoneForWhatsApp,
  getGoogleReviewShortUrl,
  GOOGLE_REVIEW_SHORT_URL,
  GOOGLE_REVIEW_URL,
  type GoogleReviewClientOption,
} from "@/lib/google-review";

interface GoogleReviewLinkCardProps {
  clients: GoogleReviewClientOption[];
}

interface LinkCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  url: string;
  recommended?: boolean;
}

function LinkCard({ icon, title, description, url, recommended }: LinkCardProps) {
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
    <div className="flex h-full flex-col rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex items-start gap-2.5">
        <div className="rounded-lg bg-background p-2 text-primary shrink-0">{icon}</div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {recommended ? (
              <span className="text-[10px] font-bold uppercase tracking-wide rounded-full bg-primary/10 text-primary px-2 py-0.5">
                Recomendado
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
      </div>

      <code className="mt-3 block text-[11px] break-all rounded-lg bg-slate-950 text-slate-100 px-2.5 py-2">
        {url}
      </code>

      <div className="mt-2 flex gap-2">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Abrir
        </a>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
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
  const qrUrl = GOOGLE_REVIEW_SHORT_URL;
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? null,
    [clients, selectedClientId]
  );

  const personalizedName = selectedClient?.nome ?? (manualName.trim() || undefined);
  const personalizedPhone = selectedClient?.telefone ?? manualPhone.trim();

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
        clientName: personalizedName,
        reviewUrl: shortUrl,
      }),
    [personalizedName, shortUrl]
  );

  const whatsappUrl = useMemo(() => {
    if (!personalizedPhone) return "";
    return buildWhatsAppUrl(personalizedPhone, whatsappMessage);
  }, [personalizedPhone, whatsappMessage]);

  const formattedPhone = personalizedPhone ? formatPhoneForWhatsApp(personalizedPhone) : "";

  useEffect(() => {
    let active = true;

    QRCode.toDataURL(qrUrl, {
      width: 200,
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
  }, [qrUrl]);

  function handleSelectClient(client: GoogleReviewClientOption) {
    setSelectedClientId(client.id);
    setClientSearch("");
    setManualName("");
    setManualPhone("");
  }

  function handleClearClient() {
    setSelectedClientId(null);
    setClientSearch("");
    setManualName("");
    setManualPhone("");
  }

  function handleManualNameChange(value: string) {
    setManualName(value);
    if (value.trim()) {
      setSelectedClientId(null);
      setClientSearch("");
    }
  }

  function handleManualPhoneChange(value: string) {
    setManualPhone(value);
    if (value.trim()) {
      setSelectedClientId(null);
    }
  }

  function handleDownloadQr() {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = "avaliar-moveis-unghero.png";
    link.click();
  }

  return (
    <div className="space-y-[var(--space-5)]">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--space-4)] items-stretch">
        <LinkCard
          icon={<Link2 className="h-4 w-4" />}
          title="Link curto"
          description="Domínio da Móveis Unghero — ideal para WhatsApp e materiais impressos."
          url={shortUrl}
          recommended
        />

        <LinkCard
          icon={<ExternalLink className="h-4 w-4" />}
          title="Link direto Google"
          description="Atalho oficial do Google Business Profile."
          url={GOOGLE_REVIEW_URL}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--space-4)] items-stretch">
        <div className="flex h-full flex-col rounded-xl border border-border bg-muted/20 p-4 space-y-[var(--space-3)]">
          <div className="flex items-start gap-2">
            <MessageCircle className="h-5 w-5 text-[#25D366] mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">Mensagem no WhatsApp</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Selecione um cliente cadastrado ou informe nome e telefone manualmente para clientes antigos.
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
            <div className="space-y-3">
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
                ) : clientSearch.trim() ? (
                  <p className="text-xs text-muted-foreground px-1">
                    Nenhum cliente encontrado. Use o nome manual abaixo ou cadastre em Clientes.
                  </p>
                ) : null}
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-muted/20 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    ou cliente antigo
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label htmlFor="manual-review-name" className="text-[11px] font-semibold text-muted-foreground">
                    Nome manual
                  </label>
                  <input
                    id="manual-review-name"
                    type="text"
                    value={manualName}
                    onChange={(event) => handleManualNameChange(event.target.value)}
                    placeholder="Ex.: Maria Silva"
                    className="w-full rounded-lg border border-input bg-card py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="manual-review-phone" className="text-[11px] font-semibold text-muted-foreground">
                    Telefone (opcional)
                  </label>
                  <input
                    id="manual-review-phone"
                    type="tel"
                    value={manualPhone}
                    onChange={(event) => handleManualPhoneChange(event.target.value)}
                    placeholder="(54) 99999-9999"
                    className="w-full rounded-lg border border-input bg-card py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
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
                {personalizedName ? "Informe o telefone" : "Selecione ou informe o cliente"}
              </button>
            )}
          </div>

          {personalizedPhone && !formattedPhone ? (
            <p className="text-xs text-destructive">
              O telefone informado é inválido. Verifique o número ou atualize o cadastro em Clientes.
            </p>
          ) : null}
        </div>

        <div className="flex h-full flex-col rounded-xl border border-border bg-muted/20 p-4">
          <div className="flex items-start gap-2.5">
            <div className="rounded-lg bg-background p-2 text-primary shrink-0">
              <QrCode className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">QR Code</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Para impressão na entrega ou no ambiente instalado.
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-col items-center">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt="QR Code para avaliação no Google"
                className="rounded-lg border border-border bg-white p-2"
                width={200}
                height={200}
              />
            ) : (
              <div className="h-[200px] w-[200px] rounded-lg border border-dashed border-border bg-muted animate-pulse" />
            )}
          </div>

          <code className="mt-3 block text-[11px] break-all rounded-lg bg-slate-950 text-slate-100 px-2.5 py-2">
            {qrUrl}
          </code>

          <button
            type="button"
            onClick={handleDownloadQr}
            disabled={!qrDataUrl}
            className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            Baixar PNG
          </button>
        </div>
      </div>
    </div>
  );
}
