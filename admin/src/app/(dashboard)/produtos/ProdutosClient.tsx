"use client";

import React, { useMemo, useState } from "react";
import {
  createShowcaseProduct,
  deleteShowcaseProduct,
  updateShowcaseProduct,
  type ShowcaseProductDTO,
} from "@/app/actions/produtos";
import { ActionDialogHost, useActionDialog } from "@/components/ActionDialogHost";
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

function formatCurrency(val: number | null) {
  if (val == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
}

export default function ProdutosClient({
  companyId,
  initialProducts,
  inventoryOptions,
}: ProdutosClientProps) {
  const dialog = useActionDialog();
  const { showSuccess, showError, confirmAction } = dialog;

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
  const [imagemUrl, setImagemUrl] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.categoria?.trim()) set.add(p.categoria.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
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
    setImagemUrl(null);
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
    setImagemUrl(product.imagem_url);
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
        setProducts((prev) => prev.map((p) => (p.id === res.product!.id ? res.product! : p)));
        showSuccess("Produto atualizado", "Alterações salvas no mostruário.");
        setModalOpen(false);
        resetForm();
      } else {
        const res = await createShowcaseProduct(companyId, payload);
        if (!res.success || !res.product) {
          showError("Falha ao salvar", res.error || "Não foi possível criar.");
          return;
        }
        setProducts((prev) => [...prev, res.product!].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR")));
        showSuccess("Produto criado", "Agora você pode enviar uma foto.");
        setEditing(res.product);
        setImagemUrl(res.product.imagem_url);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (file: File) => {
    const productId = editing?.id;
    if (!productId) {
      showError("Salve primeiro", "Crie o produto antes de enviar a imagem.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/produtos/${productId}/image`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showError("Upload falhou", data.error || "Não foi possível enviar a imagem.");
        return;
      }
      setImagemUrl(data.imagem_url);
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? { ...p, imagem_url: data.imagem_url, imagem_mime: data.imagem_mime }
            : p
        )
      );
      setEditing((prev) =>
        prev && prev.id === productId
          ? { ...prev, imagem_url: data.imagem_url, imagem_mime: data.imagem_mime }
          : prev
      );
      showSuccess("Imagem enviada", "Foto do produto atualizada.");
    } catch {
      showError("Upload falhou", "Erro de rede ao enviar a imagem.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    const productId = editing?.id;
    if (!productId) return;
    setUploading(true);
    try {
      const res = await fetch(`/api/produtos/${productId}/image`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showError("Falha", data.error || "Não foi possível remover a imagem.");
        return;
      }
      setImagemUrl(null);
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, imagem_url: null, imagem_mime: null } : p
        )
      );
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
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      <ActionDialogHost dialog={dialog} />

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Produtos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Mostruário visual para identificar o que entra no orçamento do cliente.
          </p>
        </div>
        <Button onClick={openCreate} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-1.5" /> Novo produto
        </Button>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Buscar por nome, descrição ou categoria…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="ALL">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={filterAtivo}
            onChange={(e) => setFilterAtivo(e.target.value as typeof filterAtivo)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="ALL">Todos</option>
            <option value="ATIVO">Ativos</option>
            <option value="INATIVO">Inativos</option>
          </select>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-3 text-slate-300" />
          Nenhum produto no mostruário. Cadastre o primeiro para usar nos orçamentos.
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((product) => (
            <Card
              key={product.id}
              className={`overflow-hidden flex flex-col ${!product.ativo ? "opacity-60" : ""}`}
            >
              <div className="aspect-[4/3] bg-slate-100 relative">
                {product.imagem_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.imagem_url}
                    alt={product.nome}
                    className="absolute inset-0 w-full h-full object-cover"
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
              </div>
              <div className="p-3.5 flex-1 flex flex-col gap-2">
                <div>
                  <h3 className="font-semibold text-slate-900 leading-snug">{product.nome}</h3>
                  {product.categoria ? (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{product.categoria}</p>
                  ) : null}
                </div>
                <p className="text-sm font-bold text-slate-800">
                  {formatCurrency(product.preco_exibicao)}
                </p>
                {product.inventory_item_id ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-700 bg-cyan-50 border border-cyan-100 rounded px-1.5 py-0.5 w-fit">
                    <Link2 className="h-3 w-3" />
                    Estoque: {product.inventoryItemNome || "vinculado"}
                  </span>
                ) : null}
                <div className="mt-auto pt-2 flex gap-2">
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
          ))}
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
          <div className="flex gap-4 items-start">
            <div className="w-28 h-28 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden relative shrink-0">
              {imagemUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagemUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <Camera className="h-8 w-8" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-xs text-muted-foreground">
                {editing
                  ? "JPG, PNG ou WEBP até 8 MB."
                  : "Salve o produto para liberar o envio da foto."}
              </p>
              <div className="flex flex-wrap gap-2">
                <label
                  className={`inline-flex items-center justify-center h-9 px-3 rounded-md border text-xs font-medium cursor-pointer ${
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
                  Enviar foto
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={!editing || uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleUpload(file);
                      e.target.value = "";
                    }}
                  />
                </label>
                {imagemUrl && editing ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => void handleRemoveImage()}
                  >
                    <X className="h-3.5 w-3.5 mr-1" /> Remover
                  </Button>
                ) : null}
              </div>
            </div>
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
              />
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
