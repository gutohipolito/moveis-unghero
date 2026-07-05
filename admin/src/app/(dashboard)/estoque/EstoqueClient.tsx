"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import PrivacyToggle from "@/components/PrivacyToggle";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  createSupplierAction, 
  updateSupplierAction, 
  deleteSupplierAction, 
  createInventoryItemAction, 
  updateInventoryItemAction, 
  deleteInventoryItemAction,
  type Supplier,
  type InventoryItem 
} from "@/app/actions/estoque";
import { ActionDialogHost, useActionDialog } from "@/components/ActionDialogHost";
import { 
  Package, 
  Users, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  AlertTriangle, 
  DollarSign, 
  Phone, 
  Mail, 
  Filter, 
  TrendingUp, 
  ChevronRight,
  Boxes,
  Settings2,
} from "lucide-react";

interface CategoryOption {
  value: string;
  label: string;
}

interface EstoqueClientProps {
  initialSuppliers: Supplier[];
  initialInventory: InventoryItem[];
  companyId: string;
  categoryOptions: CategoryOption[];
}

const FALLBACK_CATEGORIES: Record<string, string> = {
  CHAPAS_MDF: "Chapas MDF",
  FERRAGENS: "Ferragens",
  ILUMINACAO: "Iluminação",
  TINTAS_QUIMICOS: "Tintas & Químicos",
  OUTROS: "Outros",
};

const CATEGORY_COLORS: Record<string, string> = {
  CHAPAS_MDF: "bg-amber-500/10 text-amber-700 border-amber-200",
  FERRAGENS: "bg-blue-500/10 text-blue-700 border-blue-200",
  ILUMINACAO: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  TINTAS_QUIMICOS: "bg-purple-500/10 text-purple-700 border-purple-200",
  OUTROS: "bg-slate-500/10 text-slate-700 border-slate-200"
};

