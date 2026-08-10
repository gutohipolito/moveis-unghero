"use client";

import React, { useEffect, useState } from "react";
import { Moon, Palette, Settings2, Sun } from "lucide-react";
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

type Props = {
  open: boolean;
  onClose: () => void;
  prefs: PartnerUiPrefs;
  onChange: (prefs: PartnerUiPrefs) => void;
};

export default function ParceiroSettingsModal({
  open,
  onClose,
  prefs,
  onChange,
}: Props) {
  const [draft, setDraft] = useState(prefs);

  useEffect(() => {
    if (open) setDraft(prefs);
  }, [open, prefs]);

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
            Tema, cor de destaque e preferências de alerta neste dispositivo.
          </p>
        </div>

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
