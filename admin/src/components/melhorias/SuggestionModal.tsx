"use client";

import { useState } from "react";
import { Lightbulb, Loader2, Check } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  createSuggestion,
  type SuggestionResult,
} from "@/app/actions/suggestions";
import type { SuggestionDTO } from "@/lib/suggestions";

interface SuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (suggestion: SuggestionDTO) => void;
  submitAction?: (input: {
    titulo: string;
    descricao?: string | null;
  }) => Promise<SuggestionResult>;
  audience?: "staff" | "partner";
}

export default function SuggestionModal({
  isOpen,
  onClose,
  onCreated,
  submitAction = createSuggestion,
  audience = "staff",
}: SuggestionModalProps) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function reset() {
    setTitulo("");
    setDescricao("");
    setError(null);
    setSaving(false);
    setDone(false);
  }

  function handleClose() {
    if (saving) return;
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) {
      setError("Descreva a sugestão de melhoria.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await submitAction({ titulo, descricao });
    setSaving(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    onCreated?.(res.suggestion);
    setDone(true);
    window.setTimeout(handleClose, 1100);
  }

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} className="max-w-md">
      {done ? (
        <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
          <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
            <Check className="h-6 w-6 text-emerald-600" />
          </div>
          <p className="text-sm font-bold text-slate-700">Sugestão enviada!</p>
          <p className="text-xs text-slate-500">
            {audience === "partner"
              ? "Obrigado por ajudar a melhorar o portal."
              : "Obrigado por ajudar a melhorar o sistema."}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-start gap-3 border-b border-slate-100 pb-4 pr-8">
            <div className="rounded-xl bg-amber-100 p-2.5 text-amber-600 shrink-0">
              <Lightbulb className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-800 leading-tight">
                Sugerir melhoria
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {audience === "partner"
                  ? "Tem uma ideia para melhorar o portal? Envie para a equipe da Móveis Unghero. Limite de 3 envios por hora."
                  : "Tem uma ideia para deixar o sistema melhor? Conte para a gente."}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500">Sua sugestão *</label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              autoFocus
              maxLength={160}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 focus:border-amber-400 focus:bg-white focus:outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500">Detalhes (opcional)</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={4}
              maxLength={1000}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700 focus:border-amber-400 focus:bg-white focus:outline-none transition-all resize-y"
            />
          </div>

          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={handleClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />}
              {saving ? "Enviando..." : "Enviar sugestão"}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
