"use client";

import React, { useMemo, useState } from "react";
import {
  createShowcaseProduct,
  deleteShowcaseProduct,
  updateShowcaseProduct,
  type ShowcaseProductDTO,
} from "@/app/actions/produtos";
import { ActionDialogHost, useActionDialog } from "@/components/ActionDialogHost";
import PrivacyToggle from "@/components/PrivacyToggle";
import { usePrivacy } from "@/context/PrivacyContext";
import InfoTooltip, { TooltipBody } from "@/components/ui/InfoTooltip";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Image as ImageIcon,
  Link2,
  Package,
  Loader2,
  Camera,
  X,
  LayoutGrid,
  Sofa,
  ChefHat,
  DoorOpen,
  Bath,
  BedDouble,
  Armchair,
} from "lucide-react";

type InventoryOption = {
  id: string;
  nome: string;
  categoria: string;
  precoCusto: number;
};

interface ProdutosClientProps {
  companyId: string;
  initialProducts: ShowcaseProductDTO[];
  inventoryOptions: InventoryOption[];
}

const CATEGORY_VISUAL: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  cozinha: {
    icon: ChefHat,
    tone: "bg-amber-50 text-amber-800 border-amber-200 data-[active=true]:bg-amber-600 data-[active=true]:text-white data-[active=true]:border-amber-600",
  },
  closet: {
    icon: DoorOpen,
    tone: "bg-violet-50 text-violet-800 border-violet-200 data-[active=true]:bg-violet-600 data-[active=true]:text-white data-[active=true]:border-violet-600",
  },
  dormitório: {
    icon: BedDouble,
    tone: "bg-sky-50 text-sky-800 border-sky-200 data-[active=true]:bg-sky-600 data-[active=true]:text-white data-[active=true]:border-sky-600",
  },
  dormitorio: {
    icon: BedDouble,
    tone: "bg-sky-50 text-sky-800 border-sky-200 data-[active=true]:bg-sky-600 data-[active=true]:text-white data-[active=true]:border-sky-600",
  },
  banheiro: {
    icon: Bath,
    tone: "bg-cyan-50 text-cyan-800 border-cyan-200 data-[active=true]:bg-cyan-600 data-[active=true]:text-white data-[active=true]:border-cyan-600",
  },
  sala: {
    icon: Sofa,
    tone: "bg-emerald-50 text-emerald-800 border-emerald-200 data-[active=true]:bg-emerald-600 data-[active=true]:text-white data-[active=true]:border-emerald-600",
  },
  home: {
    icon: Armchair,
    tone: "bg-rose-50 text-rose-800 border-rose-200 data-[active=true]:bg-rose-600 data-[active=true]:text-white data-[active=true]:border-rose-600",
  },
};

function categoryVisual(label: string) {
  const key = label.trim().toLowerCase();
  return (
    CATEGORY_VISUAL[key] || {
      icon: Package,
      tone: "bg-slate-50 text-slate-700 border-slate-200 data-[active=true]:bg-slate-800 data-[active=true]:text-white data-[active=true]:border-slate-800",
    }
  );
}

