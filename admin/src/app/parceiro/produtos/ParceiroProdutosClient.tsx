"use client";

import React, { useMemo, useState } from "react";
import { ArrowLeft, Building2, Package, Search } from "lucide-react";
import type { PartnerPortalData, PartnerPortalProduct } from "@/lib/partnerPortal";
import ParceiroPortalShell from "@/app/parceiro/ParceiroPortalShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const NONE_SUPPLIER_ID = "__none__";

const moneyFmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

interface ParceiroProdutosClientProps {
  partner: PartnerPortalData;
  products: PartnerPortalProduct[];
  isAdminPreview?: boolean;
}

export default function ParceiroProdutosClient({
  partner,
  products,
  isAdminPreview = false,
}: ParceiroProdutosClientProps) {
  const [search, setSearch] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);

  const supplierTiles = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      const key = p.supplier_id || NONE_SUPPLIER_ID;
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
      const sample = products.find((p) => p.supplier_id === id);
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
  }, [products]);

  const showingSuppliers = selectedSupplierId == null;

  const supplierProducts = useMemo(() => {
    if (selectedSupplierId == null) return products;
    if (selectedSupplierId === NONE_SUPPLIER_ID) {
      return products.filter((p) => !p.supplier_id);
    }
    return products.filter((p) => p.supplier_id === selectedSupplierId);
  }, [products, selectedSupplierId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return supplierProducts;
    return supplierProducts.filter(
      (p) =>
        p.nome.toLowerCase().includes(q) ||
        (p.categoria?.toLowerCase().includes(q) ?? false) ||
        (p.descricao?.toLowerCase().includes(q) ?? false)
    );
  }, [supplierProducts, search]);

  const selectedLabel =
    selectedSupplierId == null
      ? null
      : selectedSupplierId === NONE_SUPPLIER_ID
        ? "Sem fornecedor"
        : supplierTiles.find((t) => t.id === selectedSupplierId)?.nome || null;

  return (
    <ParceiroPortalShell partner={partner} isAdminPreview={isAdminPreview}>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight">
              Produtos
            </h1>
            <p className="text-xs text-white/60 mt-1 max-w-lg">
              {showingSuppliers
                ? "Escolha o fornecedor para ver o catálogo da Móveis Unghero."
                : selectedLabel
                  ? `Produtos de ${selectedLabel}.`
                  : "Catálogo ativo da Móveis Unghero."}
            </p>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-white/70 bg-white/10 border border-white/15 px-2.5 py-1 rounded-full self-start sm:self-auto">
            {showingSuppliers
              ? `${supplierTiles.length} fornecedor${supplierTiles.length === 1 ? "" : "es"}`
              : `${filtered.length} item${filtered.length === 1 ? "" : "s"}`}
          </span>
        </div>

        {!showingSuppliers && (
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <Button
              type="button"
              variant="outline"
              className="font-bold gap-1.5 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white w-fit"
              onClick={() => {
                setSelectedSupplierId(null);
                setSearch("");
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              Fornecedores
            </Button>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome ou categoria..."
                className="pl-9 h-11 bg-white/95 border-white/20"
              />
            </div>
          </div>
        )}

        {showingSuppliers ? (
          supplierTiles.length === 0 ? (
            <div className="partner-card p-10 text-center">
              <div className="partner-card-accent" />
              <div className="inline-flex p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-4">
                <Package className="h-6 w-6" />
              </div>
              <h2 className="font-display font-bold text-slate-900">Nenhum produto encontrado</h2>
              <p className="text-sm text-slate-600 mt-2">
                A Móveis Unghero ainda não publicou produtos no catálogo.
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
                  }}
                  className="partner-card text-left cursor-pointer overflow-hidden hover:border-primary/40 transition-colors"
                >
                  <div className="partner-card-accent" />
                  <div className="aspect-[4/3] bg-slate-50 flex items-center justify-center p-5 border-b border-slate-200/70">
                    {tile.logoUrl ? (
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
                      {tile.count} {tile.count === 1 ? "produto" : "produtos"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )
        ) : filtered.length === 0 ? (
          <div className="partner-card p-10 text-center">
            <div className="partner-card-accent" />
            <div className="inline-flex p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-4">
              <Package className="h-6 w-6" />
            </div>
            <h2 className="font-display font-bold text-slate-900">Nenhum produto encontrado</h2>
            <p className="text-sm text-slate-600 mt-2">Tente outro termo de busca.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((product) => (
              <article key={product.id} className="partner-card overflow-hidden flex flex-col">
                <div className="partner-card-accent" />
                <div className="aspect-[4/3] bg-slate-100 border-b border-slate-200/80 overflow-hidden">
                  {product.imagem_url ? (
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
                  {product.preco_exibicao != null && (
                    <p className="mt-auto pt-2 text-sm font-display font-bold text-gradient-gold tabular-nums">
                      {moneyFmt.format(product.preco_exibicao)}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </ParceiroPortalShell>
  );
}
