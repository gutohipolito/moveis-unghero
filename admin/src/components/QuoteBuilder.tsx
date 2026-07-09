"use client";

import React, { useState, useEffect } from "react";
import { createQuote, getProjectBriefingAction, type ItemType } from "@/app/actions/quotes";
import { getInventoryAndSuppliers, deductInventoryAction, type InventoryItem } from "@/app/actions/estoque";
import { ActionDialogHost, useActionDialog } from "@/components/ActionDialogHost";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Plus, Trash2, Calculator, Sparkles, ExternalLink, Layers } from "lucide-react";
import { QUOTE_TEMPLATE_BASICO, QUOTE_TEMPLATE_ID, QUOTE_TEMPLATE_LABEL } from "@/lib/quoteTemplates";

interface QuoteBuilderProps {
  projectId: string;
  companyId: string;
  onSuccess: (newQuote: any) => void;
  onCancel: () => void;
}

interface QuoteItemInput {
  id: string;
  descricao: string;
  quantidade: number;
  tipo_custo: ItemType;
  valor_unitario: number;
  valor_total: number;
  inventoryItemId?: string;
  precoCusto?: number;
  markup?: number;
}


// Template único ativo no sistema
const ACTIVE_TEMPLATE = QUOTE_TEMPLATE_BASICO;

