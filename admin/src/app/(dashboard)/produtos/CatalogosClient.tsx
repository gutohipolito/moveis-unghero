"use client";

import React, { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import {
  updateProductCatalog,
  type ProductCatalogDTO,
} from "@/app/actions/productCatalogs";
import { formatCatalogSize } from "@/lib/productCatalogs";
import { ActionDialogHost, useActionDialog } from "@/components/ActionDialogHost";
import ProdutosSectionTabs from "@/components/produtos/ProdutosSectionTabs";
import InfoTooltip, { TooltipBody } from "@/components/ui/InfoTooltip";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import {
  BookOpen,
  Plus,
  Trash2,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Search,
} from "lucide-react";

interface CatalogosClientProps {
  companyId: string;
  initialCatalogs: ProductCatalogDTO[];
}

export default function CatalogosClient({
  companyId,
  initialCatalogs,
}: CatalogosClientProps) {
  const dialog = useActionDialog();
  const { showSuccess, showError, confirmAction } = dialog;

  const [catalogs, setCatalogs] = useState(initialCatalogs);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProductCatalogDTO | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [marca, setMarca] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [capa, setCapa] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const capaRef = useRef<HTMLInputElement>(null);

  const filtered = catalogs.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      c.titulo.toLowerCase().includes(q) ||
      (c.marca || "").toLowerCase().includes(q) ||
      (c.descricao || "").toLowerCase().includes(q) ||
      c.arquivo_nome.toLowerCase().includes(q)
    );
  });

  const resetForm = () => {
    setEditing(null);
    setTitulo("");
    setDescricao("");
    setMarca("");
    setFile(null);
    setCapa(null);
    if (fileRef.current) fileRef.current.value = "";
    if (capaRef.current) capaRef.current.value = "";
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (catalog: ProductCatalogDTO) => {
    setEditing(catalog);
    setTitulo(catalog.titulo);
    setDescricao(catalog.descricao || "");
    setMarca(catalog.marca || "");
    setFile(null);
    setCapa(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editing) {
      if (!titulo.trim()) {
        showError("Título obrigatório", "Informe o nome do catálogo.");
        return;
      }
      setSaving(true);
      try {
        const res = await updateProductCatalog(companyId, editing.id, {
          titulo: titulo.trim(),
          descricao: descricao.trim() || null,
          marca: marca.trim() || null,
        });
        if (!res.success || !res.catalog) {
          showError("Falha", res.error || "Não foi possível atualizar.");
          return;
        }
        setCatalogs((prev) => prev.map((c) => (c.id === res.catalog!.id ? res.catalog! : c)));
        showSuccess("Catálogo atualizado", "Dados salvos.");
        setModalOpen(false);
        resetForm();
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!file) {
      showError("Arquivo obrigatório", "Selecione o PDF ou a imagem do catálogo.");
      return;
    }

    setUploading(true);
    try {
      // 1. Upload do PDF/Imagem do catálogo direto do navegador para o Vercel Blob
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/produtos/catalogos/upload",
      });

      // 2. Upload da capa do catálogo (se houver)
      let capaUrl = null;
      if (capa) {
        const capaBlob = await upload(capa.name, capa, {
          access: "public",
          handleUploadUrl: "/api/produtos/catalogos/upload",
        });
        capaUrl = capaBlob.url;
      }

      // 3. Envia os metadados e as URLs salvas para criar no banco via JSON
      const payload = {
        titulo: titulo.trim() || file.name,
        descricao: descricao.trim() || null,
        marca: marca.trim() || null,
        arquivoUrl: blob.url,
        arquivoNome: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        capaUrl,
      };

      const res = await fetch("/api/produtos/catalogos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.catalog) {
        showError("Cadastro falhou", data.error || "Não foi possível registrar o catálogo.");
        return;
      }

      setCatalogs((prev) =>
        [...prev, data.catalog as ProductCatalogDTO].sort((a, b) =>
          a.titulo.localeCompare(b.titulo, "pt-BR")
        )
      );
      showSuccess("Catálogo adicionado", "Disponível para uso com os clientes.");
      setModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      showError("Upload falhou", "Erro ao realizar upload ou criar catálogo.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (catalog: ProductCatalogDTO) => {
    confirmAction({
      title: "Excluir catálogo?",
      message: `Remover "${catalog.titulo}"? O arquivo será apagado.`,
      confirmLabel: "Excluir",
      onConfirm: async () => {
        const res = await fetch(`/api/produtos/catalogos?id=${encodeURIComponent(catalog.id)}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          showError("Falha", data.error || "Não foi possível excluir.");
          return;
        }
        setCatalogs((prev) => prev.filter((c) => c.id !== catalog.id));
        showSuccess("Catálogo excluído", "Removido da biblioteca.");
      },
    });
  };

  return (
    <div className="space-y-6">
      <ActionDialogHost dialog={dialog} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-black text-foreground tracking-tight">Produtos</h1>
            <InfoTooltip label="Sobre Catálogos">
              <TooltipBody
                title="Catálogos para clientes"
                items={[
                  "Guarde PDFs e imagens de catálogos de marcas e linhas.",
                  "Use na conversa comercial para mostrar opções ao cliente.",
                  "A capa é opcional; em imagens, a própria foto vira capa.",
                ]}
              />
            </InfoTooltip>
          </div>
          <ProdutosSectionTabs />
          <p className="text-sm text-muted-foreground">
            Biblioteca de catálogos para apresentar aos clientes.
          </p>
        </div>

        <Button onClick={openCreate} className="font-bold btn-metallic gap-1.5 w-full md:w-auto">
          <Plus className="h-4.5 w-4.5" /> Novo catálogo
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          className="pl-9 bg-white"
          placeholder="Buscar por título, marca ou arquivo…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">
          <BookOpen className="h-10 w-10 mx-auto mb-3 text-slate-300" />
          Nenhum catálogo ainda. Adicione o primeiro PDF ou imagem.
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((catalog) => {
            const isPdf = catalog.mime_type === "application/pdf";
            const thumb = catalog.capa_url || (!isPdf ? catalog.arquivo_url : null);
            return (
              <Card
                key={catalog.id}
                className="overflow-hidden flex flex-col border-border/60 hover:shadow-md transition-all"
              >
                <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt={catalog.titulo}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
                      <FileText className="h-10 w-10" />
                      <span className="text-[10px] font-bold uppercase tracking-wide">PDF</span>
                    </div>
                  )}
                  <span className="absolute top-2 left-2 text-[10px] font-bold uppercase bg-black/65 text-white px-1.5 py-0.5 rounded">
                    {isPdf ? "PDF" : "Imagem"}
                  </span>
                </div>
                <div className="p-3.5 flex-1 flex flex-col gap-1.5">
                  {catalog.marca ? (
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {catalog.marca}
                    </p>
                  ) : null}
                  <h3 className="font-semibold text-foreground leading-snug line-clamp-2">
                    {catalog.titulo}
                  </h3>
                  {catalog.descricao ? (
                    <p className="text-xs text-muted-foreground line-clamp-2">{catalog.descricao}</p>
                  ) : null}
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {catalog.arquivo_nome} · {formatCatalogSize(catalog.size_bytes)}
                  </p>
                  <div className="mt-auto pt-3 flex gap-2">
                    <a
                      href={catalog.arquivo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1"
                    >
                      <Button type="button" variant="outline" size="sm" className="w-full">
                        <ExternalLink className="h-3.5 w-3.5 mr-1" /> Abrir
                      </Button>
                    </a>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(catalog)}
                      title="Editar dados"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      onClick={() => handleDelete(catalog)}
                      title="Excluir"
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
        className="max-w-md w-full"
      >
        <form onSubmit={handleSave} className="space-y-4 pr-6">
          <div>
            <h3 className="text-lg font-bold text-foreground">
              {editing ? "Editar catálogo" : "Novo catálogo"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {editing
                ? "Atualize título, marca e descrição."
                : "Envie um PDF ou imagem de catálogo para a biblioteca."}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Título *</label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Linha Essenza 2026"
              required={Boolean(editing)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Marca / linha</label>
            <Input
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              placeholder="Ex.: Arauco, Duratex…"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Descrição</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Observação opcional para a equipe"
            />
          </div>

          {!editing ? (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  Arquivo (PDF ou imagem) *
                </label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  required
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Capa (opcional)</label>
                <input
                  ref={capaRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setCapa(e.target.files?.[0] || null)}
                  className="block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold"
                />
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" />
                  Em PDF, a capa ajuda a identificar o catálogo na grade.
                </p>
              </div>
            </>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
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
            <Button type="submit" className="btn-metallic font-bold" disabled={saving || uploading}>
              {saving || uploading ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : null}
              {editing ? "Salvar" : "Adicionar"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
