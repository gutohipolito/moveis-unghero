"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Loader2, MessageCircle } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { buildWhatsAppUrl, formatPhoneForWhatsApp } from "@/lib/google-review";
import { buildCatalogWhatsAppMessage } from "@/lib/catalogShareMessage";

export type CatalogShareClient = {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  catalogTitle: string;
  partnerName?: string | null;
  catalogUrl: string | null;
  resolvingLink?: boolean;
  clients: CatalogShareClient[];
};

export default function CatalogShareWhatsAppDialog({
  open,
  onClose,
  catalogTitle,
  partnerName,
  catalogUrl,
  resolvingLink,
  clients,
}: Props) {
  const [query, setQuery] = useState("");
  const [clientId, setClientId] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const selected = useMemo(
    () => clients.find((c) => c.id === clientId) || null,
    [clients, clientId]
  );

  useEffect(() => {
    if (!open) {
      setQuery("");
      setClientId("");
      setPhone("");
      setMessage("");
      setCopied(false);
      return;
    }
    setMessage(
      buildCatalogWhatsAppMessage({
        catalogTitle,
        catalogUrl: catalogUrl || "",
        clientName: selected?.nome,
        partnerName,
      })
    );
  }, [open, catalogTitle, catalogUrl, partnerName, selected?.nome]);

  useEffect(() => {
    if (!open) return;
    if (selected) setPhone(selected.telefone || "");
  }, [open, selected]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients.slice(0, 40);
    return clients
      .filter(
        (c) =>
          c.nome.toLowerCase().includes(q) ||
          c.telefone.replace(/\D/g, "").includes(q.replace(/\D/g, ""))
      )
      .slice(0, 40);
  }, [clients, query]);

  const phoneReady = Boolean(formatPhoneForWhatsApp(phone));
  const linkReady = Boolean(catalogUrl);
  const whatsappUrl =
    phoneReady && linkReady && message.trim()
      ? buildWhatsAppUrl(phone, message)
      : "";

  async function handleCopy() {
    if (!message.trim()) return;
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <Dialog isOpen={open} onClose={onClose} className="max-w-lg w-full" closeOnBackdrop>
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-emerald-600" />
            Compartilhar no WhatsApp
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Selecione o cliente, ajuste a mensagem e abra o WhatsApp.
          </p>
        </div>

        {resolvingLink ? (
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Gerando link público…
          </p>
        ) : catalogUrl ? (
          <p className="text-[11px] font-medium text-slate-500 break-all bg-slate-50 border border-slate-100 rounded-[var(--radius-sm)] px-2.5 py-2">
            {catalogUrl}
          </p>
        ) : (
          <p className="text-xs text-rose-600">Não foi possível gerar o link do catálogo.</p>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">Buscar cliente</label>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nome ou telefone…"
          />
          <div className="max-h-36 overflow-y-auto rounded-[var(--radius-sm)] border border-slate-200 divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground px-3 py-2">Nenhum cliente encontrado.</p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setClientId(c.id)}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors cursor-pointer ${
                    clientId === c.id
                      ? "bg-emerald-50 text-emerald-900 font-semibold"
                      : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <span className="block font-semibold">{c.nome}</span>
                  <span className="text-[10px] text-muted-foreground">{c.telefone || "Sem telefone"}</span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">Telefone</label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(54) 99999-9999"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">Mensagem</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            className="w-full rounded-[var(--radius-sm)] border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button type="button" variant="outline" onClick={() => void handleCopy()} disabled={!message.trim()}>
            {copied ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
            {copied ? "Copiado" : "Copiar"}
          </Button>
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: "default" }),
                "font-bold bg-emerald-600 border-emerald-700 text-white hover:bg-emerald-500"
              )}
            >
              <MessageCircle className="h-4 w-4 mr-1.5" />
              Abrir WhatsApp
            </a>
          ) : (
            <Button type="button" disabled className="font-bold">
              Abrir WhatsApp
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
