"use client";

import React, { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import {
  updateProductCatalog,
  type ProductCatalogDTO,
} from "@/app/actions/productCatalogs";
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
  FileText,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Search,
  Settings2,
} from "lucide-react";

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

const generateCapaFromPdf = async (pdfFile: File): Promise<File | null> => {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(null);
      return;
    }
    const scriptId = "pdfjs-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    
    const startProcessing = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      processPdf(pdfFile, resolve);
    };

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.onload = startProcessing;
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    } else if (!window.pdfjsLib) {
      script.addEventListener("load", startProcessing);
    } else {
      startProcessing();
    }
  });
};

const processPdf = (pdfFile: File, resolve: (f: File | null) => void) => {
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const arr = e.target?.result as ArrayBuffer;
      const loadingTask = window.pdfjsLib.getDocument({ data: arr });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);

      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) {
        resolve(null);
        return;
      }

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(null);
          return;
        }
        const file = new File([blob], "capa-pdf-gerada.png", { type: "image/png" });
        resolve(file);
      }, "image/png");
    } catch (err) {
      console.error("Erro ao extrair primeira página do PDF:", err);
      resolve(null);
    }
  };
  reader.onerror = () => resolve(null);
  reader.readAsArrayBuffer(pdfFile);
};

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
  const [manageMode, setManageMode] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProductCatalogDTO | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewing, setViewing] = useState<ProductCatalogDTO | null>(null);

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
      // Se for PDF e não houver capa manual, gera a capa da primeira página automaticamente
      let finalCapa = capa;
      if (file.type === "application/pdf" && !capa) {
        try {
          const generated = await generateCapaFromPdf(file);
          if (generated) {
            finalCapa = generated;
          }
        } catch (err) {
          console.error("Falha ao gerar capa automática do PDF:", err);
        }
      }

      // 1. Upload do PDF/Imagem do catálogo direto do navegador para o Vercel Blob
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/produtos/catalogos/upload",
      });

      // 2. Upload da capa do catálogo (se houver)
      let capaUrl = null;
      if (finalCapa) {
        const capaBlob = await upload(finalCapa.name, finalCapa, {
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
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Biblioteca de Catálogos</h1>
            <InfoTooltip label="Sobre Catálogos">
              <TooltipBody
                title="Catálogos para clientes"
                items={[
                  "Guarde PDFs e imagens de catálogos de marcas e linhas.",
                  "A grade mostra só a capa — clique para abrir o arquivo.",
                  "Em PDF, a primeira página vira capa automaticamente se você não enviar uma.",
                ]}
              />
            </InfoTooltip>
          </div>
          <ProdutosSectionTabs />
          <p className="text-sm text-slate-500">
            Acesse, visualize e compartilhe catálogos de fornecedores, materiais e folders inspiracionais.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <Button
            type="button"
            variant={manageMode ? "default" : "outline"}
            onClick={() => setManageMode((v) => !v)}
            className={`font-bold gap-1.5 rounded-xl w-full sm:w-auto ${
              manageMode ? "btn-metallic" : ""
            }`}
          >
            <Settings2 className="h-4 w-4" />
            {manageMode ? "Edição ativa" : "Habilitar edição"}
          </Button>
          <Button onClick={openCreate} className="font-bold btn-metallic gap-1.5 w-full sm:w-auto rounded-xl">
            <Plus className="h-4.5 w-4.5" /> Novo catálogo
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          className="pl-9 bg-white rounded-xl"
          placeholder="Buscar por título, marca ou arquivo…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center text-sm text-muted-foreground rounded-2xl border-dashed">
          <BookOpen className="h-10 w-10 mx-auto mb-3 text-slate-300" />
          Nenhum catálogo ainda. Adicione o primeiro PDF ou imagem.
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
          {filtered.map((catalog) => {
            const isPdf = catalog.mime_type === "application/pdf";
            const thumb = catalog.capa_url || (!isPdf ? catalog.arquivo_url : null);
            return (
              <div key={catalog.id} className="relative group">
                <button
                  type="button"
                  onClick={() => {
                    if (manageMode) return;
                    setViewing(catalog);
                  }}
                  className={`w-full aspect-[3/4] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 relative shadow-sm transition-all duration-300 ${
                    manageMode
                      ? "cursor-default"
                      : "cursor-pointer hover:-translate-y-1 hover:shadow-lg hover:border-slate-300"
                  }`}
                  aria-label={`Abrir catálogo ${catalog.titulo}`}
                >
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    />
                  ) : (
                    <span className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                      <FileText className="h-10 w-10 text-rose-400" />
                    </span>
                  )}
                  <span className="absolute inset-y-0 left-0 w-2 bg-linear-to-r from-black/25 via-black/5 to-transparent pointer-events-none" />
                </button>

                {manageMode ? (
                  <div className="absolute top-2 right-2 z-10 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEdit(catalog)}
                      className="h-8 w-8 rounded-lg inline-flex items-center justify-center bg-white/95 border border-slate-200 text-slate-700 shadow-sm hover:bg-white"
                      title="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(catalog)}
                      className="h-8 w-8 rounded-lg inline-flex items-center justify-center bg-white/95 border border-slate-200 text-rose-600 shadow-sm hover:bg-rose-50"
                      title="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : null}
              </div>
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
                  Em PDF, a 1ª página vira capa automaticamente se você não enviar uma.
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

      <Dialog
        isOpen={viewing !== null}
        onClose={() => setViewing(null)}
        className="max-w-6xl w-full h-[min(92svh,920px)] max-h-[92svh]"
        bodyClassName="!p-0 !overflow-hidden flex flex-col min-h-0"
      >
        {viewing ? (
          <>
            <div className="shrink-0 px-5 py-3.5 pr-12 border-b border-slate-100 bg-white">
              <h3 className="text-sm font-bold text-slate-800 tracking-tight truncate">
                {viewing.titulo}
              </h3>
              {viewing.marca ? (
                <p className="text-[10px] text-slate-500 mt-0.5 font-semibold uppercase tracking-wider truncate">
                  {viewing.marca}
                </p>
              ) : null}
            </div>
            <div className="flex-1 min-h-0 relative bg-slate-900">
              {viewing.mime_type === "application/pdf" ? (
                <iframe
                  src={`${viewing.arquivo_url}#toolbar=1&navpanes=0`}
                  className="absolute inset-0 w-full h-full border-0"
                  title={viewing.titulo}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={viewing.arquivo_url}
                  alt={viewing.titulo}
                  className="absolute inset-0 w-full h-full object-contain"
                />
              )}
            </div>
          </>
        ) : null}
      </Dialog>
    </div>
  );
}
