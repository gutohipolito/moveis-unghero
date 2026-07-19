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
  X,
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
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProductCatalogDTO | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewingCatalogUrl, setViewingCatalogUrl] = useState<string | null>(null);
  const [viewingCatalogTitle, setViewingCatalogTitle] = useState<string>("");

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
                  "Use na conversa comercial para apresentar opções de acabamentos.",
                  "A capa é opcional; em imagens, a própria foto vira capa.",
                ]}
              />
            </InfoTooltip>
          </div>
          <ProdutosSectionTabs />
          <p className="text-sm text-slate-500">
            Acesse, visualize e compartilhe catálogos de fornecedores, materiais e folders inspiracionais.
          </p>
        </div>

        <Button onClick={openCreate} className="font-bold btn-metallic gap-1.5 w-full md:w-auto rounded-xl">
          <Plus className="h-4.5 w-4.5" /> Novo catálogo
        </Button>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 md:gap-6">
          {filtered.map((catalog) => {
            const isPdf = catalog.mime_type === "application/pdf";
            const thumb = catalog.capa_url || (!isPdf ? catalog.arquivo_url : null);
            return (
              <Card
                key={catalog.id}
                className="overflow-hidden flex flex-col border border-slate-200/70 hover:border-slate-300 hover:-translate-y-1.5 hover:shadow-lg transition-all duration-300 rounded-2xl bg-white group"
              >
                {/* Visualizador de Capa em Proporção Retrato (Estilo Catálogo/Revista Física) */}
                <div className="aspect-[3/4] bg-slate-50 relative overflow-hidden border-b border-slate-100 flex items-center justify-center select-none">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt={catalog.titulo}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-linear-to-br from-slate-800 to-slate-950 flex flex-col items-center justify-center p-4 text-center">
                      <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md mb-2">
                        <FileText className="h-7 w-7 text-rose-500" />
                      </div>
                      <span className="text-[11px] font-black tracking-widest text-slate-350 uppercase">
                        {catalog.marca || "Catálogo"}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1 font-medium line-clamp-2 px-2">
                        {catalog.titulo}
                      </span>
                    </div>
                  )}

                  {/* Efeito 3D de Lombada de Livro/Revista no lado esquerdo */}
                  <div className="absolute top-0 bottom-0 left-0 w-2.5 bg-linear-to-r from-black/20 via-black/5 to-transparent z-10" />

                  {/* Badge de Formato no Topo Direito */}
                  <span className={`absolute top-3 right-3 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md text-white shadow-xs z-10 ${
                    isPdf ? "bg-rose-600/90" : "bg-cyan-600/90"
                  }`}>
                    {isPdf ? "PDF" : "Imagem"}
                  </span>
                </div>

                <div className="p-4 flex-1 flex flex-col gap-2">
                  <div className="space-y-1">
                    {catalog.marca ? (
                      <span className="inline-block text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/50">
                        {catalog.marca}
                      </span>
                    ) : null}
                    <h3 className="font-extrabold text-slate-800 leading-snug line-clamp-2 group-hover:text-primary transition-colors text-sm">
                      {catalog.titulo}
                    </h3>
                  </div>

                  {catalog.descricao && (
                    <p className="text-xs text-slate-450 line-clamp-2 leading-relaxed font-medium">
                      {catalog.descricao}
                    </p>
                  )}

                  <div className="mt-auto space-y-3 pt-2">
                    {/* Metadados de Arquivo */}
                    <div className="text-[10px] font-bold text-slate-400 flex items-center justify-between border-t border-slate-100 pt-2 flex-wrap gap-1">
                      <span className="truncate max-w-[80px] font-mono" title={catalog.arquivo_nome}>
                        {catalog.arquivo_nome.slice(-15)}
                      </span>
                      <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[9px] shrink-0">
                        {formatCatalogSize(catalog.size_bytes)}
                      </span>
                    </div>

                    {/* Ações (Ajustado para evitar hydration mismatch de botão em tag A) */}
                    <div className="flex gap-1.5 items-center w-full">
                      <button
                        type="button"
                        onClick={() => {
                          setViewingCatalogUrl(catalog.arquivo_url);
                          setViewingCatalogTitle(catalog.titulo);
                        }}
                        className="flex-1 h-9 rounded-xl inline-flex items-center justify-center gap-1.5 text-xs font-extrabold transition-all border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs cursor-pointer"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                        Visualizar
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(catalog)}
                        className="h-9 w-9 shrink-0 rounded-xl inline-flex items-center justify-center border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-all cursor-pointer shadow-xs"
                        title="Editar dados"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(catalog)}
                        className="h-9 w-9 shrink-0 rounded-xl inline-flex items-center justify-center border border-slate-200 bg-white hover:bg-rose-50 text-slate-550 hover:text-rose-600 transition-all cursor-pointer shadow-xs"
                        title="Excluir"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
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

      {/* Dialog de Visualização em Modal do PDF/Catálogo */}
      <Dialog
        isOpen={viewingCatalogUrl !== null}
        onClose={() => setViewingCatalogUrl(null)}
        className="max-w-6xl w-full h-[90vh] flex flex-col p-0"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0 bg-white rounded-t-2xl">
          <div>
            <h3 className="text-base font-black text-slate-800 tracking-tight leading-none">
              {viewingCatalogTitle}
            </h3>
            <p className="text-[10px] text-slate-450 mt-1.5 font-bold uppercase tracking-wider">Visualização Interna</p>
          </div>
          <button
            onClick={() => setViewingCatalogUrl(null)}
            className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="flex-1 bg-slate-900 overflow-hidden relative min-h-[500px] rounded-b-2xl">
          {viewingCatalogUrl && (
            <iframe
              src={`${viewingCatalogUrl}#toolbar=1`}
              className="w-full h-full border-0 absolute inset-0"
              title={viewingCatalogTitle}
            />
          )}
        </div>
      </Dialog>
    </div>
  );
}