function formatCurrency(val: number | null) {
  if (val == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
}

function coverUrl(product: ShowcaseProductDTO) {
  return product.imagens?.[0] || product.imagem_url || null;
}

export default function ProdutosClient({
  companyId,
  initialProducts,
  inventoryOptions,
}: ProdutosClientProps) {
  const dialog = useActionDialog();
  const { showSuccess, showError, confirmAction } = dialog;
  const { privacyMode } = usePrivacy();

  const [products, setProducts] = useState(initialProducts);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterAtivo, setFilterAtivo] = useState<"ALL" | "ATIVO" | "INATIVO">("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ShowcaseProductDTO | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [precoExibicao, setPrecoExibicao] = useState("");
  const [inventoryItemId, setInventoryItemId] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [imagens, setImagens] = useState<string[]>([]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.categoria?.trim()) set.add(p.categoria.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [products]);

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => {
      const key = p.categoria?.trim();
      if (!key) return;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [products]);

  const filtered = products.filter((p) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.nome.toLowerCase().includes(q) ||
      (p.descricao || "").toLowerCase().includes(q) ||
      (p.categoria || "").toLowerCase().includes(q);
    const matchesCategory = filterCategory === "ALL" || p.categoria === filterCategory;
    const matchesAtivo =
      filterAtivo === "ALL" ||
      (filterAtivo === "ATIVO" ? p.ativo : !p.ativo);
    return matchesSearch && matchesCategory && matchesAtivo;
  });

  const resetForm = () => {
    setEditing(null);
    setNome("");
    setDescricao("");
    setCategoria("");
    setPrecoExibicao("");
    setInventoryItemId("");
    setAtivo(true);
    setImagens([]);
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (product: ShowcaseProductDTO) => {
    setEditing(product);
    setNome(product.nome);
    setDescricao(product.descricao || "");
    setCategoria(product.categoria || "");
    setPrecoExibicao(
      product.preco_exibicao != null ? String(product.preco_exibicao) : ""
    );
    setInventoryItemId(product.inventory_item_id || "");
    setAtivo(product.ativo);
    setImagens(product.imagens?.length ? product.imagens : product.imagem_url ? [product.imagem_url] : []);
    setModalOpen(true);
  };

  const handleInventorySelect = (id: string) => {
    setInventoryItemId(id);
    if (!id) return;
    const inv = inventoryOptions.find((i) => i.id === id);
    if (!inv) return;
    if (!nome.trim()) setNome(inv.nome);
    if (!categoria.trim()) setCategoria(inv.categoria);
    if (!precoExibicao.trim()) setPrecoExibicao(String(Number((inv.precoCusto * 2.2).toFixed(2))));
  };

  const applyProductImages = (productId: string, nextImagens: string[], mime?: string | null) => {
    const cover = nextImagens[0] || null;
    setImagens(nextImagens);
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              imagens: nextImagens,
              imagem_url: cover,
              imagem_mime: mime ?? p.imagem_mime,
            }
          : p
      )
    );
    setEditing((prev) =>
      prev && prev.id === productId
        ? {
            ...prev,
            imagens: nextImagens,
            imagem_url: cover,
            imagem_mime: mime ?? prev.imagem_mime,
          }
        : prev
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      showError("Nome obrigatório", "Informe o nome do produto.");
      return;
    }

    setSaving(true);
    const payload = {
      nome: nome.trim(),
      descricao: descricao.trim() || undefined,
      categoria: categoria.trim() || undefined,
      preco_exibicao: precoExibicao.trim() ? Number(precoExibicao) : null,
      inventory_item_id: inventoryItemId || null,
      ativo,
    };

    try {
      if (editing) {
        const res = await updateShowcaseProduct(companyId, editing.id, payload);
        if (!res.success || !res.product) {
          showError("Falha ao salvar", res.error || "Não foi possível atualizar.");
          return;
        }
        setProducts((prev) =>
          prev.map((p) =>
            p.id === res.product!.id
              ? { ...res.product!, imagens: p.imagens, imagem_url: p.imagem_url }
              : p
          )
        );
        showSuccess("Produto atualizado", "Alterações salvas no mostruário.");
        setModalOpen(false);
        resetForm();
      } else {
        const res = await createShowcaseProduct(companyId, payload);
        if (!res.success || !res.product) {
          showError("Falha ao salvar", res.error || "Não foi possível criar.");
          return;
        }
        setProducts((prev) =>
          [...prev, res.product!].sort(
            (a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR")
          )
        );
        showSuccess("Produto criado", "Agora você pode enviar fotos.");
        setEditing(res.product);
        setImagens(res.product.imagens || []);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (files: FileList | File[]) => {
    const productId = editing?.id;
    if (!productId) {
      showError("Salve primeiro", "Crie o produto antes de enviar imagens.");
      return;
    }

    const list = Array.from(files).filter((f) => f.size > 0);
    if (list.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      list.forEach((file) => formData.append("file", file));
      const res = await fetch(`/api/produtos/${productId}/image`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showError("Upload falhou", data.error || "Não foi possível enviar as imagens.");
        return;
      }
      applyProductImages(productId, data.imagens || [], data.imagem_mime);
      showSuccess(
        list.length > 1 ? "Fotos enviadas" : "Foto enviada",
        `${list.length} imagem(ns) adicionada(s) ao produto.`
      );
    } catch {
      showError("Upload falhou", "Erro de rede ao enviar as imagens.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async (url?: string) => {
    const productId = editing?.id;
    if (!productId) return;
    setUploading(true);
    try {
      const qs = url ? `?url=${encodeURIComponent(url)}` : "";
      const res = await fetch(`/api/produtos/${productId}/image${qs}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showError("Falha", data.error || "Não foi possível remover a imagem.");
        return;
      }
      applyProductImages(productId, data.imagens || []);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (product: ShowcaseProductDTO) => {
    confirmAction({
      title: "Excluir produto?",
      message: `Remover "${product.nome}" do mostruário? Orçamentos existentes mantêm a descrição.`,
      confirmLabel: "Excluir",
      onConfirm: async () => {
        const res = await deleteShowcaseProduct(companyId, product.id);
        if (!res.success) {
          showError("Falha ao excluir", res.error || "Não foi possível excluir.");
          return;
        }
        setProducts((prev) => prev.filter((p) => p.id !== product.id));
        showSuccess("Produto excluído", "Removido do mostruário.");
      },
    });
  };

  return (
    <div className="space-y-6">
      <ActionDialogHost dialog={dialog} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-foreground tracking-tight">Produtos</h1>
            <InfoTooltip label="Sobre Produtos">
              <TooltipBody
                title="Mostruário comercial"
                items={[
                  "Cadastre produtos com fotos para mostrar ao cliente no orçamento.",
                  "O vínculo com o estoque é opcional e não altera a quantidade.",
                  "No PDF do orçamento, a foto de capa aparece na linha do item.",
                ]}
              />
            </InfoTooltip>
            <PrivacyToggle />
          </div>
          <p className="text-sm text-muted-foreground">
            Mostruário visual para identificar o que entra no orçamento do cliente.
          </p>
        </div>

        <Button onClick={openCreate} className="font-bold btn-metallic gap-1.5 w-full md:w-auto">
          <Plus className="h-4.5 w-4.5" /> Novo produto
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9 bg-white"
              placeholder="Buscar por nome, descrição ou categoria…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            value={filterAtivo}
            onChange={(e) => setFilterAtivo(e.target.value as typeof filterAtivo)}
            className="h-10 rounded-md border border-input bg-white px-3 text-sm"
          >
            <option value="ALL">Todos os status</option>
            <option value="ATIVO">Ativos</option>
            <option value="INATIVO">Inativos</option>
          </select>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            type="button"
            data-active={filterCategory === "ALL"}
            onClick={() => setFilterCategory("ALL")}
            className="shrink-0 inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer bg-slate-50 text-slate-700 border-slate-200 data-[active=true]:bg-slate-900 data-[active=true]:text-white data-[active=true]:border-slate-900"
          >
            <LayoutGrid className="h-4 w-4" />
            Todas
            <span className="opacity-70 font-semibold">{products.length}</span>
          </button>
          {categories.map((cat) => {
            const visual = categoryVisual(cat);
            const Icon = visual.icon;
            return (
              <button
                key={cat}
                type="button"
                data-active={filterCategory === cat}
                onClick={() => setFilterCategory(cat)}
                className={`shrink-0 inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer ${visual.tone}`}
              >
                <Icon className="h-4 w-4" />
                {cat}
                <span className="opacity-70 font-semibold">{categoryCounts.get(cat) || 0}</span>
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-3 text-slate-300" />
          Nenhum produto no mostruário. Cadastre o primeiro para usar nos orçamentos.
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
          {filtered.map((product) => {
            const cover = coverUrl(product);
            const extraPhotos = Math.max(0, (product.imagens?.length || 0) - 1);
            return (
              <Card
                key={product.id}
                className={`group overflow-hidden flex flex-col border-border/60 hover:border-border hover:shadow-md transition-all ${
                  !product.ativo ? "opacity-60" : ""
                }`}
              >
                <div className="aspect-square bg-slate-100 relative overflow-hidden">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cover}
                      alt={product.nome}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                      <ImageIcon className="h-10 w-10" />
                    </div>
                  )}
                  {!product.ativo && (
                    <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wide bg-slate-800 text-white px-2 py-0.5 rounded">
                      Inativo
                    </span>
                  )}
                  {extraPhotos > 0 && (
                    <span className="absolute bottom-2 right-2 text-[10px] font-bold bg-black/65 text-white px-1.5 py-0.5 rounded">
                      +{extraPhotos}
                    </span>
                  )}
                </div>
                <div className="p-3.5 flex-1 flex flex-col gap-1.5">
                  {product.categoria ? (
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {product.categoria}
                    </p>
                  ) : null}
                  <h3 className="font-semibold text-foreground leading-snug line-clamp-2">
                    {product.nome}
                  </h3>
                  {!privacyMode ? (
                    <p className="text-sm font-black text-foreground mt-0.5">
                      {formatCurrency(product.preco_exibicao)}
                    </p>
                  ) : null}
                  {product.inventory_item_id ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-700 bg-cyan-50 border border-cyan-100 rounded px-1.5 py-0.5 w-fit mt-1">
                      <Link2 className="h-3 w-3" />
                      Estoque
                    </span>
                  ) : null}
                  <div className="mt-auto pt-3 flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEdit(product)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      onClick={() => handleDelete(product)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        className="max-w-lg w-full"
      >
        <form onSubmit={handleSave} className="space-y-4 pr-6">
          <div>
            <h3 className="text-lg font-bold text-foreground">
              {editing ? "Editar produto" : "Novo produto"}
            </h3>
            <p className="text-xs text-muted-foreground">
              Cadastro visual para o mostruário comercial.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-600">
                Fotos {imagens.length > 0 ? `(${imagens.length})` : ""}
              </label>
              <label
                className={`inline-flex items-center justify-center h-8 px-3 rounded-md border text-xs font-medium cursor-pointer ${
                  editing && !uploading
                    ? "bg-white hover:bg-slate-50"
                    : "opacity-50 pointer-events-none"
                }`}
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5 mr-1.5" />
                )}
                Adicionar fotos
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  disabled={!editing || uploading}
                  onChange={(e) => {
                    if (e.target.files?.length) void handleUpload(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            {!editing ? (
              <p className="text-xs text-muted-foreground">
                Salve o produto para liberar o envio de fotos (múltiplas).
              </p>
            ) : imagens.length === 0 ? (
              <div className="h-24 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-300">
                <Camera className="h-8 w-8" />
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {imagens.map((url, idx) => (
                  <div
                    key={url}
                    className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50 group/img"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    {idx === 0 ? (
                      <span className="absolute bottom-1 left-1 text-[9px] font-bold uppercase bg-black/70 text-white px-1 rounded">
                        Capa
                      </span>
                    ) : null}
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => void handleRemoveImage(url)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover/img:opacity-100 transition-opacity cursor-pointer"
                      title="Remover foto"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Nome *</label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Descrição comercial</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Texto opcional para o cliente"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Categoria</label>
              <Input
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="Ex.: Cozinha, Closet"
                list="produto-categorias"
              />
              <datalist id="produto-categorias">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Preço de exibição</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={precoExibicao}
                onChange={(e) => setPrecoExibicao(e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">
              Vincular ao estoque (opcional)
            </label>
            <select
              value={inventoryItemId}
              onChange={(e) => handleInventorySelect(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Sem vínculo</option>
              {inventoryOptions.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.nome}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              className="rounded border-slate-300"
            />
            Produto ativo no mostruário
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setModalOpen(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
              {editing ? "Salvar" : "Criar produto"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
