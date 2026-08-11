"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Building2, 
  Phone, 
  PackageOpen, 
  BadgePercent, 
  Truck, 
  ClipboardList, 
  Star, 
  Calendar, 
  DollarSign, 
  Plus, 
  Trash2, 
  Upload, 
  Download, 
  Tag, 
  MessageSquare, 
  Edit3, 
  Check, 
  X,
  FileText,
  UserCheck,
  AlertTriangle,
  History,
  Paperclip,
  Loader2
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  updateSupplierCrmAction, 
  addSupplierCrmHistoryLogAction, 
  updateSupplierGeneralAction 
} from "@/app/actions/fornecedores";
import InfoTooltip, { TooltipBody } from "@/components/ui/InfoTooltip";

interface SupplierCrmClientProps {
  supplier: {
    id: string;
    nome: string; // Razão Social
    cnpj: string;
    telefone: string;
    email: string;
    principal_material: string;
    ativo: boolean;
    createdAt: string;
    updatedAt: string;

    // Info Geral
    nomeFantasia?: string | null;
    inscricaoEstadual?: string | null;
    categoria?: string | null;
    subcategoria?: string | null;
    site?: string | null;
    instagram?: string | null;
    linkedin?: string | null;
    anoFundacao?: number | null;
    numFuncionarios?: string | null;
    possuiShowroom?: boolean | null;

    // Contato
    contatoRepresentante?: string | null;
    contatoCargo?: string | null;
    contatoWhatsapp?: string | null;
    contatoSegundo?: string | null;
    contatoTelefoneSecundario?: string | null;
    contatoCidade?: string | null;
    contatoEstado?: string | null;
    contatoEndereco?: string | null;
    contatoCep?: string | null;

    // Produtos
    produtosFornecidos?: string | null;
    marcasRepresentadas?: string | null;
    produtosCatalogoUrl?: string | null;
    produtosTabelaPrecosUrl?: string | null;
    produtosLinkCatalogoOnline?: string | null;
    produtosSobEncomenda?: boolean | null;
    produtosQuantidadeMinima?: string | null;
    produtosTempoFabricacao?: string | null;

    // Comercial
    comercialCondicoesPagamento: string[];
    comercialDescontoMarceneiros?: boolean | null;
    comercialTabelaDiferenciada?: boolean | null;
    comercialRepresentanteExclusivo?: boolean | null;
    comercialPedidoMinimo?: string | null;
    comercialFreteGratisAcima?: string | null;
    comercialComissao?: string | null;
    comercialObservacoes?: string | null;

    // Logística
    logisticaCidadeEstoque?: string | null;
    logisticaPrazoMedioEntrega?: string | null;
    logisticaEntregaPropria?: boolean | null;
    logisticaTransportadora?: boolean | null;
    logisticaRetiradaLocal?: boolean | null;
    logisticaEstadosAtendidos: string[];
    logisticaFazEntregasUrgentes?: boolean | null;
    logisticaPossuiRastreamento?: boolean | null;
    logisticaAreaCobertura?: string | null;

    // CRM
    crmStatus: string;
    crmNota?: number | null;
    crmQualidade?: number | null;
    crmPrazo?: number | null;
    crmAtendimento?: number | null;
    crmPreco?: number | null;
    crmPosVenda?: number | null;
    crmUltimaCompra?: string | null;
    crmValorTotalComprado?: number | null;
    crmUltimoOrcamento?: string | null;
    crmUltimoContato?: string | null;
    crmResponsavelInterno?: string | null;
    crmObservacoes?: string | null;
    crmHistorico?: any; // JSON
    crmUploads?: any; // JSON
    crmTags: string[];
  };
  companyId: string;
  currentUser?: { name?: string | null; email?: string } | null;
}

