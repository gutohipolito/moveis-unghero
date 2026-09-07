"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Building2,
  Check,
  Copy,
  Download,
  ImageIcon,
  Package,
  Search,
  X,
} from "lucide-react";
import { CartIcon, HighlightAnimatedIcon } from "@/components/icons";
import type {
  PartnerPortalCatalog,
  PartnerPortalData,
  PartnerPortalProduct,
} from "@/lib/partnerPortal";
import { acabamentosToSwatches, parseShowcaseDescricao } from "@/lib/zenAcabamentos";
import ParceiroPortalShell from "@/app/parceiro/ParceiroPortalShell";
import ParceiroFilterPills from "@/app/parceiro/ParceiroFilterPills";
import ParceiroCatalogActionsModal from "./ParceiroCatalogActionsModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Pagination } from "@/components/ui/pagination";

const NONE_SUPPLIER_ID = "__none__";
const PAGE_SIZE_OPTIONS = [12, 24, 36];
const DEFAULT_PAGE_SIZE = 12;

type SectionTab = "produtos" | "catalogos";

interface ParceiroProdutosClientProps {
  partner: PartnerPortalData;
  products: PartnerPortalProduct[];
  catalogs: PartnerPortalCatalog[];
  isAdminPreview?: boolean;
}

function productGallery(product: PartnerPortalProduct) {
  if (product.imagens?.length) return product.imagens;
  return product.imagem_url ? [product.imagem_url] : [];
}

function buildSupplierTiles(
  items: Array<{
    supplier_id: string | null;
    supplierNome: string | null;
    supplierLogoUrl: string | null;
  }>
) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = item.supplier_id || NONE_SUPPLIER_ID;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const tiles: Array<{
    id: string;
    nome: string;
    logoUrl: string | null;
    count: number;
  }> = [];

  for (const [id, count] of counts) {
    if (id === NONE_SUPPLIER_ID) {
      tiles.push({ id, nome: "Sem fornecedor", logoUrl: null, count });
      continue;
    }
    const sample = items.find((p) => p.supplier_id === id);
    tiles.push({
      id,
      nome: sample?.supplierNome || "Fornecedor",
      logoUrl: sample?.supplierLogoUrl || null,
      count,
    });
  }

  return tiles.sort((a, b) => {
    if (a.id === NONE_SUPPLIER_ID) return 1;
    if (b.id === NONE_SUPPLIER_ID) return -1;
    return a.nome.localeCompare(b.nome, "pt-BR");
  });
}

