"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import {
  updateProductCatalog,
  type ProductCatalogDTO,
} from "@/app/actions/productCatalogs";
import { generateCapaFromPdfFile } from "@/lib/pdfCover";
import {
  formatCatalogSize,
  PRODUCT_CATALOG_MAX_BYTES,
} from "@/lib/productCatalogs";
import { ActionDialogHost, useActionDialog } from "@/components/ActionDialogHost";
import CatalogCoverThumb from "@/components/produtos/CatalogCoverThumb";
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
  Image as ImageIcon,
  Loader2,
  Maximize2,
  Minimize2,
  Pencil,
  Search,
  Settings2,
  ArrowLeft,
  Building2,
  ExternalLink,
} from "lucide-react";

/** Zen (e outros hosts) servem PDF como attachment/octet-stream — o iframe fica em branco. */
function isHostedPdf(url: string): boolean {
  return url.includes("blob.vercel-storage.com");
}

function pdfViewerSrc(url: string): string {
  if (isHostedPdf(url)) return `${url}#toolbar=1&navpanes=0`;
  // Viewer público que busca o arquivo no servidor (contorna Content-Disposition: attachment)
  return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`;
}

const CATALOG_MAX_SIZE_LABEL = formatCatalogSize(PRODUCT_CATALOG_MAX_BYTES);

function describeCatalogUploadError(error: unknown, status?: number): string {
  const rawMessage =
    error instanceof Error
      ? error.message.trim()
      : typeof error === "string"
        ? error.trim()
        : "";
  const normalized = rawMessage.toLowerCase();

  if (
    normalized.includes("too large") ||
    normalized.includes("larger than") ||
    normalized.includes("exceed") ||
    normalized.includes("maximum size") ||
    normalized.includes("size limit") ||
    normalized.includes("413")
  ) {
    return "O arquivo é muito grande.";
  }
  if (
    normalized.includes("content type") ||
    normalized.includes("mime") ||
    normalized.includes("unsupported") ||
    normalized.includes("not allowed")
  ) {
    return "O formato do arquivo não é aceito. Use PDF, JPG, PNG ou WEBP.";
  }
  if (
    normalized.includes("unauth") ||
    normalized.includes("forbidden") ||
    normalized.includes("401") ||
    normalized.includes("403")
  ) {
    return "Sua sessão expirou ou não possui permissão para enviar catálogos. Entre novamente e tente de novo.";
  }
  if (
    normalized.includes("network") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("offline")
  ) {
    return "A conexão foi interrompida durante o envio. Verifique sua internet e tente novamente.";
  }
  if (
    normalized.includes("administrador") ||
    normalized.includes("banco") ||
    normalized.includes("database") ||
    normalized.includes("prisma") ||
    normalized.includes("postgres") ||
    normalized.includes("neon")
  ) {
    return "Não foi possível concluir o cadastro. Entre em contato com o Administrador do Sistema.";
  }
  if (status === 400) {
    return "Não foi possível concluir o cadastro. Confira os dados e tente novamente.";
  }
  return "Não foi possível concluir o cadastro. Entre em contato com o Administrador do Sistema.";
}

type SupplierOption = {
  id: string;
  nome: string;
  nomeFantasia: string | null;
  logoUrl: string | null;
};

const NONE_SUPPLIER_ID = "__none__";

interface CatalogosClientProps {
  companyId: string;
  initialCatalogs: ProductCatalogDTO[];
  suppliers?: SupplierOption[];
}

function acabamentosFromDescricao(descricao: string | null): string | null {
  if (!descricao) return null;
  const m = descricao.match(/^Acabamentos:\s*(.+)$/m);
  return m?.[1]?.trim() || null;
}

export default function CatalogosClient({
  companyId,
  initialCatalogs,
  suppliers = [],
}: CatalogosClientProps) {
  const dialog = useActionDialog();
  const { showSuccess, showError, confirmAction } = dialog;

  const [catalogs, setCatalogs] = useState(initialCatalogs);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMarca, setFilterMarca] = useState("ALL");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [manageMode, setManageMode] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProductCatalogDTO | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewing, setViewing] = useState<ProductCatalogDTO | null>(null);
  const [viewFullscreen, setViewFullscreen] = useState(false);
  const [rehostingPdf, setRehostingPdf] = useState(false);

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [marca, setMarca] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [capa, setCapa] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const capaRef = useRef<HTMLInputElement>(null);

  const supplierById = useMemo(() => {
    const map = new Map<string, SupplierOption>();
    suppliers.forEach((s) => map.set(s.id, s));
    return map;
  }, [suppliers]);

  const supplierTiles = useMemo(() => {
    const counts = new Map<string, number>();
    let orphans = 0;
    for (const c of catalogs) {
      if (c.supplier_id) counts.set(c.supplier_id, (counts.get(c.supplier_id) || 0) + 1);
      else orphans += 1;
    }
    const tiles: { id: string; nome: string; logoUrl: string | null; count: number }[] = [];
    for (const [id, count] of counts) {
      const s = supplierById.get(id);
      tiles.push({
        id,
        nome:
          s?.nomeFantasia ||
          s?.nome ||
          catalogs.find((c) => c.supplier_id === id)?.supplierNome ||
          "Fornecedor",
        logoUrl:
          s?.logoUrl ||
          catalogs.find((c) => c.supplier_id === id)?.supplierLogoUrl ||
          null,
        count,
      });
    }
    tiles.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    if (orphans > 0) {
      tiles.push({ id: NONE_SUPPLIER_ID, nome: "Sem fornecedor", logoUrl: null, count: orphans });
    }
    return tiles;
  }, [catalogs, supplierById]);

  const showingSuppliers = !manageMode && selectedSupplierId == null;

  const scopeCatalogs = useMemo(() => {
    if (manageMode || selectedSupplierId == null) return catalogs;
    if (selectedSupplierId === NONE_SUPPLIER_ID) {
      return catalogs.filter((c) => !c.supplier_id);
    }
    return catalogs.filter((c) => c.supplier_id === selectedSupplierId);
  }, [catalogs, manageMode, selectedSupplierId]);

  const marcas = useMemo(() => {
    const set = new Set<string>();
    scopeCatalogs.forEach((c) => {
      if (c.marca?.trim()) set.add(c.marca.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [scopeCatalogs]);

  const handleCapaSaved = useCallback((catalogId: string, capaUrl: string) => {
    setCatalogs((prev) =>
      prev.map((c) => (c.id === catalogId ? { ...c, capa_url: capaUrl } : c))
    );
  }, []);

  // PDFs externos (Zen etc.) vêm com Content-Disposition: attachment — iframe fica vazio.
  // Na 1ª abertura, rehospeda no Blob da Vercel com application/pdf.
  useEffect(() => {
    if (!viewing) return;
    if (viewing.mime_type !== "application/pdf") return;
    if (isHostedPdf(viewing.arquivo_url)) return;

    let cancelled = false;
    setRehostingPdf(true);

    void (async () => {
      try {
        const res = await fetch("/api/produtos/catalogos/rehost", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: viewing.id }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.success || !data.arquivo_url) {
          console.warn("Rehost PDF falhou:", data.error);
          return;
        }
        const nextUrl = data.arquivo_url as string;
        setCatalogs((prev) =>
          prev.map((c) =>
            c.id === viewing.id ? { ...c, arquivo_url: nextUrl, mime_type: "application/pdf" } : c
          )
        );
        setViewing((prev) =>
          prev && prev.id === viewing.id
            ? { ...prev, arquivo_url: nextUrl, mime_type: "application/pdf" }
            : prev
        );
      } catch (err) {
        console.error("Rehost PDF:", err);
      } finally {
        if (!cancelled) setRehostingPdf(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [viewing?.id, viewing?.arquivo_url, viewing?.mime_type]);

  const filtered = scopeCatalogs.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      c.titulo.toLowerCase().includes(q) ||
      (c.marca || "").toLowerCase().includes(q) ||
      (c.descricao || "").toLowerCase().includes(q) ||
      (c.supplierNome || "").toLowerCase().includes(q) ||
      c.arquivo_nome.toLowerCase().includes(q);
    const matchesMarca = filterMarca === "ALL" || c.marca === filterMarca;
    return matchesSearch && matchesMarca;
  });

  const selectedSupplierLabel = useMemo(() => {
    if (!selectedSupplierId || selectedSupplierId === NONE_SUPPLIER_ID) {
      return selectedSupplierId === NONE_SUPPLIER_ID ? "Sem fornecedor" : null;
    }
    return supplierTiles.find((t) => t.id === selectedSupplierId)?.nome || null;
  }, [selectedSupplierId, supplierTiles]);

  const resetForm = () => {
    setEditing(null);
    setTitulo("");
    setDescricao("");
    setMarca("");
    setSupplierId(
      selectedSupplierId && selectedSupplierId !== NONE_SUPPLIER_ID ? selectedSupplierId : ""
    );
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
    setSupplierId(catalog.supplier_id || "");
    setFile(null);
    setCapa(null);
    setModalOpen(true);
  };

  const selectCatalogFile = (selected: File | null) => {
    if (selected && selected.size > PRODUCT_CATALOG_MAX_BYTES) {
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      showError(
        "Arquivo muito grande",
        "O arquivo selecionado é muito grande."
      );
      return;
    }
    setFile(selected);
  };

  const selectCoverFile = (selected: File | null) => {
    if (selected && selected.size > PRODUCT_CATALOG_MAX_BYTES) {
      setCapa(null);
      if (capaRef.current) capaRef.current.value = "";
      showError(
        "Capa muito grande",
        "A imagem de capa selecionada é muito grande."
      );
      return;
    }
    setCapa(selected);
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
          supplier_id: supplierId.trim() || null,
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
    if (file.size > PRODUCT_CATALOG_MAX_BYTES) {
      showError(
        "Arquivo muito grande",
        "O arquivo selecionado é muito grande."
      );
      return;
    }
    if (capa && capa.size > PRODUCT_CATALOG_MAX_BYTES) {
      showError(
        "Capa muito grande",
        "A imagem de capa selecionada é muito grande."
      );
      return;
    }

    setUploading(true);
    try {
      // Se for PDF e não houver capa manual, gera a capa da primeira página automaticamente
      let finalCapa = capa;
      if (file.type === "application/pdf" && !capa) {
        try {
          const generated = await generateCapaFromPdfFile(file);
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
        supplierId: supplierId.trim() || null,
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

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success || !data?.catalog) {
        showError(
          "Não foi possível adicionar",
          describeCatalogUploadError(data?.error, res.status)
        );
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
      showError(
        "Não foi possível enviar",
        describeCatalogUploadError(err)
      );
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
            {showingSuppliers
              ? "Escolha o fornecedor para ver os catálogos e fichas técnicas."
              : selectedSupplierLabel
                ? `Catálogos de ${selectedSupplierLabel}.`
                : "Acesse, visualize e compartilhe catálogos de fornecedores, materiais e folders inspiracionais."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <Button
            type="button"
            variant={manageMode ? "default" : "outline"}
            onClick={() => {
              setManageMode((v) => {
                const next = !v;
                if (next) setSelectedSupplierId(null);
                return next;
              });
            }}
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

      {showingSuppliers ? (
        supplierTiles.length === 0 ? (
          <Card className="p-12 text-center text-sm text-muted-foreground rounded-2xl border-dashed">
            <BookOpen className="h-10 w-10 mx-auto mb-3 text-slate-300" />
            Nenhum catálogo ainda. Adicione o primeiro PDF ou imagem.
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {supplierTiles.map((tile) => (
              <button
                key={tile.id}
                type="button"
                onClick={() => {
                  setSelectedSupplierId(tile.id);
                  setFilterMarca("ALL");
                  setSearchQuery("");
                }}
                className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300 transition-all"
              >
                <div className="aspect-[4/3] rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden mb-3">
                  {tile.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={tile.logoUrl}
                      alt={tile.nome}
                      className="max-h-full max-w-full object-contain p-3"
                    />
                  ) : (
                    <Building2 className="h-10 w-10 text-slate-300" />
                  )}
                </div>
                <p className="text-sm font-bold text-slate-800 truncate">{tile.nome}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {tile.count} {tile.count === 1 ? "item" : "itens"}
                </p>
              </button>
            ))}
          </div>
        )
      ) : (
        <>
          <div className="space-y-3">
            {!manageMode && selectedSupplierId != null ? (
              <Button
                type="button"
                variant="outline"
                className="font-bold gap-1.5 rounded-xl"
                onClick={() => {
                  setSelectedSupplierId(null);
                  setFilterMarca("ALL");
                  setSearchQuery("");
                }}
              >
                <ArrowLeft className="h-4 w-4" /> Fornecedores
              </Button>
            ) : null}

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  className="pl-9 bg-white rounded-xl"
                  placeholder="Buscar por título, categoria ou acabamento…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {marcas.length > 0 ? (
                <select
                  value={filterMarca}
                  onChange={(e) => setFilterMarca(e.target.value)}
                  className="h-10 rounded-xl border border-input bg-white px-3 text-sm"
                >
                  <option value="ALL">Todas as categorias</option>
                  {marcas.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
          </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center text-sm text-muted-foreground rounded-2xl border-dashed">
          <BookOpen className="h-10 w-10 mx-auto mb-3 text-slate-300" />
          Nenhum catálogo encontrado.
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
          {filtered.map((catalog) => (
            <div key={catalog.id} className="relative group">
              <button
                type="button"
                onClick={() => {
                  if (manageMode) return;
                  setViewing(catalog);
                }}
                className={`w-full text-left ${
                  manageMode ? "cursor-default" : "cursor-pointer"
                }`}
                aria-label={`Abrir catálogo ${catalog.titulo}`}
              >
                <div
                  className={`aspect-[3/4] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 relative shadow-sm transition-all duration-300 ${
                    manageMode
                      ? ""
                      : "group-hover:-translate-y-1 group-hover:shadow-lg group-hover:border-slate-300"
                  }`}
                >
                  <CatalogCoverThumb
                    catalog={catalog}
                    companyId={companyId}
                    onCapaSaved={handleCapaSaved}
                    className="group-hover:scale-[1.03] transition-transform duration-500"
                  />
                  <span className="absolute inset-y-0 left-0 w-2 bg-linear-to-r from-black/25 via-black/5 to-transparent pointer-events-none" />
                </div>
                <div className="mt-2 px-0.5">
                  <p className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug">
                    {catalog.titulo}
                  </p>
                  {catalog.marca ? (
                    <p className="text-[10px] text-slate-500 mt-0.5 font-semibold uppercase tracking-wider truncate">
                      {catalog.marca}
                    </p>
                  ) : null}
                </div>
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
          ))}
        </div>
      )}
        </>
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
            <label className="text-xs font-semibold text-slate-600">Categoria / linha</label>
            <Input
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              placeholder="Ex.: Puxadores, Banho…"
            />
          </div>

          {suppliers.length > 0 ? (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Fornecedor</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Sem fornecedor</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nomeFantasia || s.nome}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Descrição</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Acabamentos, observações…"
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
                  onChange={(e) => selectCatalogFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold"
                />
                <p className="text-[11px] text-muted-foreground">
                  Tamanho máximo: {CATALOG_MAX_SIZE_LABEL}. Formatos aceitos: PDF, JPG, PNG e WEBP.
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Capa (opcional)</label>
                <input
                  ref={capaRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => selectCoverFile(e.target.files?.[0] || null)}
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
        onClose={() => {
          setViewing(null);
          setViewFullscreen(false);
        }}
        fullscreen={viewFullscreen}
        className={
          viewFullscreen
            ? "bg-white"
            : "max-w-[min(96vw,1400px)] w-full h-[min(96svh,1100px)] max-h-[96svh] bg-white"
        }
        bodyClassName="!p-0 !overflow-hidden flex flex-col min-h-0 h-full"
      >
        {viewing ? (
          <>
            <div className="shrink-0 flex items-center gap-3 px-5 py-3.5 pr-14 border-b border-slate-100 bg-white">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-slate-800 tracking-tight truncate">
                  {viewing.titulo}
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5 font-semibold uppercase tracking-wider truncate">
                  {[viewing.marca, viewing.supplierNome].filter(Boolean).join(" · ")}
                </p>
                {acabamentosFromDescricao(viewing.descricao) ? (
                  <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                    Acabamentos: {acabamentosFromDescricao(viewing.descricao)}
                  </p>
                ) : null}
              </div>
              {viewing.mime_type === "application/pdf" ? (
                <a
                  href={viewing.arquivo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 h-8 px-2.5 inline-flex items-center justify-center gap-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors text-[11px] font-semibold"
                  title="Abrir PDF em nova aba"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Abrir PDF
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => setViewFullscreen((v) => !v)}
                className="shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
                title={viewFullscreen ? "Sair da tela cheia" : "Tela cheia"}
                aria-label={viewFullscreen ? "Sair da tela cheia" : "Tela cheia"}
              >
                {viewFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </button>
            </div>
            <div className="flex-1 min-h-0 relative bg-slate-900">
              {viewing.mime_type === "application/pdf" ? (
                <>
                  {rehostingPdf && !isHostedPdf(viewing.arquivo_url) ? (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-900/90 text-slate-200">
                      <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                      <p className="text-sm font-medium">Preparando PDF para visualização…</p>
                      <p className="text-xs text-slate-400 max-w-sm text-center px-4">
                        O arquivo original força download; estamos copiando para o armazenamento interno.
                      </p>
                    </div>
                  ) : null}
                  <iframe
                    src={pdfViewerSrc(viewing.arquivo_url)}
                    className="absolute inset-0 w-full h-full border-0"
                    title={viewing.titulo}
                  />
                </>
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
