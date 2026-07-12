"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bookmark, Loader2, Pencil, Trash2, Check, X, Plus, Layers, ListChecks } from "lucide-react";
import { DetailsEditor } from "@/components/quotes/QuoteItemInputs";
import type { QuoteItemPresetDTO, QuoteDetailPresetDTO } from "@/lib/quoteItemPresets";
import {
  listQuoteItemPresets,
  createQuoteItemPreset,
  updateQuoteItemPreset,
  deleteQuoteItemPreset,
  listQuoteDetailPresets,
  createQuoteDetailPreset,
  updateQuoteDetailPreset,
  deleteQuoteDetailPreset,
} from "@/app/actions/quoteItemPresets";

type Tab = "ambientes" | "detalhes";

export default function QuoteItemPresetsManager({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("ambientes");

  // Ambientes / itens
  const [presets, setPresets] = useState<QuoteItemPresetDTO[]>([]);
  const [descricao, setDescricao] = useState("");
  const [detalhes, setDetalhes] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Detalhes globais
  const [details, setDetails] = useState<QuoteDetailPresetDTO[]>([]);
  const [detailText, setDetailText] = useState("");
  const [editingDetailId, setEditingDetailId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Sugestões (globais + opcionais já cadastrados) para o editor de opcionais do ambiente.
  const detailSuggestions = useMemo(() => {
    const set = new Set<string>();
    for (const d of details) set.add(d.texto);
    for (const p of presets) for (const d of p.detalhes) set.add(d);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [details, presets]);

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

  function resetAmbienteForm() {
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

  async function handleSaveAmbiente() {
    if (!descricao.trim()) {
      setError("Informe a descrição do ambiente/item.");
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
          const next =
            idx === -1 ? [...prev, res.preset] : prev.map((p) => (p.id === res.preset.id ? res.preset : p));
          return next.sort((a, b) => a.descricao.localeCompare(b.descricao, "pt-BR"));
        });
        resetAmbienteForm();
      } else {
        setError(res.error);
      }
    } catch {
      setError("Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAmbiente(id: string) {
    setDeletingId(id);
    try {
      const res = await deleteQuoteItemPreset(id);
      if (res.success) {
        setPresets((prev) => prev.filter((p) => p.id !== id));
        if (editingId === id) resetAmbienteForm();
      } else {
        setError(res.error ?? "Não foi possível excluir.");
      }
    } finally {
      setDeletingId(null);
    }
  }

  function resetDetailForm() {
    setEditingDetailId(null);
    setDetailText("");
    setError(null);
  }

  async function handleSaveDetail() {
    if (!detailText.trim()) {
      setError("Informe o detalhe.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = editingDetailId
        ? await updateQuoteDetailPreset(editingDetailId, { texto: detailText })
        : await createQuoteDetailPreset({ texto: detailText });
      if (res.success) {
        setDetails((prev) => {
          const idx = prev.findIndex((d) => d.id === res.detail.id);
          const next = idx === -1 ? [...prev, res.detail] : prev.map((d) => (d.id === res.detail.id ? res.detail : d));
          return next.sort((a, b) => a.texto.localeCompare(b.texto, "pt-BR"));
        });
        resetDetailForm();
      } else {
        setError(res.error);
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
              Cadastre ambientes/itens e detalhes reutilizáveis para montar orçamentos mais rápido.
            </p>
          </div>
        </div>

        {/* Abas */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100/80 border border-slate-200/50 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setTab("ambientes");
              setError(null);
            }}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tab === "ambientes" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Layers className="h-4 w-4 text-amber-500" /> Ambientes / Itens
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
            <ListChecks className="h-4 w-4 text-slate-500" /> Detalhes globais
          </button>
        </div>

        {tab === "ambientes" ? (
          <>
            <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-450">
                  {editingId ? "Editar ambiente / item" : "Descrição do ambiente ou item"}
                </label>
                <input
                  type="text"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  maxLength={160}
                  placeholder="Ex: Mesa, Cozinha completa, Closet..."
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:border-amber-400 focus:outline-none transition-all"
                />
              </div>

              <div>
                <p className="text-[10px] text-slate-400 font-medium mb-1">
                  Opcionais deste item (aparecem em destaque ao selecionar este ambiente). Você pode reaproveitar detalhes globais.
                </p>
                <DetailsEditor subitens={detalhes} suggestions={detailSuggestions} onChange={setDetalhes} />
              </div>

              {error && (
                <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{error}</p>
              )}

              <div className="flex items-center gap-2 justify-end">
                {editingId && (
                  <Button type="button" variant="outline" onClick={resetAmbienteForm} className="gap-1.5">
                    <X className="h-4 w-4" /> Cancelar edição
                  </Button>
                )}
                <Button type="button" onClick={handleSaveAmbiente} disabled={saving} className="btn-metallic gap-1.5">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {editingId ? "Atualizar" : "Salvar ambiente"}
                </Button>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                {presets.length} {presets.length === 1 ? "ambiente salvo" : "ambientes salvos"}
              </p>
              {loading ? (
                <div className="flex items-center gap-2 text-xs text-slate-450 font-medium py-6 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                </div>
              ) : presets.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 font-medium border border-dashed border-slate-200 rounded-xl">
                  Nenhum ambiente salvo ainda.
                </div>
              ) : (
                <div className="space-y-2 max-h-[34vh] overflow-y-auto pr-1">
                  {presets.map((p) => (
                    <div key={p.id} className="flex items-start justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-white">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 break-words">{p.descricao}</p>
                        {p.detalhes.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {p.detalhes.map((d, i) => (
                              <span key={`${d}-${i}`} className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                                {d}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" onClick={() => startEdit(p)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer" title="Editar">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => handleDeleteAmbiente(p.id)} disabled={deletingId === p.id} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50" title="Excluir">
                          {deletingId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-450 block">
                {editingDetailId ? "Editar detalhe global" : "Novo detalhe global"}
              </label>
              <p className="text-[10px] text-slate-400 font-medium -mt-1">
                Detalhes avulsos ficam disponíveis para <strong>qualquer</strong> item do orçamento.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={detailText}
                  onChange={(e) => setDetailText(e.target.value)}
                  maxLength={160}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSaveDetail();
                    }
                  }}
                  placeholder="Ex: Puxador cromado, Corrediça telescópica..."
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
                {details.length} {details.length === 1 ? "detalhe global" : "detalhes globais"}
              </p>
              {loading ? (
                <div className="flex items-center gap-2 text-xs text-slate-450 font-medium py-6 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                </div>
              ) : details.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 font-medium border border-dashed border-slate-200 rounded-xl">
                  Nenhum detalhe global ainda.
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
