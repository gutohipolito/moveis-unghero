"use client";

import React, { useEffect, useState, useTransition } from "react";
import { Eye, EyeOff, Loader2, Moon, Palette, Settings2, Sun } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PARTNER_ACCENT_PRESETS,
  type PartnerUiAccentId,
  type PartnerUiPrefs,
  type PartnerUiTheme,
} from "@/lib/partnerUiPrefs";
import { PartnerNotificationSettings } from "@/app/parceiro/ParceiroUserMenu";
import { updateParceiroQuoteVisibilityAction } from "@/app/actions/parceiroPortal";

type Props = {
  open: boolean;
  onClose: () => void;
  prefs: PartnerUiPrefs;
  onChange: (prefs: PartnerUiPrefs) => void;
  showOnQuote: boolean;
  onShowOnQuoteChange: (show: boolean) => void;
};

export default function ParceiroSettingsModal({
  open,
  onClose,
  prefs,
  onChange,
  showOnQuote,
  onShowOnQuoteChange,
}: Props) {
  const [draft, setDraft] = useState(prefs);
  const [quoteVisible, setQuoteVisible] = useState(showOnQuote);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setDraft(prefs);
      setQuoteVisible(showOnQuote);
      setQuoteError(null);
    }
  }, [open, prefs, showOnQuote]);

  const setTheme = (theme: PartnerUiTheme) => {
    const next = { ...draft, theme };
    setDraft(next);
    onChange(next);
  };

  const setAccent = (accent: PartnerUiAccentId) => {
    const next = { ...draft, accent };
    setDraft(next);
    onChange(next);
  };

  const toggleQuoteVisibility = (next: boolean) => {
    setQuoteError(null);
    setQuoteVisible(next);
    startTransition(async () => {
      const res = await updateParceiroQuoteVisibilityAction(next);
      if (!res.success) {
        setQuoteVisible(!next);
        setQuoteError(res.error);
        return;
      }
      onShowOnQuoteChange(res.showOnQuote);
    });
  };

  return (
    <Dialog
      isOpen={open}
      onClose={onClose}
      className="parceiro-info-modal max-w-lg w-full"
      backdropClassName="parceiro-info-modal-backdrop"
      bodyClassName="max-h-[min(90svh,760px)] overflow-y-auto"
    >
      <div className="space-y-5 pr-12">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 inline-flex items-center gap-1.5">
            <Settings2 className="h-3.5 w-3.5" />
            Painel
          </p>
          <h3 className="text-lg font-display font-bold text-slate-900 tracking-tight">
            Configurações
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Tema, orçamento, cor de destaque e preferências de alerta neste dispositivo.
          </p>
        </div>

        <section className="space-y-2.5">
          <div className="flex items-center gap-2">
            {quoteVisible ? (
              <Eye className="h-3.5 w-3.5 text-slate-500" />
            ) : (
              <EyeOff className="h-3.5 w-3.5 text-slate-500" />
            )}
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
              Orçamento do cliente
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  Aparecer no orçamento
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Se desligado, seu nome e foto{" "}
                  <strong className="font-semibold text-slate-700">não entram</strong> no
                  PDF enviado ao cliente. O vínculo com o projeto continua só no sistema
                  da Móveis Unghero (CRM e comissões).
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={quoteVisible}
                disabled={pending}
                onClick={() => toggleQuoteVisibility(!quoteVisible)}
                className={cn(
                  "relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors touch-manipulation",
                  quoteVisible ? "bg-primary" : "bg-slate-300",
                  pending && "opacity-60"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-6 w-6 transform rounded-full bg-white shadow transition",
                    quoteVisible ? "translate-x-7" : "translate-x-1"
                  )}
                />
              </button>
            </div>
            {pending ? (
              <p className="text-[10px] text-slate-500 inline-flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                Salvando…
              </p>
            ) : null}
            {quoteError ? (
              <p className="text-[11px] font-semibold text-rose-600">{quoteError}</p>
            ) : null}
            {!quoteVisible ? (
              <p className="text-[11px] text-amber-900/90 bg-amber-50 border border-amber-200/80 rounded-lg px-2.5 py-2 leading-relaxed">
                Preferência salva: orçamentos novos e existentes usam esta regra ao gerar
                o PDF — o card do parceiro fica oculto.
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Com a opção ligada, o card com seu nome e foto pode aparecer no orçamento
                (conforme autorização da equipe).
              </p>
            )}
          </div>
        </section>

        <section className="space-y-2.5">
          <div className="flex items-center gap-2">
            <Sun className="h-3.5 w-3.5 text-slate-500" />
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
              Tema
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={draft.theme === "light" ? "default" : "outline"}
              className={cn(
                "font-bold gap-1.5 h-11",
                draft.theme === "light" && "btn-metallic border-none"
              )}
              onClick={() => setTheme("light")}
            >
              <Sun className="h-4 w-4" />
              Claro
            </Button>
            <Button
              type="button"
              variant={draft.theme === "dark" ? "default" : "outline"}
              className={cn(
                "font-bold gap-1.5 h-11",
                draft.theme === "dark" && "btn-metallic border-none"
              )}
              onClick={() => setTheme("dark")}
            >
              <Moon className="h-4 w-4" />
              Escuro
            </Button>
          </div>
        </section>

        <section className="space-y-2.5">
          <div className="flex items-center gap-2">
            <Palette className="h-3.5 w-3.5 text-slate-500" />
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
              Cor de destaque
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {PARTNER_ACCENT_PRESETS.map((preset) => {
              const active = draft.accent === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setAccent(preset.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold transition-colors",
                    active
                      ? "border-slate-800 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  )}
                  title={preset.label}
                >
                  <span
                    className="h-3.5 w-3.5 rounded-full border border-black/10 shadow-sm"
                    style={{ background: `hsl(${preset.hsl})` }}
                    aria-hidden
                  />
                  {preset.label}
                </button>
              );
            })}
          </div>
        </section>

        <div className="parceiro-info-section-rule" aria-hidden />

        <PartnerNotificationSettings />
      </div>
    </Dialog>
  );
}
