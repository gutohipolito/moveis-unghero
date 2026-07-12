"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bookmark, Loader2, Pencil, Trash2, Check, X, Plus } from "lucide-react";
import { DetailsEditor } from "@/components/quotes/QuoteItemInputs";
import type { QuoteItemPresetDTO } from "@/lib/quoteItemPresets";
import {
  listQuoteItemPresets,
  createQuoteItemPreset,
  updateQuoteItemPreset,
  deleteQuoteItemPreset,
} from "@/app/actions/quoteItemPresets";

export default function QuoteItemPresetsManager({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [presets, setPresets] = useState<QuoteItemPresetDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [descricao, setDescricao] = useState("");
  const [detalhes, setDetalhes] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const detailSuggestions = useMemo(() => {
    const set = new Set<string>();
    for (const p of presets) for (const d of p.detalhes) set.add(d);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [presets]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoading(true);
    listQuoteItemPresets()
      .then((res) => {
        if (active && res.success) setPresets(res.presets);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [isOpen]);

  function resetForm() {
    setEditingId(null);
    setDescricao("");
    setDetalhes([]);
    setError(null);
  }

  function startEdit(p: QuoteItemPresetDTO) {
    setEditingId(p.id);
    setDescricao(p.descricao);
    setDetalhes([...p.detalhes]);
    setError(null);
  }

  async function handleSave() {
    if (!descricao.trim()) {
      setError("Informe a descrição do item.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = editingId
        ? await updateQuoteItemPreset(editingId, { descricao, detalhes })
        : await createQuoteItemPreset({ descricao, detalhes });
      if (res.success) {
        setPresets((prev) => {
          const idx = prev.findIndex((p) => p.id === res.preset.id);
          const next = idx === -1 ? [...prev, res.preset] : prev.map((p) => (p.id === res.preset.id ? res.preset : p));
          return next.sort((a, b) => a.descricao.localeCompare(b.descricao, "pt-BR"));
        });
        resetForm();
      } else {
        setError(res.error);
      }
    } catch {
      setError("Não foi possível salvar o item.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await deleteQuoteItemPreset(id);
      if (res.success) {
        setPresets((prev) => prev.filter((p) => p.id !== id));
        if (editingId === id) resetForm();
      } else {
        setError(res.error ?? "Não foi possível excluir.");
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <div className="space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Bookmark className="h-5 w-5 text-amber-500" />
          <div>
            <h2 className="text-base font-black text-slate-800">Itens salvos do orçamento</h2>
            <p className="text-[11px] text-slate-500 font-medium">
              Cadastre descrições e detalhes usados com frequência para selecionar rápido ao montar um orçamento.
            </p>
          </div>
        </div>

        {/* Formulário */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-450">
              {editingId ? "Editar item" : "Descrição do item ou ambiente"}
            </label>
            <input
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              maxLength={160}
              placeholder="Ex: Porta de correr, Cozinha completa..."
              className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:border-amber-400 focus:outline-none transition-all"
            />
          </div>

          <DetailsEditor subitens={detalhes} suggestions={detailSuggestions} onChange={setDetalhes} />

          {error && (
            <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <div className="flex items-center gap-2 justify-end">
            {editingId && (
              <Button type="button" variant="outline" onClick={resetForm} className="gap-1.5">
                <X className="h-4 w-4" /> Cancelar edição
              </Button>
            )}
            <Button type="button" onClick={handleSave} disabled={saving} className="btn-metallic gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingId ? "Atualizar item" : "Salvar item"}
            </Button>
          </div>
        </div>

        {/* Lista */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
            {presets.length} {presets.length === 1 ? "item salvo" : "itens salvos"}
          </p>
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-slate-450 font-medium py-6 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : presets.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400 font-medium border border-dashed border-slate-200 rounded-xl">
              Nenhum item salvo ainda.
            </div>
          ) : (
            <div className="space-y-2 max-h-[38vh] overflow-y-auto pr-1">
              {presets.map((p) => (
                <div
                  key={p.id}
                  className="flex items-start justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-white"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 break-words">{p.descricao}</p>
                    {p.detalhes.length > 0 && (
                      <p className="text-[11px] text-slate-500 mt-0.5 break-words">{p.detalhes.join(" • ")}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(p)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      disabled={deletingId === p.id}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
                      title="Excluir"
                    >
                      {deletingId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
