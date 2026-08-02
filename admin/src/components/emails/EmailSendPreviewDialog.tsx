"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PreviewData = {
  to: string;
  subject: string;
  html: string;
  from?: string | null;
};

interface EmailSendPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  loading?: boolean;
  error?: string | null;
  preview: PreviewData | null;
  sending?: boolean;
  onConfirm: (to: string) => void | Promise<void>;
}

export default function EmailSendPreviewDialog({
  open,
  onClose,
  title = "Enviar e-mail",
  loading = false,
  error = null,
  preview,
  sending = false,
  onConfirm,
}: EmailSendPreviewDialogProps) {
  const [to, setTo] = useState("");

  useEffect(() => {
    if (open && preview) {
      setTo(preview.to || "");
    }
  }, [open, preview]);

  const canSend = Boolean(to.trim().includes("@")) && !loading && !sending && !error;

  return (
    <Dialog
      isOpen={open}
      onClose={onClose}
      className="max-w-2xl"
      bodyClassName="p-0"
    >
      <div className="border-b border-border/50 px-5 py-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Mail className="h-5 w-5 text-sky-700" />
          {title}
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Confira o conteúdo antes de enviar. Você pode alterar o destinatário.
        </p>
      </div>

      <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Montando prévia do e-mail…
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-900 text-sm px-3 py-2.5">
            {error}
          </div>
        )}

        {!loading && !error && preview && (
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Destinatário
              </label>
              <Input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="cliente@email.com"
                autoFocus
              />
            </div>
            {preview.from && (
              <p className="text-[11px] text-muted-foreground">
                De: <span className="font-medium text-foreground">{preview.from}</span>
              </p>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Assunto
              </label>
              <p className="text-sm font-semibold text-foreground rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
                {preview.subject}
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Prévia
              </label>
              <iframe
                title="Prévia do e-mail"
                className="w-full h-[320px] rounded-lg border border-border/50 bg-white"
                sandbox=""
                srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"></head><body style="margin:0;padding:16px;background:#ffffff;">${preview.html}</body></html>`}
              />
            </div>
          </>
        )}
      </div>

      <div className="border-t border-border/50 px-5 py-3 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={sending}>
          Cancelar
        </Button>
        <Button
          type="button"
          className="btn-metallic gap-1.5"
          disabled={!canSend}
          onClick={() => void onConfirm(to.trim().toLowerCase())}
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Mail className="h-4 w-4" />
          )}
          {sending ? "Enviando…" : "Confirmar envio"}
        </Button>
      </div>
    </Dialog>
  );
}
