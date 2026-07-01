"use client";

import React, { useState, useEffect } from "react";
import { createQuote, type ItemType } from "@/app/actions/quotes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Plus, Trash2, ShieldCheck, DollarSign, Calculator, Percent } from "lucide-react";

interface QuoteBuilderProps {
  projectId: string;
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
}

// Modelos pré-definidos de Propostas
const TEMPLATES = {
  PREMIUM: {
    nome: "Template Premium (Luxo)",
    observacoes: "Mdf Lacca e texturas especiais com corrediças invisíveis e amortecimento Blum. Detalhes em vidro Reflecta e iluminação em fitas de LED embutidas. Garantia estendida de 10 anos da Móveis Unghero. Montagem com equipe própria especializada.",
    prazo: "45 dias úteis",
    items: [
      { descricao: "Móveis planejados em MDF Lacca e texturas amadeiradas nobres", quantidade: 1, tipo_custo: "MOVEIS_MDF" as ItemType, valor_unitario: 42000 },
      { descricao: "Ferragens de alta tecnologia invisíveis com amortecedores Blum/Hettich", quantidade: 1, tipo_custo: "FERRAGENS_ESPECIAIS" as ItemType, valor_unitario: 12000 },
      { descricao: "Fitas de LED de alto brilho embutidas em perfis de alumínio com sensores de toque", quantidade: 1, tipo_custo: "OUTROS" as ItemType, valor_unitario: 3500 },
      { descricao: "Mão de obra qualificada para projeto técnico detalhado e montagem fina", quantidade: 1, tipo_custo: "MAO_DE_OBRA" as ItemType, valor_unitario: 8000 }
    ]
  },
  ECONOMICO: {
    nome: "Template Essencial (Custo-Benefício)",
    observacoes: "Mdf Branco Tx e texturas padrão sob medida. Ferragens telescópicas zincadas padrão com excelente resistência e durabilidade. Garantia de 5 anos da Móveis Unghero.",
    prazo: "30 dias úteis",
    items: [
      { descricao: "Móveis planejados em MDF texturizado padrão e Branco TX", quantidade: 1, tipo_custo: "MOVEIS_MDF" as ItemType, valor_unitario: 22000 },
      { descricao: "Ferragens telescópicas e dobradiças padrão de alta durabilidade", quantidade: 1, tipo_custo: "FERRAGENS_ESPECIAIS" as ItemType, valor_unitario: 3000 },
      { descricao: "Mão de obra de marcenaria de alto nível e instalação", quantidade: 1, tipo_custo: "MAO_DE_OBRA" as ItemType, valor_unitario: 5000 }
    ]
  },
  CORPORATIVO: {
    nome: "Template Corporativo (Escritórios)",
    observacoes: "Móveis ergonômicos e duráveis para escritórios comerciais em MDF de alta densidade 18mm e 25mm. Prazos de montagem especiais fora do horário comercial (noturno/sábados). Garantia contratual de 3 anos.",
    prazo: "25 dias úteis",
    items: [
      { descricao: "Estações de trabalho, mesas e divisórias em MDF texturizado 25mm", quantidade: 1, tipo_custo: "MOVEIS_MDF" as ItemType, valor_unitario: 28000 },
      { descricao: "Sistemas de gerenciamento de fiação e tomadas embutidas", quantidade: 1, tipo_custo: "FERRAGENS_ESPECIAIS" as ItemType, valor_unitario: 4500 },
      { descricao: "Serviço de montagem noturna especial para não interromper a operação comercial", quantidade: 1, tipo_custo: "MAO_DE_OBRA" as ItemType, valor_unitario: 7500 }
    ]
  }
};