export default function EstoqueClient({
  initialSuppliers,
  initialInventory,
  companyId,
  categoryOptions,
}: EstoqueClientProps) {
  const dialog = useActionDialog();
  const { showSuccess, showError, confirmAction } = dialog;
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);

  const categories = useMemo(() => {
    const map: Record<string, string> = { ...FALLBACK_CATEGORIES };
    categoryOptions.forEach((opt) => {
      map[opt.value] = opt.label;
    });
    return map;
  }, [categoryOptions]);

  const defaultCategory = categoryOptions[0]?.value ?? "CHAPAS_MDF";
  
  // Controle de abas: "estoque" ou "fornecedores"
  const [activeTab, setActiveTab] = useState<"estoque" | "fornecedores">("estoque");

  // Filtros & Buscas
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL"); // ALL, CRITICO, OK, ESGOTADO

  // Modais
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Estados de Formulário - Fornecedor
  const [supplierNome, setSupplierNome] = useState("");
  const [supplierCnpj, setSupplierCnpj] = useState("");
  const [supplierTelefone, setSupplierTelefone] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [supplierMaterial, setSupplierMaterial] = useState("");

  // Estados de Formulário - Item do Estoque
  const [itemNome, setItemNome] = useState("");
  const [itemCategoria, setItemCategoria] = useState<string>(defaultCategory);
  const [itemQuantidade, setItemQuantidade] = useState("");
  const [itemMinima, setItemMinima] = useState("");
  const [itemPreco, setItemPreco] = useState("");
  const [itemSupplierId, setItemSupplierId] = useState("");

  // Filtragem da lista de Estoque
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.nome.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.supplierName && item.supplierName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = filterCategory === "ALL" || item.categoria === filterCategory;
    
    let matchesStatus = true;
    if (filterStatus === "CRITICO") {
      matchesStatus = item.quantidade > 0 && item.quantidade < item.minima;
    } else if (filterStatus === "OK") {
      matchesStatus = item.quantidade >= item.minima;
    } else if (filterStatus === "ESGOTADO") {
      matchesStatus = item.quantidade <= 0;
    }

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Filtragem da lista de Fornecedores
  const filteredSuppliers = suppliers.filter(sup => {
    return sup.nome.toLowerCase().includes(searchQuery.toLowerCase()) || 
           sup.cnpj.includes(searchQuery) || 
           sup.principalMaterial.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Métricas do Estoque
  const totalStockValue = inventory.reduce((acc, item) => acc + (item.quantidade * item.precoCusto), 0);
  const criticalItemsCount = inventory.filter(item => item.quantidade < item.minima).length;
  const outOfStockCount = inventory.filter(item => item.quantidade <= 0).length;

  // Reset Formulário Fornecedor
  const resetSupplierForm = () => {
    setSupplierNome("");
    setSupplierCnpj("");
    setSupplierTelefone("");
    setSupplierEmail("");
    setSupplierMaterial("");
    setEditingSupplier(null);
  };

  // Reset Formulário Item Estoque
  const resetItemForm = () => {
    setItemNome("");
    setItemCategoria(defaultCategory);
    setItemQuantidade("");
    setItemMinima("");
    setItemPreco("");
    setItemSupplierId(suppliers[0]?.id || "");
    setEditingItem(null);
  };

  // CRUD Fornecedores
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierNome || !supplierCnpj) return;

    const data = {
      nome: supplierNome,
      cnpj: supplierCnpj,
      telefone: supplierTelefone,
      email: supplierEmail,
      principalMaterial: supplierMaterial
    };

    if (editingSupplier) {
      const res = await updateSupplierAction(editingSupplier.id, data);
      if (res.success) {
        setSuppliers(suppliers.map(s => s.id === editingSupplier.id ? { ...s, ...data } : s));
        setIsSupplierModalOpen(false);
        resetSupplierForm();
        showSuccess("Fornecedor atualizado", `${supplierNome} foi salvo com sucesso.`);
      } else {
        showError("Erro ao salvar", "Não foi possível atualizar o fornecedor.");
      }
    } else {
      const res = await createSupplierAction({ ...data, company_id: companyId });
      if (res.success) {
        setSuppliers([...suppliers, res.supplier]);
        setIsSupplierModalOpen(false);
        resetSupplierForm();
        showSuccess("Fornecedor cadastrado", `${supplierNome} foi adicionado à base de fornecedores.`);
      } else {
        showError("Erro ao cadastrar", "Não foi possível cadastrar o fornecedor.");
      }
    }
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setSupplierNome(supplier.nome);
    setSupplierCnpj(supplier.cnpj);
    setSupplierTelefone(supplier.telefone);
    setSupplierEmail(supplier.email);
    setSupplierMaterial(supplier.principalMaterial);
    setIsSupplierModalOpen(true);
  };

  const handleDeleteSupplier = (id: string, nome: string) => {
    confirmAction({
      title: "Remover fornecedor?",
      message: `${nome} será removido. Os insumos vinculados ficarão sem fornecedor associado.`,
      confirmLabel: "Sim, remover",
      onConfirm: async () => {
        const res = await deleteSupplierAction(id);
        if (res.success) {
          setSuppliers(suppliers.filter(s => s.id !== id));
          setInventory(inventory.map(item => item.supplierId === id ? { ...item, supplierId: undefined, supplierName: "Sem Vínculo" } : item));
          showSuccess("Fornecedor removido", `${nome} foi excluído da base.`);
        } else {
          showError("Erro ao remover", "Não foi possível remover o fornecedor.");
        }
      },
    });
  };

  // CRUD Itens Estoque
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemNome || !itemQuantidade || !itemPreco) return;

    const data = {
      nome: itemNome,
      categoria: itemCategoria as InventoryItem["categoria"],
      quantidade: Number(itemQuantidade),
      minima: Number(itemMinima || 0),
      precoCusto: Number(itemPreco),
      supplierId: itemSupplierId || undefined
    };

    if (editingItem) {
      const res = await updateInventoryItemAction(editingItem.id, data);
      if (res.success) {
        setInventory(inventory.map(i => i.id === editingItem.id ? { ...i, ...res.item } : i));
        setIsItemModalOpen(false);
        resetItemForm();
        showSuccess("Insumo atualizado", `${itemNome} foi salvo no estoque.`);
      } else {
        showError("Erro ao salvar", "Não foi possível atualizar o insumo.");
      }
    } else {
      const res = await createInventoryItemAction({ ...data, company_id: companyId });
      if (res.success) {
        setInventory([...inventory, res.item]);
        setIsItemModalOpen(false);
        resetItemForm();
        showSuccess("Insumo cadastrado", `${itemNome} foi adicionado ao estoque.`);
      } else {
        showError("Erro ao cadastrar", "Não foi possível cadastrar o insumo.");
      }
    }
  };

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setItemNome(item.nome);
    setItemCategoria(item.categoria);
    setItemQuantidade(item.quantidade.toString());
    setItemMinima(item.minima.toString());
    setItemPreco(item.precoCusto.toString());
    setItemSupplierId(item.supplierId || "");
    setIsItemModalOpen(true);
  };

  const handleDeleteItem = (id: string, nome: string) => {
    confirmAction({
      title: "Remover insumo?",
      message: `${nome} será removido permanentemente do controle de estoque.`,
      confirmLabel: "Sim, remover",
      onConfirm: async () => {
        const res = await deleteInventoryItemAction(id);
        if (res.success) {
          setInventory(inventory.filter(i => i.id !== id));
          showSuccess("Insumo removido", `${nome} foi excluído do estoque.`);
        } else {
          showError("Erro ao remover", "Não foi possível remover o insumo.");
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* ─── CABEÇALHO ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Boxes className="h-7 w-7 text-primary" /> Estoque & Fornecedores
            </h1>
            <PrivacyToggle />
          </div>
          <p className="text-sm text-muted-foreground">Controle de insumos e matérias-primas da Móveis Unghero.</p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === "estoque" ? (
            <Button 
              onClick={() => { resetItemForm(); setIsItemModalOpen(true); }} 
              className="font-bold btn-metallic gap-1.5"
            >
              <Plus className="h-4.5 w-4.5" /> Novo Insumo / Item
            </Button>
          ) : (
            <Button 
              onClick={() => { resetSupplierForm(); setIsSupplierModalOpen(true); }} 
              className="font-bold btn-metallic gap-1.5"
            >
              <Plus className="h-4.5 w-4.5" /> Novo Fornecedor
            </Button>
          )}
        </div>
      </div>

      {/* ─── CARDS DE MÉTRICAS ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-5 glass-card flex items-center gap-4 relative overflow-hidden">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Patrimônio em Estoque</span>
            <strong className="text-2xl font-black text-foreground mt-0.5 block privacy-value">
              {totalStockValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </strong>
          </div>
        </Card>

        <Card className="p-5 glass-card flex items-center gap-4 relative overflow-hidden">
          <div className={`p-3 rounded-xl ${criticalItemsCount > 0 ? "bg-rose-500/10 text-rose-600" : "bg-emerald-500/10 text-emerald-600"}`}>
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Itens com Estoque Baixo</span>
            <strong className="text-2xl font-black text-foreground mt-0.5 block">
              {criticalItemsCount} <span className="text-xs font-semibold text-muted-foreground">de {inventory.length} itens</span>
            </strong>
          </div>
        </Card>

        <Card className="p-5 glass-card flex items-center gap-4 relative overflow-hidden">
          <div className={`p-3 rounded-xl ${outOfStockCount > 0 ? "bg-red-500/10 text-red-600" : "bg-cyan-500/10 text-cyan-600"}`}>
            <Package className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Itens Esgotados</span>
            <strong className="text-2xl font-black text-foreground mt-0.5 block">
              {outOfStockCount} <span className="text-xs font-semibold text-muted-foreground">indisponíveis</span>
            </strong>
          </div>
        </Card>
      </div>

      {/* ─── SELETOR DE ABAS & FILTROS ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Abas */}
        <div className="flex gap-1.5 p-1 bg-slate-100/80 border border-slate-200/50 rounded-xl w-fit">
          <button
            onClick={() => { setActiveTab("estoque"); setSearchQuery(""); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "estoque" ? "bg-white text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Boxes className="h-4 w-4" /> Controle de Estoque
          </button>
          <button
            onClick={() => { setActiveTab("fornecedores"); setSearchQuery(""); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "fornecedores" ? "bg-white text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Users className="h-4 w-4" /> Fornecedores Parceiros
          </button>
        </div>

        {/* Filtros e Busca */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-1 lg:max-w-2xl justify-end">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={activeTab === "estoque" ? "Buscar insumo ou fornecedor..." : "Buscar fornecedor por nome, CNPJ ou material..."}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-50 border-border text-sm"
            />
          </div>

          {activeTab === "estoque" && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-muted-foreground flex items-center gap-1"><Filter className="h-3 w-3" /> Categoria:</span>
                <select
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value)}
                  className="bg-slate-50 border border-border rounded-lg text-xs p-2.5 focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="ALL">Todas</option>
                  {Object.entries(categories).map(([key, value]) => (
                    <option key={key} value={key}>{value}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-muted-foreground flex items-center gap-1"><Filter className="h-3 w-3" /> Status:</span>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="bg-slate-50 border border-border rounded-lg text-xs p-2.5 focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="ALL">Todos</option>
                  <option value="CRITICO">Estoque Baixo</option>
                  <option value="OK">Estoque OK</option>
                  <option value="ESGOTADO">Esgotados</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── TABELAS DE DADOS ─── */}
      {activeTab === "estoque" ? (
        <Card className="glass-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-border/40">
                  <th className="p-4">Material / Insumo</th>
                  <th className="p-4 text-center">Categoria</th>
                  <th className="p-4 text-center">Estoque Atual</th>
                  <th className="p-4 text-center">Estoque Mínimo</th>
                  <th className="p-4 text-right">Preço de Custo</th>
                  <th className="p-4 text-right">Valor Total</th>
                  <th className="p-4 text-center">Fornecedor Associado</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-sm text-muted-foreground">
                      Nenhum item encontrado no estoque com os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map(item => {
                    const isCritical = item.quantidade < item.minima;
                    const isOutOfStock = item.quantidade <= 0;
                    const catName = categories[item.categoria] || item.categoria;
                    const catBadge = CATEGORY_COLORS[item.categoria] || "bg-slate-100 text-slate-600";

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-bold text-foreground">{item.nome}</td>
                        <td className="p-4 text-center">
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${catBadge}`}>
                            {catName}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`text-sm font-black px-2.5 py-1 rounded-lg ${isOutOfStock ? "bg-red-100 text-red-600 border border-red-200" : isCritical ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-emerald-50 text-emerald-600"}`}>
                            {item.quantidade}
                          </span>
                          {isOutOfStock && <span className="text-[9px] font-bold text-red-500 block mt-1">Esgotado!</span>}
                          {!isOutOfStock && isCritical && <span className="text-[9px] font-bold text-amber-600 block mt-1">Reposição Crítica!</span>}
                        </td>
                        <td className="p-4 text-center text-xs font-semibold text-muted-foreground">{item.minima} un</td>
                        <td className="p-4 text-right text-xs font-medium text-slate-600 privacy-value">
                          {item.precoCusto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </td>
                        <td className="p-4 text-right text-sm font-bold text-foreground privacy-value">
                          {(item.quantidade * item.precoCusto).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </td>
                        <td className="p-4 text-center">
                          <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                            {item.supplierName || "Sem Vínculo"}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleEditItem(item)}
                              className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-all cursor-pointer"
                              title="Editar insumo"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id, item.nome)}
                              className="p-2 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive transition-all cursor-pointer"
                              title="Remover insumo"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="glass-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-border/40">
                  <th className="p-4">Fornecedor / Razão Social</th>
                  <th className="p-4 text-center">CNPJ</th>
                  <th className="p-4 text-center">Material Principal</th>
                  <th className="p-4 text-center">Contato</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">
                      Nenhum fornecedor parceiro cadastrado.
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map(sup => (
                    <tr key={sup.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <div className="flex flex-col">
                          <strong className="text-sm font-bold text-foreground">{sup.nome}</strong>
                        </div>
                      </td>
                      <td className="p-4 text-center text-xs font-semibold text-slate-500">{sup.cnpj}</td>
                      <td className="p-4 text-center">
                        <span className="text-xs font-bold bg-primary/5 text-primary px-2.5 py-0.5 rounded-full border border-primary/20">
                          {sup.principalMaterial}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col items-center text-xs text-muted-foreground space-y-1">
                          <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {sup.telefone}</span>
                          <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {sup.email}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleEditSupplier(sup)}
                            className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-all cursor-pointer"
                            title="Editar fornecedor"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSupplier(sup.id, sup.nome)}
                            className="p-2 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive transition-all cursor-pointer"
                            title="Remover fornecedor"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ─── MODAL: FORNECEDOR (CADASTRAR / EDITAR) ─── */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}>
          <div className="bg-white border border-border w-full max-w-md rounded-2xl overflow-hidden shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div>
              <h3 className="text-lg font-bold text-foreground">{editingSupplier ? "Editar Fornecedor" : "Cadastrar Novo Fornecedor"}</h3>
              <p className="text-xs text-muted-foreground">Cadastre novos parceiros e marcas na base da Móveis Unghero.</p>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground block">Razão Social / Nome da Marca</label>
                <Input required value={supplierNome} onChange={e => setSupplierNome(e.target.value)}  className="border-border bg-slate-50 text-sm" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground block">CNPJ</label>
                  <Input required value={supplierCnpj} onChange={e => setSupplierCnpj(e.target.value)}  className="border-border bg-slate-50 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground block">Material Principal</label>
                  <Input required value={supplierMaterial} onChange={e => setSupplierMaterial(e.target.value)}  className="border-border bg-slate-50 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground block">E-mail Comercial</label>
                  <Input type="email" value={supplierEmail} onChange={e => setSupplierEmail(e.target.value)}  className="border-border bg-slate-50 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground block">Telefone Comercial</label>
                  <Input value={supplierTelefone} onChange={e => setSupplierTelefone(e.target.value)}  className="border-border bg-slate-50 text-sm" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsSupplierModalOpen(false)} className="text-xs font-bold">
                  Cancelar
                </Button>
                <Button type="submit" className="font-bold btn-metallic">
                  {editingSupplier ? "Salvar Alterações" : "Cadastrar Fornecedor"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: INSUMO (CADASTRAR / EDITAR) ─── */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}>
          <div className="bg-white border border-border w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div>
              <h3 className="text-lg font-bold text-foreground">{editingItem ? "Editar Insumo" : "Cadastrar Insumo no Estoque"}</h3>
              <p className="text-xs text-muted-foreground">Registre novos materiais para controle de marcenaria sob medida.</p>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground block">Nome do Material / Insumo</label>
                  <Input required value={itemNome} onChange={e => setItemNome(e.target.value)}  className="border-border bg-slate-50 text-sm" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-bold text-muted-foreground block">Categoria</label>
                    <Link
                      href="/cadastros?grupo=categorias_estoque"
                      className="text-[10px] font-semibold text-primary hover:underline inline-flex items-center gap-0.5"
                    >
                      <Settings2 className="h-3 w-3" />
                      Gerenciar categorias
                    </Link>
                  </div>
                  <select 
                    value={itemCategoria} 
                    onChange={e => setItemCategoria(e.target.value)} 
                    className="w-full bg-slate-50 border border-border rounded-lg text-sm p-2.5 focus:ring-1 focus:ring-primary outline-none"
                  >
                    {Object.entries(categories).map(([key, value]) => (
                      <option key={key} value={key}>{value}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground block">Estoque Atual (Qtd)</label>
                  <Input required type="number" value={itemQuantidade} onChange={e => setItemQuantidade(e.target.value)}  className="border-border bg-slate-50 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground block">Estoque Mínimo (Qtd)</label>
                  <Input required type="number" value={itemMinima} onChange={e => setItemMinima(e.target.value)}  className="border-border bg-slate-50 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground block">Preço de Custo (R$)</label>
                  <Input required type="number" step="0.01" value={itemPreco} onChange={e => setItemPreco(e.target.value)}  className="border-border bg-slate-50 text-sm" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground block">Fornecedor Principal</label>
                <select 
                  value={itemSupplierId} 
                  onChange={e => setItemSupplierId(e.target.value)} 
                  className="w-full bg-slate-50 border border-border rounded-lg text-sm p-2.5 focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="">Sem Vínculo / Não Cadastrado</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsItemModalOpen(false)} className="text-xs font-bold">
                  Cancelar
                </Button>
                <Button type="submit" className="font-bold btn-metallic">
                  {editingItem ? "Salvar Alterações" : "Cadastrar Insumo"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ActionDialogHost dialog={dialog} />
    </div>
  );
}
