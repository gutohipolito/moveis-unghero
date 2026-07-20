"use client";

import React, { useState, useEffect, useRef } from "react";
import { createQuote, getProjectBriefingAction, type ItemType } from "@/app/actions/quotes";
import { getInventoryAndSuppliers, deductInventoryAction, type InventoryItem } from "@/app/actions/estoque";
import { listShowcaseProducts, type ShowcaseProductDTO } from "@/app/actions/produtos";
import { ActionDialogHost, useActionDialog } from "@/components/ActionDialogHost";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Plus, Trash2, Calculator, Sparkles, ExternalLink, Layers, Building2, BadgeCheck, Images } from "lucide-react";
import { QUOTE_TEMPLATE_BASICO, QUOTE_TEMPLATE_ID, QUOTE_TEMPLATE_LABEL } from "@/lib/quoteTemplates";
import { listQuoteItemPresets, listQuoteDetailPresets, createQuoteItemPreset, createQuoteDetailPreset } from "@/app/actions/quoteItemPresets";
import type { QuoteItemPresetDTO } from "@/lib/quoteItemPresets";
import {
  DescriptionCombobox,
  DetailsEditor,
  flushPendingQuoteDetailDrafts,
} from "@/components/quotes/QuoteItemInputs";
import { Dialog } from "@/components/ui/dialog";
import { getParceiros } from "@/app/actions/parceiros";
import { formatPartnerRegistro, getPartnerRoleLabel } from "@/lib/partnerTypes";
import { addCalendarDaysISO, toISODateBR } from "@/lib/brazilDate";
import { getPricingTextWarning } from "@/lib/quoteItems";

interface PartnerOption {
  id: string;
  nome: string;
  tipo: string;
  fotoUrl: string | null;
  escritorio: string | null;
  registro_profissional: string | null;
  cidade: string | null;
}

function getPartnerInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

interface QuoteBuilderProps {
  projectId: string;
  companyId: string;
  onSuccess: (newQuote: any) => void;
  onCancel: () => void;
  embedded?: boolean;
}

interface QuoteItemInput {
  id: string;
  descricao: string;
  quantidade: number;
  tipo_custo: ItemType;
  valor_unitario: number;
  valor_total: number;
  inventoryItemId?: string;
  showcaseProductId?: string;
  precoCusto?: number;
  markup?: number;
  subitens?: string[];
}

// Template único ativo no sistema
const ACTIVE_TEMPLATE = QUOTE_TEMPLATE_BASICO;