export default function ParceiroProdutosClient({
  partner,
  products,
  catalogs,
  isAdminPreview = false,
}: ParceiroProdutosClientProps) {
  const [section, setSection] = useState<SectionTab>("produtos");
  const [search, setSearch] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [viewingProduct, setViewingProduct] = useState<PartnerPortalProduct | null>(null);
  const [actionCatalog, setActionCatalog] = useState<PartnerPortalCatalog | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [copiedText, setCopiedText] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const switchSection = (next: SectionTab) => {
    setSection(next);
    setSelectedSupplierId(null);
    setSearch("");
    setFilterCategory("ALL");
    setPage(1);
  };

  const productSupplierTiles = useMemo(() => buildSupplierTiles(products), [products]);
  const catalogSupplierTiles = useMemo(() => buildSupplierTiles(catalogs), [catalogs]);
  const supplierTiles = section === "produtos" ? productSupplierTiles : catalogSupplierTiles;
  const showingSuppliers = selectedSupplierId == null;

  const supplierProducts = useMemo(() => {
    if (selectedSupplierId == null) return products;
    if (selectedSupplierId === NONE_SUPPLIER_ID) {
      return products.filter((p) => !p.supplier_id);
    }
    return products.filter((p) => p.supplier_id === selectedSupplierId);
  }, [products, selectedSupplierId]);

  const supplierCatalogs = useMemo(() => {
    if (selectedSupplierId == null) return catalogs;
    if (selectedSupplierId === NONE_SUPPLIER_ID) {
      return catalogs.filter((c) => !c.supplier_id);
    }
    return catalogs.filter((c) => c.supplier_id === selectedSupplierId);
  }, [catalogs, selectedSupplierId]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of supplierProducts) {
      if (p.categoria?.trim()) set.add(p.categoria.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [supplierProducts]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return supplierProducts.filter((p) => {
      const matchesCategory =
        filterCategory === "ALL" || (p.categoria || "").trim() === filterCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        p.nome.toLowerCase().includes(q) ||
        (p.categoria?.toLowerCase().includes(q) ?? false) ||
        (p.descricao?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [supplierProducts, search, filterCategory]);

  const filteredCatalogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return supplierCatalogs;
    return supplierCatalogs.filter(
      (c) =>
        c.titulo.toLowerCase().includes(q) ||
        (c.marca?.toLowerCase().includes(q) ?? false) ||
        (c.descricao?.toLowerCase().includes(q) ?? false) ||
        (c.supplierNome?.toLowerCase().includes(q) ?? false)
    );
  }, [supplierCatalogs, search]);

  const listTotal =
    section === "produtos" ? filteredProducts.length : filteredCatalogs.length;
  const totalPages = Math.max(1, Math.ceil(listTotal / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;

  const paginatedProducts = useMemo(
    () => filteredProducts.slice(pageStart, pageStart + pageSize),
    [filteredProducts, pageStart, pageSize]
  );
  const paginatedCatalogs = useMemo(
    () => filteredCatalogs.slice(pageStart, pageStart + pageSize),
    [filteredCatalogs, pageStart, pageSize]
  );

  const goToPage = (next: number) => {
    setPage(next);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const selectedLabel =
    selectedSupplierId == null
      ? null
      : selectedSupplierId === NONE_SUPPLIER_ID
        ? "Sem fornecedor"
        : supplierTiles.find((t) => t.id === selectedSupplierId)?.nome || null;

  const openProduct = (product: PartnerPortalProduct) => {
    setViewingProduct(product);
    setActiveImageIndex(0);
    setCopiedText(false);
  };

  const countBadge =
    section === "produtos"
      ? showingSuppliers
        ? `${supplierTiles.length} fornecedor${supplierTiles.length === 1 ? "" : "es"}`
        : `${filteredProducts.length} item${filteredProducts.length === 1 ? "" : "s"}`
      : showingSuppliers
        ? `${supplierTiles.length} fornecedor${supplierTiles.length === 1 ? "" : "es"}`
        : `${filteredCatalogs.length} catálogo${filteredCatalogs.length === 1 ? "" : "s"}`;

  return (
    <ParceiroPortalShell partner={partner} isAdminPreview={isAdminPreview}>
      <div className="space-y-6">
        <div>
          <p className="parceiro-page-kicker">Catálogo</p>
          <h1 className="parceiro-page-title">
            {section === "produtos" ? "Vitrine" : "Catálogos PDF"}
          </h1>
          <p className="parceiro-page-desc">
            {section === "produtos"
              ? showingSuppliers
                ? "Escolha o fornecedor para ver a vitrine."
                : selectedLabel
                  ? `${selectedLabel} · ${countBadge}`
                  : countBadge
              : showingSuppliers
                ? "Escolha o fornecedor para ver os PDFs."
                : selectedLabel
                  ? `${selectedLabel} · ${countBadge}`
                  : countBadge}
          </p>
        </div>

        <ParceiroFilterPills
          aria-label="Seção de produtos"
          className="sm:w-fit"
          value={section}
          onChange={(id) => switchSection(id as SectionTab)}
          options={[
            { id: "produtos", label: "Vitrine" },
            { id: "catalogos", label: "Catálogos" },
          ]}
        />

        {!showingSuppliers && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <Button
                type="button"
                variant="outline"
                className="font-bold gap-1.5 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white w-fit"
                onClick={() => {
                  setSelectedSupplierId(null);
                  setSearch("");
                  setFilterCategory("ALL");
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                Fornecedores
              </Button>
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder={
                    section === "produtos"
                      ? "Buscar por nome ou categoria..."
                      : "Buscar catálogo..."
                  }
                  className="pl-9 h-11 bg-white/95 border-white/20"
                />
              </div>
            </div>

            {section === "produtos" && categories.length > 0 && (
              <ParceiroFilterPills
                aria-label="Filtrar por categoria"
                value={filterCategory}
                onChange={(id) => {
                  setFilterCategory(id);
                  setPage(1);
                }}
                options={[
                  { id: "ALL", label: "Todas" },
                  ...categories.map((cat) => ({ id: cat, label: cat })),
                ]}
              />
            )}
          </div>
        )}

        {showingSuppliers ? (
          supplierTiles.length === 0 ? (
            <div className="partner-card p-10 text-center">
              <div className="partner-card-accent" />
              <div className="inline-flex p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-4">
                {section === "produtos" ? (
                  <HighlightAnimatedIcon icon={CartIcon} size={24} playOnMount />
                ) : (
                  <BookOpen className="h-6 w-6" />
                )}
              </div>
              <h2 className="font-display font-bold text-slate-900">
                {section === "produtos"
                  ? "Nenhum produto encontrado"
                  : "Nenhum catálogo encontrado"}
              </h2>
              <p className="text-sm text-slate-600 mt-2">
                {section === "produtos"
                  ? "A Móveis Unghero ainda não publicou produtos no catálogo."
                  : "A Móveis Unghero ainda não publicou catálogos PDF."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
              {supplierTiles.map((tile) => (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => {
                    setSelectedSupplierId(tile.id);
                    setSearch("");
                    setFilterCategory("ALL");
                    setPage(1);
                  }}
                  className="partner-card partner-card-interactive text-left overflow-hidden hover:border-primary/40 transition-colors"
                >
                  <div className="partner-card-accent" />
                  <div className="aspect-[4/3] bg-slate-50 flex items-center justify-center p-5 border-b border-slate-200/70">
                    {tile.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={tile.logoUrl}
                        alt={tile.nome}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Building2 className="h-9 w-9" />
                        <span className="text-[10px] font-bold uppercase tracking-wide">
                          {tile.nome.slice(0, 2)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-3.5">
                    <h3 className="font-semibold text-slate-900 leading-snug line-clamp-2 text-sm">
                      {tile.nome}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      {tile.count}{" "}
                      {section === "produtos"
                        ? tile.count === 1
                          ? "produto"
                          : "produtos"
                        : tile.count === 1
                          ? "catálogo"
                          : "catálogos"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )
        ) : section === "produtos" ? (
          filteredProducts.length === 0 ? (
            <div className="partner-card p-10 text-center">
              <div className="partner-card-accent" />
              <div className="inline-flex p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-4">
                <HighlightAnimatedIcon icon={CartIcon} size={24} playOnMount />
              </div>
              <h2 className="font-display font-bold text-slate-900">Nenhum produto encontrado</h2>
              <p className="text-sm text-slate-600 mt-2">Tente outro termo de busca.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => openProduct(product)}
                  className="partner-card partner-card-interactive overflow-hidden flex flex-col text-left hover:border-primary/40 transition-colors"
                >
                  <div className="partner-card-accent" />
                  <div className="aspect-[4/3] bg-slate-100 border-b border-slate-200/80 overflow-hidden">
                    {product.imagem_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.imagem_url}
                        alt={product.nome}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-slate-400">
                        <Package className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col gap-2 flex-1">
                    {product.categoria && (
                      <span className="partner-card-badge text-[9px] px-2 py-0.5 self-start">
                        {product.categoria}
                      </span>
                    )}
                    <h2 className="font-display font-bold text-slate-900 text-sm leading-snug">
                      {product.nome}
                    </h2>
                    {product.descricao && (
                      <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-3">
                        {product.descricao}
                      </p>
                    )}
                  </div>
                </button>
              ))}
              </div>
              {listTotal > PAGE_SIZE_OPTIONS[0] || currentPage > 1 ? (
                <div className="parceiro-pagination-wrap">
                  <Pagination
                    page={currentPage}
                    pageSize={pageSize}
                    total={listTotal}
                    pageSizeOptions={PAGE_SIZE_OPTIONS}
                    itemLabel="produtos"
                    onPageChange={goToPage}
                    onPageSizeChange={(size) => {
                      setPageSize(size);
                      setPage(1);
                    }}
                  />
                </div>
              ) : null}
            </div>
          )
        ) : filteredCatalogs.length === 0 ? (
          <div className="partner-card p-10 text-center">
            <div className="partner-card-accent" />
            <div className="inline-flex p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-4">
              <BookOpen className="h-6 w-6" />
            </div>
            <h2 className="font-display font-bold text-slate-900">Nenhum catálogo encontrado</h2>
            <p className="text-sm text-slate-600 mt-2">Tente outro termo de busca.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedCatalogs.map((catalog) => (
              <button
                key={catalog.id}
                type="button"
                onClick={() => setActionCatalog(catalog)}
                className="partner-card partner-card-interactive overflow-hidden flex flex-col text-left hover:border-primary/40 transition-colors"
              >
                <div className="partner-card-accent" />
                <div className="aspect-[3/4] bg-slate-100 border-b border-slate-200/80 overflow-hidden flex items-center justify-center">
                  {catalog.capa_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={catalog.capa_url}
                      alt={catalog.titulo}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <BookOpen className="h-10 w-10 text-slate-300" />
                  )}
                </div>
                <div className="p-4 flex flex-col gap-1.5 flex-1">
                  {(catalog.marca || catalog.supplierNome) && (
                    <span className="partner-card-badge text-[9px] px-2 py-0.5 self-start">
                      {catalog.marca || catalog.supplierNome}
                    </span>
                  )}
                  <h2 className="font-display font-bold text-slate-900 text-sm leading-snug">
                    {catalog.titulo}
                  </h2>
                  <p className="text-[10px] text-slate-500 font-medium truncate mt-auto pt-1">
                    {catalog.publicUrl.replace(/^https?:\/\//, "")}
                  </p>
                </div>
              </button>
            ))}
            </div>
            {listTotal > PAGE_SIZE_OPTIONS[0] || currentPage > 1 ? (
              <div className="parceiro-pagination-wrap">
                <Pagination
                  page={currentPage}
                  pageSize={pageSize}
                  total={listTotal}
                  pageSizeOptions={PAGE_SIZE_OPTIONS}
                  itemLabel="catálogos"
                  onPageChange={goToPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                />
              </div>
            ) : null}
          </div>
        )}
      </div>

      <ParceiroCatalogActionsModal
        catalog={actionCatalog}
        onClose={() => setActionCatalog(null)}
      />

      <Dialog
        isOpen={viewingProduct !== null}
        onClose={() => {
          setViewingProduct(null);
          setCopiedText(false);
        }}
        showClose={false}
        className="max-w-6xl w-full"
        bodyClassName="max-h-[min(92svh,960px)] overflow-y-auto"
      >
        {viewingProduct &&
          (() => {
            const product = viewingProduct;
            const gallery = productGallery(product);
            const activeIndex = Math.min(activeImageIndex, Math.max(gallery.length - 1, 0));
            const currentImg = gallery[activeIndex] || null;
            const parsed = parseShowcaseDescricao(product.descricao);
            const swatches = acabamentosToSwatches(parsed.acabamentos);

            const copyCommercialText = () => {
              const acabLine = swatches.length
                ? `\n*Acabamentos:* ${swatches.map((s) => s.nome).join(", ")}`
                : "";
              const descBody =
                parsed.corpo ||
                (!swatches.length ? product.descricao : null) ||
                "Sem descrição comercial.";
              const linhaLine = parsed.linha ? `\n*Linha:* ${parsed.linha}` : "";
              const text = `*${product.nome}*\n\n${descBody}${linhaLine}${acabLine}\n\n*Ambiente:* ${product.categoria || "Geral"}`;
              void navigator.clipboard.writeText(text);
              setCopiedText(true);
              setTimeout(() => setCopiedText(false), 2000);
            };

            const downloadCurrentImage = async () => {
              if (!currentImg) return;
              try {
                const res = await fetch(currentImg);
                const blob = await res.blob();
                const ext = blob.type.split("/")[1] || "jpg";
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = `${product.nome.toLowerCase().replace(/\s+/g, "-")}-${activeIndex + 1}.${ext}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              } catch {
                window.open(currentImg, "_blank");
              }
            };

            return (
              <div className="space-y-5 pr-2 text-slate-800">
                <div className="flex items-start justify-between gap-4 border-b border-border/40 pb-3">
                  <div className="min-w-0">
                    <h3 className="text-lg font-black tracking-tight text-slate-800">
                      Ficha do Produto
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Catálogo Móveis Unghero — valores sob consulta com a fábrica.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setViewingProduct(null);
                      setCopiedText(false);
                    }}
                    className="shrink-0 p-1.5 hover:bg-slate-100 rounded-md text-muted-foreground transition-colors cursor-pointer"
                    aria-label="Fechar"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                  <div className="lg:col-span-7 space-y-3">
                    <div className="aspect-[4/3] sm:aspect-square bg-slate-100 rounded-[var(--radius-md)] overflow-hidden border border-border relative flex items-center justify-center shadow-xs">
                      {currentImg ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={currentImg}
                          alt={product.nome}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-12 w-12 text-slate-300" />
                      )}
                    </div>

                    {gallery.length > 1 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {gallery.map((url, idx) => (
                          <button
                            key={`${url}-${idx}`}
                            type="button"
                            onClick={() => setActiveImageIndex(idx)}
                            className={`w-14 h-14 rounded-lg overflow-hidden border transition-all cursor-pointer ${
                              idx === activeIndex
                                ? "border-primary ring-2 ring-primary/20 scale-[1.02]"
                                : "border-border hover:border-slate-400"
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt={`Miniatura ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-5 flex flex-col justify-between self-stretch gap-5">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {product.categoria ? (
                            <span className="inline-flex items-center text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                              {product.categoria}
                            </span>
                          ) : null}
                          {parsed.linha ? (
                            <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-widest text-zinc-700 bg-zinc-100 px-2.5 py-1 rounded-md border border-zinc-200">
                              Linha {parsed.linha}
                            </span>
                          ) : null}
                          {product.supplierNome ? (
                            <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                              {product.supplierNome}
                            </span>
                          ) : null}
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-850 leading-tight tracking-tight mt-1.5">
                          {product.nome}
                        </h2>
                      </div>

                      {swatches.length > 0 ? (
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-bold uppercase text-slate-450 tracking-wider">
                            Acabamentos ({swatches.length})
                          </h4>
                          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                            {swatches.map((swatch) => (
                              <div
                                key={swatch.nome}
                                className="group flex flex-col items-center gap-1.5 text-center"
                                title={swatch.nome}
                              >
                                <div className="w-full aspect-square rounded-[var(--radius-sm)] overflow-hidden border border-slate-200 bg-slate-100 shadow-xs">
                                  {swatch.imagem ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={swatch.imagem}
                                      alt={swatch.nome}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-slate-400 px-1">
                                      {swatch.nome.slice(0, 8)}
                                    </div>
                                  )}
                                </div>
                                <span className="text-[9px] font-semibold text-slate-600 leading-tight line-clamp-2 px-0.5">
                                  {swatch.nome}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {parsed.corpo ? (
                        <div className="space-y-1">
                          <h4 className="text-[10px] font-bold uppercase text-slate-450 tracking-wider">
                            Descrição Comercial
                          </h4>
                          <p className="text-sm text-slate-650 leading-relaxed whitespace-pre-line font-medium">
                            {parsed.corpo}
                          </p>
                        </div>
                      ) : !swatches.length && product.descricao ? (
                        <div className="space-y-1">
                          <h4 className="text-[10px] font-bold uppercase text-slate-450 tracking-wider">
                            Descrição Comercial
                          </h4>
                          <p className="text-sm text-slate-650 leading-relaxed whitespace-pre-line font-medium">
                            {product.descricao}
                          </p>
                        </div>
                      ) : !swatches.length ? (
                        <p className="text-xs text-slate-400 italic">
                          Sem descrição comercial cadastrada.
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-2 pt-4 border-t border-border/40 mt-auto">
                      {currentImg && (
                        <Button
                          type="button"
                          onClick={() => void downloadCurrentImage()}
                          variant="outline"
                          className="font-bold gap-1.5 h-10 border-border bg-white"
                        >
                          <Download className="h-4 w-4 text-slate-500" />
                          Baixar foto atual
                        </Button>
                      )}
                      <Button
                        type="button"
                        onClick={copyCommercialText}
                        className="font-bold gap-1.5 h-10 btn-metallic border-none"
                      >
                        {copiedText ? (
                          <>
                            <Check className="h-4 w-4" />
                            Texto copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copiar divulgação
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
      </Dialog>
    </ParceiroPortalShell>
  );
}