const CRM_STATUS_OPTIONS = [
  { value: "NOVO", label: "Novo", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { value: "EM_ANALISE", label: "Em Análise", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  { value: "HOMOLOGADO", label: "Homologado", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  { value: "INATIVO", label: "Inativo", color: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  { value: "BLOQUEADO", label: "Bloqueado", color: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
];

const QUICK_TAGS = [
  "MDF", "Premium", "Alto padrão", "Entrega rápida", "Entrega nacional", 
  "Importado", "Fornecedor homologado", "Parceiro", "Exclusivo", 
  "Frete grátis", "Promoções", "VIP", "Urgente"
];

export default function SupplierCrmClient({ supplier, companyId, currentUser }: SupplierCrmClientProps) {
  const router = useRouter();
  const [activeSupplier, setActiveSupplier] = useState(supplier);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // --- Estados de Edição das Seções ---
  const [isEditingGerais, setIsEditingGerais] = useState(false);
  const [isEditingContato, setIsEditingContato] = useState(false);
  const [isEditingProdutos, setIsEditingProdutos] = useState(false);
  const [isEditingComercial, setIsEditingComercial] = useState(false);
  const [isEditingLogistica, setIsEditingLogistica] = useState(false);

  // Form states para Info Geral
  const [nome, setNome] = useState(supplier.nome);
  const [nomeFantasia, setNomeFantasia] = useState(supplier.nomeFantasia || "");
  const [cnpj, setCnpj] = useState(supplier.cnpj);
  const [inscricaoEstadual, setInscricaoEstadual] = useState(supplier.inscricaoEstadual || "");
  const [categoria, setCategoria] = useState(supplier.principal_material);
  const [subcategoria, setSubcategoria] = useState(supplier.subcategoria || "");
  const [site, setSite] = useState(supplier.site || "");
  const [instagram, setInstagram] = useState(supplier.instagram || "");
  const [linkedin, setLinkedin] = useState(supplier.linkedin || "");
  const [anoFundacao, setAnoFundacao] = useState(supplier.anoFundacao?.toString() || "");
  const [numFuncionarios, setNumFuncionarios] = useState(supplier.numFuncionarios || "");
  const [possuiShowroom, setPossuiShowroom] = useState<boolean | null>(supplier.possuiShowroom ?? null);

  // Form states para Contato
  const [contatoRepresentante, setContatoRepresentante] = useState(supplier.contatoRepresentante || "");
  const [contatoCargo, setContatoCargo] = useState(supplier.contatoCargo || "");
  const [telefone, setTelefone] = useState(supplier.telefone);
  const [contatoWhatsapp, setContatoWhatsapp] = useState(supplier.contatoWhatsapp || "");
  const [email, setEmail] = useState(supplier.email);
  const [contatoSegundo, setContatoSegundo] = useState(supplier.contatoSegundo || "");
  const [contatoTelefoneSecundario, setContatoTelefoneSecundario] = useState(supplier.contatoTelefoneSecundario || "");
  const [contatoCidade, setContatoCidade] = useState(supplier.contatoCidade || "");
  const [contatoEstado, setContatoEstado] = useState(supplier.contatoEstado || "");
  const [contatoEndereco, setContatoEndereco] = useState(supplier.contatoEndereco || "");
  const [contatoCep, setContatoCep] = useState(supplier.contatoCep || "");

  // Form states para Produtos
  const [produtosFornecidos, setProdutosFornecidos] = useState(supplier.produtosFornecidos || "");
  const [marcasRepresentadas, setMarcasRepresentadas] = useState(supplier.marcasRepresentadas || "");
  const [produtosCatalogoUrl, setProdutosCatalogoUrl] = useState(supplier.produtosCatalogoUrl || "");
  const [produtosTabelaPrecosUrl, setProdutosTabelaPrecosUrl] = useState(supplier.produtosTabelaPrecosUrl || "");
  const [produtosLinkCatalogoOnline, setProdutosLinkCatalogoOnline] = useState(supplier.produtosLinkCatalogoOnline || "");
  const [produtosSobEncomenda, setProdutosSobEncomenda] = useState<boolean | null>(supplier.produtosSobEncomenda ?? null);
  const [produtosQuantidadeMinima, setProdutosQuantidadeMinima] = useState(supplier.produtosQuantidadeMinima || "");
  const [produtosTempoFabricacao, setProdutosTempoFabricacao] = useState(supplier.produtosTempoFabricacao || "");

  // Form states para Comercial
  const [comercialCondicoesPagamento, setComercialCondicoesPagamento] = useState<string[]>(supplier.comercialCondicoesPagamento || []);
  const [comercialDescontoMarceneiros, setComercialDescontoMarceneiros] = useState<boolean | null>(supplier.comercialDescontoMarceneiros ?? null);
  const [comercialTabelaDiferenciada, setComercialTabelaDiferenciada] = useState<boolean | null>(supplier.comercialTabelaDiferenciada ?? null);
  const [comercialRepresentanteExclusivo, setComercialRepresentanteExclusivo] = useState<boolean | null>(supplier.comercialRepresentanteExclusivo ?? null);
  const [comercialPedidoMinimo, setComercialPedidoMinimo] = useState(supplier.comercialPedidoMinimo || "");
  const [comercialFreteGratisAcima, setComercialFreteGratisAcima] = useState(supplier.comercialFreteGratisAcima || "");
  const [comercialComissao, setComercialComissao] = useState(supplier.comercialComissao || "");
  const [comercialObservacoes, setComercialObservacoes] = useState(supplier.comercialObservacoes || "");

  // Form states para Logística
  const [logisticaCidadeEstoque, setLogisticaCidadeEstoque] = useState(supplier.logisticaCidadeEstoque || "");
  const [logisticaPrazoMedioEntrega, setLogisticaPrazoMedioEntrega] = useState(supplier.logisticaPrazoMedioEntrega || "");
  const [logisticaEntregaPropria, setLogisticaEntregaPropria] = useState<boolean | null>(supplier.logisticaEntregaPropria ?? null);
  const [logisticaTransportadora, setLogisticaTransportadora] = useState<boolean | null>(supplier.logisticaTransportadora ?? null);
  const [logisticaRetiradaLocal, setLogisticaRetiradaLocal] = useState<boolean | null>(supplier.logisticaRetiradaLocal ?? null);
  const [logisticaEstadosAtendidos, setLogisticaEstadosAtendidos] = useState<string[]>(supplier.logisticaEstadosAtendidos || []);
  const [logisticaFazEntregasUrgentes, setLogisticaFazEntregasUrgentes] = useState<boolean | null>(supplier.logisticaFazEntregasUrgentes ?? null);
  const [logisticaPossuiRastreamento, setLogisticaPossuiRastreamento] = useState<boolean | null>(supplier.logisticaPossuiRastreamento ?? null);
  const [logisticaAreaCobertura, setLogisticaAreaCobertura] = useState(supplier.logisticaAreaCobertura || "");

  // --- Estados do CRM (Editados separadamente em tempo de execução) ---
  const [crmStatus, setCrmStatus] = useState(supplier.crmStatus);
  const [crmNota, setCrmNota] = useState<number | null>(supplier.crmNota ?? 0);
  const [crmQualidade, setCrmQualidade] = useState<number | null>(supplier.crmQualidade ?? 0);
  const [crmPrazo, setCrmPrazo] = useState<number | null>(supplier.crmPrazo ?? 0);
  const [crmAtendimento, setCrmAtendimento] = useState<number | null>(supplier.crmAtendimento ?? 0);
  const [crmPreco, setCrmPreco] = useState<number | null>(supplier.crmPreco ?? 0);
  const [crmPosVenda, setCrmPosVenda] = useState<number | null>(supplier.crmPosVenda ?? 0);

  const [crmUltimaCompra, setCrmUltimaCompra] = useState(supplier.crmUltimaCompra ? supplier.crmUltimaCompra.split("T")[0] : "");
  const [crmValorTotalComprado, setCrmValorTotalComprado] = useState(supplier.crmValorTotalComprado?.toString() || "");
  const [crmUltimoOrcamento, setCrmUltimoOrcamento] = useState(supplier.crmUltimoOrcamento ? supplier.crmUltimoOrcamento.split("T")[0] : "");
  const [crmResponsavelInterno, setCrmResponsavelInterno] = useState(supplier.crmResponsavelInterno || "");
  const [crmObservacoes, setCrmObservacoes] = useState(supplier.crmObservacoes || "");
  const [crmTags, setCrmTags] = useState<string[]>(supplier.crmTags || []);
  const [newTagInput, setNewTagInput] = useState("");

  // Histórico & Anexos
  const [crmHistorico, setCrmHistorico] = useState<any[]>(Array.isArray(supplier.crmHistorico) ? supplier.crmHistorico : []);
  const [crmUploads, setCrmUploads] = useState<any[]>(Array.isArray(supplier.crmUploads) ? supplier.crmUploads : []);
  const [newHistoryLogText, setNewHistoryLogText] = useState("");
  const [uploadingCrmFile, setUploadingCrmFile] = useState(false);
  const [crmFileType, setCrmFileType] = useState("Outros");

  // --- Função auxiliar de Notificação ---
  const showToast = (msg: string, isError = false) => {
    if (isError) {
      setError(msg);
      setTimeout(() => setError(null), 4000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  // --- Salvar Seções Cadastrais ---
  const handleSaveGerais = async () => {
    const res = await updateSupplierGeneralAction(supplier.id, companyId, {
      nome,
      nomeFantasia: nomeFantasia || null,
      cnpj,
      inscricaoEstadual: inscricaoEstadual || null,
      categoria,
      subcategoria: subcategoria || null,
      site: site || null,
      instagram: instagram || null,
      linkedin: linkedin || null,
      anoFundacao: anoFundacao ? parseInt(anoFundacao) : null,
      numFuncionarios: numFuncionarios || null,
      possuiShowroom,
    });
    if (res.success && res.supplier) {
      setActiveSupplier(res.supplier as any);
      setIsEditingGerais(false);
      showToast("Informações gerais salvas!");
    } else {
      showToast(res.error || "Erro ao salvar.", true);
    }
  };

  const handleSaveContato = async () => {
    const res = await updateSupplierGeneralAction(supplier.id, companyId, {
      contatoRepresentante,
      contatoCargo: contatoCargo || null,
      telefone,
      contatoWhatsapp: contatoWhatsapp || null,
      email,
      contatoSegundo: contatoSegundo || null,
      contatoTelefoneSecundario: contatoTelefoneSecundario || null,
      contatoCidade: contatoCidade || null,
      contatoEstado: contatoEstado || null,
      contatoEndereco: contatoEndereco || null,
      contatoCep: contatoCep || null,
    });
    if (res.success && res.supplier) {
      setActiveSupplier(res.supplier as any);
      setIsEditingContato(false);
      showToast("Dados de contato salvos!");
    } else {
      showToast(res.error || "Erro ao salvar.", true);
    }
  };

  const handleSaveProdutos = async () => {
    const res = await updateSupplierGeneralAction(supplier.id, companyId, {
      produtosFornecidos: produtosFornecidos || null,
      marcasRepresentadas: marcasRepresentadas || null,
      produtosCatalogoUrl: produtosCatalogoUrl || null,
      produtosTabelaPrecosUrl: produtosTabelaPrecosUrl || null,
      produtosLinkCatalogoOnline: produtosLinkCatalogoOnline || null,
      produtosSobEncomenda,
      produtosQuantidadeMinima: produtosQuantidadeMinima || null,
      produtosTempoFabricacao: produtosTempoFabricacao || null,
    });
    if (res.success && res.supplier) {
      setActiveSupplier(res.supplier as any);
      setIsEditingProdutos(false);
      showToast("Dados de produtos salvos!");
    } else {
      showToast(res.error || "Erro ao salvar.", true);
    }
  };

  const handleSaveComercial = async () => {
    const res = await updateSupplierGeneralAction(supplier.id, companyId, {
      comercialCondicoesPagamento,
      comercialDescontoMarceneiros,
      comercialTabelaDiferenciada,
      comercialRepresentanteExclusivo,
      comercialPedidoMinimo: comercialPedidoMinimo || null,
      comercialFreteGratisAcima: comercialFreteGratisAcima || null,
      comercialComissao: comercialComissao || null,
      comercialObservacoes: comercialObservacoes || null,
    });
    if (res.success && res.supplier) {
      setActiveSupplier(res.supplier as any);
      setIsEditingComercial(false);
      showToast("Dados comerciais salvos!");
    } else {
      showToast(res.error || "Erro ao salvar.", true);
    }
  };

  const handleSaveLogistica = async () => {
    const res = await updateSupplierGeneralAction(supplier.id, companyId, {
      logisticaCidadeEstoque: logisticaCidadeEstoque || null,
      logisticaPrazoMedioEntrega: logisticaPrazoMedioEntrega || null,
      logisticaEntregaPropria,
      logisticaTransportadora,
      logisticaRetiradaLocal,
      logisticaEstadosAtendidos,
      logisticaFazEntregasUrgentes,
      logisticaPossuiRastreamento,
      logisticaAreaCobertura: logisticaAreaCobertura || null,
    });
    if (res.success && res.supplier) {
      setActiveSupplier(res.supplier as any);
      setIsEditingLogistica(false);
      showToast("Dados logísticos salvos!");
    } else {
      showToast(res.error || "Erro ao salvar.", true);
    }
  };

  // --- Upload de Arquivos do Fornecedor (Catálogo/Tabela nas edições de card) ---
  const handleCardFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: "catalogo" | "tabela") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      showToast("Enviando arquivo...");
      const response = await fetch("/api/fornecedores/upload", {
        method: "POST",
        body: formData,
      });
      const res = await response.json();
      if (res.success) {
        if (field === "catalogo") setProdutosCatalogoUrl(res.url);
        else setProdutosTabelaPrecosUrl(res.url);
        showToast("Arquivo enviado! Lembre-se de salvar o card de produtos.");
      } else {
        showToast(res.error || "Erro no upload.", true);
      }
    } catch {
      showToast("Erro ao enviar arquivo.", true);
    }
  };

  // --- Atualizar CRM (Seção 6) ---
  const handleUpdateCrm = async (updatedFields: any) => {
    const res = await updateSupplierCrmAction(supplier.id, companyId, {
      crmStatus: updatedFields.crmStatus !== undefined ? updatedFields.crmStatus : crmStatus,
      crmNota: updatedFields.crmNota !== undefined ? updatedFields.crmNota : crmNota,
      crmQualidade: updatedFields.crmQualidade !== undefined ? updatedFields.crmQualidade : crmQualidade,
      crmPrazo: updatedFields.crmPrazo !== undefined ? updatedFields.crmPrazo : crmPrazo,
      crmAtendimento: updatedFields.crmAtendimento !== undefined ? updatedFields.crmAtendimento : crmAtendimento,
      crmPreco: updatedFields.crmPreco !== undefined ? updatedFields.crmPreco : crmPreco,
      crmPosVenda: updatedFields.crmPosVenda !== undefined ? updatedFields.crmPosVenda : crmPosVenda,
      crmUltimaCompra: updatedFields.crmUltimaCompra !== undefined ? updatedFields.crmUltimaCompra : (crmUltimaCompra || null),
      crmValorTotalComprado: updatedFields.crmValorTotalComprado !== undefined ? (updatedFields.crmValorTotalComprado ? parseFloat(updatedFields.crmValorTotalComprado) : null) : (crmValorTotalComprado ? parseFloat(crmValorTotalComprado) : null),
      crmUltimoOrcamento: updatedFields.crmUltimoOrcamento !== undefined ? updatedFields.crmUltimoOrcamento : (crmUltimoOrcamento || null),
      crmResponsavelInterno: updatedFields.crmResponsavelInterno !== undefined ? updatedFields.crmResponsavelInterno : crmResponsavelInterno,
      crmObservacoes: updatedFields.crmObservacoes !== undefined ? updatedFields.crmObservacoes : crmObservacoes,
      crmTags: updatedFields.crmTags !== undefined ? updatedFields.crmTags : crmTags,
      crmUploads: updatedFields.crmUploads !== undefined ? updatedFields.crmUploads : crmUploads,
      crmHistorico: updatedFields.crmHistorico !== undefined ? updatedFields.crmHistorico : crmHistorico,
    });

    if (res.success && res.supplier) {
      setActiveSupplier(res.supplier as any);
      if (res.supplier.crmHistorico) setCrmHistorico(res.supplier.crmHistorico as any[]);
      showToast("Avaliação CRM salva com sucesso!");
    } else {
      showToast(res.error || "Erro ao salvar CRM.", true);
    }
  };

  // --- Adicionar Log no Histórico ---
  const handleAddHistoryLog = async () => {
    if (!newHistoryLogText.trim()) return;

    const logText = `${currentUser?.name || "Operador"}: ${newHistoryLogText.trim()}`;
    const res = await addSupplierCrmHistoryLogAction(supplier.id, companyId, logText);
    if (res.success && res.supplier) {
      setActiveSupplier(res.supplier as any);
      setCrmHistorico(res.supplier.crmHistorico as any[]);
      setNewHistoryLogText("");
      showToast("Histórico atualizado!");
    } else {
      showToast(res.error || "Erro ao adicionar log.", true);
    }
  };

  // --- Gestão de Tags ---
  const handleAddTag = (tag: string) => {
    const cleanTag = tag.trim();
    if (!cleanTag || crmTags.includes(cleanTag)) return;
    const nextTags = [...crmTags, cleanTag];
    setCrmTags(nextTags);
    handleUpdateCrm({ crmTags: nextTags });
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const nextTags = crmTags.filter(t => t !== tagToRemove);
    setCrmTags(nextTags);
    handleUpdateCrm({ crmTags: nextTags });
  };

  // --- Upload de Anexos no CRM ---
  const handleCrmAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCrmFile(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/fornecedores/upload", {
        method: "POST",
        body: formData,
      });
      const res = await response.json();
      if (res.success) {
        const newAttachment = {
          id: crypto.randomUUID(),
          nome: res.name,
          url: res.url,
          tipo: crmFileType,
          sizeBytes: res.sizeBytes,
          uploadedBy: currentUser?.name || "Operador",
          createdAt: new Date().toISOString()
        };
        const nextUploads = [...crmUploads, newAttachment];
        setCrmUploads(nextUploads);
        
        // Registrar ação no histórico
        const nextHistorico = [...crmHistorico, {
          data: new Date().toISOString(),
          acao: `Anexo de CRM inserido: [${crmFileType}] ${res.name}`,
        }];
        setCrmHistorico(nextHistorico);

        await handleUpdateCrm({ crmUploads: nextUploads, crmHistorico: nextHistorico });
        showToast("Arquivo anexado com sucesso!");
      } else {
        showToast(res.error || "Falha no envio do anexo.", true);
      }
    } catch {
      showToast("Erro de rede no upload.", true);
    } finally {
      setUploadingCrmFile(false);
    }
  };

  const handleRemoveCrmAttachment = async (attachmentId: string) => {
    const attachmentToRemove = crmUploads.find(u => u.id === attachmentId);
    if (!attachmentToRemove) return;

    const nextUploads = crmUploads.filter(u => u.id !== attachmentId);
    setCrmUploads(nextUploads);

    const nextHistorico = [...crmHistorico, {
      data: new Date().toISOString(),
      acao: `Anexo de CRM excluído: ${attachmentToRemove.nome}`,
    }];
    setCrmHistorico(nextHistorico);

    await handleUpdateCrm({ crmUploads: nextUploads, crmHistorico: nextHistorico });
    showToast("Anexo excluído.");
  };

  // --- Renderização das Estrelas ---
  const StarRating = ({ value, onChange, label }: { value: number, onChange?: (val: number) => void, label?: string }) => {
    return (
      <div className="flex items-center gap-2">
        {label && <span className="text-xs font-bold text-slate-400 min-w-[90px]">{label}:</span>}
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(star => {
            const isLit = star <= value;
            return (
              <button
                key={star}
                type="button"
                disabled={!onChange}
                onClick={() => onChange?.(star)}
                className={`transition-all ${onChange ? "cursor-pointer hover:scale-110" : ""}`}
              >
                <Star 
                  className={`h-4.5 w-4.5 ${
                    isLit 
                      ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_2px_rgba(251,191,36,0.3)]" 
                      : "text-slate-700 hover:text-slate-600"
                  }`} 
                />
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const statusBadge = CRM_STATUS_OPTIONS.find(o => o.value === crmStatus) || CRM_STATUS_OPTIONS[0];

  return (
    <div className="space-y-6">
      
      {/* Header Premium de Ficha */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/estoque">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg hover:bg-slate-100 cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-foreground">
                {activeSupplier.nome}
              </h1>
              <span className={`text-[10px] font-extrabold border px-2.5 py-0.5 rounded-full uppercase tracking-wide ${statusBadge.color}`}>
                {statusBadge.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              CNPJ: {activeSupplier.cnpj} · Cadastrado em {new Date(activeSupplier.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        
        {/* Toggle de Status Rápido no Topo */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="text-xs font-bold text-muted-foreground">Status CRM:</span>
          <select
            value={crmStatus}
            onChange={e => {
              setCrmStatus(e.target.value);
              handleUpdateCrm({ crmStatus: e.target.value });
            }}
            className="bg-slate-100/80 hover:bg-slate-100 border border-border text-xs font-bold rounded-lg p-2 focus:ring-1 focus:ring-primary outline-none cursor-pointer text-slate-800"
          >
            {CRM_STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Alertas */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-4 rounded-xl text-xs flex items-center gap-2 animate-shake">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-4 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
          <Check className="h-4 w-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Grid de Cards - Layout Business */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Lado Esquerdo: Dados Gerais do Fornecedor (Cards 1 a 5) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* CARD 1: INFORMAÇÕES GERAIS */}
          <Card className="glass-card p-6 shadow-xs relative overflow-hidden border border-border/30">
            <div className="flex items-center justify-between border-b border-border/20 pb-3 mb-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-500" />
                1. Informações Gerais
              </h3>
              {!isEditingGerais ? (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsEditingGerais(true)}
                  className="h-7 px-2.5 text-xs text-primary hover:bg-slate-100 font-bold gap-1 cursor-pointer"
                >
                  <Edit3 className="h-3 w-3" /> Editar
                </Button>
              ) : (
                <div className="flex gap-1.5">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => { setIsEditingGerais(false); setNome(activeSupplier.nome); setNomeFantasia(activeSupplier.nomeFantasia || ""); }}
                    className="h-7 px-2 text-xs text-muted-foreground hover:bg-slate-100 font-bold cursor-pointer"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleSaveGerais}
                    className="h-7 px-3 text-xs font-bold btn-metallic cursor-pointer"
                  >
                    Salvar
                  </Button>
                </div>
              )}
            </div>

            {!isEditingGerais ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">Razão Social:</span>
                  <strong className="text-slate-800 font-bold">{activeSupplier.nome}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">Nome Fantasia:</span>
                  <span className="text-slate-800 font-medium">{activeSupplier.nomeFantasia || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">CNPJ:</span>
                  <span className="text-slate-800 font-medium">{activeSupplier.cnpj}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">Inscrição Estadual:</span>
                  <span className="text-slate-800 font-medium">{activeSupplier.inscricaoEstadual || "Isento"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">Categoria Principal:</span>
                  <span className="text-xs font-bold bg-primary/5 text-primary px-2 py-0.5 rounded-full border border-primary/20">{activeSupplier.principal_material}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">Subcategoria:</span>
                  <span className="text-slate-800 font-medium">{activeSupplier.subcategoria || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">Site:</span>
                  {activeSupplier.site ? (
                    <a href={activeSupplier.site.startsWith("http") ? activeSupplier.site : `https://${activeSupplier.site}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">{activeSupplier.site}</a>
                  ) : "—"}
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">Instagram:</span>
                  {activeSupplier.instagram ? (
                    <a href={`https://instagram.com/${activeSupplier.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">{activeSupplier.instagram}</a>
                  ) : "—"}
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">LinkedIn:</span>
                  <span className="text-slate-800 font-medium truncate block">{activeSupplier.linkedin || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">Ano de Fundação:</span>
                  <span className="text-slate-800 font-medium">{activeSupplier.anoFundacao || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">Nº de Funcionários:</span>
                  <span className="text-slate-800 font-medium">{activeSupplier.numFuncionarios || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">Possui Showroom?</span>
                  <span className="text-slate-800 font-bold">
                    {activeSupplier.possuiShowroom === true ? "Sim" : activeSupplier.possuiShowroom === false ? "Não" : "Não informado"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Razão Social</label>
                    <Input value={nome} onChange={e => setNome(e.target.value)} className="h-8 border-border bg-slate-50 text-slate-800" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Nome Fantasia</label>
                    <Input value={nomeFantasia} onChange={e => setNomeFantasia(e.target.value)} className="h-8 border-border bg-slate-50 text-slate-800" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">CNPJ</label>
                    <Input value={cnpj} onChange={e => setCnpj(e.target.value)} className="h-8 border-border bg-slate-50 text-slate-800" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Inscrição Estadual</label>
                    <Input value={inscricaoEstadual} onChange={e => setInscricaoEstadual(e.target.value)} className="h-8 border-border bg-slate-50 text-slate-800" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Categoria Principal</label>
                    <select value={categoria} onChange={e => setCategoria(e.target.value)} className="w-full bg-slate-50 border border-border rounded-lg text-xs p-2 h-8 focus:ring-1 focus:ring-primary outline-none">
                      <option value="MDF">Chapas MDF</option>
                      <option value="FERRAGENS">Ferragens</option>
                      <option value="ILUMINACAO">Iluminação</option>
                      <option value="TINTAS_QUIMICOS">Tintas & Químicos</option>
                      <option value="MAQUINAS">Máquinas & Ferramentas</option>
                      <option value="OUTROS">Outros</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Site</label>
                    <Input value={site} onChange={e => setSite(e.target.value)} className="h-8 border-border bg-slate-50 text-slate-800" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Instagram</label>
                    <Input value={instagram} onChange={e => setInstagram(e.target.value)} className="h-8 border-border bg-slate-50 text-slate-800" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">LinkedIn</label>
                    <Input value={linkedin} onChange={e => setLinkedin(e.target.value)} className="h-8 border-border bg-slate-50 text-slate-800" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Ano Fundação</label>
                    <Input type="number" value={anoFundacao} onChange={e => setAnoFundacao(e.target.value)} className="h-8 border-border bg-slate-50 text-slate-800" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Funcionários</label>
                    <Input value={numFuncionarios} onChange={e => setNumFuncionarios(e.target.value)} className="h-8 border-border bg-slate-50 text-slate-800" />
                  </div>
                  <div className="space-y-1 pb-1">
                    <span className="font-bold text-slate-500 block mb-1">Showroom?</span>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-1 font-bold text-slate-700">
                        <input type="radio" name="showroom_edit" checked={possuiShowroom === true} onChange={() => setPossuiShowroom(true)} /> Sim
                      </label>
                      <label className="flex items-center gap-1 font-bold text-slate-700">
                        <input type="radio" name="showroom_edit" checked={possuiShowroom === false} onChange={() => setPossuiShowroom(false)} /> Não
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* CARD 2: CONTATO */}
          <Card className="glass-card p-6 shadow-xs border border-border/30">
            <div className="flex items-center justify-between border-b border-border/20 pb-3 mb-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Phone className="h-4 w-4 text-blue-500" />
                2. Contato & Endereço
              </h3>
              {!isEditingContato ? (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsEditingContato(true)}
                  className="h-7 px-2.5 text-xs text-primary hover:bg-slate-100 font-bold gap-1 cursor-pointer"
                >
                  <Edit3 className="h-3 w-3" /> Editar
                </Button>
              ) : (
                <div className="flex gap-1.5">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsEditingContato(false)}
                    className="h-7 px-2 text-xs text-muted-foreground hover:bg-slate-100 font-bold cursor-pointer"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleSaveContato}
                    className="h-7 px-3 text-xs font-bold btn-metallic cursor-pointer"
                  >
                    Salvar
                  </Button>
                </div>
              )}
            </div>

            {!isEditingContato ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">Representante:</span>
                  <strong className="text-slate-800 font-bold">{activeSupplier.contatoRepresentante || "—"}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">Cargo:</span>
                  <span className="text-slate-800 font-medium">{activeSupplier.contatoCargo || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">E-mail:</span>
                  <span className="text-slate-800 font-medium">{activeSupplier.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">Telefone Comercial:</span>
                  <span className="text-slate-800 font-medium">{activeSupplier.telefone || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">WhatsApp:</span>
                  <span className="text-slate-800 font-medium">{activeSupplier.contatoWhatsapp || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">Segundo Contato:</span>
                  <span className="text-slate-800 font-medium">{activeSupplier.contatoSegundo || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">Fixo Secundário:</span>
                  <span className="text-slate-800 font-medium">{activeSupplier.contatoTelefoneSecundario || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">Cidade / UF:</span>
                  <span className="text-slate-800 font-medium">
                    {activeSupplier.contatoCidade ? `${activeSupplier.contatoCidade} - ${activeSupplier.contatoEstado || ""}` : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">CEP:</span>
                  <span className="text-slate-800 font-medium">{activeSupplier.contatoCep || "—"}</span>
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <span className="text-slate-400 block font-semibold mb-0.5">Endereço Sede:</span>
                  <span className="text-slate-800 font-medium">{activeSupplier.contatoEndereco || "—"}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Nome Representante</label>
                    <Input value={contatoRepresentante} onChange={e => setContatoRepresentante(e.target.value)} className="h-8 border-border bg-slate-50 text-slate-800" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Cargo</label>
                    <Input value={contatoCargo} onChange={e => setContatoCargo(e.target.value)} className="h-8 border-border bg-slate-50 text-slate-800" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">E-mail</label>
                    <Input value={email} onChange={e => setEmail(e.target.value)} className="h-8 border-border bg-slate-50 text-slate-800" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">WhatsApp</label>
                    <Input value={contatoWhatsapp} onChange={e => setContatoWhatsapp(e.target.value)} className="h-8 border-border bg-slate-50 text-slate-800" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Fixo Comercial</label>
                    <Input value={telefone} onChange={e => setTelefone(e.target.value)} className="h-8 border-border bg-slate-50 text-slate-800" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 border-t border-border/20 pt-2">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Segundo Contato (Faturamento)</label>
                    <Input value={contatoSegundo} onChange={e => setContatoSegundo(e.target.value)} className="h-8 border-border bg-slate-50 text-slate-800" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Telefone Secundário</label>
                    <Input value={contatoTelefoneSecundario} onChange={e => setContatoTelefoneSecundario(e.target.value)} className="h-8 border-border bg-slate-50 text-slate-800" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 border-t border-border/20 pt-2">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">CEP</label>
                    <Input value={contatoCep} onChange={e => setContatoCep(e.target.value)} className="h-8 border-border bg-slate-50 text-slate-800" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Cidade</label>
                    <Input value={contatoCidade} onChange={e => setContatoCidade(e.target.value)} className="h-8 border-border bg-slate-50 text-slate-800" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Estado (UF)</label>
                    <Input value={contatoEstado} onChange={e => setContatoEstado(e.target.value)} className="h-8 border-border bg-slate-50 text-slate-800 animate-fade-in" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Endereço Completo</label>
                  <Input value={contatoEndereco} onChange={e => setContatoEndereco(e.target.value)} className="h-8 border-border bg-slate-50 text-slate-800" />
                </div>
              </div>
            )}
          </Card>

          {/* CARD 3: PRODUTOS */}
          <Card className="glass-card p-6 shadow-xs border border-border/30">
            <div className="flex items-center justify-between border-b border-border/20 pb-3 mb-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <PackageOpen className="h-4 w-4 text-blue-500" />
                3. Produtos & Catálogos
              </h3>
              {!isEditingProdutos ? (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsEditingProdutos(true)}
                  className="h-7 px-2.5 text-xs text-primary hover:bg-slate-100 font-bold gap-1 cursor-pointer"
                >
                  <Edit3 className="h-3 w-3" /> Editar
                </Button>
              ) : (
                <div className="flex gap-1.5">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsEditingProdutos(false)}
                    className="h-7 px-2 text-xs text-muted-foreground hover:bg-slate-100 font-bold cursor-pointer"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleSaveProdutos}
                    className="h-7 px-3 text-xs font-bold btn-metallic cursor-pointer"
                  >
                    Salvar
                  </Button>
                </div>
              )}
            </div>

            {!isEditingProdutos ? (
              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">Quais produtos fornece:</span>
                  <p className="text-slate-800 font-medium bg-slate-50 p-2.5 rounded-lg border border-border/20">{activeSupplier.produtosFornecidos || "—"}</p>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">Marcas representadas:</span>
                  <p className="text-slate-800 font-medium">{activeSupplier.marcasRepresentadas || "—"}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-border/20 pt-3">
                  <div>
                    <span className="text-slate-400 block font-semibold mb-1">Catálogo Comercial:</span>
                    {activeSupplier.produtosCatalogoUrl ? (
                      <a 
                        href={activeSupplier.produtosCatalogoUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 font-bold text-blue-600 hover:text-blue-500 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200"
                      >
                        <Download className="h-3.5 w-3.5" /> Baixar Catálogo (PDF)
                      </a>
                    ) : (
                      <span className="text-slate-500 italic">Nenhum catálogo anexado</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold mb-1">Tabela de Preços:</span>
                    {activeSupplier.produtosTabelaPrecosUrl ? (
                      <a 
                        href={activeSupplier.produtosTabelaPrecosUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 font-bold text-emerald-600 hover:text-emerald-500 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200"
                      >
                        <Download className="h-3.5 w-3.5" /> Baixar Tabela
                      </a>
                    ) : (
                      <span className="text-slate-500 italic">Nenhuma tabela anexada</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-border/20 pt-3">
                  <div className="col-span-2">
                    <span className="text-slate-400 block font-semibold mb-0.5">Catálogo Online:</span>
                    {activeSupplier.produtosLinkCatalogoOnline ? (
                      <a href={activeSupplier.produtosLinkCatalogoOnline} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-bold truncate block">{activeSupplier.produtosLinkCatalogoOnline}</a>
                    ) : "—"}
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold mb-0.5">Sob Encomenda?</span>
                    <span className="text-slate-800 font-bold">{activeSupplier.produtosSobEncomenda === true ? "Sim" : activeSupplier.produtosSobEncomenda === false ? "Não" : "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold mb-0.5">Pedido Mínimo Qtd:</span>
                    <span className="text-slate-800 font-medium">{activeSupplier.produtosQuantidadeMinima || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold mb-0.5">Fabricação Médio:</span>
                    <span className="text-slate-800 font-medium">{activeSupplier.produtosTempoFabricacao || "—"}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Produtos fornecidos</label>
                  <textarea rows={3} value={produtosFornecidos} onChange={e => setProdutosFornecidos(e.target.value)} className="w-full bg-slate-50 border border-border rounded-lg p-2.5 text-slate-800 outline-none resize-y" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Marcas representadas</label>
                  <Input value={marcasRepresentadas} onChange={e => setMarcasRepresentadas(e.target.value)} className="h-8 border-border bg-slate-50 text-slate-800" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-lg border border-border/40 space-y-2">
                    <span className="font-bold text-slate-500 block">Anexo de Catálogo PDF</span>
                    <Input type="file" accept="application/pdf" onChange={e => handleCardFileUpload(e, "catalogo")} className="h-8 border-border text-[10px]" />
                    {produtosCatalogoUrl && <span className="text-[10px] text-emerald-600 font-bold truncate block">✓ Catálogo pronto</span>}
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-border/40 space-y-2">
                    <span className="font-bold text-slate-500 block">Anexo de Tabela</span>
                    <Input type="file" onChange={e => handleCardFileUpload(e, "tabela")} className="h-8 border-border text-[10px]" />
                    {produtosTabelaPrecosUrl && <span className="text-[10px] text-emerald-600 font-bold truncate block">✓ Tabela pronta</span>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Catálogo Link</label>
                    <Input value={produtosLinkCatalogoOnline} onChange={e => setProdutosLinkCatalogoOnline(e.target.value)} className="h-8 border-border bg-slate-50 text-slate-800" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Pedido Mínimo Qtd</label>
                    <Input value={produtosQuantidadeMinima} onChange={e => setProdutosQuantidadeMinima(e.target.value)} className="h-8 border-border bg-slate-50 text-slate-800" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Tempo Fabricação</label>
                    <Input value={produtosTempoFabricacao} onChange={e => setProdutosTempoFabricacao(e.target.value)} className="h-8 border-border bg-slate-50 text-slate-800" />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="font-bold text-slate-500 block mb-1">Sob encomenda?</span>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-1 font-bold text-slate-700">
                      <input type="radio" name="encomenda_edit" checked={produtosSobEncomenda === true} onChange={() => setProdutosSobEncomenda(true)} /> Sim
                    </label>
                    <label className="flex items-center gap-1 font-bold text-slate-700">
                      <input type="radio" name="encomenda_edit" checked={produtosSobEncomenda === false} onChange={() => setProdutosSobEncomenda(false)} /> Não
                    </label>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* CARD 4: COMERCIAL */}
          <Card className="glass-card p-6 shadow-xs border border-border/30">
            <div className="flex items-center justify-between border-b border-border/20 pb-3 mb-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <BadgePercent className="h-4 w-4 text-blue-500" />
                4. Comercial & RT
              </h3>
              {!isEditingComercial ? (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsEditingComercial(true)}
                  className="h-7 px-2.5 text-xs text-primary hover:bg-slate-100 font-bold gap-1 cursor-pointer"
                >
                  <Edit3 className="h-3 w-3" /> Editar
                </Button>
              ) : (
                <div className="flex gap-1.5">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsEditingComercial(false)}
                    className="h-7 px-2 text-xs text-muted-foreground hover:bg-slate-100 font-bold cursor-pointer"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleSaveComercial}
                    className="h-7 px-3 text-xs font-bold btn-metallic cursor-pointer"
                  >
                    Salvar
                  </Button>
                </div>
              )}
            </div>

            {!isEditingComercial ? (
              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold mb-1">Condições de Pagamento:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeSupplier.comercialCondicoesPagamento.length > 0 ? (
                      activeSupplier.comercialCondicoesPagamento.map(c => (
                        <span key={c} className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-border">{c}</span>
                      ))
                    ) : (
                      <span className="text-slate-500 italic">Nenhuma condição informada</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-border/20 pt-3">
                  <div>
                    <span className="text-slate-400 block font-semibold mb-0.5">Desconto Marceneiros?</span>
                    <span className="text-slate-800 font-bold">{activeSupplier.comercialDescontoMarceneiros === true ? "Sim" : activeSupplier.comercialDescontoMarceneiros === false ? "Não" : "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold mb-0.5">Tabela diferenciada?</span>
                    <span className="text-slate-800 font-bold">{activeSupplier.comercialTabelaDiferenciada === true ? "Sim" : activeSupplier.comercialTabelaDiferenciada === false ? "Não" : "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold mb-0.5">Representante exclusivo?</span>
                    <span className="text-slate-800 font-bold">{activeSupplier.comercialRepresentanteExclusivo === true ? "Sim" : activeSupplier.comercialRepresentanteExclusivo === false ? "Não" : "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold mb-0.5">Pedido Mínimo (R$):</span>
                    <span className="text-slate-800 font-bold text-blue-600">{activeSupplier.comercialPedidoMinimo || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold mb-0.5">Frete Grátis acima:</span>
                    <span className="text-slate-800 font-medium text-emerald-600">{activeSupplier.comercialFreteGratisAcima || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold mb-0.5">Comissão RT:</span>
                    <span className="text-slate-800 font-bold text-indigo-600">{activeSupplier.comercialComissao || "—"}</span>
                  </div>
                </div>

                <div className="border-t border-border/20 pt-3">
                  <span className="text-slate-400 block font-semibold mb-0.5">Observações comerciais:</span>
                  <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-border/20 whitespace-pre-line">{activeSupplier.comercialObservacoes || "Sem observações comerciais"}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div>
                  <span className="font-bold text-slate-500 block mb-1.5">Condições Pagamento</span>
                  <div className="flex flex-wrap gap-1.5">
                    {["Pix", "Boleto", "30 dias", "28 dias", "45 dias", "Cartão", "Outros"].map(c => {
                      const isSel = comercialCondicoesPagamento.includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setComercialCondicoesPagamento(prev => 
                              prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
                            );
                          }}
                          className={`px-2 py-1 text-[10px] font-bold border rounded ${isSel ? "bg-blue-50 text-blue-600 border-blue-400" : "bg-slate-50 border-border text-slate-500"}`}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 block">Desconto Marceneiro</label>
                    <div className="flex gap-2 pt-1">
                      <label className="flex items-center gap-1 font-bold"><input type="radio" name="desc_m_e" checked={comercialDescontoMarceneiros === true} onChange={() => setComercialDescontoMarceneiros(true)} /> Sim</label>
                      <label className="flex items-center gap-1 font-bold"><input type="radio" name="desc_m_e" checked={comercialDescontoMarceneiros === false} onChange={() => setComercialDescontoMarceneiros(false)} /> Não</label>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 block">Tabela Diferenciada</label>
                    <div className="flex gap-2 pt-1">
                      <label className="flex items-center gap-1 font-bold"><input type="radio" name="tab_d_e" checked={comercialTabelaDiferenciada === true} onChange={() => setComercialTabelaDiferenciada(true)} /> Sim</label>
                      <label className="flex items-center gap-1 font-bold"><input type="radio" name="tab_d_e" checked={comercialTabelaDiferenciada === false} onChange={() => setComercialTabelaDiferenciada(false)} /> Não</label>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 block">Exclusivo?</label>
                    <div className="flex gap-2 pt-1">
                      <label className="flex items-center gap-1 font-bold"><input type="radio" name="ex_e" checked={comercialRepresentanteExclusivo === true} onChange={() => setComercialRepresentanteExclusivo(true)} /> Sim</label>
                      <label className="flex items-center gap-1 font-bold"><input type="radio" name="ex_e" checked={comercialRepresentanteExclusivo === false} onChange={() => setComercialRepresentanteExclusivo(false)} /> Não</label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 border-t border-border/20 pt-2">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Pedido Mínimo</label>
                    <Input value={comercialPedidoMinimo} onChange={e => setComercialPedidoMinimo(e.target.value)} className="h-8 border-border bg-slate-50 text-slate-800" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Frete Grátis</label>
                    <Input value={comercialFreteGratisAcima} onChange={e => setComercialFreteGratisAcima(e.target.value)} className="h-8 border-border bg-slate-50 text-slate-800" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Comissão RT</label>
                    <Input value={comercialComissao} onChange={e => setComercialComissao(e.target.value)} className="h-8 border-border bg-slate-50 text-slate-800" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Observações Comerciais</label>
                  <textarea rows={3} value={comercialObservacoes} onChange={e => setComercialObservacoes(e.target.value)} className="w-full bg-slate-50 border border-border rounded-lg p-2.5 text-slate-800 outline-none resize-y" />
                </div>
              </div>
            )}
          </Card>

          {/* CARD 5: LOGÍSTICA */}
          <Card className="glass-card p-6 shadow-xs border border-border/30">
            <div className="flex items-center justify-between border-b border-border/20 pb-3 mb-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Truck className="h-4 w-4 text-blue-500" />
                5. Logística & Entrega
              </h3>
              {!isEditingLogistica ? (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsEditingLogistica(true)}
                  className="h-7 px-2.5 text-xs text-primary hover:bg-slate-100 font-bold gap-1 cursor-pointer"
                >
                  <Edit3 className="h-3 w-3" /> Editar
                </Button>
              ) : (
                <div className="flex gap-1.5">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsEditingLogistica(false)}
                    className="h-7 px-2 text-xs text-muted-foreground hover:bg-slate-100 font-bold cursor-pointer"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleSaveLogistica}
                    className="h-7 px-3 text-xs font-bold btn-metallic cursor-pointer"
                  >
                    Salvar
                  </Button>
                </div>
              )}
            </div>

            {!isEditingLogistica ? (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <span className="text-slate-400 block font-semibold mb-0.5">Cidade do Estoque:</span>
                    <span className="text-slate-800 font-bold">{activeSupplier.logisticaCidadeEstoque || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold mb-0.5">Prazo Médio Entrega:</span>
                    <span className="text-slate-800 font-medium">{activeSupplier.logisticaPrazoMedioEntrega || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold mb-0.5">Entrega Própria?</span>
                    <span className="text-slate-800 font-bold">{activeSupplier.logisticaEntregaPropria === true ? "Sim" : activeSupplier.logisticaEntregaPropria === false ? "Não" : "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold mb-0.5">Transportadora?</span>
                    <span className="text-slate-800 font-bold">{activeSupplier.logisticaTransportadora === true ? "Sim" : activeSupplier.logisticaTransportadora === false ? "Não" : "—"}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-border/20 pt-3">
                  <div>
                    <span className="text-slate-400 block font-semibold mb-0.5">Retirada local?</span>
                    <span className="text-slate-800 font-bold">{activeSupplier.logisticaRetiradaLocal === true ? "Sim" : activeSupplier.logisticaRetiradaLocal === false ? "Não" : "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold mb-0.5">Entregas Urgentes?</span>
                    <span className="text-slate-800 font-bold">{activeSupplier.logisticaFazEntregasUrgentes === true ? "Sim" : activeSupplier.logisticaFazEntregasUrgentes === false ? "Não" : "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold mb-0.5">Rastreamento?</span>
                    <span className="text-slate-800 font-bold">{activeSupplier.logisticaPossuiRastreamento === true ? "Sim" : activeSupplier.logisticaPossuiRastreamento === false ? "Não" : "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold mb-0.5">Área de Cobertura:</span>
                    <span className="text-slate-800 font-medium truncate block">{activeSupplier.logisticaAreaCobertura || "—"}</span>
                  </div>
                </div>

                <div className="border-t border-border/20 pt-3">
                  <span className="text-slate-400 block font-semibold mb-1">Estados Atendidos:</span>
                  <div className="flex flex-wrap gap-1">
                    {activeSupplier.logisticaEstadosAtendidos.length > 0 ? (
                      activeSupplier.logisticaEstadosAtendidos.map(uf => (
                        <span key={uf} className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 border border-border rounded">{uf}</span>
                      ))
                    ) : (
                      <span className="text-slate-500 italic">Não informado</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Cidade Estoque</label>
                    <Input value={logisticaCidadeEstoque} onChange={e => setLogisticaCidadeEstoque(e.target.value)} className="h-8 border-border bg-slate-50 text-slate-800" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Prazo Médio</label>
                    <Input value={logisticaPrazoMedioEntrega} onChange={e => setLogisticaPrazoMedioEntrega(e.target.value)} className="h-8 border-border bg-slate-50 text-slate-800" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 border-t border-border/20 pt-2">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 block">Frota Própria</label>
                    <div className="flex gap-2 pt-1">
                      <label className="flex items-center gap-1 font-bold"><input type="radio" name="f_p_e" checked={logisticaEntregaPropria === true} onChange={() => setLogisticaEntregaPropria(true)} /> Sim</label>
                      <label className="flex items-center gap-1 font-bold"><input type="radio" name="f_p_e" checked={logisticaEntregaPropria === false} onChange={() => setLogisticaEntregaPropria(false)} /> Não</label>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 block">Transportadora</label>
                    <div className="flex gap-2 pt-1">
                      <label className="flex items-center gap-1 font-bold"><input type="radio" name="transp_e" checked={logisticaTransportadora === true} onChange={() => setLogisticaTransportadora(true)} /> Sim</label>
                      <label className="flex items-center gap-1 font-bold"><input type="radio" name="transp_e" checked={logisticaTransportadora === false} onChange={() => setLogisticaTransportadora(false)} /> Não</label>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 block">Retirada FOB?</label>
                    <div className="flex gap-2 pt-1">
                      <label className="flex items-center gap-1 font-bold"><input type="radio" name="retirada_e" checked={logisticaRetiradaLocal === true} onChange={() => setLogisticaRetiradaLocal(true)} /> Sim</label>
                      <label className="flex items-center gap-1 font-bold"><input type="radio" name="retirada_e" checked={logisticaRetiradaLocal === false} onChange={() => setLogisticaRetiradaLocal(false)} /> Não</label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-border/20 pt-2">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 block">Entregas Urgentes?</label>
                    <div className="flex gap-2 pt-1">
                      <label className="flex items-center gap-1 font-bold"><input type="radio" name="urgente_e" checked={logisticaFazEntregasUrgentes === true} onChange={() => setLogisticaFazEntregasUrgentes(true)} /> Sim</label>
                      <label className="flex items-center gap-1 font-bold"><input type="radio" name="urgente_e" checked={logisticaFazEntregasUrgentes === false} onChange={() => setLogisticaFazEntregasUrgentes(false)} /> Não</label>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 block">Rastreamento Carga?</label>
                    <div className="flex gap-2 pt-1">
                      <label className="flex items-center gap-1 font-bold"><input type="radio" name="rastreamento_e" checked={logisticaPossuiRastreamento === true} onChange={() => setLogisticaPossuiRastreamento(true)} /> Sim</label>
                      <label className="flex items-center gap-1 font-bold"><input type="radio" name="rastreamento_e" checked={logisticaPossuiRastreamento === false} onChange={() => setLogisticaPossuiRastreamento(false)} /> Não</label>
                    </div>
                  </div>
                </div>

                <div className="space-y-1 border-t border-border/20 pt-2">
                  <span className="font-bold text-slate-500 block mb-1">Estados Atendidos</span>
                  <div className="flex flex-wrap gap-1.5">
                    {["RS", "SC", "PR", "SP", "RJ", "MG"].map(uf => {
                      const isSelected = logisticaEstadosAtendidos.includes(uf);
                      return (
                        <button
                          key={uf}
                          type="button"
                          onClick={() => {
                            setLogisticaEstadosAtendidos(prev => 
                              prev.includes(uf) ? prev.filter(x => x !== uf) : [...prev, uf]
                            );
                          }}
                          className={`px-2 py-0.5 text-[10px] font-bold border rounded ${isSelected ? "bg-blue-50 text-blue-600 border-blue-400" : "bg-slate-50 border-border text-slate-500"}`}
                        >
                          {uf}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Área de Cobertura</label>
                  <Input value={logisticaAreaCobertura} onChange={e => setLogisticaAreaCobertura(e.target.value)} className="h-8 border-border bg-slate-50 text-slate-800 animate-fade-in" />
                </div>
              </div>
            )}
          </Card>

        </div>

        {/* Lado Direito: Avaliação Interna & CRM (Card 6 - Super Premium) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* CARD 6: AVALIAÇÃO INTERNA (CRM) */}
          <Card className="glass-card p-6 shadow-md border-t-2 border-t-indigo-500/80 bg-slate-50 border border-border/40 space-y-5">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <UserCheck className="h-4.5 w-4.5 text-indigo-500" />
                6. Avaliação Interna (CRM)
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Exclusivo para uso interno. O fornecedor não tem acesso a esta ficha.</p>
            </div>

            {/* Notas Rápidas por Estrelas */}
            <div className="space-y-2.5 bg-slate-100/50 p-4 rounded-xl border border-slate-200/50">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-2">Notas da Avaliação (1-5)</span>
              <StarRating label="Nota Geral" value={crmNota || 0} onChange={val => { setCrmNota(val); handleUpdateCrm({ crmNota: val }); }} />
              <div className="border-t border-slate-200/50 my-2 pt-2 space-y-2">
                <StarRating label="Qualidade" value={crmQualidade || 0} onChange={val => { setCrmQualidade(val); handleUpdateCrm({ crmQualidade: val }); }} />
                <StarRating label="Prazo" value={crmPrazo || 0} onChange={val => { setCrmPrazo(val); handleUpdateCrm({ crmPrazo: val }); }} />
                <StarRating label="Atendimento" value={crmAtendimento || 0} onChange={val => { setCrmAtendimento(val); handleUpdateCrm({ crmAtendimento: val }); }} />
                <StarRating label="Preço" value={crmPreco || 0} onChange={val => { setCrmPreco(val); handleUpdateCrm({ crmPreco: val }); }} />
                <StarRating label="Pós-venda" value={crmPosVenda || 0} onChange={val => { setCrmPosVenda(val); handleUpdateCrm({ crmPosVenda: val }); }} />
              </div>
            </div>

            {/* Metadados Internos (Compra e Orçamentos) */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-500 block">Responsável Interno</label>
                <Input 
                  value={crmResponsavelInterno} 
                  onChange={e => setCrmResponsavelInterno(e.target.value)} 
                  onBlur={() => handleUpdateCrm({ crmResponsavelInterno })}
                  placeholder="Ex: João Compras"
                  className="h-8 bg-white text-slate-800 text-xs border-border"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-500 block">Valor Total Comprado (R$)</label>
                <Input 
                  type="text"
                  value={crmValorTotalComprado} 
                  onChange={e => setCrmValorTotalComprado(e.target.value)} 
                  onBlur={() => handleUpdateCrm({ crmValorTotalComprado })}
                  placeholder="Ex: 15400.00"
                  className="h-8 bg-white text-slate-800 text-xs border-border"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-500 block">Último Orçamento</label>
                <input 
                  type="date"
                  value={crmUltimoOrcamento} 
                  onChange={e => { setCrmUltimoOrcamento(e.target.value); handleUpdateCrm({ crmUltimoOrcamento: e.target.value }); }} 
                  className="w-full bg-white border border-border rounded-lg text-xs p-1.5 h-8 focus:ring-1 focus:ring-primary outline-none text-slate-800 cursor-pointer"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-500 block">Última Compra</label>
                <input 
                  type="date"
                  value={crmUltimaCompra} 
                  onChange={e => { setCrmUltimaCompra(e.target.value); handleUpdateCrm({ crmUltimaCompra: e.target.value }); }} 
                  className="w-full bg-white border border-border rounded-lg text-xs p-1.5 h-8 focus:ring-1 focus:ring-primary outline-none text-slate-800 cursor-pointer"
                />
              </div>
            </div>

            {/* Gestão de Tags */}
            <div className="space-y-2 border-t border-border/20 pt-3">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">Tags de Fornecedor</span>
              <div className="flex flex-wrap gap-1">
                {crmTags.length > 0 ? (
                  crmTags.map(tag => (
                    <span key={tag} className="text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded-full flex items-center gap-1.5">
                      {tag}
                      <button 
                        type="button" 
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-rose-500 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic block mb-1">Sem tags atribuídas.</span>
                )}
              </div>
              <div className="flex gap-1.5 pt-1.5">
                <Input 
                  value={newTagInput} 
                  onChange={e => setNewTagInput(e.target.value)} 
                  placeholder="Nova tag..." 
                  className="h-7 text-xs bg-white border-border"
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag(newTagInput);
                      setNewTagInput("");
                    }
                  }}
                />
                <Button 
                  size="sm" 
                  onClick={() => { handleAddTag(newTagInput); setNewTagInput(""); }} 
                  className="h-7 text-[10px] font-bold btn-metallic shrink-0 cursor-pointer"
                >
                  <Plus className="h-3 w-3 mr-0.5" /> Add
                </Button>
              </div>
              
              {/* Sugestões de Tags Rápidas */}
              <div className="flex flex-wrap gap-1 pt-1.5">
                {QUICK_TAGS.filter(t => !crmTags.includes(t)).slice(0, 7).map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleAddTag(tag)}
                    className="text-[9px] font-semibold bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 border border-slate-200 px-2 py-0.5 rounded cursor-pointer transition-all"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Observações Internas */}
            <div className="space-y-1.5 border-t border-border/20 pt-3">
              <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">Observações do CRM</label>
              <textarea
                rows={3}
                value={crmObservacoes}
                onChange={e => setCrmObservacoes(e.target.value)}
                onBlur={() => handleUpdateCrm({ crmObservacoes })}
                placeholder="Ex: Fornecedor muito proativo. Preços competitivos porém frete demorado..."
                className="w-full bg-white border border-border text-xs rounded-lg p-2.5 text-slate-800 outline-none resize-y"
              />
            </div>

            {/* Gestão de Documentos / Uploads CRM */}
            <div className="space-y-2 border-t border-border/20 pt-3 text-xs">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">Documentos & Arquivos de CRM</span>
              
              {crmUploads.length > 0 && (
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {crmUploads.map(up => (
                    <div key={up.id} className="flex items-center justify-between bg-white border border-border p-2 rounded-lg text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <div className="flex flex-col truncate">
                          <span className="font-bold text-slate-700 truncate">{up.nome}</span>
                          <span className="text-[9px] text-slate-400 font-semibold uppercase">{up.tipo} · por {up.uploadedBy}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <a 
                          href={up.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-1 rounded-md text-slate-500 hover:text-primary hover:bg-primary/10 cursor-pointer"
                          title="Baixar arquivo"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleRemoveCrmAttachment(up.id)}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload de novo arquivo CRM */}
              <div className="bg-slate-100 p-3 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <select 
                    value={crmFileType} 
                    onChange={e => setCrmFileType(e.target.value)}
                    className="bg-white border border-border rounded-lg text-[10px] p-1 h-7 font-bold outline-none cursor-pointer text-slate-700"
                  >
                    <option value="Contrato">Contrato</option>
                    <option value="Tabela de Preços">Tabela de Preços</option>
                    <option value="Catálogo">Catálogo</option>
                    <option value="Certificados">Certificados</option>
                    <option value="Logo">Logo</option>
                    <option value="Fotos">Fotos</option>
                    <option value="Vídeos">Vídeos</option>
                    <option value="Outros">Outros</option>
                  </select>
                  
                  <label className="flex items-center gap-1 px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-[10px] font-bold border border-slate-300 text-slate-700 cursor-pointer transition-all shadow-xs">
                    {uploadingCrmFile ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Paperclip className="h-3 w-3 text-slate-400" />
                        Selecionar e Anexar
                      </>
                    )}
                    <input 
                      type="file" 
                      disabled={uploadingCrmFile}
                      onChange={handleCrmAttachmentUpload} 
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Histórico / Linha do tempo */}
            <div className="space-y-3.5 border-t border-border/20 pt-3">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                <History className="h-3.5 w-3.5 text-slate-400" />
                Histórico & Logs de Contato
              </span>

              {/* Adicionar log rápido */}
              <div className="flex gap-1.5">
                <Input 
                  value={newHistoryLogText} 
                  onChange={e => setNewHistoryLogText(e.target.value)} 
                  placeholder="Ex: Enviou novo catálogo ou preço aumentou..." 
                  className="h-8 text-xs bg-white border-border"
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddHistoryLog();
                    }
                  }}
                />
                <Button 
                  size="sm" 
                  onClick={handleAddHistoryLog}
                  className="h-8 text-[10px] font-bold btn-metallic shrink-0 cursor-pointer"
                >
                  Registrar
                </Button>
              </div>

              {/* Logs */}
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {crmHistorico.length > 0 ? (
                  crmHistorico.slice().reverse().map((log, index) => (
                    <div key={index} className="text-[11px] leading-relaxed p-2 bg-white rounded-lg border border-slate-200/50">
                      <div className="flex items-center justify-between text-[9px] text-slate-400 font-semibold mb-0.5">
                        <span>{new Date(log.data).toLocaleDateString()} · {new Date(log.data).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-slate-700 font-medium whitespace-pre-wrap">{log.acao}</p>
                    </div>
                  ))
                ) : (
                  <span className="text-[11px] text-slate-400 italic block">Nenhum evento registrado no histórico.</span>
                )}
              </div>
            </div>

          </Card>
          
        </div>

      </div>

    </div>
  );
}