export default function QuoteBuilder({ projectId, companyId, onSuccess, onCancel }: QuoteBuilderProps) {
  const dialog = useActionDialog();
  const { showSuccess, showError } = dialog;
  const [observacoes, setObservacoes] = useState(ACTIVE_TEMPLATE.observacoes);
  const [validade, setValidade] = useState(() => {
    // Validade padrão: 15 dias a partir de hoje
    const date = new Date();
    date.setDate(date.getDate() + 15);
    return date.toISOString().split("T")[0];
  });
  const [items, setItems] = useState<QuoteItemInput[]>([]);
  const [desconto, setDesconto] = useState<number>(0);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [baixarEstoque, setBaixarEstoque] = useState(true);
  const [loading, setLoading] = useState(false);
  const [briefingData, setBriefingData] = useState<any | null>(null);
  const [clientOrigem, setClientOrigem] = useState<string>("");
  const [activeBuilderTab, setActiveBuilderTab] = useState<"items" | "briefing">("items");

  useEffect(() => {
    async function loadBriefing() {
      const res = await getProjectBriefingAction(projectId);
      if (res.success) {
        setBriefingData(res.briefing);
        setClientOrigem(res.clientOrigem || "");
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

  // Adicionar uma nova linha de item vazia (Item Livre)
  const handleAddItem = () => {
    const newItem: QuoteItemInput = {
      id: `item-${Date.now()}`,
      descricao: "",
      quantidade: 1,
      tipo_custo: "MOVEIS_MDF",
      valor_unitario: 0,
      valor_total: 0
    };
    setItems([...items, newItem]);
  };

  // Adicionar item do estoque
  const handleAddItemFromStock = () => {
    const defaultItem = inventory[0] || { id: "inv-1", nome: "Chapa MDF Guararapes Freijó Puro 18mm", precoCusto: 280.0, categoria: "CHAPAS_MDF" };
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
              descricao: selected.nome,
              precoCusto: selected.precoCusto,
              tipo_custo: mappedType,
              valor_unitario: selected.precoCusto * currentMarkup,
              valor_total: item.quantidade * (selected.precoCusto * currentMarkup)
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


  // Cálculos comerciais
  const subtotal = items.reduce((sum, item) => sum + item.valor_total, 0);
  const valorFinal = Math.max(0, subtotal - desconto);

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      showError("Orçamento vazio", "Adicione pelo menos um item comercial antes de salvar.");
      return;
    }

    setLoading(true);

    const inputData = {
      subtotal,
      desconto,
      valor_final: valorFinal,
      validade,
      observacoes,
      template_tipo: QUOTE_TEMPLATE_ID,
      items: items.map(item => ({
        descricao: item.descricao,
        quantidade: item.quantidade,
        tipo_custo: item.tipo_custo,
        valor_unitario: item.valor_unitario,
        valor_total: item.valor_total
      }))
    };

    const result = await createQuote(projectId, inputData);

    if (result.success && result.data) {
      // Dar baixa no estoque se o checkbox estiver ativo e houver itens de estoque
      if (baixarEstoque) {
        const itemsToDeduct = items
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-border/40 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gradient-gold">
            Construtor Visual de Proposta Comercial
          </h2>
          <p className="text-xs text-muted-foreground">
            Monte a tabela comercial e exporte o PDF com itens e valores.
          </p>
        </div>
      </div>

      {/* Abas opcionais para leads vindo de formulário */}
      {clientOrigem === "FORMULARIO" && (
        <div className="flex gap-1.5 p-1 bg-slate-100/80 border border-slate-200/50 rounded-xl w-fit select-none">
          <button
            type="button"
            onClick={() => setActiveBuilderTab("items")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeBuilderTab === "items" 
                ? "bg-white text-slate-800 shadow-xs" 
                : "text-muted-foreground hover:text-slate-700"
            }`}
          >
            <Layers className="h-4 w-4 text-amber-500" />
            1. Tabela Comercial do Orçamento
          </button>
          <button
            type="button"
            onClick={() => setActiveBuilderTab("briefing")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeBuilderTab === "briefing" 
                ? "bg-white text-slate-800 shadow-xs" 
                : "text-muted-foreground hover:text-slate-700"
            }`}
          >
            <Sparkles className="h-4 w-4 text-emerald-500 animate-pulse" />
            2. Respostas do Formulário (Briefing)
          </button>
        </div>
      )}

      {activeBuilderTab === "items" && (
        <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Bloco 1: Template e validade */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>

        {/* Bloco 2: Tabela Dinâmica de Itens */}
        <div className="rounded-xl border border-border/40 bg-black/10 overflow-hidden">
          <div className="p-4 bg-slate-100 border-b border-border/40 flex justify-between items-center flex-wrap gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Tabela Comercial de Itens
            </span>
            <div className="flex gap-2">
              <Button type="button" onClick={handleAddItem} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" /> + Item Livre
              </Button>
              <Button type="button" onClick={handleAddItemFromStock} size="sm" variant="outline" className="border-cyan-200 text-cyan-600 hover:bg-cyan-50">
                <Plus className="h-4 w-4 mr-1 text-cyan-500" /> + Insumo do Estoque
              </Button>
            </div>
          </div>

          {/* Visualização em Tabela para Desktop / Tablet (hidden md:block) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-border/40 bg-black/5 text-muted-foreground text-xs font-semibold uppercase">
                  <th className="p-3 w-5/12">Descrição do Insumo / Serviço</th>
                  <th className="p-3 w-28">Categoria</th>
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
                      Tabela vazia. Adicione um "Item Livre" ou um "Insumo do Estoque" para começar.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const isStockItem = !!item.inventoryItemId;

                    return (
                      <tr key={item.id} className="hover:bg-card/20 transition-colors">
                        <td className="p-2">
                          {isStockItem ? (
                            <div className="space-y-1">
                              <select
                                value={item.inventoryItemId}
                                onChange={(e) => handleUpdateItem(item.id, "inventoryItemId", e.target.value)}
                                className="w-full bg-slate-50 border border-border/50 rounded-lg text-sm p-1.5 focus:ring-1 focus:ring-primary outline-none font-semibold text-foreground"
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
                          ) : (
                            <Input
                              required
                              placeholder="Descrição do item ou ambiente"
                              value={item.descricao}
                              onChange={(e) => handleUpdateItem(item.id, "descricao", e.target.value)}
                              className="bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 px-1 py-0.5 h-8 text-sm"
                            />
                          )}
                        </td>
                        <td className="p-2">
                          <Select
                            disabled={isStockItem}
                            value={item.tipo_custo}
                            onChange={(e) => handleUpdateItem(item.id, "tipo_custo", e.target.value as ItemType)}
                            className="h-8 py-0 px-2 text-xs bg-transparent border-none focus:ring-0"
                          >
                            <option value="MOVEIS_MDF">MDF/Marcenaria</option>
                            <option value="FERRAGENS_ESPECIAIS">Ferragens Esp.</option>
                            <option value="MAO_DE_OBRA">Mão de Obra</option>
                            <option value="OUTROS">Outros</option>
                          </Select>
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            min="1"
                            required
                            className="bg-transparent border-none text-center focus-visible:ring-0 focus-visible:ring-offset-0 h-8 text-sm p-1"
                            value={item.quantidade}
                            onChange={(e) => handleUpdateItem(item.id, "quantidade", Number(e.target.value))}
                          />
                        </td>
                        <td className="p-2">
                          {isStockItem ? (
                            <div className="flex items-center gap-1 px-1">
                              <span className="text-[10px] text-muted-foreground">x</span>
                              <Input
                                type="number"
                                step="0.1"
                                min="1"
                                max="10"
                                required
                                className="w-16 bg-slate-50 border border-border/50 rounded-lg text-center h-8 text-sm font-bold"
                                value={item.markup || 2.2}
                                onChange={(e) => handleUpdateItem(item.id, "markup", Number(e.target.value))}
                                title="Markup Multiplicador"
                              />
                              <span className="text-[10px] text-muted-foreground font-semibold">Markup</span>
                            </div>
                          ) : (
                            <div className="flex items-center relative">
                              <span className="text-[10px] text-muted-foreground absolute left-1">R$</span>
                              <Input
                                type="number"
                                min="0"
                                required
                                className="bg-transparent border-none pl-6 focus-visible:ring-0 focus-visible:ring-offset-0 h-8 text-sm"
                                value={item.valor_unitario}
                                onChange={(e) => handleUpdateItem(item.id, "valor_unitario", Number(e.target.value))}
                              />
                            </div>
                          )}
                        </td>
                        <td className="p-2 font-semibold text-foreground">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.valor_total)}
                        </td>
                        <td className="p-2 text-center">
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
                Tabela vazia. Adicione um "Item Livre" ou um "Insumo do Estoque" para começar.
              </div>
            ) : (
              items.map((item, idx) => {
                const isStockItem = !!item.inventoryItemId;
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
                          Descrição do Insumo / Serviço
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
                        ) : (
                          <Input
                            required
                            placeholder="Descrição do item ou ambiente"
                            value={item.descricao}
                            onChange={(e) => handleUpdateItem(item.id, "descricao", e.target.value)}
                            className="bg-slate-50 border-slate-200 text-xs h-9 font-medium"
                          />
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
            placeholder="Anotações internas sobre o orçamento..."
          />
        </div>

        {/* Bloco 4: Fechamento Financeiro */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end border-t border-border/40 pt-6">
          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground block">Subtotal dos Itens</span>
            <span className="text-lg font-bold text-foreground block p-2 rounded-lg bg-secondary/50 border border-border/20">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(subtotal)}
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground block">Desconto (R$)</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs text-muted-foreground font-semibold">R$</span>
              <Input
                type="number"
                min="0"
                max={subtotal}
                className="pl-8 bg-black/10 border-border/40 focus-visible:ring-primary h-10"
                value={desconto}
                onChange={(e) => setDesconto(Math.min(subtotal, Math.max(0, Number(e.target.value))))}
              />
            </div>
          </div>

          <div className="space-y-1.5 p-3 rounded-xl border border-primary/20 bg-primary/5">
            <span className="text-xs text-muted-foreground block font-medium flex items-center">
              <Calculator className="h-3.5 w-3.5 mr-1 text-primary" /> Valor Final da Proposta
            </span>
            <span className="text-2xl font-black tracking-tight text-gradient-gold block">
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
        <div className="flex justify-end gap-3 border-t border-border/40 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="font-semibold px-6">
            {loading ? "Gravando Proposta..." : "Salvar Proposta Comercial"}
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

      <ActionDialogHost dialog={dialog} />
    </div>
  );
}