export default function QuoteBuilder({ projectId, companyId, onSuccess, onCancel, embedded = false }: QuoteBuilderProps) {
  const dialog = useActionDialog();
  const { showSuccess, showError } = dialog;
  const [observacoes, setObservacoes] = useState(ACTIVE_TEMPLATE.observacoes);
  const [validade, setValidade] = useState(() => {
    // Validade padrão: 15 dias a partir de hoje (calendário de São Paulo)
    return addCalendarDaysISO(toISODateBR(), 15);
  });
  const [items, setItems] = useState<QuoteItemInput[]>([]);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const [desconto, setDesconto] = useState<number>(0);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [showcaseProducts, setShowcaseProducts] = useState<ShowcaseProductDTO[]>([]);
  const [presets, setPresets] = useState<QuoteItemPresetDTO[]>([]);
  const [globalDetails, setGlobalDetails] = useState<string[]>([]);
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [partnerId, setPartnerId] = useState<string>("");
  const [baixarEstoque, setBaixarEstoque] = useState(true);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [briefingData, setBriefingData] = useState<any | null>(null);
  const [activeBuilderTab, setActiveBuilderTab] = useState<"items" | "briefing">("items");
  const hasBriefing = Boolean(briefingData);

  useEffect(() => {
    async function loadBriefing() {
      const res = await getProjectBriefingAction(projectId);
      if (res.success) {
        setBriefingData(res.briefing);
        if (!res.briefing) setActiveBuilderTab("items");
      }
    }
    loadBriefing();
  }, [projectId]);

  useEffect(() => {
    async function loadInventory() {
      const res = await getInventoryAndSuppliers(companyId);
      if (res.success && res.inventory) {
        setInventory(res.inventory);
      }
    }
    loadInventory();
  }, [companyId]);

  useEffect(() => {
    async function loadShowcase() {
      const res = await listShowcaseProducts(companyId, { ativoOnly: true });
      if (res.success) {
        setShowcaseProducts(res.products);
      }
    }
    loadShowcase();
  }, [companyId]);

  useEffect(() => {
    async function loadPartners() {
      const res = await getParceiros(companyId);
      if (res.success) {
        setPartners(
          res.parceiros
            .filter((p) => p.ativo)
            .map((p) => ({
              id: p.id,
              nome: p.nome,
              tipo: String(p.tipo),
              fotoUrl: p.fotoUrl,
              escritorio: p.escritorio,
              registro_profissional: p.registro_profissional,
              cidade: p.cidade,
            }))
        );
      }
    }
    loadPartners();
  }, [companyId]);

  useEffect(() => {
    async function loadPresets() {
      const [itemsRes, detailsRes] = await Promise.all([
        listQuoteItemPresets(),
        listQuoteDetailPresets(),
      ]);
      if (itemsRes.success) setPresets(itemsRes.presets);
      if (detailsRes.success) setGlobalDetails(detailsRes.details.map((d) => d.texto));
    }
    loadPresets();
  }, []);

  // Sugestões do campo de detalhes: apenas o cadastro de "Detalhes do item".
  const detailSuggestions = React.useMemo(
    () => [...globalDetails].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [globalDetails]
  );

  // Aplica uma descrição salva: preenche apenas a descrição do item.
  const applyPreset = (id: string, preset: QuoteItemPresetDTO) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, descricao: preset.descricao } : item
      )
    );
  };

  const ensureItemPreset = async (itemId: string, text: string) => {
    const res = await createQuoteItemPreset({ descricao: text });
    if (!res.success) return;
    setPresets((prev) => {
      if (prev.some((p) => p.id === res.preset.id)) return prev;
      return [...prev, res.preset].sort((a, b) =>
        a.descricao.localeCompare(b.descricao, "pt-BR")
      );
    });
    applyPreset(itemId, res.preset);
  };

  const ensureDetailPreset = async (texto: string) => {
    const res = await createQuoteDetailPreset({ texto });
    if (!res.success) return;
    setGlobalDetails((prev) => {
      const exists = prev.some((d) => d.toLowerCase() === res.detail.texto.toLowerCase());
      if (exists) {
        return prev.map((d) =>
          d.toLowerCase() === res.detail.texto.toLowerCase() ? res.detail.texto : d
        );
      }
      return [...prev, res.detail.texto].sort((a, b) => a.localeCompare(b, "pt-BR"));
    });
  };

  // Adicionar uma nova linha de item vazia (Item Livre)
  const handleAddItem = () => {
    const newItem: QuoteItemInput = {
      id: `item-${Date.now()}`,
      descricao: "",
      quantidade: 1,
      tipo_custo: "MOVEIS_MDF",
      valor_unitario: 0,
      valor_total: 0,
      subitens: [],
    };
    setItems([...items, newItem]);
  };

  // Adicionar item do estoque
  const handleAddItemFromStock = () => {
    if (inventory.length === 0) {
      showError("Estoque vazio", "Cadastre insumos no estoque antes de vincular ao orçamento.");
      return;
    }

    const defaultItem = inventory[0];
    const mappedType: ItemType = 
      defaultItem.categoria === "CHAPAS_MDF" ? "MOVEIS_MDF" :
      defaultItem.categoria === "FERRAGENS" ? "FERRAGENS_ESPECIAIS" : "OUTROS";

    const newItem: QuoteItemInput = {
      id: `item-${Date.now()}`,
      descricao: defaultItem.nome,
      quantidade: 1,
      tipo_custo: mappedType,
      valor_unitario: defaultItem.precoCusto * 2.2,
      valor_total: defaultItem.precoCusto * 2.2,
      inventoryItemId: defaultItem.id,
      precoCusto: defaultItem.precoCusto,
      markup: 2.2
    };
    setItems([...items, newItem]);
  };

  const handleAddItemFromShowcase = () => {
    if (showcaseProducts.length === 0) {
      showError("Mostruário vazio", "Cadastre produtos em Comercial → Produtos antes de usar no orçamento.");
      return;
    }

    const product = showcaseProducts[0];
    const unit = product.preco_exibicao ?? 0;
    const newItem: QuoteItemInput = {
      id: `item-${Date.now()}`,
      descricao: product.descricao?.trim() || product.nome,
      quantidade: 1,
      tipo_custo: "MOVEIS_MDF",
      valor_unitario: unit,
      valor_total: unit,
      showcaseProductId: product.id,
      subitens: [],
    };
    setItems([...items, newItem]);
  };

  // Remover uma linha de item
  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  // Atualizar campo do item na tabela
  const handleUpdateItem = (id: string, field: keyof QuoteItemInput, value: any) => {
    const updated = items.map(item => {
      if (item.id === id) {
        let updatedItem = { ...item, [field]: value };
        
        // Se mudou o material selecionado do estoque
        if (field === "inventoryItemId") {
          const selected = inventory.find(i => i.id === value);
          if (selected) {
            const mappedType: ItemType = 
              selected.categoria === "CHAPAS_MDF" ? "MOVEIS_MDF" :
              selected.categoria === "FERRAGENS" ? "FERRAGENS_ESPECIAIS" : "OUTROS";
            
            const currentMarkup = item.markup || 2.2;
            updatedItem = {
              ...updatedItem,
              showcaseProductId: undefined,
              descricao: selected.nome,
              precoCusto: selected.precoCusto,
              tipo_custo: mappedType,
              valor_unitario: selected.precoCusto * currentMarkup,
              valor_total: item.quantidade * (selected.precoCusto * currentMarkup)
            };
          }
        }

        if (field === "showcaseProductId") {
          const selected = showcaseProducts.find((p) => p.id === value);
          if (selected) {
            const unit = selected.preco_exibicao ?? item.valor_unitario;
            updatedItem = {
              ...updatedItem,
              inventoryItemId: undefined,
              precoCusto: undefined,
              markup: undefined,
              descricao: selected.descricao?.trim() || selected.nome,
              valor_unitario: unit,
              valor_total: item.quantidade * unit,
            };
          }
        }
        
        // Se mudou o markup
        if (field === "markup") {
          const mk = Number(value) || 1;
          const cost = item.precoCusto || 0;
          updatedItem.valor_unitario = cost * mk;
          updatedItem.valor_total = item.quantidade * (cost * mk);
        }
        
        // Regra geral de totalizacao
        if (field === "quantidade" || field === "valor_unitario") {
          updatedItem.valor_total = Number(updatedItem.quantidade) * Number(updatedItem.valor_unitario);
        }
        if (field === "quantidade" && item.inventoryItemId) {
          const cost = item.precoCusto || 0;
          const mk = item.markup || 2.2;
          updatedItem.valor_total = Number(value) * (cost * mk);
        }
        
        return updatedItem;
      }
      return item;
    });
    setItems(updated);
  };

  const handleUpdateSubitens = (id: string, subitens: string[]) => {
    setItems(items.map((item) => (item.id === id ? { ...item, subitens } : item)));
  };

  // Cálculos comerciais
  const subtotal = items.reduce((sum, item) => sum + item.valor_total, 0);
  const valorFinal = Math.max(0, subtotal - desconto);

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    flushPendingQuoteDetailDrafts();
    const currentItems = itemsRef.current;
    if (currentItems.length === 0) {
      showError("Orçamento vazio", "Adicione pelo menos um item comercial antes de salvar.");
      return;
    }

    const pricingProblems = currentItems.flatMap((item, idx) => {
      const issues: string[] = [];
      const titleWarn = getPricingTextWarning(item.descricao);
      if (titleWarn) issues.push(`Item ${idx + 1} (título): ${item.descricao}`);
      for (const detail of item.subitens || []) {
        if (getPricingTextWarning(detail)) {
          issues.push(`Item ${idx + 1} (detalhe): ${detail}`);
        }
      }
      return issues;
    });
    if (pricingProblems.length > 0) {
      showError(
        "Preço/quantidade no texto",
        `Remova valores e quantidades do título/detalhes e use os campos Valor e Qtd:\n• ${pricingProblems.slice(0, 4).join("\n• ")}`
      );
      return;
    }

    setConfirmOpen(true);
  };

  // Submit após confirmação do resumo
  const handleConfirmSave = async () => {
    flushPendingQuoteDetailDrafts();
    const currentItems = itemsRef.current;

    if (currentItems.length === 0) {
      setConfirmOpen(false);
      showError("Orçamento vazio", "Adicione pelo menos um item comercial antes de salvar.");
      return;
    }

    setLoading(true);
    setConfirmOpen(false);

    // Garante pré-cadastro de títulos novos (blur pode não ter ocorrido antes do save).
    // Detalhes só são cadastrados ao digitar vírgula no campo de detalhes.
    const titles = Array.from(
      new Set(
        currentItems
          .filter((i) => !i.inventoryItemId && !i.showcaseProductId)
          .map((i) => i.descricao.trim())
          .filter((t) => t && !getPricingTextWarning(t))
      )
    );
    await Promise.all(titles.map((t) => createQuoteItemPreset({ descricao: t })));

    const currentSubtotal = currentItems.reduce((sum, item) => sum + item.valor_total, 0);
    const currentValorFinal = Math.max(0, currentSubtotal - desconto);

    const inputData = {
      subtotal: currentSubtotal,
      desconto,
      valor_final: currentValorFinal,
      validade,
      observacoes,
      template_tipo: QUOTE_TEMPLATE_ID,
      partnerId: partnerId || null,
      items: currentItems.map((item) => ({
        descricao: item.descricao,
        quantidade: item.quantidade,
        tipo_custo: item.tipo_custo,
        valor_unitario: item.valor_unitario,
        valor_total: item.valor_total,
        showcase_product_id: item.showcaseProductId || null,
        subitens: (item.subitens || []).map((s) => s.trim()).filter(Boolean),
      })),
    };

    const result = await createQuote(projectId, inputData);

    if (result.success && result.data) {
      // Dar baixa no estoque se o checkbox estiver ativo e houver itens de estoque
      if (baixarEstoque) {
        const itemsToDeduct = currentItems
          .filter(item => item.inventoryItemId)
          .map(item => ({
            itemId: item.inventoryItemId!,
            quantity: item.quantidade
          }));

        if (itemsToDeduct.length > 0) {
          const deductRes = await deductInventoryAction(companyId, itemsToDeduct);
          if (deductRes.success) {
            showSuccess(
              "Orçamento salvo",
              `Versão ${result.data.version} gravada com baixa automática no estoque.`
            );
          }
        } else {
          showSuccess("Orçamento salvo", `Versão ${result.data.version} gravada com sucesso.`);
        }
      } else {
        showSuccess("Orçamento salvo", `Versão ${result.data.version} gravada com sucesso.`);
      }
      onSuccess(result.data);
    } else {
      showError("Erro ao salvar", result.error || "Falha ao salvar a proposta comercial.");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-5">
      {!embedded && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-border/40 pb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gradient-gold">
              Construtor de proposta comercial
            </h2>
            <p className="text-xs text-muted-foreground">
              Monte a tabela comercial e exporte o PDF com itens e valores.
            </p>
          </div>
        </div>
      )}

      {/* Abas só quando há briefing preenchido para o lead */}
      {hasBriefing && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 bg-slate-100/80 border border-slate-200/50 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveBuilderTab("items")}
            className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeBuilderTab === "items" 
                ? "bg-white text-slate-800 shadow-xs" 
                : "text-muted-foreground hover:text-slate-700"
            }`}
          >
            <Layers className="h-4 w-4 text-amber-500 shrink-0" />
            Tabela comercial
          </button>
          <button
            type="button"
            onClick={() => setActiveBuilderTab("briefing")}
            className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeBuilderTab === "briefing" 
                ? "bg-white text-slate-800 shadow-xs" 
                : "text-muted-foreground hover:text-slate-700"
            }`}
          >
            <Sparkles className="h-4 w-4 text-emerald-500 shrink-0" />
            Briefing do lead
          </button>
        </div>
      )}

      {activeBuilderTab === "items" && (
        <form onSubmit={handleSubmitRequest} className="space-y-5">
        
        {/* Bloco 1: Template e validade */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Template de Proposta
            </label>
            <div className="h-10 flex items-center px-3 rounded-lg border border-border/40 bg-secondary/30 text-sm font-semibold text-foreground">
              {QUOTE_TEMPLATE_LABEL}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Data de Validade da Proposta
            </label>
            <Input
              type="date"
              required
              value={validade}
              onChange={(e) => setValidade(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <label className="text-xs font-semibold text-muted-foreground block">
              Arquiteto / Parceiro (opcional)
            </label>
            <Select
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              className="h-10"
            >
              <option value="">Sem arquiteto vinculado</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                  {` — ${getPartnerRoleLabel(p.tipo, p.nome)}`}
                </option>
              ))}
            </Select>
            {(() => {
              const selected = partners.find((p) => p.id === partnerId);
              if (!selected) return null;
              const roleLabel = getPartnerRoleLabel(selected.tipo, selected.nome);
              const registro = formatPartnerRegistro(selected.tipo, selected.registro_profissional);
              return (
                <div className="relative overflow-hidden rounded-xl p-3.5 w-fit max-w-sm space-y-1 text-slate-800 text-xs border border-amber-400/40 bg-linear-to-br from-amber-50/90 via-white to-slate-50/60 shadow-[0_6px_22px_-6px_rgba(180,130,40,0.35)] ring-1 ring-amber-300/30">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 shrink-0 rounded-full overflow-hidden border-2 border-amber-300/70 shadow-inner bg-amber-50 flex items-center justify-center">
                      {selected.fotoUrl ? (
                        <img
                          src={selected.fotoUrl}
                          alt={selected.nome}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-black tracking-wide text-amber-800/80">
                          {getPartnerInitials(selected.nome)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1 min-w-0">
                        <p className="text-sm font-extrabold text-slate-900 truncate tracking-tight">
                          {selected.nome}
                        </p>
                        <BadgeCheck
                          className="h-4 w-4 shrink-0 text-amber-500 fill-amber-400/30"
                          aria-label="Parceiro verificado"
                        />
                      </div>
                      <p className="text-[10px] font-semibold text-amber-800/70 tracking-wide">
                        {roleLabel}
                      </p>
                      {selected.escritorio ? (
                        <p className="text-[10px] font-medium text-slate-500 truncate">
                          {selected.escritorio}
                        </p>
                      ) : null}
                      {registro ? (
                        <p className="text-[10px] font-medium text-slate-400 truncate">{registro}</p>
                      ) : null}
                      {!selected.escritorio && !registro && selected.cidade ? (
                        <p className="text-[10px] font-medium text-slate-400">{selected.cidade}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })()}
            <p className="text-[10px] text-muted-foreground">
              Aparece de forma discreta no PDF do orçamento.
            </p>
          </div>
        </div>

        {/* Bloco 2: Tabela Dinâmica de Itens */}
        <div className="rounded-xl border border-border/40 bg-white overflow-visible">
          <div className="p-3 sm:p-4 bg-slate-50 border-b border-border/40 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Itens do orçamento
            </span>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button type="button" onClick={handleAddItem} size="sm" variant="outline" className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-1" /> Item livre
              </Button>
              <Button
                type="button"
                onClick={handleAddItemFromStock}
                size="sm"
                variant="outline"
                disabled
                title="Temporariamente indisponível — em alinhamento"
                className="w-full sm:w-auto border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
              >
                <Plus className="h-4 w-4 mr-1" /> Do estoque
              </Button>
            </div>
          </div>

          {/* Visualização em Tabela para Desktop / Tablet (hidden md:block) */}
          <div className="hidden md:block overflow-x-auto overflow-y-visible">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-border/40 bg-black/5 text-muted-foreground text-xs font-semibold uppercase">
                  <th className="p-3 w-[38%]">Descrição do Insumo / Serviço</th>
                  <th className="p-3 w-44 min-w-[11rem]">Categoria</th>
                  <th className="p-3 w-20 text-center">Qtd</th>
                  <th className="p-3 w-40">Valor / Precificação</th>
                  <th className="p-3 w-32">Total</th>
                  <th className="p-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-xs text-muted-foreground">
                      Tabela vazia. Adicione um item livre, do mostruário ou do estoque.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const isStockItem = !!item.inventoryItemId;
                    const isShowcaseItem = !!item.showcaseProductId;
                    const showcase = isShowcaseItem
                      ? showcaseProducts.find((p) => p.id === item.showcaseProductId)
                      : null;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors border-b border-slate-100">
                        <td className="p-3">
                          {isStockItem ? (
                            <div className="space-y-1">
                              <select
                                value={item.inventoryItemId}
                                onChange={(e) => handleUpdateItem(item.id, "inventoryItemId", e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg text-xs p-2 outline-none font-bold text-slate-800 focus:ring-1 focus:ring-[hsl(28_85%_45%)] focus:border-[hsl(28_85%_45%)] cursor-pointer transition-all"
                              >
                                {inventory.map((inv) => (
                                  <option key={inv.id} value={inv.id}>
                                    {inv.nome}
                                  </option>
                                ))}
                              </select>
                              <div className="text-[10px] text-cyan-600 font-bold flex items-center gap-1.5 px-1">
                                <span>Custo: R$ {(item.precoCusto || 0).toFixed(2)}</span>
                                <span className="text-muted-foreground/30">|</span>
                                <span>Venda Sugerida: R$ {(item.valor_unitario || 0).toFixed(2)}</span>
                              </div>
                            </div>
                          ) : isShowcaseItem ? (
                            <div className="space-y-1.5">
                              <div className="flex gap-2 items-start">
                                {showcase?.imagem_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={showcase.imagem_url}
                                    alt=""
                                    className="w-10 h-10 rounded object-cover border border-slate-200 shrink-0"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                                    <Images className="h-4 w-4 text-amber-600" />
                                  </div>
                                )}
                                <select
                                  value={item.showcaseProductId}
                                  onChange={(e) => handleUpdateItem(item.id, "showcaseProductId", e.target.value)}
                                  className="flex-1 bg-white border border-amber-200 rounded-lg text-xs p-2 outline-none font-bold text-slate-800 focus:ring-1 focus:ring-amber-400 cursor-pointer"
                                >
                                  {showcaseProducts.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.nome}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <DetailsEditor
                                subitens={item.subitens || []}
                                suggestions={detailSuggestions}
                                onChange={(next) => handleUpdateSubitens(item.id, next)}
                                onCommitNew={ensureDetailPreset}
                              />
                            </div>
                          ) : (
                            <div>
                              <DescriptionCombobox
                                value={item.descricao}
                                presets={presets}
                                onChangeText={(text) => handleUpdateItem(item.id, "descricao", text)}
                                onSelectPreset={(preset) => applyPreset(item.id, preset)}
                                onCommitNew={(text) => ensureItemPreset(item.id, text)}
                              />
                              <DetailsEditor
                                subitens={item.subitens || []}
                                suggestions={detailSuggestions}
                                onChange={(next) => handleUpdateSubitens(item.id, next)}
                                onCommitNew={ensureDetailPreset}
                              />
                            </div>
                          )}
                        </td>
                        <td className="p-3 min-w-[11rem]">
                          <Select
                            disabled={isStockItem}
                            value={item.tipo_custo}
                            onChange={(e) => handleUpdateItem(item.id, "tipo_custo", e.target.value as ItemType)}
                            className="h-9 py-1 px-2 text-xs bg-white border border-slate-200 focus:ring-1 focus:ring-[hsl(28_85%_45%)] rounded-lg transition-all cursor-pointer font-semibold text-slate-700 disabled:opacity-60 w-full min-w-[10.5rem]"
                          >
                            <option value="MOVEIS_MDF">MDF/Marcenaria</option>
                            <option value="FERRAGENS_ESPECIAIS">Ferragens Esp.</option>
                            <option value="MAO_DE_OBRA">Mão de Obra</option>
                            <option value="OUTROS">Outros</option>
                          </Select>
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            min="1"
                            required
                            className="bg-white border border-slate-200 text-center focus-visible:ring-1 focus-visible:ring-[hsl(28_85%_45%)] h-9 text-xs font-bold p-2 rounded-lg transition-all"
                            value={item.quantidade}
                            onChange={(e) => handleUpdateItem(item.id, "quantidade", Number(e.target.value))}
                          />
                        </td>
                        <td className="p-3">
                          {isStockItem ? (
                            <div className="flex items-center gap-1.5 px-1">
                              <span className="text-[10px] text-muted-foreground font-bold">x</span>
                              <Input
                                type="number"
                                step="0.1"
                                min="1"
                                max="10"
                                required
                                className="w-16 bg-white border border-slate-200 text-center h-9 text-xs font-black rounded-lg focus-visible:ring-1 focus-visible:ring-[hsl(28_85%_45%)] transition-all"
                                value={item.markup || 2.2}
                                onChange={(e) => handleUpdateItem(item.id, "markup", Number(e.target.value))}
                                title="Markup Multiplicador"
                              />
                              <span className="text-[9px] text-muted-foreground font-extrabold uppercase tracking-wider">Markup</span>
                            </div>
                          ) : (
                            <div className="flex items-center relative">
                              <span className="text-xs text-neutral-400 font-bold absolute left-3">R$</span>
                              <Input
                                type="number"
                                min="0"
                                required
                                className="bg-white border border-slate-200 pl-8 focus-visible:ring-1 focus-visible:ring-[hsl(28_85%_45%)] h-9 text-xs font-bold rounded-lg transition-all"
                                value={item.valor_unitario}
                                onChange={(e) => handleUpdateItem(item.id, "valor_unitario", Number(e.target.value))}
                              />
                            </div>
                          )}
                        </td>
                        <td className="p-3 font-extrabold text-xs text-neutral-950">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.valor_total)}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1 rounded-sm text-destructive/70 hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Visualização em Lista de Cards para Mobile (block md:hidden) */}
          <div className="block md:hidden p-3.5 space-y-4.5 bg-slate-50/50 border-t border-border/20">
            {items.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 font-medium">
                Tabela vazia. Adicione um item livre, do mostruário ou do estoque.
              </div>
            ) : (
              items.map((item, idx) => {
                const isStockItem = !!item.inventoryItemId;
                const isShowcaseItem = !!item.showcaseProductId;
                const showcase = isShowcaseItem
                  ? showcaseProducts.find((p) => p.id === item.showcaseProductId)
                  : null;
                return (
                  <div key={item.id} className="p-4 bg-white border border-slate-200/80 rounded-2xl space-y-4 shadow-sm relative animate-in fade-in duration-200">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Item #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1.5 rounded-full text-rose-500 hover:bg-rose-50 transition-all cursor-pointer"
                        title="Remover Item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-3.5">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Título do item
                        </label>
                        {isStockItem ? (
                          <div className="space-y-1.5">
                            <select
                              value={item.inventoryItemId}
                              onChange={(e) => handleUpdateItem(item.id, "inventoryItemId", e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs p-2 outline-none font-bold text-slate-800 cursor-pointer"
                            >
                              {inventory.map((inv) => (
                                <option key={inv.id} value={inv.id}>
                                  {inv.nome}
                                </option>
                              ))}
                            </select>
                            <div className="text-[9px] text-cyan-600 font-bold flex flex-wrap gap-x-2 px-1">
                              <span>Custo: R$ {(item.precoCusto || 0).toFixed(2)}</span>
                              <span>Venda Sugerida: R$ {(item.valor_unitario || 0).toFixed(2)}</span>
                            </div>
                          </div>
                        ) : isShowcaseItem ? (
                          <div className="space-y-1.5">
                            <div className="flex gap-2 items-center">
                              {showcase?.imagem_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={showcase.imagem_url}
                                  alt=""
                                  className="w-10 h-10 rounded object-cover border border-slate-200 shrink-0"
                                />
                              ) : null}
                              <select
                                value={item.showcaseProductId}
                                onChange={(e) => handleUpdateItem(item.id, "showcaseProductId", e.target.value)}
                                className="flex-1 bg-amber-50/50 border border-amber-200 rounded-lg text-xs p-2 outline-none font-bold text-slate-800 cursor-pointer"
                              >
                                {showcaseProducts.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.nome}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <DetailsEditor
                              subitens={item.subitens || []}
                              suggestions={detailSuggestions}
                              onChange={(next) => handleUpdateSubitens(item.id, next)}
                              onCommitNew={ensureDetailPreset}
                            />
                          </div>
                        ) : (
                          <div>
                            <DescriptionCombobox
                              value={item.descricao}
                              presets={presets}
                              onChangeText={(text) => handleUpdateItem(item.id, "descricao", text)}
                              onSelectPreset={(preset) => applyPreset(item.id, preset)}
                              onCommitNew={(text) => ensureItemPreset(item.id, text)}
                              showLabel={false}
                              className="w-full bg-slate-50 border border-slate-200 text-xs h-9 font-medium rounded-md px-3 outline-none focus-visible:ring-1 focus-visible:ring-[hsl(28_85%_45%)]"
                            />
                            <DetailsEditor
                              subitens={item.subitens || []}
                              suggestions={detailSuggestions}
                              onChange={(next) => handleUpdateSubitens(item.id, next)}
                              onCommitNew={ensureDetailPreset}
                            />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                            Categoria
                          </label>
                          <Select
                            disabled={isStockItem}
                            value={item.tipo_custo}
                            onChange={(e) => handleUpdateItem(item.id, "tipo_custo", e.target.value as ItemType)}
                            className="h-9 py-0 px-2 text-xs bg-slate-50 border-slate-200 font-medium"
                          >
                            <option value="MOVEIS_MDF">MDF/Marcenaria</option>
                            <option value="FERRAGENS_ESPECIAIS">Ferragens Esp.</option>
                            <option value="MAO_DE_OBRA">Mão de Obra</option>
                            <option value="OUTROS">Outros</option>
                          </Select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                            Quantidade
                          </label>
                          <Input
                            type="number"
                            min="1"
                            required
                            className="bg-slate-50 border-slate-200 text-center h-9 text-xs font-bold"
                            value={item.quantidade}
                            onChange={(e) => handleUpdateItem(item.id, "quantidade", Number(e.target.value))}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-50">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                            Precificação
                          </label>
                          {isStockItem ? (
                            <div className="flex items-center gap-1.5 h-9 bg-slate-50 border border-slate-200 px-2 rounded-lg">
                              <Input
                                type="number"
                                step="0.1"
                                min="1"
                                max="10"
                                required
                                className="w-12 border-none bg-transparent text-center h-7 text-xs font-black p-0"
                                value={item.markup || 2.2}
                                onChange={(e) => handleUpdateItem(item.id, "markup", Number(e.target.value))}
                              />
                              <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Markup</span>
                            </div>
                          ) : (
                            <div className="relative flex items-center">
                              <span className="text-[10px] text-slate-400 absolute left-2.5 font-black">R$</span>
                              <Input
                                type="number"
                                min="0"
                                required
                                className="bg-slate-50 border-slate-200 pl-7 text-xs h-9 font-bold"
                                value={item.valor_unitario}
                                onChange={(e) => handleUpdateItem(item.id, "valor_unitario", Number(e.target.value))}
                              />
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                            Valor Total
                          </label>
                          <div className="h-9 bg-slate-100 border border-slate-200 flex items-center px-3 rounded-lg text-xs font-black text-slate-800">
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.valor_total)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* Bloco 3: Observações internas */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground block">
            Observações internas (opcional, não impressas no PDF)
          </label>
          <textarea
            className="w-full min-h-[80px] rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
          />
        </div>

        {/* Bloco 4: Fechamento Financeiro */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch border-t border-border/40 pt-5">
          <div className="space-y-1.5 rounded-xl border border-border/30 bg-slate-50/80 p-3">
            <span className="text-xs text-muted-foreground block">Subtotal</span>
            <span className="text-lg font-bold text-foreground block">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(subtotal)}
            </span>
          </div>

          <div className="space-y-1.5 rounded-xl border border-border/30 bg-slate-50/80 p-3">
            <label className="text-xs font-semibold text-muted-foreground block">Desconto (R$)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">R$</span>
              <Input
                type="number"
                min="0"
                max={subtotal}
                className="pl-8 bg-white border-border/40 h-10"
                value={desconto}
                onChange={(e) => setDesconto(Math.min(subtotal, Math.max(0, Number(e.target.value))))}
              />
            </div>
          </div>

          <div className="space-y-1.5 rounded-xl border border-primary/20 bg-primary/5 p-3 sm:col-span-1">
            <span className="text-xs text-muted-foreground block font-medium flex items-center">
              <Calculator className="h-3.5 w-3.5 mr-1 text-primary" /> Valor final
            </span>
            <span className="text-xl sm:text-2xl font-black tracking-tight text-gradient-gold block">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valorFinal)}
            </span>
          </div>
        </div>

        {/* Baixa no Estoque Checkbox */}
        {items.some(item => item.inventoryItemId) && (
          <div className="flex items-center gap-2 p-3.5 rounded-lg border border-cyan-500/20 bg-cyan-500/5 my-4">
            <input
              type="checkbox"
              id="baixarEstoque"
              checked={baixarEstoque}
              onChange={(e) => setBaixarEstoque(e.target.checked)}
              className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 border-cyan-300 cursor-pointer"
            />
            <label htmlFor="baixarEstoque" className="text-xs font-semibold text-cyan-700 cursor-pointer">
              Dar baixa automática nos insumos e ferragens selecionados do estoque físico ao salvar
            </label>
          </div>
        )}

        {/* Ações */}
        <div className="sticky bottom-0 z-10 -mx-1 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t border-border/40 bg-card/95 backdrop-blur-sm pt-4 pb-1">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="font-semibold px-6 w-full sm:w-auto">
            {loading ? "Gravando..." : "Salvar proposta"}
          </Button>
        </div>

      </form>
      )}

      {activeBuilderTab === "briefing" && briefingData && (
        <div className="space-y-5 animate-in fade-in duration-200 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-2 border-b border-slate-200/60 pb-3">
            <Sparkles className="h-5 w-5 text-emerald-500" />
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                Ficha Técnica do Lead de Formulário
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Use estas respostas e especificações inseridas pelo cliente para desenhar a proposta comercial ideal.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Card 1: Ambientes e Escopo */}
            <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-xs space-y-3.5">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">
                📋 1. Ambientes & Escopo
              </h4>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-500 font-semibold block mb-1">Ambientes desejados:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(() => {
                      try {
                        const list = JSON.parse(briefingData.ambientes);
                        return list.map((a: any, idx: number) => (
                          <span key={idx} className="px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-bold text-[11px]">
                            {a.nome}{a.opcao ? ` (${a.opcao})` : ""}
                          </span>
                        ));
                      } catch (e) {
                        return <span className="text-slate-700 font-bold">{briefingData.ambientes}</span>;
                      }
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50">
                  <div>
                    <span className="text-slate-500 font-semibold block">Tipo do imóvel:</span>
                    <strong className="text-slate-900">{briefingData.tipo_imovel}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">Fase da compra:</span>
                    <strong className="text-slate-900">{briefingData.fase_projeto}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Status e Design */}
            <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-xs space-y-3.5">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">
                🏠 2. Status do Imóvel & Design
              </h4>
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 font-semibold block">Imóvel pronto?</span>
                    <strong className="text-slate-900">{briefingData.pronto}</strong>
                  </div>
                  {briefingData.data_chaves && (
                    <div>
                      <span className="text-slate-500 font-semibold block">Entrega das chaves:</span>
                      <strong className="text-slate-900">{briefingData.data_chaves}</strong>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50">
                  <div>
                    <span className="text-slate-500 font-semibold block">Já possui projeto?</span>
                    <strong className="text-slate-900">{briefingData.tem_projeto}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">Estilo preferido:</span>
                    <strong className="text-slate-900">{briefingData.estilo}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Investimento */}
            <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-xs space-y-3.5">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">
                ⏳ 3. Expectativa de Orçamento & Prazos
              </h4>
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 font-semibold block">Pretende gastar (Investimento):</span>
                    <strong className="text-slate-900 text-emerald-600 font-black">{briefingData.faixa_investimento || "Não informado"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">Pretende iniciar:</span>
                    <strong className="text-slate-900 font-bold">{briefingData.prazo_inicio}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Links de Referências */}
            <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-xs space-y-3.5">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">
                🔗 4. Arquivos & Referências Anexadas
              </h4>
              <div className="space-y-2 text-xs">
                {briefingData.pinterest_link && (
                  <div>
                    <span className="text-slate-500 font-semibold block">Painel do Pinterest:</span>
                    <a 
                      href={briefingData.pinterest_link} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-primary hover:underline font-bold inline-flex items-center gap-1"
                    >
                      Ver Pinterest <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                {briefingData.referencia_url && (
                  <div>
                    <span className="text-slate-500 font-semibold block">Arquivo de referência / Planta:</span>
                    <a 
                      href={briefingData.referencia_url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-emerald-600 hover:underline font-bold inline-flex items-center gap-1"
                    >
                      Baixar arquivo técnico <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                {!briefingData.pinterest_link && !briefingData.referencia_url && (
                  <span className="text-muted-foreground italic">Nenhuma referência compartilhada pelo cliente.</span>
                )}
              </div>
            </div>

          </div>

          <div className="flex justify-end pt-3 border-t border-slate-200/50">
            <Button
              type="button"
              onClick={() => setActiveBuilderTab("items")}
              className="text-xs font-bold cursor-pointer bg-slate-900 text-white hover:bg-slate-800"
            >
              ← Ir para a Tabela Comercial
            </Button>
          </div>
        </div>
      )}

      <Dialog
        isOpen={confirmOpen}
        onClose={() => {
          if (!loading) setConfirmOpen(false);
        }}
        className="max-w-lg w-full"
      >
        <div className="space-y-4 pr-6">
          <div>
            <h3 className="text-lg font-bold text-foreground">Confirmar emissão</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Revise o resumo antes de gravar a proposta.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-slate-500 font-medium">Itens</span>
              <span className="font-bold text-slate-800">{items.length}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500 font-medium">Validade</span>
              <span className="font-bold text-slate-800">
                {validade ? validade.split("-").reverse().join("/") : "—"}
              </span>
            </div>
            {desconto > 0 ? (
              <div className="flex justify-between gap-3">
                <span className="text-slate-500 font-medium">Desconto</span>
                <span className="font-bold text-emerald-700">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(desconto)}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between gap-3 pt-2 border-t border-slate-200">
              <span className="text-slate-600 font-semibold">Valor final</span>
              <span className="font-black text-amber-700">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valorFinal)}
              </span>
            </div>
            {partnerId ? (
              <div className="flex justify-between gap-3">
                <span className="text-slate-500 font-medium">Parceiro</span>
                <span className="font-bold text-slate-800 text-right truncate max-w-[60%]">
                  {partners.find((p) => p.id === partnerId)?.nome || "—"}
                </span>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2 max-h-52 overflow-y-auto">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Itens da proposta
            </p>
            <ul className="space-y-2">
              {items.map((item, idx) => (
                <li
                  key={item.id}
                  className="text-xs border-b border-slate-100 last:border-0 pb-2 last:pb-0"
                >
                  <p className="font-bold text-slate-800">
                    <span className="text-slate-400 font-semibold mr-1">{idx + 1}.</span>
                    {item.descricao || "Sem título"}
                    <span className="text-slate-400 font-medium">
                      {" "}
                      · qtd {item.quantidade} ·{" "}
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(item.valor_total)}
                    </span>
                  </p>
                  {(item.subitens || []).length > 0 ? (
                    <p className="text-[11px] text-slate-500 mt-0.5 pl-4 leading-snug">
                      {(item.subitens || []).join(" • ")}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => setConfirmOpen(false)}
            >
              Voltar
            </Button>
            <Button
              type="button"
              className="font-bold"
              disabled={loading}
              onClick={() => void handleConfirmSave()}
            >
              {loading ? "Gravando..." : "Confirmar e emitir"}
            </Button>
          </div>
        </div>
      </Dialog>

      <ActionDialogHost dialog={dialog} />
    </div>
  );
}
