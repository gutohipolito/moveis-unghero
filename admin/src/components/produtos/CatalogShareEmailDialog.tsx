"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Mail, Send } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EmailMailboxDTO } from "@/app/actions/emailMailboxes";
import { sendMailboxEmail } from "@/app/actions/emailInbox";
import {
  buildCatalogEmailBody,
  buildCatalogEmailSubject,
} from "@/lib/catalogShareMessage";
import type { CatalogShareClient } from "@/components/produtos/CatalogShareWhatsAppDialog";

type Props = {
  open: boolean;
  onClose: () => void;
  catalogTitle: string;
  partnerName?: string | null;
  catalogUrl: string | null;
  resolvingLink?: boolean;
  clients: CatalogShareClient[];
  mailboxes: EmailMailboxDTO[];
  onSent?: () => void;
  onError?: (message: string) => void;
};

export default function CatalogShareEmailDialog({
  open,
  onClose,
  catalogTitle,
  partnerName,
  catalogUrl,
  resolvingLink,
  clients,
  mailboxes,
  onSent,
  onError,
}: Props) {
  const [query, setQuery] = useState("");
  const [clientId, setClientId] = useState("");
  const [mailboxId, setMailboxId] = useState("");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const selected = useMemo(
    () => clients.find((c) => c.id === clientId) || null,
    [clients, clientId]
  );

  useEffect(() => {
    if (!open) {
      setQuery("");
      setClientId("");
      setTo("");
      setSubject("");
      setBody("");
      setSending(false);
      return;
    }
    setMailboxId((prev) => prev || mailboxes[0]?.id || "");
    setSubject(buildCatalogEmailSubject(catalogTitle));
    setBody(
      buildCatalogEmailBody({
        catalogTitle,
        catalogUrl: catalogUrl || "",
        clientName: selected?.nome,
        partnerName,
      })
    );
  }, [open, catalogTitle, catalogUrl, partnerName, selected?.nome, mailboxes]);

  useEffect(() => {
    if (!open) return;
    if (selected?.email) setTo(selected.email);
  }, [open, selected]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = !q
      ? clients
      : clients.filter(
          (c) =>
            c.nome.toLowerCase().includes(q) ||
            (c.email || "").toLowerCase().includes(q)
        );
    return { items: list.slice(0, 80), total: list.length };
  }, [clients, query]);

  const canSend =
    Boolean(mailboxId) &&
    Boolean(to.trim()) &&
    Boolean(subject.trim()) &&
    Boolean(body.trim()) &&
    Boolean(catalogUrl) &&
    !sending;

  async function handleSend() {
    if (!canSend || !mailboxId) return;
    setSending(true);
    const res = await sendMailboxEmail({
      mailboxId,
      to: to.trim(),
      subject: subject.trim(),
      text: body.trim(),
    });
    setSending(false);
    if (!res.success) {
      onError?.(res.error || "Falha ao enviar e-mail.");
      return;
    }
    onSent?.();
    onClose();
  }

  return (
    <Dialog isOpen={open} onClose={() => !sending && onClose()} className="max-w-lg w-full">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Mail className="h-5 w-5 text-sky-600" />
            Enviar por e-mail
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Rascunho no sistema (como abrir o Mail) — fica registrado na caixa.
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

        {mailboxes.length === 0 ? (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-[var(--radius-sm)] px-3 py-2">
            Nenhuma caixa de e-mail disponível para o seu cargo. Peça à Diretoria para liberar o módulo
            E-mails ou uma caixa comercial.
          </p>
        ) : (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Enviar de</label>
            <select
              value={mailboxId}
              onChange={(e) => setMailboxId(e.target.value)}
              className="w-full h-10 rounded-[var(--radius-sm)] border border-input bg-background px-3 text-sm"
            >
              {mailboxes.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.areaLabel} — {m.address}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">Cliente (opcional)</label>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar para preencher o e-mail…"
          />
          <div className="max-h-28 overflow-y-auto rounded-[var(--radius-sm)] border border-slate-200 divide-y divide-slate-100">
            {filtered.total === 0 ? (
              <p className="text-xs text-muted-foreground px-3 py-2">Nenhum cliente.</p>
            ) : (
              <>
                {filtered.items.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setClientId(c.id)}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors cursor-pointer ${
                      clientId === c.id
                        ? "bg-sky-50 text-sky-950 font-semibold"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <span className="block font-semibold">{c.nome}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {c.email || "Sem e-mail"}
                    </span>
                  </button>
                ))}
                {filtered.total > filtered.items.length ? (
                  <p className="text-[10px] text-muted-foreground px-3 py-2">
                    Mostrando {filtered.items.length} de {filtered.total}. Digite para filtrar.
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">Para *</label>
          <Input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="cliente@email.com"
            type="email"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">Assunto *</label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">Mensagem *</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={7}
            className="w-full rounded-[var(--radius-sm)] border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose} disabled={sending}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="font-bold"
            disabled={!canSend || mailboxes.length === 0}
            onClick={() => void handleSend()}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-1.5" />
            )}
            Enviar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
