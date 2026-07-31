"use client";

import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import InfoTooltip, { TooltipBody } from "@/components/ui/InfoTooltip";
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
import { getEstoqueLiveSnapshot } from "@/app/actions/liveSnapshots";
import { useLiveEntity } from "@/context/LiveSyncContext";
import { ActionDialogHost, useActionDialog } from "@/components/ActionDialogHost";
import { usePermissions } from "@/context/PermissionsContext";
import {
  canDeleteEstoque,
  canSeeEstoquePatrimonio,
} from "@/lib/permissions";
import { Dialog } from "@/components/ui/dialog";
import { compressImageFile } from "@/lib/imageCompression";
import { formatPhoneInput } from "@/lib/phone";
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
  ClipboardList,
  Star,
  Loader2,
  ImagePlus,
  Building2,
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

const CRM_STATUS_LABELS: Record<string, { label: string, color: string }> = {
  NOVO: { label: "Novo", color: "bg-blue-500/10 text-blue-700 border-blue-200" },
  EM_ANALISE: { label: "Em Análise", color: "bg-amber-500/10 text-amber-700 border-amber-200" },
  HOMOLOGADO: { label: "Homologado", color: "bg-emerald-500/10 text-emerald-700 border-emerald-200" },
  INATIVO: { label: "Inativo", color: "bg-slate-500/10 text-slate-700 border-slate-200" },
  BLOQUEADO: { label: "Bloqueado", color: "bg-rose-500/10 text-rose-700 border-rose-200" },
};

