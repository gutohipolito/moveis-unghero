"use client";

import React, { useMemo, useRef, useState } from "react";
import { Plus, X, ListPlus, Sparkles } from "lucide-react";
import type { QuoteItemPresetDTO } from "@/lib/quoteItemPresets";

/**
 * Campo de descrição com sugestões de ambientes/itens salvos.
 * - Permanece livre para digitação.
 * - Itens que possuem "opcionais" próprios aparecem destacados na busca.
 * - Ao selecionar, preenche a descrição e disponibiliza os opcionais do item.
 */
export function DescriptionCombobox({
  value,
  presets,
  onChangeText,
  onSelectPreset,
  className,
  placeholder = "Descrição do item ou ambiente",
}: {
  value: string;
  presets: QuoteItemPresetDTO[];
  onChangeText: (text: string) => void;
  onSelectPreset: (preset: QuoteItemPresetDTO) => void;
  className?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    const base = q
      ? presets.filter((p) => p.descricao.toLowerCase().includes(q))
      : presets;
    return base.slice(0, 8);
  }, [value, presets]);

  const showList = open && matches.length > 0;

  return (
    <div className="relative">
      <input
        type="text"
        required
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChangeText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 120);
        }}
        className={
          className ??
          "w-full bg-white border border-slate-200 focus-visible:ring-1 focus-visible:ring-[hsl(28_85%_45%)] focus-visible:border-[hsl(28_85%_45%)] px-3 py-1.5 h-9 text-xs font-semibold rounded-lg outline-none transition-all"
        }
      />
      {showList && (
        <div
          className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
          onMouseDown={(e) => {
            // Evita que o blur feche antes do clique.
            e.preventDefault();
          }}
        >
          {matches.map((p) => {
            const hasOptionals = p.detalhes.length > 0;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onSelectPreset(p);
                  setOpen(false);
                  if (blurTimer.current) clearTimeout(blurTimer.current);
                }}
                className="w-full text-left px-3 py-2 hover:bg-amber-50 transition-colors border-b border-slate-50 last:border-0 cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-800">{p.descricao}</span>
                  {hasOptionals && (
                    <span className="text-[9px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 border border-amber-200 rounded px-1.5 py-0.5">
                      {p.detalhes.length} opcio{p.detalhes.length === 1 ? "nal" : "nais"}
                    </span>
                  )}
                </span>
                {hasOptionals && (
                  <span className="mt-1 flex flex-wrap gap-1">
                    {p.detalhes.slice(0, 6).map((d, i) => (
                      <span
                        key={`${d}-${i}`}
                        className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5"
                      >
                        {d}
                      </span>
                    ))}
                    {p.detalhes.length > 6 && (
                      <span className="text-[10px] text-slate-400">+{p.detalhes.length - 6}</span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Editor de detalhes do item em "chips".
 * - `itemOptionals`: opcionais do ambiente selecionado (destacados para adição rápida).
 * - `suggestions`: detalhes globais (avulsos), reutilizáveis por qualquer item.
 * Saída continua sendo um array de strings (compatível com subitens).
 */
export function DetailsEditor({
  subitens,
  suggestions,
  itemOptionals = [],
  onChange,
}: {
  subitens: string[];
  suggestions: string[];
  itemOptionals?: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentSet = useMemo(
    () => new Set(subitens.map((s) => s.toLowerCase())),
    [subitens]
  );

  // Opcionais do ambiente ainda não adicionados (para adição rápida em destaque).
  const pendingOptionals = useMemo(
    () => itemOptionals.filter((o) => !currentSet.has(o.toLowerCase())),
    [itemOptionals, currentSet]
  );

  const q = draft.trim().toLowerCase();

  const optionalMatches = useMemo(
    () => pendingOptionals.filter((o) => (q ? o.toLowerCase().includes(q) : true)).slice(0, 8),
    [pendingOptionals, q]
  );

  const globalMatches = useMemo(() => {
    const optionalSet = new Set(itemOptionals.map((o) => o.toLowerCase()));
    return suggestions
      .filter(
        (s) =>
          !currentSet.has(s.toLowerCase()) &&
          !optionalSet.has(s.toLowerCase()) &&
          (q ? s.toLowerCase().includes(q) : true)
      )
      .slice(0, 8);
  }, [suggestions, currentSet, itemOptionals, q]);

  function addDetail(v: string) {
    const t = v.trim();
    if (!t) return;
    if (!subitens.some((s) => s.toLowerCase() === t.toLowerCase())) {
      onChange([...subitens, t]);
    }
    setDraft("");
    setOpen(false);
  }

  function removeDetail(idx: number) {
    onChange(subitens.filter((_, i) => i !== idx));
  }

  const showDropdown = open && (optionalMatches.length > 0 || globalMatches.length > 0);

  return (
    <div className="mt-2">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
        Detalhes do item (opcional)
      </label>

      {/* Chips já escolhidos */}
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

      {/* Opcionais do ambiente selecionado — adição rápida em destaque */}
      {pendingOptionals.length > 0 && (
        <div className="mb-1.5 rounded-md border border-amber-200 bg-amber-50/60 p-1.5">
          <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-amber-700 mb-1">
            <Sparkles className="h-3 w-3" /> Opcionais deste item
          </span>
          <div className="flex flex-wrap gap-1">
            {pendingOptionals.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => addDetail(o)}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-amber-300 text-[10px] font-semibold text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer"
              >
                <Plus className="h-2.5 w-2.5" /> {o}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <input
              type="text"
              value={draft}
              placeholder="Digite um detalhe e Enter (ex: Puxador cromado)"
              onChange={(e) => {
                setDraft(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => {
                blurTimer.current = setTimeout(() => setOpen(false), 120);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addDetail(draft);
                }
              }}
              className="w-full bg-slate-50 md:bg-white border border-slate-200 text-[10px] font-medium rounded-md px-2.5 py-2 outline-none focus-visible:ring-1 focus-visible:ring-[hsl(28_85%_45%)]"
            />
            {showDropdown && (
              <div
                className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto"
                onMouseDown={(e) => e.preventDefault()}
              >
                {optionalMatches.length > 0 && (
                  <>
                    <span className="block px-3 pt-2 pb-1 text-[9px] font-black uppercase tracking-wider text-amber-600">
                      Opcionais deste item
                    </span>
                    {optionalMatches.map((s) => (
                      <button
                        key={`opt-${s}`}
                        type="button"
                        onClick={() => {
                          addDetail(s);
                          if (blurTimer.current) clearTimeout(blurTimer.current);
                        }}
                        className="w-full text-left px-3 py-1.5 text-[11px] font-semibold text-amber-800 hover:bg-amber-50 transition-colors border-b border-slate-50 last:border-0 cursor-pointer flex items-center gap-1.5"
                      >
                        <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
                        {s}
                      </button>
                    ))}
                  </>
                )}
                {globalMatches.length > 0 && (
                  <>
                    <span className="block px-3 pt-2 pb-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
                      Detalhes gerais
                    </span>
                    {globalMatches.map((s) => (
                      <button
                        key={`gl-${s}`}
                        type="button"
                        onClick={() => {
                          addDetail(s);
                          if (blurTimer.current) clearTimeout(blurTimer.current);
                        }}
                        className="w-full text-left px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 cursor-pointer flex items-center gap-1.5"
                      >
                        <ListPlus className="h-3 w-3 text-slate-400 shrink-0" />
                        {s}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => addDetail(draft)}
            disabled={!draft.trim()}
            className="shrink-0 h-8 w-8 flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:text-amber-600 hover:border-amber-200 disabled:opacity-40 cursor-pointer transition-colors"
            title="Adicionar detalhe"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <p className="mt-1 text-[9px] text-slate-400">
        Apenas texto informativo — sem quantidade nem valor. No PDF aparece abaixo do item, separado por •.
      </p>
    </div>
  );
}
