"use client";

import { useMemo, useState } from "react";
import { Lightbulb, Plus, Trash2, Loader2, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import SuggestionModal from "@/components/melhorias/SuggestionModal";
import { setSuggestionDone, deleteSuggestion } from "@/app/actions/suggestions";
import type { SuggestionDTO } from "@/lib/suggestions";

interface MelhoriasClientProps {
  initialSuggestions: SuggestionDTO[];
  isAdmin: boolean;
  currentUserId: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function MelhoriasClient({
  initialSuggestions,
  isAdmin,
  currentUserId,
}: MelhoriasClientProps) {
  const [suggestions, setSuggestions] = useState<SuggestionDTO[]>(initialSuggestions);
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { openCount, doneCount } = useMemo(() => {
    let open = 0;
    let done = 0;
    for (const s of suggestions) {
      if (s.status === "CONCLUIDA") done += 1;
      else open += 1;
    }
    return { openCount: open, doneCount: done };
  }, [suggestions]);

  const ordered = useMemo(() => {
    return [...suggestions].sort((a, b) => {
      if (a.status !== b.status) return a.status === "ABERTA" ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [suggestions]);

  async function handleToggle(s: SuggestionDTO) {
    const nextDone = s.status !== "CONCLUIDA";
    setBusyId(s.id);
    // Otimista
    setSuggestions((prev) =>
      prev.map((it) =>
        it.id === s.id ? { ...it, status: nextDone ? "CONCLUIDA" : "ABERTA" } : it
      )
    );
    const res = await setSuggestionDone(s.id, nextDone);
    setBusyId(null);
    if (res.success) {
      setSuggestions((prev) => prev.map((it) => (it.id === s.id ? res.suggestion : it)));
    } else {
      // Reverte
      setSuggestions((prev) =>
        prev.map((it) => (it.id === s.id ? s : it))
      );
    }
  }

  async function handleDelete(s: SuggestionDTO) {
    if (!window.confirm("Remover esta sugestão?")) return;
    setBusyId(s.id);
    const res = await deleteSuggestion(s.id);
    setBusyId(null);
    if (res.success) {
      setSuggestions((prev) => prev.filter((it) => it.id !== s.id));
    } else if (res.error) {
      window.alert(res.error);
    }
  }

  function canDelete(s: SuggestionDTO) {
    return isAdmin || s.authorId === currentUserId;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-700 px-3 py-1">
            <Circle className="h-3.5 w-3.5" />
            {openCount} aberta{openCount === 1 ? "" : "s"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 px-3 py-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {doneCount} concluída{doneCount === 1 ? "" : "s"}
          </span>
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          className="w-full sm:w-auto justify-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Nova melhoria
        </Button>
      </div>

      {ordered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-16 flex flex-col items-center justify-center gap-3 text-center">
          <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
            <Lightbulb className="h-6 w-6 text-amber-600" />
          </div>
          <p className="text-sm font-bold text-slate-600">Nenhuma sugestão ainda</p>
          <p className="text-xs text-slate-400 max-w-xs">
            Use o botão flutuante ou &quot;Nova melhoria&quot; para registrar ideias de melhoria do
            sistema.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {ordered.map((s) => {
            const done = s.status === "CONCLUIDA";
            const busy = busyId === s.id;
            return (
              <li
                key={s.id}
                className={`flex items-start gap-3 rounded-xl border p-3.5 transition-colors ${
                  done ? "border-emerald-100 bg-emerald-50/40" : "border-slate-200 bg-white"
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleToggle(s)}
                  disabled={busy}
                  aria-label={done ? "Reabrir sugestão" : "Marcar como concluída"}
                  className="mt-0.5 shrink-0 text-slate-300 hover:text-emerald-500 transition-colors disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  ) : done ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-semibold leading-snug ${
                      done ? "text-slate-400 line-through" : "text-slate-700"
                    }`}
                  >
                    {s.titulo}
                  </p>
                  {s.descricao && (
                    <p
                      className={`text-xs mt-1 leading-relaxed whitespace-pre-line ${
                        done ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      {s.descricao}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
                    {s.authorName} · {formatDate(s.createdAt)}
                    {done && s.resolverName ? ` · concluída por ${s.resolverName}` : ""}
                  </p>
                </div>

                {canDelete(s) && (
                  <button
                    type="button"
                    onClick={() => handleDelete(s)}
                    disabled={busy}
                    aria-label="Remover sugestão"
                    className="mt-0.5 shrink-0 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <SuggestionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(s) => setSuggestions((prev) => [s, ...prev])}
      />
    </div>
  );
}