export default function EstoqueClient({
  initialSuppliers,
  initialInventory,
  companyId,
  categoryOptions,
}: EstoqueClientProps) {
  const dialog = useActionDialog();
  const { showSuccess, showError, confirmAction } = dialog;
  const { role, isReadOnly } = usePermissions();
  const isFactoryRole = role === "PRODUCAO";
  const canManageEstoque = !isReadOnly && !isFactoryRole;
  const canDelete = canDeleteEstoque(role);
  const showPatrimonio = canSeeEstoquePatrimonio(role);
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

  const syncEstoque = useCallback(async () => {
    const result = await getEstoqueLiveSnapshot(companyId);
    if (result.success) {
      if (result.suppliers) setSuppliers(result.suppliers);
      if (result.inventory) setInventory(result.inventory);
    }
  }, [companyId]);

  useLiveEntity("estoque", {
    sync: syncEstoque,
    enabled: !isSupplierModalOpen && !isItemModalOpen,
  });

  // Estados de Formulário - Fornecedor (cadastro rápido)
  const [supplierNome, setSupplierNome] = useState("");
  const [supplierNomeFantasia, setSupplierNomeFantasia] = useState("");
  const [supplierCnpj, setSupplierCnpj] = useState("");
  const [supplierTelefone, setSupplierTelefone] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [supplierLogoUrl, setSupplierLogoUrl] = useState("");
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cnpjError, setCnpjError] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const lastFetchedCnpjRef = useRef("");

  // Estados de Formulário - Item do Estoque
  const [itemNome, setItemNome] = useState("");
  const [itemCategoria, setItemCategoria] = useState<string>(defaultCategory);
  const [itemQuantidade, setItemQuantidade] = useState("");
  const [itemMinima, setItemMinima] = useState("");
  const [itemPreco, setItemPreco] = useState("");
  const [itemSupplierId, setItemSupplierId] = useState("");

  const formatCnpj = (value: string) => {
    let digits = value.replace(/\D/g, "").slice(0, 14);
    if (digits.length > 12) {
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
    }
    if (digits.length > 8) {
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    }
    if (digits.length > 5) {
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    }
    if (digits.length > 2) {
      return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    }
    return digits;
  };

  const fetchCompanyByCnpj = useCallback(async (cnpjValue: string) => {
    const clean = cnpjValue.replace(/\D/g, "");
    if (clean.length !== 14 || clean === lastFetchedCnpjRef.current) return;

    setCnpjLoading(true);
    setCnpjError(null);
    try {
      const { fetchCnpjCompany } = await import("@/lib/cnpjClient");
      const result = await fetchCnpjCompany(clean);
      if (!result.ok) {
        setCnpjError(result.error || "CNPJ não encontrado. Confira o número e tente de novo.");
        return;
      }

      const json = result.data;
      lastFetchedCnpjRef.current = clean;
      if (json.razao_social) setSupplierNome(json.razao_social);
      if (json.nome_fantasia) setSupplierNomeFantasia(json.nome_fantasia);
      if (json.email) setSupplierEmail(json.email);

      if (json.ddd_telefone_1) {
        const cleanTel = `${json.ddd_telefone_1}`.replace(/\D/g, "");
        if (cleanTel.length === 10 || cleanTel.length === 11) {
          setSupplierTelefone(formatPhoneInput(cleanTel));
        } else {
          setSupplierTelefone(`${json.ddd_telefone_1}`);
        }
      }
    } catch {
      setCnpjError("Não foi possível consultar o CNPJ agora.");
    } finally {
      setCnpjLoading(false);
    }
  }, []);

  useEffect(() => {
    const clean = supplierCnpj.replace(/\D/g, "");
    if (clean.length !== 14) {
      setCnpjError(null);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchCompanyByCnpj(clean);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [supplierCnpj, fetchCompanyByCnpj]);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoUploading(true);
    setCnpjError(null);
    try {
      const compressed = await compressImageFile(file, { maxDimension: 512, quality: 0.8 });
      const formData = new FormData();
      formData.append("file", compressed);
      const res = await fetch("/api/fornecedores/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok || !json?.success || !json.url) {
        showError("Upload", json?.error || "Não foi possível enviar o logo.");
        return;
      }
      setSupplierLogoUrl(json.url);
    } catch {
      showError("Upload", "Falha ao enviar o logo.");
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

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
           (sup.nomeFantasia || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
           sup.cnpj.includes(searchQuery) || 
           (sup.principalMaterial || "").toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Métricas do Estoque
  const totalStockValue = inventory.reduce((acc, item) => acc + (item.quantidade * item.precoCusto), 0);
  const criticalItemsCount = inventory.filter(item => item.quantidade < item.minima).length;
  const outOfStockCount = inventory.filter(item => item.quantidade <= 0).length;

  // Reset Formulário Fornecedor
  const resetSupplierForm = () => {
    setSupplierNome("");
    setSupplierNomeFantasia("");
    setSupplierCnpj("");
    setSupplierTelefone("");
    setSupplierEmail("");
    setSupplierLogoUrl("");
    setCnpjError(null);
    setCnpjLoading(false);
    setLogoUploading(false);
    lastFetchedCnpjRef.current = "";
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
    const cleanCnpj = supplierCnpj.replace(/\D/g, "");
    if (cleanCnpj.length !== 14) {
      setCnpjError("Informe um CNPJ válido com 14 dígitos.");
      return;
    }
    if (!supplierNome.trim()) {
      setCnpjError("Aguarde a busca do CNPJ ou confira o número.");
      return;
    }

    const data = {
      nome: supplierNome.trim(),
      nomeFantasia: supplierNomeFantasia.trim() || null,
      cnpj: formatCnpj(cleanCnpj),
      telefone: supplierTelefone,
      email: supplierEmail,
      principalMaterial: "",
      logoUrl: supplierLogoUrl || null,
    };

    if (editingSupplier) {
      const res = await updateSupplierAction(editingSupplier.id, companyId, data);
      if (res.success && res.supplier) {
        setSuppliers(suppliers.map(s => s.id === editingSupplier.id ? res.supplier! : s));
        setIsSupplierModalOpen(false);
        resetSupplierForm();
        showSuccess("Fornecedor atualizado", `${supplierNome} foi salvo com sucesso.`);
      } else {
        showError("Erro ao salvar", res.error || "Não foi possível atualizar o fornecedor.");
      }
    } else {
      const res = await createSupplierAction({ ...data, company_id: companyId });
      if (res.success && res.supplier) {
        setSuppliers([...suppliers, res.supplier]);
        setIsSupplierModalOpen(false);
        resetSupplierForm();
        showSuccess("Fornecedor cadastrado", `${supplierNome} foi adicionado à base de fornecedores.`);
      } else {
        showError("Erro ao cadastrar", res.error || "Não foi possível cadastrar o fornecedor.");
      }
    }
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setSupplierNome(supplier.nome);
    setSupplierNomeFantasia(supplier.nomeFantasia || "");
    setSupplierCnpj(supplier.cnpj);
    setSupplierTelefone(supplier.telefone);
    setSupplierEmail(supplier.email);
    setSupplierLogoUrl(supplier.logoUrl || "");
    lastFetchedCnpjRef.current = supplier.cnpj.replace(/\D/g, "");
    setCnpjError(null);
    setIsSupplierModalOpen(true);
  };

  const handleDeleteSupplier = (id: string, nome: string) => {
    confirmAction({
      title: "Remover fornecedor?",
      message: `${nome} será removido. Os insumos vinculados ficarão sem fornecedor associado.`,
      confirmLabel: "Sim, remover",
      onConfirm: async () => {
        const res = await deleteSupplierAction(id, companyId);
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
      categoria: itemCategoria,
      quantidade: Number(itemQuantidade),
      minima: Number(itemMinima || 0),
      precoCusto: Number(itemPreco),
      supplierId: itemSupplierId || undefined
    };

    if (editingItem) {
      const res = await updateInventoryItemAction(editingItem.id, companyId, data);
      if (res.success && res.item) {
        setInventory(inventory.map(i => i.id === editingItem.id ? { ...i, ...res.item } : i));
        setIsItemModalOpen(false);
        resetItemForm();
        showSuccess("Insumo atualizado", `${itemNome} foi salvo no estoque.`);
      } else {
        showError("Erro ao salvar", "Não foi possível atualizar o insumo.");
      }
    } else {
      const res = await createInventoryItemAction({ ...data, company_id: companyId });
      if (res.success && res.item) {
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
        const res = await deleteInventoryItemAction(id, companyId);
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
            <h1 className="text-2xl font-black text-foreground tracking-tight">
              Estoque & Fornecedores
            </h1>
            {!isFactoryRole && (
              <InfoTooltip label="Sobre Estoque">
                <TooltipBody
                  title="Insumos e fornecedores"
                  items={[
                    "Controle a quantidade de cada insumo e o patrimônio em estoque.",
                    "Itens abaixo do mínimo aparecem como estoque baixo ou esgotado.",
                    "Cadastre fornecedores para agilizar compras e reposição.",
                    "A baixa de estoque pode ser feita ao gerar orçamentos.",
                  ]}
                />
              </InfoTooltip>
            )}
          </div>
          {!isFactoryRole && (
            <p className="text-sm text-muted-foreground">
              Controle de insumos e matérias-primas da Móveis Unghero.
            </p>
          )}
        </div>

        {canManageEstoque && (
          <div className="flex items-center gap-3">
            {activeTab === "estoque" ? (
              <Button
                onClick={() => {
                  resetItemForm();
                  setIsItemModalOpen(true);
                }}
                className="font-bold btn-metallic gap-1.5"
              >
                <Plus className="h-4.5 w-4.5" /> Novo Insumo / Item
              </Button>
            ) : (
              <Button
                onClick={() => {
                  resetSupplierForm();
                  setIsSupplierModalOpen(true);
                }}
                className="font-bold btn-metallic gap-1.5"
              >
                <Plus className="h-4.5 w-4.5" /> Novo Fornecedor
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ─── CARDS DE MÉTRICAS ─── */}
      <div className={`grid grid-cols-1 gap-6 ${showPatrimonio ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        {showPatrimonio && (
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
        )}

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
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <label className="flex flex-col gap-1 min-w-0 flex-1 sm:flex-initial">
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                  <Filter className="h-3 w-3" /> Categoria
                </span>
                <select
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value)}
                  className="w-full min-w-0 bg-slate-50 border border-border rounded-lg text-xs p-2.5 focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="ALL">Todas</option>
                  {Object.entries(categories).map(([key, value]) => (
                    <option key={key} value={key}>{value}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 min-w-0 flex-1 sm:flex-initial">
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                  <Filter className="h-3 w-3" /> Status
                </span>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full min-w-0 bg-slate-50 border border-border rounded-lg text-xs p-2.5 focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="ALL">Todos</option>
                  <option value="CRITICO">Estoque Baixo</option>
                  <option value="OK">Estoque OK</option>
                  <option value="ESGOTADO">Esgotados</option>
                </select>
              </label>
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
                  {!isFactoryRole && (
                    <>
                      {showPatrimonio && (
                        <>
                          <th className="p-4 text-right">Preço de Custo</th>
                          <th className="p-4 text-right">Valor Total</th>
                        </>
                      )}
                    </>
                  )}
                  <th className="p-4 text-center">Fornecedor Associado</th>
                  {canManageEstoque && <th className="p-4 text-right">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isFactoryRole ? 5 : canManageEstoque ? 8 : 7}
                      className="p-8 text-center text-sm text-muted-foreground"
                    >
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
                        {showPatrimonio && (
                          <>
                            <td className="p-4 text-right text-xs font-medium text-slate-600 privacy-value">
                              {item.precoCusto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </td>
                            <td className="p-4 text-right text-sm font-bold text-foreground privacy-value">
                              {(item.quantidade * item.precoCusto).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </td>
                          </>
                        )}
                        <td className="p-4 text-center">
                          <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                            {item.supplierName || "Sem Vínculo"}
                          </span>
                        </td>
                        {canManageEstoque && (
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleEditItem(item)}
                                className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-all cursor-pointer"
                                title="Editar insumo"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              {canDelete && (
                              <button
                                onClick={() => handleDeleteItem(item.id, item.nome)}
                                className="p-2 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive transition-all cursor-pointer"
                                title="Remover insumo"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                              )}
                            </div>
                          </td>
                        )}
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
                  <th className="p-4 text-center">Status CRM</th>
                  <th className="p-4 text-center">Avaliação</th>
                  <th className="p-4 text-center">Contato</th>
                  {canManageEstoque && <th className="p-4 text-right">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canManageEstoque ? 7 : 6}
                      className="p-8 text-center text-sm text-muted-foreground"
                    >
                      Nenhum fornecedor parceiro cadastrado.
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map(sup => {
                    const status = sup.crmStatus || "NOVO";
                    const statusConfig = CRM_STATUS_LABELS[status] || CRM_STATUS_LABELS.NOVO;
                    
                    return (
                      <tr key={sup.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-5 min-w-0">
                            <div className="h-10 w-auto min-w-10 max-w-20 overflow-hidden shrink-0 flex items-center justify-center">
                              {sup.logoUrl ? (
                                <img
                                  src={sup.logoUrl}
                                  alt=""
                                  className="h-full w-auto max-w-20 object-contain"
                                />
                              ) : (
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <strong className="text-sm font-bold text-foreground truncate">{sup.nome}</strong>
                              {sup.nomeFantasia ? (
                                <span className="text-[11px] text-muted-foreground truncate">{sup.nomeFantasia}</span>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-center text-xs font-semibold text-slate-500">{sup.cnpj}</td>
                        <td className="p-4 text-center">
                          <span className="text-xs font-bold bg-primary/5 text-primary px-2.5 py-0.5 rounded-full border border-primary/20">
                            {sup.principalMaterial}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full uppercase tracking-wider ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {sup.crmNota && sup.crmNota > 0 ? (
                            <div className="flex justify-center gap-0.5">
                              {[1, 2, 3, 4, 5].map(star => (
                                <Star 
                                  key={star} 
                                  className={`h-3 w-3 ${star <= (sup.crmNota || 0) ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} 
                                />
                              ))}
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">Não avaliado</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-1.5">
                            {sup.telefone ? (
                              <a
                                href={`tel:${sup.telefone.replace(/\D/g, "")}`}
                                className="p-2 rounded-lg bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 transition-colors"
                                title={sup.telefone}
                                aria-label={`Telefone ${sup.telefone}`}
                              >
                                <Phone className="h-3.5 w-3.5" />
                              </a>
                            ) : null}
                            {sup.email ? (
                              <a
                                href={`mailto:${sup.email}`}
                                className="p-2 rounded-lg bg-sky-500/10 text-sky-700 hover:bg-sky-500/20 transition-colors"
                                title={sup.email}
                                aria-label={`E-mail ${sup.email}`}
                              >
                                <Mail className="h-3.5 w-3.5" />
                              </a>
                            ) : null}
                            {!sup.telefone && !sup.email ? (
                              <span className="text-[10px] text-muted-foreground">—</span>
                            ) : null}
                          </div>
                        </td>
                        {canManageEstoque && (
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link href={`/estoque/fornecedores/${sup.id}`}>
                                <button
                                  className="p-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 transition-all cursor-pointer"
                                  title="Ficha de CRM / Avaliação"
                                >
                                  <ClipboardList className="h-4 w-4" />
                                </button>
                              </Link>
                              <button
                                onClick={() => handleEditSupplier(sup)}
                                className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-all cursor-pointer"
                                title="Editar fornecedor"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              {canDelete && (
                              <button
                                onClick={() => handleDeleteSupplier(sup.id, sup.nome)}
                                className="p-2 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive transition-all cursor-pointer"
                                title="Remover fornecedor"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ─── MODAL: FORNECEDOR RÁPIDO (CNPJ + LOGO) ─── */}
      <Dialog
        isOpen={isSupplierModalOpen}
        onClose={() => {
          setIsSupplierModalOpen(false);
          resetSupplierForm();
        }}
        className="max-w-md w-full"
      >
        <div className="space-y-4 pr-6">
            <div>
              <h3 className="text-lg font-bold text-foreground">
                {editingSupplier ? "Editar Fornecedor" : "Novo Fornecedor"}
              </h3>
              <p className="text-xs text-muted-foreground">
                Informe o CNPJ para preencher os dados e anexe o logo da marca.
              </p>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground block">CNPJ</label>
                <div className="relative">
                  <Input
                    required
                    value={supplierCnpj}
                    onChange={(e) => setSupplierCnpj(formatCnpj(e.target.value))}
                    placeholder="00.000.000/0000-00"
                    className="border-border bg-slate-50 text-sm pr-10"
                    inputMode="numeric"
                  />
                  {cnpjLoading ? (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
                  ) : null}
                </div>
                {cnpjError ? (
                  <p className="text-[11px] text-rose-600 font-medium">{cnpjError}</p>
                ) : null}
              </div>

              {supplierNome ? (
                <div className="rounded-xl border border-border bg-slate-50/80 px-3 py-2.5 space-y-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Empresa encontrada
                  </p>
                  <p className="text-sm font-semibold text-foreground leading-snug">{supplierNome}</p>
                  {supplierNomeFantasia ? (
                    <p className="text-xs text-muted-foreground">{supplierNomeFantasia}</p>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground block">Logo</label>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleLogoChange}
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={logoUploading}
                    className="h-16 w-16 rounded-xl border border-dashed border-border bg-slate-50 hover:bg-slate-100 overflow-hidden flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                    title="Enviar logo"
                  >
                    {logoUploading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : supplierLogoUrl ? (
                      <img src={supplierLogoUrl} alt="Logo" className="h-full w-full object-cover" />
                    ) : (
                      <ImagePlus className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1 space-y-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={logoUploading}
                      className="text-xs font-bold"
                    >
                      {supplierLogoUrl ? "Trocar imagem" : "Enviar logo"}
                    </Button>
                    {supplierLogoUrl ? (
                      <button
                        type="button"
                        onClick={() => setSupplierLogoUrl("")}
                        className="block text-[11px] font-medium text-muted-foreground hover:text-foreground"
                      >
                        Remover logo
                      </button>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">JPG, PNG ou WEBP</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsSupplierModalOpen(false);
                    resetSupplierForm();
                  }}
                  className="text-xs font-bold"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="font-bold btn-metallic"
                  disabled={cnpjLoading || logoUploading || !supplierNome}
                >
                  {editingSupplier ? "Salvar Alterações" : "Cadastrar Fornecedor"}
                </Button>
              </div>
            </form>
        </div>
      </Dialog>

      {/* ─── MODAL: INSUMO (CADASTRAR / EDITAR) ─── */}
      <Dialog
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        className="max-w-lg w-full"
      >
        <div className="space-y-4 pr-6">
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
      </Dialog>

      <ActionDialogHost dialog={dialog} />
    </div>
  );
}
