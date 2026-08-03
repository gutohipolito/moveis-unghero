"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
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
import { resolveCatalogPublicUrl } from "@/lib/catalogShare";
import { ActionDialogHost, useActionDialog } from "@/components/ActionDialogHost";
import { usePermissions } from "@/context/PermissionsContext";
import { canManageProducts as canManageProductsRole } from "@/lib/permissions";
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
  Pencil,
  Search,
  Settings2,
  ArrowLeft,
  Building2,
  FolderUp,
} from "lucide-react";

const CATALOG_MAX_SIZE_LABEL = formatCatalogSize(PRODUCT_CATALOG_MAX_BYTES);
const CATALOG_ACCEPT =
  "application/pdf,image/jpeg,image/png,image/webp,image/jpg";

function isAllowedCatalogFile(file: File): boolean {
  const t = (file.type || "").toLowerCase();
  if (
    t === "application/pdf" ||
    t === "image/jpeg" ||
    t === "image/png" ||
    t === "image/webp" ||
    t === "image/jpg"
  ) {
    return true;
  }
  return /\.(pdf|jpe?g|png|webp)$/i.test(file.name);
}

function titleFromFilename(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return base || name;
}

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

export default function CatalogosClient({
  companyId,
  initialCatalogs,
  suppliers = [],
}: CatalogosClientProps) {
  const dialog = useActionDialog();
  const { showSuccess, showError, confirmAction } = dialog;
  const { role, isReadOnly, isAdmin } = usePermissions();
  const canManageCatalogs = canManageProductsRole(role);

  const [catalogs, setCatalogs] = useState(initialCatalogs);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMarca, setFilterMarca] = useState("ALL");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [manageMode, setManageMode] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProductCatalogDTO | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [marca, setMarca] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [capa, setCapa] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const capaRef = useRef<HTMLInputElement>(null);
  const bulkFileRef = useRef<HTMLInputElement>(null);
  const bulkCancelRef = useRef(false);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [bulkSupplierId, setBulkSupplierId] = useState("");
  const [bulkMarca, setBulkMarca] = useState("");
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{
    current: number;
    total: number;
    name: string;
  } | null>(null);
  const [bulkLog, setBulkLog] = useState<string[]>([]);

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

  const openCatalog = (catalog: ProductCatalogDTO) => {
    // Preferir o arquivo completo (PDF) — o link curto também aponta para o visualizador.
    const url =
      catalog.arquivo_url ||
      catalog.public_url ||
      resolveCatalogPublicUrl(catalog.share_code);
    if (!url) {
      showError(
        "Link indisponível",
        "Este catálogo ainda não possui um link público. Entre em contato com o Administrador do Sistema."
      );
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

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

  const createCatalogFromFile = async (
    file: File,
    opts: {
      titulo?: string;
      marca?: string | null;
      supplierId?: string | null;
      descricao?: string | null;
      capa?: File | null;
    }
  ): Promise<ProductCatalogDTO> => {
    if (file.size > PRODUCT_CATALOG_MAX_BYTES) {
      throw new Error(`Arquivo muito grande (máx. ${CATALOG_MAX_SIZE_LABEL}).`);
    }
    if (!isAllowedCatalogFile(file)) {
      throw new Error("Formato não aceito. Use PDF, JPG, PNG ou WEBP.");
    }
    if (opts.capa && opts.capa.size > PRODUCT_CATALOG_MAX_BYTES) {
      throw new Error("A imagem de capa selecionada é muito grande.");
    }

    let finalCapa: File | null = opts.capa || null;
    const isPdf =
      file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (!finalCapa && isPdf) {
      try {
        finalCapa = await generateCapaFromPdfFile(file);
      } catch (err) {
        console.error("Falha ao gerar capa automática do PDF:", err);
      }
    }

    const blob = await upload(file.name, file, {
      access: "public",
      handleUploadUrl: "/api/produtos/catalogos/upload",
    });

    let capaUrl: string | null = null;
    if (finalCapa) {
      const capaBlob = await upload(finalCapa.name, finalCapa, {
        access: "public",
        handleUploadUrl: "/api/produtos/catalogos/upload",
      });
      capaUrl = capaBlob.url;
    }

    const mimeType =
      file.type ||
      (isPdf
        ? "application/pdf"
        : /\.png$/i.test(file.name)
          ? "image/png"
          : /\.webp$/i.test(file.name)
            ? "image/webp"
            : "image/jpeg");

    const payload = {
      titulo: (opts.titulo || titleFromFilename(file.name)).trim() || file.name,
      descricao: opts.descricao?.trim() || null,
      marca: opts.marca?.trim() || null,
      supplierId: opts.supplierId?.trim() || null,
      arquivoUrl: blob.url,
      arquivoNome: file.name,
      mimeType,
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
      throw new Error(describeCatalogUploadError(data?.error, res.status));
    }
    return data.catalog as ProductCatalogDTO;
  };

  const openBulk = () => {
    bulkCancelRef.current = false;
    setBulkFiles([]);
    setBulkLog([]);
    setBulkProgress(null);
    setBulkMarca("");
    setBulkSupplierId(
      selectedSupplierId && selectedSupplierId !== NONE_SUPPLIER_ID
        ? selectedSupplierId
        : ""
    );
    if (bulkFileRef.current) bulkFileRef.current.value = "";
    setBulkOpen(true);
  };

  const selectBulkFiles = (list: FileList | null) => {
    if (!list?.length) {
      setBulkFiles([]);
      return;
    }
    const accepted: File[] = [];
    const rejected: string[] = [];
    for (const f of Array.from(list)) {
      if (!isAllowedCatalogFile(f)) {
        rejected.push(`${f.name}: formato inválido`);
        continue;
      }
      if (f.size > PRODUCT_CATALOG_MAX_BYTES) {
        rejected.push(`${f.name}: acima de ${CATALOG_MAX_SIZE_LABEL}`);
        continue;
      }
      accepted.push(f);
    }
    setBulkFiles(accepted);
    setBulkLog(rejected.length ? rejected.slice(0, 12) : []);
    if (rejected.length > 12) {
      setBulkLog((prev) => [...prev, `… e mais ${rejected.length - 12} ignorados`]);
    }
  };

  const runBulkImport = async () => {
    if (!bulkFiles.length) {
      showError("Sem arquivos", "Selecione um ou mais PDFs/imagens para importar.");
      return;
    }
    bulkCancelRef.current = false;
    setBulkRunning(true);
    setBulkLog([]);
    let ok = 0;
    let fail = 0;
    const created: ProductCatalogDTO[] = [];
    const errors: string[] = [];

    try {
      for (let i = 0; i < bulkFiles.length; i++) {
        if (bulkCancelRef.current) break;
        const file = bulkFiles[i];
        setBulkProgress({
          current: i + 1,
          total: bulkFiles.length,
          name: file.name,
        });
        try {
          const catalog = await createCatalogFromFile(file, {
            marca: bulkMarca || null,
            supplierId: bulkSupplierId || null,
          });
          created.push(catalog);
          ok += 1;
        } catch (err) {
          fail += 1;
          errors.push(
            `${file.name}: ${err instanceof Error ? err.message : "falha no envio"}`
          );
        }
      }

      if (created.length) {
        setCatalogs((prev) =>
          [...prev, ...created].sort((a, b) =>
            a.titulo.localeCompare(b.titulo, "pt-BR")
          )
        );
      }

      if (bulkCancelRef.current) {
        showError(
          "Importação interrompida",
          `${ok} enviado(s), ${fail} com erro. O restante foi cancelado.`
        );
      } else if (fail === 0) {
        showSuccess(
          "Importação concluída",
          `${ok} catálogo(s) adicionados à biblioteca.`
        );
        setBulkOpen(false);
      } else {
        showSuccess(
          "Importação parcial",
          `${ok} ok, ${fail} com erro. Veja o log no diálogo.`
        );
      }
      setBulkLog(errors);
    } finally {
      setBulkRunning(false);
      setBulkProgress(null);
    }
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

    setUploading(true);
    try {
      const catalog = await createCatalogFromFile(file, {
        titulo: titulo.trim() || undefined,
        descricao: descricao.trim() || null,
        marca: marca.trim() || null,
        supplierId: supplierId.trim() || null,
        capa,
      });
      setCatalogs((prev) =>
        [...prev, catalog].sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"))
      );
      showSuccess("Catálogo adicionado", "Disponível para uso com os clientes.");
      setModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      showError(
        "Não foi possível enviar",
        err instanceof Error ? err.message : describeCatalogUploadError(err)
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
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Biblioteca de Catálogos</h1>
              <InfoTooltip label="Sobre Catálogos">
                <TooltipBody
                  title="Catálogos para clientes"
                  items={[
                    "Guarde PDFs e imagens de catálogos de marcas e linhas.",
                    "A grade mostra só a capa — o clique abre o arquivo em uma nova aba.",
                    "Em PDF, a primeira página vira capa automaticamente se você não enviar uma.",
                  ]}
                />
              </InfoTooltip>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {showingSuppliers
                ? "Escolha o fornecedor para ver os catálogos e fichas técnicas."
                : selectedSupplierLabel
                  ? `Catálogos de ${selectedSupplierLabel}.`
                  : "Acesse, visualize e compartilhe catálogos de fornecedores, materiais e folders inspiracionais."}
            </p>
          </div>
          <ProdutosSectionTabs />
        </div>

        {canManageCatalogs ? (
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
            className={`font-bold gap-1.5 w-full sm:w-auto ${
              manageMode ? "btn-metallic" : ""
            }`}
          >
            <Settings2 className="h-4 w-4" />
            {manageMode ? "Edição ativa" : "Habilitar edição"}
          </Button>
          {isAdmin ? (
            <Button
              type="button"
              variant="outline"
              onClick={openBulk}
              className="font-bold gap-1.5 w-full sm:w-auto"
              disabled={bulkRunning}
            >
              <FolderUp className="h-4 w-4" />
              Importar em lote
            </Button>
          ) : null}
          <Button onClick={openCreate} className="font-bold btn-metallic gap-1.5 w-full sm:w-auto">
            <Plus className="h-4.5 w-4.5" /> Novo catálogo
          </Button>
        </div>
        ) : null}
      </div>

      {showingSuppliers ? (
        supplierTiles.length === 0 ? (
          <Card className="p-12 text-center text-sm text-muted-foreground border-dashed">
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
                className="group rounded-[var(--radius-md)] border border-slate-200 bg-white p-5 text-left shadow-sm hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300 transition-all"
              >
                <div className="aspect-[4/3] rounded-[var(--radius-sm)] bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden mb-3">
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
                className="font-bold gap-1.5"
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
                  className="pl-9 bg-white"
                  placeholder="Buscar por título, categoria ou acabamento…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {marcas.length > 0 ? (
                <select
                  value={filterMarca}
                  onChange={(e) => setFilterMarca(e.target.value)}
                  className="h-10 rounded-[var(--radius-sm)] border border-input bg-white px-3 text-sm"
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
        <Card className="p-12 text-center text-sm text-muted-foreground border-dashed">
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
                  openCatalog(catalog);
                }}
                className={`w-full text-left ${
                  manageMode ? "cursor-default" : "cursor-pointer"
                }`}
                aria-label={`Abrir catálogo ${catalog.titulo}`}
              >
                <div
                  className={`aspect-[3/4] rounded-[var(--radius-md)] overflow-hidden bg-slate-100 border border-slate-200/80 relative shadow-sm transition-all duration-300 ${
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

      {isAdmin ? (
        <Dialog
          isOpen={bulkOpen}
          onClose={() => {
            if (bulkRunning) {
              bulkCancelRef.current = true;
              return;
            }
            setBulkOpen(false);
          }}
          className="max-w-lg w-full"
        >
          <div className="space-y-4 pr-2">
            <div>
              <h3 className="text-lg font-bold text-foreground">Importar catálogos em lote</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Somente Diretoria. Selecione vários PDFs/imagens — título vem do nome do arquivo;
                capa da 1ª página em PDFs. Envio um a um para o armazenamento (até{" "}
                {CATALOG_MAX_SIZE_LABEL} cada).
              </p>
            </div>

            {suppliers.length > 0 ? (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Fornecedor</label>
                <select
                  value={bulkSupplierId}
                  onChange={(e) => setBulkSupplierId(e.target.value)}
                  disabled={bulkRunning}
                  className="w-full h-10 rounded-[var(--radius-sm)] border border-input bg-background px-3 text-sm"
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
              <label className="text-xs font-semibold text-slate-600">
                Categoria / linha (opcional, vale para todos)
              </label>
              <Input
                value={bulkMarca}
                onChange={(e) => setBulkMarca(e.target.value)}
                disabled={bulkRunning}
                placeholder="Ex.: Puxadores, Pastas técnicas…"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Arquivos *</label>
              <input
                ref={bulkFileRef}
                type="file"
                multiple
                accept={CATALOG_ACCEPT}
                disabled={bulkRunning}
                onChange={(e) => selectBulkFiles(e.target.files)}
                className="block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold"
              />
              <p className="text-[11px] text-muted-foreground">
                {bulkFiles.length > 0
                  ? `${bulkFiles.length} arquivo(s) prontos para envio.`
                  : "PDF, JPG, PNG ou WEBP. Pode selecionar dezenas de uma vez."}
              </p>
            </div>

            {bulkProgress ? (
              <div className="rounded-[var(--radius-sm)] border border-amber-200 bg-amber-50/80 px-3 py-2.5 space-y-1">
                <p className="text-xs font-bold text-amber-900">
                  Enviando {bulkProgress.current}/{bulkProgress.total}
                </p>
                <p className="text-[11px] text-amber-800/80 truncate">{bulkProgress.name}</p>
                <div className="h-1.5 rounded-full bg-amber-100 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all"
                    style={{
                      width: `${Math.round(
                        (bulkProgress.current / Math.max(bulkProgress.total, 1)) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ) : null}

            {bulkLog.length > 0 ? (
              <div className="max-h-32 overflow-y-auto rounded-[var(--radius-sm)] border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600 space-y-0.5">
                {bulkLog.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (bulkRunning) {
                    bulkCancelRef.current = true;
                    return;
                  }
                  setBulkOpen(false);
                }}
              >
                {bulkRunning ? "Parar após o atual" : "Fechar"}
              </Button>
              <Button
                type="button"
                className="btn-metallic font-bold"
                disabled={bulkRunning || bulkFiles.length === 0}
                onClick={() => void runBulkImport()}
              >
                {bulkRunning ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <FolderUp className="h-4 w-4 mr-1.5" />
                )}
                {bulkRunning ? "Importando…" : `Importar ${bulkFiles.length || ""}`}
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}
