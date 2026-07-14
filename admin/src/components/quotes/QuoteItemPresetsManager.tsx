"use client";

import React, { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bookmark, Loader2, Pencil, Trash2, Check, X, Plus, Type, ListChecks } from "lucide-react";
import type { QuoteItemPresetDTO, QuoteDetailPresetDTO } from "@/lib/quoteItemPresets";
import {
  listQuoteItemPresets,
  createQuoteItemPresetsBulk,
  updateQuoteItemPreset,
  deleteQuoteItemPreset,
  listQuoteDetailPresets,
  createQuoteDetailPresetsBulk,
  updateQuoteDetailPreset,
  deleteQuoteDetailPreset,
} from "@/app/actions/quoteItemPresets";

/** Divide o texto por vírgula (e quebras de linha), removendo vazios. */
function splitEntries(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

type Tab = "descricoes" | "detalhes";

export default function QuoteItemPresetsManager({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("descricoes");

  // Descrições do item
  const [presets, setPresets] = useState<QuoteItemPresetDTO[]>([]);
  const [descricao, setDescricao] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Detalhes do item
  const [details, setDetails] = useState<QuoteDetailPresetDTO[]>([]);
  const [detailText, setDetailText] = useState("");
  const [editingDetailId, setEditingDetailId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoading(true);
    Promise.all([listQuoteItemPresets(), listQuoteDetailPresets()])
      .then(([itemsRes, detailsRes]) => {
        if (!active) return;
        if (itemsRes.success) setPresets(itemsRes.presets);
        if (detailsRes.success) setDetails(detailsRes.details);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [isOpen]);

  /* ------------------------------------------------------------------ */
  /* Descrições                                                          */
  /* ------------------------------------------------------------------ */

  function resetDescricaoForm() {
    setEditingId(null);
    setDescricao("");
    setError(null);
  }

  async function handleSaveDescricao() {
    const entries = splitEntries(descricao);
    if (entries.length === 0) {
      setError("Informe a descrição do item.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        const res = await updateQuoteItemPreset(editingId, { descricao: entries[0] });
        if (res.success) {
          setPresets((prev) =>
            prev
              .map((p) => (p.id === res.preset.id ? res.preset : p))
              .sort((a, b) => a.descricao.localeCompare(b.descricao, "pt-BR"))
          );
          resetDescricaoForm();
        } else {
          setError(res.error);
        }
      } else {
        const res = await createQuoteItemPresetsBulk({ descricoes: entries });
        if (res.success) {
          setPresets((prev) => {
            const map = new Map(prev.map((p) => [p.id, p]));
            res.presets.forEach((p) => map.set(p.id, p));
            return Array.from(map.values()).sort((a, b) =>
              a.descricao.localeCompare(b.descricao, "pt-BR")
            );
          });
          resetDescricaoForm();
        } else {
          setError(res.error ?? "Não foi possível salvar.");
        }
      }
    } catch {
      setError("Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteDescricao(id: string) {
    setDeletingId(id);
    try {
      const res = await deleteQuoteItemPreset(id);
      if (res.success) {
        setPresets((prev) => prev.filter((p) => p.id !== id));
        if (editingId === id) resetDescricaoForm();
      } else {
        setError(res.error ?? "Não foi possível excluir.");
      }
    } finally {
      setDeletingId(null);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Detalhes                                                            */
  /* ------------------------------------------------------------------ */

  function resetDetailForm() {
    setEditingDetailId(null);
    setDetailText("");
    setError(null);
  }

  async function handleSaveDetail() {
    const entries = splitEntries(detailText);
    if (entries.length === 0) {
      setError("Informe o detalhe.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingDetailId) {
        const res = await updateQuoteDetailPreset(editingDetailId, { texto: entries[0] });
        if (res.success) {
          setDetails((prev) =>
            prev
              .map((d) => (d.id === res.detail.id ? res.detail : d))
              .sort((a, b) => a.texto.localeCompare(b.texto, "pt-BR"))
          );
          resetDetailForm();
        } else {
          setError(res.error);
        }
      } else {
        const res = await createQuoteDetailPresetsBulk({ textos: entries });
        if (res.success) {
          setDetails((prev) => {
            const map = new Map(prev.map((d) => [d.id, d]));
            res.details.forEach((d) => map.set(d.id, d));
            return Array.from(map.values()).sort((a, b) =>
              a.texto.localeCompare(b.texto, "pt-BR")
            );
          });
          resetDetailForm();
        } else {
          setError(res.error ?? "Não foi possível salvar o detalhe.");
        }
      }
    } catch {
      setError("Não foi possível salvar o detalhe.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteDetail(id: string) {
    setDeletingId(id);
    try {
      const res = await deleteQuoteDetailPreset(id);
      if (res.success) {
        setDetails((prev) => prev.filter((d) => d.id !== id));
        if (editingDetailId === id) resetDetailForm();
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
              Cadastre descrições e detalhes reutilizáveis. Cada um aparece apenas no seu próprio campo ao montar o orçamento.
            </p>
          </div>
        </div>

        {/* Abas */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100/80 border border-slate-200/50 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setTab("descricoes");
              setError(null);
            }}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tab === "descricoes" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Type className="h-4 w-4 text-amber-500" /> Descrição do item
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("detalhes");
              setError(null);
            }}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tab === "detalhes" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <ListChecks className="h-4 w-4 text-slate-500" /> Detalhes do item
          </button>
        </div>

        {tab === "descricoes" ? (
          <>
            <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-450 block">
                {editingId ? "Editar descrição" : "Nova descrição do item"}
              </label>
              <p className="text-[10px] text-slate-400 font-medium -mt-1">
                Aparece como sugestão apenas no campo <strong>Descrição do item</strong>.
                {!editingId && " Separe por vírgula para adicionar vários de uma vez."}
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  maxLength={editingId ? 160 : 600}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSaveDescricao();
                    }
                  }}
                  className="flex-1 h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:border-amber-400 focus:outline-none transition-all"
                />
                {editingId && (
                  <Button type="button" variant="outline" onClick={resetDescricaoForm} className="gap-1.5">
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <Button type="button" onClick={handleSaveDescricao} disabled={saving} className="btn-metallic gap-1.5">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {editingId ? "Atualizar" : "Adicionar"}
                </Button>
              </div>
              {error && (
                <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{error}</p>
              )}
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                {presets.length} {presets.length === 1 ? "descrição salva" : "descrições salvas"}
              </p>
              {loading ? (
                <div className="flex items-center gap-2 text-xs text-slate-450 font-medium py-6 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                </div>
              ) : presets.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 font-medium border border-dashed border-slate-200 rounded-xl">
                  Nenhuma descrição salva ainda.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-[34vh] overflow-y-auto pr-1">
                  {presets.map((p) => (
                    <span key={p.id} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700">
                      {p.descricao}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(p.id);
                          setDescricao(p.descricao);
                          setError(null);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 cursor-pointer"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDescricao(p.id)}
                        disabled={deletingId === p.id}
                        className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer disabled:opacity-50"
                        title="Excluir"
                      >
                        {deletingId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-450 block">
                {editingDetailId ? "Editar detalhe" : "Novo detalhe do item"}
              </label>
              <p className="text-[10px] text-slate-400 font-medium -mt-1">
                Aparece como sugestão apenas no campo <strong>Detalhes do item</strong>.
                {!editingDetailId && " Separe por vírgula para adicionar vários de uma vez."}
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={detailText}
                  onChange={(e) => setDetailText(e.target.value)}
                  maxLength={editingDetailId ? 160 : 600}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSaveDetail();
                    }
                  }}
                  className="flex-1 h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:border-amber-400 focus:outline-none transition-all"
                />
                {editingDetailId && (
                  <Button type="button" variant="outline" onClick={resetDetailForm} className="gap-1.5">
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <Button type="button" onClick={handleSaveDetail} disabled={saving} className="btn-metallic gap-1.5">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingDetailId ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {editingDetailId ? "Atualizar" : "Adicionar"}
                </Button>
              </div>
              {error && (
                <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{error}</p>
              )}
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                {details.length} {details.length === 1 ? "detalhe salvo" : "detalhes salvos"}
              </p>
              {loading ? (
                <div className="flex items-center gap-2 text-xs text-slate-450 font-medium py-6 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                </div>
              ) : details.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 font-medium border border-dashed border-slate-200 rounded-xl">
                  Nenhum detalhe salvo ainda.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-[34vh] overflow-y-auto pr-1">
                  {details.map((d) => (
                    <span key={d.id} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700">
                      {d.texto}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingDetailId(d.id);
                          setDetailText(d.texto);
                          setError(null);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 cursor-pointer"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDetail(d.id)}
                        disabled={deletingId === d.id}
                        className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer disabled:opacity-50"
                        title="Excluir"
                      >
                        {deletingId === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