export default function QuoteBuilder({ projectId, onSuccess, onCancel }: QuoteBuilderProps) {
  const [template, setTemplate] = useState<"CUSTOM" | "PREMIUM" | "ECONOMICO" | "CORPORATIVO">("PREMIUM");
  const [observacoes, setObservacoes] = useState(TEMPLATES.PREMIUM.observacoes);
  const [validade, setValidade] = useState(() => {
    // Validade padrão: 15 dias a partir de hoje
    const date = new Date();
    date.setDate(date.getDate() + 15);
    return date.toISOString().split("T")[0];
  });
  const [items, setItems] = useState<QuoteItemInput[]>([]);
  const [desconto, setDesconto] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // Carrega itens do template inicial
  useEffect(() => {
    if (template !== "CUSTOM") {
      const templateData = TEMPLATES[template];
      setObservacoes(templateData.observacoes);
      const newItems = templateData.items.map((item, idx) => ({
        id: `temp-${idx}-${Date.now()}`,
        descricao: item.descricao,
        quantidade: item.quantidade,
        tipo_custo: item.tipo_custo,
        valor_unitario: item.valor_unitario,
        valor_total: item.quantidade * item.valor_unitario
      }));
      setItems(newItems);
    }
  }, [template]);

  // Adicionar uma nova linha de item vazia
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
    setTemplate("CUSTOM");
  };

  // Remover uma linha de item
  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
    setTemplate("CUSTOM");
  };

  // Atualizar campo do item na tabela
  const handleUpdateItem = (id: string, field: keyof QuoteItemInput, value: any) => {
    const updated = items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === "quantidade" || field === "valor_unitario") {
          updatedItem.valor_total = Number(updatedItem.quantidade) * Number(updatedItem.valor_unitario);
        }
        return updatedItem;
      }
      return item;
    });
    setItems(updated);
    setTemplate("CUSTOM");
  };

  // Cálculos comerciais
  const subtotal = items.reduce((sum, item) => sum + item.valor_total, 0);
  const valorFinal = Math.max(0, subtotal - desconto);

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert("Por favor, adicione pelo menos um item comercial no orçamento.");
      return;
    }

    setLoading(true);

    const inputData = {
      subtotal,
      desconto,
      valor_final: valorFinal,
      validade,
      observacoes,
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
      onSuccess(result.data);
    } else {
      alert("Falha ao salvar a proposta comercial.");
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
            Crie tabelas comerciais detalhadas e exporte capas e conceitos elegantes para o cliente.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Bloco 1: Escolha do Modelo de Proposta */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Modelo de Proposta Base (Template)
            </label>
            <Select
              value={template}
              onChange={(e) => setTemplate(e.target.value as any)}
            >
              <option value="PREMIUM">Template Premium (Luxo)</option>
              <option value="ECONOMICO">Template Essencial (Custo-Benefício)</option>
              <option value="CORPORATIVO">Template Corporativo (Escritórios)</option>
              <option value="CUSTOM">Orçamento Livre (Personalizado)</option>
            </Select>
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
          <div className="p-4 bg-black/20 border-b border-border/40 flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Tabela Comercial de Itens
            </span>
            <Button type="button" onClick={handleAddItem} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" /> Adicionar Item
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-border/40 bg-black/5 text-muted-foreground text-xs font-semibold uppercase">
                  <th className="p-3 w-1/2">Descrição do Insumo / Serviço</th>
                  <th className="p-3 w-28">Categoria</th>
                  <th className="p-3 w-20 text-center">Qtd</th>
                  <th className="p-3 w-32">Valor Unit.</th>
                  <th className="p-3 w-32">Total</th>
                  <th className="p-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-xs text-muted-foreground">
                      Tabela vazia. Clique em "Adicionar Item" para iniciar.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="hover:bg-card/20 transition-colors">
                      <td className="p-2">
                        <Input
                          required
                          placeholder="Ex: Cozinha sob medida MDF Freijó 18mm"
                          value={item.descricao}
                          onChange={(e) => handleUpdateItem(item.id, "descricao", e.target.value)}
                          className="bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 px-1 py-0.5 h-8 text-sm"
                        />
                      </td>
                      <td className="p-2">
                        <Select
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bloco 3: Observações / Detalhamento do Projeto */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground block">
            Descritivo Técnico & Condições Gerais (Será impresso na Página 2 e 4)
          </label>
          <textarea
            required
            className="w-full min-h-[100px] rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
            value={observacoes}
            onChange={(e) => {
              setObservacoes(e.target.value);
              setTemplate("CUSTOM");
            }}
            placeholder="Descreva detalhes de acabamento do MDF, sistemas, condições de instalação, garantia..."
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
    </div>
  );
}
