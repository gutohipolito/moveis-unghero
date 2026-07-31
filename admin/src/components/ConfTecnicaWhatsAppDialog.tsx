"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { buildWhatsAppUrl, formatPhoneForWhatsApp } from "@/lib/google-review";
import { buildConfTecnicaWhatsAppMessage } from "@/lib/confTecnicaWhatsApp";

export type ConfTecnicaWhatsAppTarget = {
  projectId: string;
  clientName: string;
  clientPhone: string;
  /** Nomes dos responsáveis (pré-preenche “Quem vai”). */
  responsaveis?: string[];
};

type Props = {
  target: ConfTecnicaWhatsAppTarget | null;
  onClose: () => void;
};

export default function ConfTecnicaWhatsAppDialog({ target, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const [phone, setPhone] = useState("");
  const [horario, setHorario] = useState("");
  const [quemVai, setQuemVai] = useState("");

  useEffect(() => {
    if (!target) {
      setCopied(false);
      setPhone("");
      setHorario("");
      setQuemVai("");
      return;
    }
    setCopied(false);
    setPhone(target.clientPhone || "");
    setHorario("");
    setQuemVai(
      (target.responsaveis || []).filter(Boolean).join(" e ") || ""
    );
  }, [target]);

  const message = useMemo(
    () =>
      target
        ? buildConfTecnicaWhatsAppMessage({
            clientName: target.clientName,
            horario,
            quemVai,
          })
        : "",
    [target, horario, quemVai]
  );

  const phoneReady = Boolean(formatPhoneForWhatsApp(phone));
  const whatsappUrl = phoneReady ? buildWhatsAppUrl(phone, message) : "";
  const detailsReady = Boolean(horario.trim() && quemVai.trim());

  async function handleCopy() {
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <Dialog
      isOpen={!!target}
      onClose={onClose}
      className="max-w-lg"
      closeOnBackdrop
    >
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold tracking-tight text-foreground">
            Lembrete — visita de conferência técnica
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {target
              ? `Preencha horário e quem vai na visita de ${target.clientName}. O WhatsApp usa o rótulo em negrito e o valor na linha de baixo.`
              : ""}
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/10 p-3.5 space-y-3">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-foreground">
              Horário marcado
            </label>
            <input
              type="text"
              value={horario}
              onChange={(e) => setHorario(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm"
              placeholder="Ex.: Sexta, 15/08 às 14h"
            />
            <p className="text-[10px] text-muted-foreground">
              Na mensagem: <span className="font-semibold">*Horário marcado:*</span>{" "}
              e o texto na linha seguinte.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-foreground">
              Quem vai
            </label>
            <input
              type="text"
              value={quemVai}
              onChange={(e) => setQuemVai(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm"
              placeholder="Ex.: Ana (projetista) e Carlos"
            />
            <p className="text-[10px] text-muted-foreground">
              Na mensagem: <span className="font-semibold">*Quem vai:*</span> e o
              texto na linha seguinte.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MessageCircle className="h-4 w-4 text-primary" />
            Prévia da mensagem
          </div>
          {!detailsReady ? (
            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200/80 rounded-lg px-3 py-2">
              Preencha horário e quem vai para montar o lembrete completo.
            </p>
          ) : null}
          <pre className="text-[11px] whitespace-pre-wrap rounded-lg border border-border bg-background p-3 max-h-52 overflow-y-auto text-foreground leading-relaxed">
            {message}
          </pre>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={!detailsReady}
            className="text-xs font-bold gap-1.5"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copiar mensagem
              </>
            )}
          </Button>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-2.5">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <MessageCircle className="h-4 w-4 text-emerald-600" />
            Enviar no WhatsApp
          </p>
          <label className="block text-[11px] font-semibold text-muted-foreground">
            Telefone do cliente (com DDD)
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm"
            placeholder="(54) 99999-9999"
          />
          {whatsappUrl && detailsReady ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              Abrir WhatsApp
            </a>
          ) : (
            <Button type="button" disabled size="sm" className="text-xs font-bold">
              {!detailsReady
                ? "Preencha horário e quem vai"
                : "Informe o telefone"}
            </Button>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="text-xs font-bold"
          >
            Agora não
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
