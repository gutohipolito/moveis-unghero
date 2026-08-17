"use client";

import React, { useEffect, useRef, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Bookmark,
  Loader2,
  Pencil,
  Trash2,
  Check,
  X,
  Plus,
  Type,
  ListChecks,
  ImageIcon,
  Package,
  Upload,
} from "lucide-react";
import type {
  QuoteItemPresetDTO,
  QuoteDetailPresetDTO,
  QuotePresetInventoryOption,
} from "@/lib/quoteItemPresets";
import {
  listQuoteItemPresets,
  createQuoteItemPresetsBulk,
  updateQuoteItemPreset,
  deleteQuoteItemPreset,
  listQuoteDetailPresets,
  createQuoteDetailPresetsBulk,
  updateQuoteDetailPreset,
  deleteQuoteDetailPreset,
  listQuotePresetInventoryOptions,
  createQuoteDetailPreset,
} from "@/app/actions/quoteItemPresets";
import { compressImageFile } from "@/lib/imageCompression";
import { ModalShell } from "@/components/ui/modal-shell";

/** Divide o texto por vírgula (e quebras de linha), removendo vazios. */
function splitEntries(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

type Tab = "descricoes" | "detalhes";
type ImageTarget = { type: "item"; id: string; label: string; imagem_url: string | null };

export default function QuoteItemPresetsManager({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("descricoes");

  const [presets, setPresets] = useState<QuoteItemPresetDTO[]>([]);
  const [descricao, setDescricao] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [details, setDetails] = useState<QuoteDetailPresetDTO[]>([]);
  const [detailText, setDetailText] = useState("");
  const [editingDetailId, setEditingDetailId] = useState<string | null>(null);
  const [detailInventoryId, setDetailInventoryId] = useState("");
  const [inventoryOptions, setInventoryOptions] = useState<QuotePresetInventoryOption[]>([]);
  const [inventoryFilter, setInventoryFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [imageTarget, setImageTarget] = useState<ImageTarget | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoading(true);
    Promise.all([
      listQuoteItemPresets(),
      listQuoteDetailPresets(),
      listQuotePresetInventoryOptions(),
    ])
      .then(([itemsRes, detailsRes, invRes]) => {
        if (!active) return;
        if (itemsRes.success) setPresets(itemsRes.presets);
        if (detailsRes.success) setDetails(detailsRes.details);
        if (invRes.success) setInventoryOptions(invRes.items);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [isOpen]);

  function resetDescricaoForm() {
    setEditingId(null);
    setDescricao("");
    setError(null);
  }

  function resetDetailForm() {
    setEditingDetailId(null);
    setDetailText("");
    setDetailInventoryId("");
    setInventoryFilter("");
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
        const res = await updateQuoteDetailPreset(editingDetailId, {
          texto: entries[0],
          inventory_item_id: detailInventoryId || null,
        });
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
      } else if (entries.length === 1) {
        const createRes = await createQuoteDetailPreset({
          texto: entries[0],
          inventory_item_id: detailInventoryId || null,
        });
        if (createRes.success) {
          setDetails((prev) => {
            const map = new Map(prev.map((d) => [d.id, d]));
            map.set(createRes.detail.id, createRes.detail);
            return Array.from(map.values()).sort((a, b) =>
              a.texto.localeCompare(b.texto, "pt-BR")
            );
          });
          resetDetailForm();
        } else {
          setError(createRes.error);
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

  function openImagePanel(target: ImageTarget) {
    setImageTarget(target);
    setImageError(null);
  }

  function applyImageUrl(id: string, imagem_url: string | null) {
    setPresets((prev) => prev.map((p) => (p.id === id ? { ...p, imagem_url } : p)));
    setImageTarget((prev) => (prev && prev.id === id ? { ...prev, imagem_url } : prev));
  }

  async function uploadImage(fileList: FileList | null) {
    if (!imageTarget || !fileList?.[0]) return;
    setImageBusy(true);
    setImageError(null);
    try {
      const compressed = await compressImageFile(fileList[0], {
        maxDimension: 1200,
        quality: 0.8,
      });
      const formData = new FormData();
      formData.append("file", compressed, compressed.name);
      const res = await fetch(
        `/api/quote-presets/${imageTarget.type}/${imageTarget.id}/image`,
        { method: "POST", body: formData }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        setImageError(data.error || "Não foi possível enviar a imagem.");
        return;
      }
      applyImageUrl(imageTarget.id, data.imagem_url ?? null);
    } catch {
      setImageError("Falha de conexão ao enviar a imagem.");
    } finally {
      setImageBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function removeImage() {
    if (!imageTarget) return;
    setImageBusy(true);
    setImageError(null);
    try {
      const res = await fetch(
        `/api/quote-presets/${imageTarget.type}/${imageTarget.id}/image`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        setImageError(data.error || "Não foi possível remover a imagem.");
        return;
      }
      applyImageUrl(imageTarget.id, null);
    } catch {
      setImageError("Falha de conexão ao remover a imagem.");
    } finally {
      setImageBusy(false);
    }
  }

  const filteredInventory = inventoryOptions.filter((item) => {
    if (!inventoryFilter.trim()) return true;
    const q = inventoryFilter.trim().toLowerCase();
    return (
      item.nome.toLowerCase().includes(q) || item.categoria.toLowerCase().includes(q)
    );
  });

  function rowActions(opts: {
    hasImage?: boolean;
    onImage?: () => void;
    onEdit: () => void;
    onDelete: () => void;
    deleting: boolean;
  }) {
    return (
      <div className="flex items-center gap-0.5 shrink-0">
        {opts.onImage ? (
          <button
            type="button"
            onClick={opts.onImage}
            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
              opts.hasImage
                ? "text-amber-600 bg-amber-50 hover:bg-amber-100"
                : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            }`}
            title={opts.hasImage ? "Ver / trocar imagem" : "Adicionar imagem"}
          >
            <ImageIcon className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={opts.onEdit}
          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 cursor-pointer"
          title="Editar"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={opts.onDelete}
          disabled={opts.deleting}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer disabled:opacity-50"
          title="Excluir"
        >
          {opts.deleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    );
  }

  return (
    <>
      <Dialog isOpen={isOpen} onClose={onClose} className="max-w-2xl">
        <div className="space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Bookmark className="h-5 w-5 text-amber-500" />
            <div>
              <h2 className="text-base font-black text-slate-800">Itens salvos do orçamento</h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Cadastre descrições e detalhes reutilizáveis. Cada um aparece apenas no seu próprio
                campo ao montar o orçamento.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100/80 border border-slate-200/50 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setTab("descricoes");
                setError(null);
              }}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tab === "descricoes"
                  ? "bg-white text-slate-800 shadow-xs"
                  : "text-slate-500 hover:text-slate-700"
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
                tab === "detalhes"
                  ? "bg-white text-slate-800 shadow-xs"
                  : "text-slate-500 hover:text-slate-700"
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
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    maxLength={editingId ? 160 : 600}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleSaveDescricao();
                      }
                    }}
                    className="flex-1 min-w-[12rem] h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:border-amber-400 focus:outline-none transition-all"
                  />
                  {editingId && (
                    <Button type="button" variant="outline" onClick={resetDescricaoForm} className="gap-1.5">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    onClick={() => void handleSaveDescricao()}
                    disabled={saving}
                    className="btn-metallic gap-1.5"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : editingId ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    {editingId ? "Atualizar" : "Adicionar"}
                  </Button>
                </div>
                {error && (
                  <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                    {error}
                  </p>
                )}
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                  {presets.length}{" "}
                  {presets.length === 1 ? "descrição salva" : "descrições salvas"}
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
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white max-h-[40vh] overflow-y-auto">
                    {presets.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50/80"
                      >
                        <p className="min-w-0 flex-1 text-sm font-semibold text-slate-800 truncate">
                          {p.descricao}
                        </p>
                        {rowActions({
                          hasImage: Boolean(p.imagem_url),
                          onImage: () =>
                            openImagePanel({
                              type: "item",
                              id: p.id,
                              label: p.descricao,
                              imagem_url: p.imagem_url,
                            }),
                          onEdit: () => {
                            setEditingId(p.id);
                            setDescricao(p.descricao);
                            setError(null);
                          },
                          onDelete: () => void handleDeleteDescricao(p.id),
                          deleting: deletingId === p.id,
                        })}
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
                  {editingDetailId ? "Editar detalhe" : "Novo detalhe do item"}
                </label>
                <p className="text-[10px] text-slate-400 font-medium -mt-1">
                  Aparece como sugestão apenas no campo <strong>Detalhes do item</strong>.
                  {!editingDetailId && " Separe por vírgula para adicionar vários de uma vez."}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={detailText}
                    onChange={(e) => setDetailText(e.target.value)}
                    maxLength={editingDetailId ? 160 : 600}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleSaveDetail();
                      }
                    }}
                    className="flex-1 min-w-[12rem] h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:border-amber-400 focus:outline-none transition-all"
                  />
                  {editingDetailId && (
                    <Button type="button" variant="outline" onClick={resetDetailForm} className="gap-1.5">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    onClick={() => void handleSaveDetail()}
                    disabled={saving}
                    className="btn-metallic gap-1.5"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : editingDetailId ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    {editingDetailId ? "Atualizar" : "Adicionar"}
                  </Button>
                </div>

                {(editingDetailId || splitEntries(detailText).length <= 1) && (
                  <div className="space-y-1.5 pt-1 border-t border-slate-200/80">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-450 flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5" />
                      Vincular ao estoque (opcional)
                    </label>
                    <input
                      type="search"
                      value={inventoryFilter}
                      onChange={(e) => setInventoryFilter(e.target.value)}
                      placeholder="Buscar no estoque…"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:border-amber-400 focus:outline-none"
                    />
                    <select
                      value={detailInventoryId}
                      onChange={(e) => setDetailInventoryId(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:border-amber-400 focus:outline-none cursor-pointer"
                    >
                      <option value="">Sem vínculo</option>
                      {filteredInventory.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.nome}
                          {item.categoria ? ` · ${item.categoria}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {error && (
                  <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                    {error}
                  </p>
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
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white max-h-[40vh] overflow-y-auto">
                    {details.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50/80"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-800 truncate">{d.texto}</p>
                          {d.inventory_item_nome ? (
                            <p className="text-[10px] font-medium text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                              <Package className="h-3 w-3 shrink-0" />
                              {d.inventory_item_nome}
                            </p>
                          ) : null}
                        </div>
                        {rowActions({
                          onEdit: () => {
                            setEditingDetailId(d.id);
                            setDetailText(d.texto);
                            setDetailInventoryId(d.inventory_item_id || "");
                            setInventoryFilter("");
                            setError(null);
                          },
                          onDelete: () => void handleDeleteDetail(d.id),
                          deleting: deletingId === d.id,
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </Dialog>

      <ModalShell
        open={Boolean(imageTarget)}
        onClose={() => {
          if (!imageBusy) setImageTarget(null);
        }}
        panelClassName="max-w-md w-full"
      >
        {imageTarget ? (
          <div className="space-y-4 p-1">
            <div>
              <h3 className="text-sm font-bold text-slate-800 truncate">
                Imagem · {imageTarget.label}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Uma foto por item salvo. Usada só no cadastro por enquanto.
              </p>
            </div>
            <div className="aspect-video rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
              {imageTarget.imagem_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageTarget.imagem_url}
                  alt=""
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="text-center text-slate-400 text-xs font-medium space-y-2 p-6">
                  <ImageIcon className="h-8 w-8 mx-auto opacity-50" />
                  <p>Nenhuma imagem ainda.</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              className="hidden"
              onChange={(e) => void uploadImage(e.target.files)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={imageBusy}
                onClick={() => fileInputRef.current?.click()}
                className="btn-metallic gap-1.5 text-xs"
              >
                {imageBusy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                {imageTarget.imagem_url ? "Trocar imagem" : "Enviar imagem"}
              </Button>
              {imageTarget.imagem_url ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={imageBusy}
                  onClick={() => void removeImage()}
                  className="gap-1.5 text-xs text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remover
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                disabled={imageBusy}
                onClick={() => setImageTarget(null)}
                className="text-xs ml-auto"
              >
                Fechar
              </Button>
            </div>
            {imageError ? (
              <p className="text-xs font-bold text-red-600">{imageError}</p>
            ) : (
              <p className="text-[10px] text-slate-400">
                JPG, PNG ou WEBP · até 8 MB · convertida automaticamente para WebP.
              </p>
            )}
          </div>
        ) : null}
      </ModalShell>
    </>
  );
}
