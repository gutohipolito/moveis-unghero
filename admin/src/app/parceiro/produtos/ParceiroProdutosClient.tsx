"use client";

import React, { useMemo, useState } from "react";
import { Package, Search } from "lucide-react";
import type { PartnerPortalData, PartnerPortalProduct } from "@/lib/partnerPortal";
import ParceiroPortalShell from "@/app/parceiro/ParceiroPortalShell";
import { Input } from "@/components/ui/input";

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.nome.toLowerCase().includes(q) ||
        (p.categoria?.toLowerCase().includes(q) ?? false) ||
        (p.descricao?.toLowerCase().includes(q) ?? false)
    );
  }, [products, search]);

  return (
    <ParceiroPortalShell partner={partner} isAdminPreview={isAdminPreview}>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight">
              Produtos
            </h1>
            <p className="text-xs text-white/60 mt-1 max-w-lg">
              Catálogo ativo da Móveis Unghero para consulta e indicação aos seus clientes.
            </p>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-white/70 bg-white/10 border border-white/15 px-2.5 py-1 rounded-full self-start sm:self-auto">
            {filtered.length} item{filtered.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou categoria..."
            className="pl-9 h-11 bg-white/95 border-white/20"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="partner-card p-10 text-center">
            <div className="partner-card-accent" />
            <div className="inline-flex p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-4">
              <Package className="h-6 w-6" />
            </div>
            <h2 className="font-display font-bold text-slate-900">Nenhum produto encontrado</h2>
            <p className="text-sm text-slate-600 mt-2">
              {products.length === 0
                ? "A Móveis Unghero ainda não publicou produtos no catálogo."
                : "Tente outro termo de busca."}
            </p>
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
