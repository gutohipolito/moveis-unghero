"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { flushSync } from "react-dom";
import { Plus, X, ListPlus } from "lucide-react";
import type { QuoteItemPresetDTO } from "@/lib/quoteItemPresets";
import {
  expandAndFormatQuoteDetails,
  formatQuotePhrase,
  getPricingTextWarning,
} from "@/lib/quoteItems";

function useDropdownPosition(open: boolean, anchorRef: React.RefObject<HTMLElement | null>) {
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const update = () => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 260),
    });
  };

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    update();
    const onScroll = () => update();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, anchorRef]);

  return pos;
}

/**
 * Campo de título/descrição com sugestões de itens pré-cadastrados.
 * - Clique ou digitação abre a lista (não cadastra enquanto digita).
 * - Se o texto bater com um existente, no blur normaliza para o cadastrado.
 * - Se for novo, cadastra só ao sair do campo (blur), e nunca se houver aviso de preço.
 */
export function DescriptionCombobox({
  value,
  presets,
  onChangeText,
  onSelectPreset,
  onCommitNew,
  className,
  showLabel = true,
}: {
  value: string;
  presets: QuoteItemPresetDTO[];
  onChangeText: (text: string) => void;
  onSelectPreset: (preset: QuoteItemPresetDTO) => void;
  /** Chamado no blur quando o texto não existe ainda — cadastra e devolve o preset. */
  onCommitNew?: (text: string) => void | Promise<void>;
  className?: string;
  showLabel?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const committingRef = useRef(false);
  const pos = useDropdownPosition(open, inputRef);

  useEffect(() => setMounted(true), []);

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    const base = q
      ? presets.filter((p) => p.descricao.toLowerCase().includes(q))
      : presets;
    return base.slice(0, 12);
  }, [value, presets]);

  const exactMatch = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return null;
    return presets.find((p) => p.descricao.toLowerCase() === q) ?? null;
  }, [value, presets]);

  const pricingWarning = useMemo(() => getPricingTextWarning(value), [value]);

  const showList = open && mounted && pos !== null;

  async function handleBlurCommit() {
    if (committingRef.current) return;
    const text = value.trim();
    if (!text) return;

    const existing =
      presets.find((p) => p.descricao.toLowerCase() === text.toLowerCase()) ?? null;
    if (existing) {
      if (existing.descricao !== value) onSelectPreset(existing);
      return;
    }
    // Não cadastra título com preço/quantidade no texto.
    if (getPricingTextWarning(text)) return;
    if (onCommitNew) {
      committingRef.current = true;
      try {
        await onCommitNew(text);
      } finally {
        committingRef.current = false;
      }
    }
  }

  const dropdown =
    showList && pos ? (
      <div
        className="fixed z-[9999] bg-white border border-slate-200 rounded-lg shadow-xl max-h-64 overflow-y-auto"
        style={{ top: pos.top, left: pos.left, width: pos.width }}
        onMouseDown={(e) => {
          e.preventDefault();
        }}
      >
        {matches.length === 0 ? (
          <div className="px-3 py-2.5 text-[11px] text-slate-500">
            {value.trim()
              ? pricingWarning
                ? "Corrija o aviso de preço/quantidade — este título não será cadastrado."
                : "Nenhum pré-cadastro com esse nome — será cadastrado ao sair do campo."
              : "Nenhum item pré-cadastrado ainda."}
          </div>
        ) : (
          matches.map((p) => {
            const isExact = exactMatch?.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onSelectPreset(p);
                  setOpen(false);
                  if (blurTimer.current) clearTimeout(blurTimer.current);
                }}
                className={`w-full text-left px-3 py-2 hover:bg-amber-50 transition-colors border-b border-slate-50 last:border-0 cursor-pointer flex items-center gap-1.5 ${
                  isExact ? "bg-amber-50/80" : ""
                }`}
              >
                <ListPlus className="h-3 w-3 text-slate-300 shrink-0" />
                <span className="text-xs font-bold text-slate-800">{p.descricao}</span>
                {isExact ? (
                  <span className="ml-auto text-[9px] font-bold uppercase tracking-wide text-amber-700">
                    Já cadastrado
                  </span>
                ) : null}
              </button>
            );
          })
        )}
      </div>
    ) : null;

  return (
    <div className="relative">
      {showLabel ? (
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
          Título do item
        </label>
      ) : null}
      <input
        ref={inputRef}
        type="text"
        required
        value={value}
        autoComplete="off"
        onChange={(e) => {
          onChangeText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={() => {
          blurTimer.current = setTimeout(() => {
            setOpen(false);
            void handleBlurCommit();
          }, 140);
        }}
        className={
          className ??
          "w-full bg-white border border-slate-200 focus-visible:ring-1 focus-visible:ring-[hsl(28_85%_45%)] focus-visible:border-[hsl(28_85%_45%)] px-3 py-1.5 h-9 text-xs font-semibold rounded-lg outline-none transition-all"
        }
      />
      {pricingWarning ? (
        <p className="mt-1 text-[10px] text-rose-600 font-semibold leading-snug">
          {pricingWarning}
        </p>
      ) : null}
      {exactMatch && value.trim() && value.trim() !== exactMatch.descricao ? (
        <p className="mt-1 text-[9px] text-amber-700 font-semibold">
          Já existe “{exactMatch.descricao}” — selecione na lista ou saia do campo para usar o
          cadastrado.
        </p>
      ) : null}
      {mounted && dropdown ? createPortal(dropdown, document.body) : null}
    </div>
  );
}

/**
 * Editor de detalhes do item em "chips".
 * - `suggestions`: detalhes salvos no cadastro de "Detalhes do item".
 * - Novos textos são cadastrados só ao digitar vírgula (Enter/blur só adicionam ao item).
 */
export function DetailsEditor({
  subitens,
  suggestions,
  onChange,
  onCommitNew,
}: {
  subitens: string[];
  suggestions: string[];
  onChange: (next: string[]) => void;
  onCommitNew?: (texto: string) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef(draft);
  const subitensRef = useRef(subitens);
  const inputRef = useRef<HTMLInputElement>(null);
  draftRef.current = draft;
  subitensRef.current = subitens;
  const pos = useDropdownPosition(open, inputRef);

  useEffect(() => setMounted(true), []);

  const currentSet = useMemo(
    () => new Set(subitens.map((s) => s.toLowerCase())),
    [subitens]
  );

  const q = draft.trim().toLowerCase();

  const matches = useMemo(() => {
    return suggestions
      .filter(
        (s) =>
          !currentSet.has(s.toLowerCase()) &&
          (q ? s.toLowerCase().includes(q) : true)
      )
      .slice(0, 12);
  }, [suggestions, currentSet, q]);

  const exactSuggestion = useMemo(() => {
    if (!q) return null;
    return suggestions.find((s) => s.toLowerCase() === q) ?? null;
  }, [suggestions, q]);

  const pricingWarning = useMemo(() => getPricingTextWarning(draft), [draft]);

  /** Adiciona um ou mais detalhes ao item; `register` grava no cadastro de presets. */
  async function commitTexts(rawTexts: string[], register: boolean) {
    const current = subitensRef.current;
    const next = [...current];
    const toRegister: string[] = [];

    for (const raw of rawTexts) {
      for (const piece of expandAndFormatQuoteDetails([raw])) {
        const t = piece;
        if (!t) continue;
        if (next.some((s) => s.toLowerCase() === t.toLowerCase())) continue;
        if (getPricingTextWarning(t)) continue;

        const existing =
          suggestions.find((s) => s.toLowerCase() === t.toLowerCase()) ?? null;
        const final = existing ? formatQuotePhrase(existing) : t;
        next.push(final);
        if (register && !existing) toRegister.push(final);
      }
    }

    if (next.length !== current.length) {
      onChange(next);
    }
    if (onCommitNew) {
      for (const t of toRegister) {
        await onCommitNew(t);
      }
    }
    return next.length > current.length;
  }

  async function commitDraft(from = draftRef.current, register = false) {
    const t = from.trim();
    if (!t) return false;
    // Mantém o texto no campo para o aviso de preço continuar visível.
    if (getPricingTextWarning(t)) return false;
    const ok = await commitTexts([from], register);
    setDraft("");
    return ok;
  }

  function addDetail(v: string, register = false) {
    void commitDraft(v, register);
    setOpen(false);
  }

  function removeDetail(idx: number) {
    onChange(subitens.filter((_, i) => i !== idx));
  }

  function handleDraftChange(raw: string) {
    if (!raw.includes(",")) {
      setDraft(raw);
      setOpen(true);
      return;
    }
    const parts = raw.split(",");
    const rest = parts.pop() ?? "";
    const completed = parts.map((p) => p.trim()).filter(Boolean);
    setDraft(rest);
    setOpen(true);
    if (completed.length > 0) {
      void commitTexts(completed, true);
    }
  }

  const showDropdown = open && mounted && pos !== null;

  const dropdown =
    showDropdown && pos ? (
      <div
        className="fixed z-[9999] bg-white border border-slate-200 rounded-lg shadow-xl max-h-56 overflow-y-auto"
        style={{ top: pos.top, left: pos.left, width: pos.width }}
        onMouseDown={(e) => e.preventDefault()}
      >
        {matches.length === 0 ? (
          <div className="px-3 py-2 text-[11px] text-slate-500">
            {draft.trim()
              ? "Novo detalhe — digite vírgula para cadastrar."
              : "Nenhum detalhe pré-cadastrado ainda."}
          </div>
        ) : (
          matches.map((s) => (
            <button
              key={`gl-${s}`}
              type="button"
              onClick={() => {
                addDetail(s, false);
                if (blurTimer.current) clearTimeout(blurTimer.current);
              }}
              className={`w-full text-left px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 cursor-pointer flex items-center gap-1.5 ${
                exactSuggestion?.toLowerCase() === s.toLowerCase() ? "bg-amber-50/80" : ""
              }`}
            >
              <ListPlus className="h-3 w-3 text-slate-400 shrink-0" />
              {s}
            </button>
          ))
        )}
      </div>
    ) : null;

  return (
    <div className="mt-2">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
        Detalhes do item (opcional)
      </label>

      {subitens.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {subitens.map((s, idx) => (
            <span
              key={`${s}-${idx}`}
              className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-semibold text-slate-700"
            >
              {s}
              <button
                type="button"
                onClick={() => removeDetail(idx)}
                className="p-0.5 rounded hover:bg-slate-200 text-slate-500 cursor-pointer"
                title="Remover detalhe"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={draft}
              data-quote-detail-draft="true"
              autoComplete="off"
              onChange={(e) => handleDraftChange(e.target.value)}
              onFocus={() => setOpen(true)}
              onClick={() => setOpen(true)}
              onBlur={() => {
                flushSync(() => {
                  void commitDraft(draftRef.current, false);
                });
                blurTimer.current = setTimeout(() => setOpen(false), 140);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addDetail(draft, false);
                }
              }}
              className="w-full bg-slate-50 md:bg-white border border-slate-200 text-[10px] font-medium rounded-md px-2.5 py-2 outline-none focus-visible:ring-1 focus-visible:ring-[hsl(28_85%_45%)]"
            />
            {mounted && dropdown ? createPortal(dropdown, document.body) : null}
          </div>
          <button
            type="button"
            onClick={() => addDetail(draft, false)}
            disabled={!draft.trim()}
            className="shrink-0 h-8 w-8 flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:text-amber-600 hover:border-amber-200 disabled:opacity-40 cursor-pointer transition-colors"
            title="Adicionar detalhe"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {pricingWarning ? (
        <p className="mt-1 text-[10px] text-rose-600 font-semibold leading-snug">
          {pricingWarning}
        </p>
      ) : (
        <p className="mt-1 text-[9px] text-slate-400">
          Digite a vírgula para cadastrar o detalhe. Enter ou sair do campo só adiciona neste
          orçamento — no PDF aparece abaixo do item, separado por •.
        </p>
      )}
    </div>
  );
}

/** Consolida rascunhos de detalhes ainda abertos (ex.: antes do submit). */
export function flushPendingQuoteDetailDrafts() {
  if (typeof document === "undefined") return;
  const active = document.activeElement;
  if (
    active instanceof HTMLElement &&
    active.matches('input[data-quote-detail-draft="true"]')
  ) {
    flushSync(() => {
      active.blur();
    });
  }
}
