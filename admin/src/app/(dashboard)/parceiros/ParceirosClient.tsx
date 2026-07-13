"use client";

import React, { useMemo, useState, useCallback } from "react";
import InfoTooltip, { TooltipBody } from "@/components/ui/InfoTooltip";
import { PartnerType } from "@prisma/client";
import {
  createParceiro,
  deleteParceiro,
  updateParceiro,
  type ParceiroDTO,
} from "@/app/actions/parceiros";
import { getParceirosLiveSnapshot } from "@/app/actions/liveSnapshots";
import { useLiveEntity } from "@/context/LiveSyncContext";
import { PARTNER_TYPE_STYLES, PARTNER_TYPES } from "@/lib/partnerTypes";
import { PHONE_PLACEHOLDER } from "@/lib/phone";
import { ActionDialogHost, useActionDialog } from "@/components/ActionDialogHost";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { getColaboradores } from "@/app/actions/colaboradores";
import { getProjectDetailsAction } from "@/app/actions/project";
import ProjectDetails from "@/components/ProjectDetails";
import {
  Search,
  UserPlus,
  Trash2,
  Loader2,
  Mail,
  Phone,
  MapPin,
  Building2,
  Pencil,
  Camera,
  Plus,
  X,
  Image as ImageIcon,
  ExternalLink,
  Globe,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface ParceirosClientProps {
  initialParceiros: ParceiroDTO[];
  companyId: string;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

interface PartnerCardProps {
  p: ParceiroDTO;
  privacyMode: boolean;
  uploadingId: string | null;
  handleUploadImage: (id: string, file: File, type: "avatar" | "galeria") => void;
  handleDeleteImage: (id: string, imageUrl: string, isAvatar: boolean) => void;
  handleViewProject: (projectId: string) => void;
  openEdit: (p: ParceiroDTO) => void;
  handleDelete: (p: ParceiroDTO) => void;
}

const PartnerCard = ({
  p,
  privacyMode,
  uploadingId,
  handleUploadImage,
  handleDeleteImage,
  handleViewProject,
  openEdit,
  handleDelete,
}: PartnerCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const style = PARTNER_TYPE_STYLES[p.tipo];
  const Icon = style.icon;
  const imagesList = p.imagens ? p.imagens.split(",").filter(Boolean) : [];

  return (
    <Card
      key={p.id}
      className="bg-white border border-slate-100 hover:border-slate-200/80 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group/card relative"
    >
      <div className={`h-1.5 w-full ${style.accent}`} />
      
      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Perfil & Cabeçalho */}
        <div className="flex items-center gap-3.5 relative">
          {/* Avatar com upload rápido e bordas premium */}
          <div className={`relative group/avatar flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 overflow-hidden shadow-inner ring-4 ring-slate-50 transition-all duration-300 group-hover/card:ring-slate-100 transition-all duration-300 ${privacyMode ? "blur-md select-none" : ""}`}>
            {p.fotoUrl ? (
              <img src={p.fotoUrl} alt={p.nome} className="h-full w-full object-cover group-hover/avatar:scale-105 transition-transform duration-500" />
            ) : (
              <div className={`h-full w-full flex items-center justify-center text-lg font-black ${style.avatar}`}>
                {getInitials(p.nome)}
              </div>
            )}
            <label
              htmlFor={`avatar-upload-${p.id}`}
              className="absolute inset-0 bg-black/60 text-white flex flex-col items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer text-[9px] font-bold gap-1"
            >
              {uploadingId === `${p.id}-avatar` ? (
                <Loader2 className="h-4.5 w-4.5 animate-spin" />
              ) : (
                <>
                  <Camera className="h-4 w-4" />
                  <span>Alterar</span>
                </>
              )}
            </label>
            <input
              id={`avatar-upload-${p.id}`}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadImage(p.id, file, "avatar");
              }}
              disabled={uploadingId !== null}
            />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className={`font-extrabold text-slate-800 text-sm leading-tight tracking-tight group-hover/card:text-indigo-600 transition-colors truncate transition-all duration-300 ${privacyMode ? "blur-[6px] select-none" : ""}`}>{p.nome}</h3>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border}`}>
                <Icon className="h-2.5 w-2.5" />
                {style.label}
              </span>
              
              {p.cidade && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                  <MapPin className="h-2.5 w-2.5 text-slate-350" />
                  {p.cidade}
                </span>
              )}
            </div>
          </div>

          {/* Ações Rápidas de Foto do perfil */}
          {p.fotoUrl && (
            <button
              type="button"
              onClick={() => handleDeleteImage(p.id, p.fotoUrl!, true)}
              title="Remover foto de perfil"
              className="absolute top-0 right-0 p-1 bg-slate-50 hover:bg-red-50 border border-slate-100 rounded-lg text-slate-400 hover:text-red-500 transition-colors shadow-sm cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Dados Comerciais / Escritório */}
        {p.escritorio && (
          <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-100 rounded-xl">
            <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">Escritório / Studio</span>
              <span className="text-[10px] font-bold text-slate-700 truncate block mt-0.5">{p.escritorio}</span>
            </div>
          </div>
        )}

        {/* Contatos Rápidos em Grid */}
        <div className="grid grid-cols-3 gap-2">
          {p.telefone ? (
            <a
              href={`https://wa.me/${p.telefone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-white hover:bg-emerald-50 border border-slate-100 hover:border-emerald-250 text-slate-500 hover:text-emerald-600 transition-all gap-1 cursor-pointer"
              title={`Falar no WhatsApp: ${p.telefone}`}
            >
              <Phone className="h-4 w-4 shrink-0" />
              <span className="text-[9px] font-bold">WhatsApp</span>
            </a>
          ) : (
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50/50 border border-slate-100 text-slate-300 opacity-60">
              <Phone className="h-4 w-4 shrink-0" />
              <span className="text-[9px] font-bold">WhatsApp</span>
            </div>
          )}

          {p.email ? (
            <a
              href={`mailto:${p.email}`}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-white hover:bg-blue-50 border border-slate-100 hover:border-blue-250 text-slate-500 hover:text-blue-600 transition-all gap-1 cursor-pointer"
              title={`Enviar e-mail: ${p.email}`}
            >
              <Mail className="h-4 w-4 shrink-0" />
              <span className="text-[9px] font-bold">E-mail</span>
            </a>
          ) : (
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50/50 border border-slate-100 text-slate-300 opacity-60">
              <Mail className="h-4 w-4 shrink-0" />
              <span className="text-[9px] font-bold">E-mail</span>
            </div>
          )}

          {p.portfolioUrl ? (
            <a
              href={p.portfolioUrl}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-white hover:bg-pink-50 border border-slate-100 hover:border-pink-250 text-slate-500 hover:text-pink-600 transition-all gap-1 cursor-pointer"
              title="Acessar Portfólio / Instagram"
            >
              <Globe className="h-4 w-4 shrink-0" />
              <span className="text-[9px] font-bold">Portfólio</span>
            </a>
          ) : (
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50/50 border border-slate-100 text-slate-300 opacity-60">
              <Globe className="h-4 w-4 shrink-0" />
              <span className="text-[9px] font-bold">Portfólio</span>
            </div>
          )}
        </div>

        {/* Botão de Minimizar / Expandir */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-1.5 flex items-center justify-center gap-1.5 text-[9px] font-black text-slate-400 hover:text-indigo-600 hover:bg-slate-50 border border-dashed border-slate-200 hover:border-slate-350 rounded-xl transition-all uppercase tracking-widest cursor-pointer mt-1"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              <span>Ocultar Detalhes</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              <span>Mostrar Detalhes</span>
            </>
          )}
        </button>

        {isExpanded && (
          <>
            {/* Observações */}
            {p.observacoes && (
              <p className="text-[10px] text-slate-500 leading-relaxed italic bg-slate-50/50 border border-dashed border-slate-200 rounded-xl p-3 line-clamp-2">
                "{p.observacoes}"
              </p>
            )}

            {/* Galeria de Fotos / Projetos */}
            <div className="border-t border-slate-100 pt-3.5 space-y-2 mt-auto">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Portfólio de Fotos</span>
                <span className="text-[8px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                  {imagesList.length} fotos
                </span>
              </div>

              {/* Grid de Imagens com botão "+ Adicionar" inline */}
              <div className="grid grid-cols-4 gap-2">
                {imagesList.map((img, idx) => (
                  <div key={img} className="relative aspect-square rounded-xl overflow-hidden border border-slate-100 group/img bg-slate-50 shadow-inner">
                    <img src={img} alt={`Projeto ${idx + 1}`} className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-500" />
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(p.id, img, false)}
                      className="absolute top-1 right-1 p-0.5 bg-black/60 hover:bg-red-650 rounded-lg text-white opacity-0 group-hover/img:opacity-100 transition-opacity shadow-sm cursor-pointer"
                      title="Excluir imagem"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}

                {/* Botão de Adicionar Foto inline na Galeria */}
                {imagesList.length < 8 && (
                  <label
                    htmlFor={`gallery-upload-${p.id}`}
                    className="aspect-square rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 hover:border-slate-350 transition-all group/add shadow-sm"
                    title="Adicionar imagem ao portfólio"
                  >
                    {uploadingId === `${p.id}-galeria` ? (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-450" />
                    ) : (
                      <>
                        <Plus className="h-4 w-4 text-slate-450 group-hover/add:text-indigo-650 transition-colors" />
                        <span className="text-[7px] font-black uppercase text-slate-400 tracking-wider mt-1 group-hover/add:text-indigo-650 transition-colors">Subir</span>
                      </>
                    )}
                  </label>
                )}
                
                <input
                  id={`gallery-upload-${p.id}`}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadImage(p.id, file, "galeria");
                  }}
                  disabled={uploadingId !== null}
                />

                {imagesList.length === 0 && (
                  <label
                    htmlFor={`gallery-upload-${p.id}`}
                    className="col-span-3 py-4 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <ImageIcon className="h-4 w-4 text-slate-400 mb-1" />
                    <span className="text-[9px] text-slate-400 font-bold">Nenhuma imagem enviada</span>
                  </label>
                )}
              </div>
            </div>

            {/* Projetos Integrados no CRM */}
            <div className="border-t border-slate-100 pt-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Projetos no CRM</span>
                <span className="text-[8px] font-black bg-slate-50 border border-slate-100 text-slate-650 px-2 py-0.5 rounded-full">
                  {p.projects?.length || 0}
                </span>
              </div>
              {p.projects && p.projects.length > 0 ? (
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {p.projects.map((proj) => {
                    let statusBg = "bg-slate-50 text-slate-700 border-slate-200";
                    if (proj.status_geral === "APROVADO" || proj.status_geral === "FINALIZADO") {
                      statusBg = "bg-emerald-50 text-emerald-700 border-emerald-100";
                    } else if (proj.status_geral === "LEAD" || proj.status_geral === "ORCAMENTO" || proj.status_geral === "NEGOCIACAO") {
                      statusBg = "bg-blue-50 text-blue-700 border-blue-100";
                    } else if (proj.status_geral === "PRODUCAO" || proj.status_geral === "INSTALACAO" || proj.status_geral === "CONFERENCIA_TECNICA") {
                      statusBg = "bg-amber-50/70 text-amber-700 border-amber-100";
                    }
                    
                    return (
                      <div 
                        key={proj.id} 
                        onClick={() => handleViewProject(proj.id)}
                        className="flex items-center justify-between p-2 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer text-[10px] group/project"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="font-bold text-slate-700 group-hover/project:text-indigo-650 transition-colors truncate">{proj.client.nome}</p>
                          <p className="text-[9px] text-slate-450 font-bold mt-0.5">
                            {proj.valor_previsto ? Number(proj.valor_previsto).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "R$ 0,00"}
                          </p>
                        </div>
                        <span className={`inline-flex items-center text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusBg}`}>
                          {proj.status_geral}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-3 rounded-xl border border-dashed border-slate-200 text-center bg-slate-50/30">
                  <span className="text-[9px] text-slate-450 font-bold">Nenhum projeto vinculado</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Ações de Edição e Exclusão do Parceiro */}
        <div className="flex gap-2 pt-3 border-t border-slate-100 mt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 text-[11px] font-extrabold h-9 rounded-xl border-slate-200 hover:border-slate-350 hover:bg-slate-50 transition-all"
            onClick={() => openEdit(p)}
          >
            <Pencil className="h-3 w-3 mr-1.5 text-slate-500" />
            Editar Cadastro
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 border-slate-200 h-9 px-3 rounded-xl transition-all"
            onClick={() => handleDelete(p)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default function ParceirosClient({ initialParceiros, companyId }: ParceirosClientProps) {
  const dialog = useActionDialog();
  const { showSuccess, showError, confirmAction } = dialog;

  const [parceiros, setParceiros] = useState<ParceiroDTO[]>(initialParceiros);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("ALL");
  const [loading, setLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ParceiroDTO | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  
  const [privacyMode, setPrivacyMode] = useState(false);

  React.useEffect(() => {
    async function loadColabs() {
      const res = await getColaboradores(companyId);
      if (res.success && res.colaboradores) {
        setColaboradores(res.colaboradores);
      }
    }
    loadColabs();
  }, [companyId]);

  const handleViewProject = async (projectId: string) => {
    setActiveProjectId(projectId);
    const res = await getProjectDetailsAction(projectId);
    if (res.success && res.project) {
      setSelectedProject(res.project);
    } else {
      showError("Erro ao carregar", "Não foi possível carregar os detalhes do projeto.");
    }
  };

  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<PartnerType>("PROJETISTA");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cidade, setCidade] = useState("");
  const [escritorio, setEscritorio] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");

  const syncParceiros = useCallback(async () => {
    const result = await getParceirosLiveSnapshot(companyId);
    if (result.success && result.parceiros) {
      setParceiros(result.parceiros);
    }
  }, [companyId]);

  useLiveEntity("parceiros", {
    sync: syncParceiros,
    enabled: !loading && !isCreateOpen && uploadingId === null,
  });

  const resetForm = () => {
    setNome("");
    setTipo("PROJETISTA");
    setEmail("");
    setTelefone("");
    setCidade("");
    setEscritorio("");
    setObservacoes("");
    setFotoUrl("");
    setPortfolioUrl("");
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const openEdit = (p: ParceiroDTO) => {
    setEditing(p);
    setNome(p.nome);
    setTipo(p.tipo);
    setEmail(p.email || "");
    setTelefone(p.telefone || "");
    setCidade(p.cidade || "");
    setEscritorio(p.escritorio || "");
    setObservacoes(p.observacoes || "");
    setFotoUrl(p.fotoUrl || "");
    setPortfolioUrl(p.portfolioUrl || "");
    setIsCreateOpen(true);
  };

  const filtered = useMemo(() => {
    return parceiros.filter((p) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        p.nome.toLowerCase().includes(q) ||
        (p.escritorio?.toLowerCase().includes(q) ?? false) ||
        (p.cidade?.toLowerCase().includes(q) ?? false);
      const matchesTipo = filterTipo === "ALL" || p.tipo === filterTipo;
      return matchesSearch && matchesTipo && p.ativo;
    });
  }, [parceiros, search, filterTipo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      showError("Campo obrigatório", "Informe o nome do profissional ou escritório.");
      return;
    }

    setLoading(true);
    const payload = {
      nome,
      tipo,
      email,
      telefone,
      cidade,
      escritorio,
      observacoes,
      fotoUrl,
      portfolioUrl,
    };

    if (editing) {
      const res = await updateParceiro(editing.id, payload);
      setLoading(false);
      if (!res.success || !res.parceiro) {
        showError("Erro ao salvar", res.error || "Não foi possível atualizar.");
        return;
      }
      setParceiros((prev) =>
        prev.map((p) => (p.id === editing.id ? { ...p, ...res.parceiro! } : p))
      );
      showSuccess("Parceiro atualizado", `${nome} foi salvo com sucesso.`);
    } else {
      const res = await createParceiro(companyId, payload);
      setLoading(false);
      if (!res.success || !res.parceiro) {
        showError("Erro ao cadastrar", res.error || "Não foi possível cadastrar.");
        return;
      }
      setParceiros((prev) => [...prev, res.parceiro!]);
      showSuccess("Parceiro cadastrado", `${nome} foi adicionado à base.`);
    }

    setIsCreateOpen(false);
    resetForm();
  };

  const handleDelete = (target: ParceiroDTO) => {
    confirmAction({
      title: "Remover parceiro?",
      message: `${target.nome} será removido da base de projetistas e arquitetos. Esta ação não pode ser desfeita.`,
      confirmLabel: "Sim, remover",
      onConfirm: async () => {
        setLoading(true);
        const res = await deleteParceiro(target.id);
        setLoading(false);
        if (!res.success) {
          showError("Erro ao remover", res.error || "Não foi possível excluir.");
          return;
        }
        setParceiros((prev) => prev.filter((p) => p.id !== target.id));
        showSuccess("Parceiro removido", "Cadastro excluído da base.");
      },
    });
  };

  // Upload/Exclusão direta no Card
  const handleUploadImage = async (partnerId: string, file: File, type: "avatar" | "galeria") => {
    setUploadingId(`${partnerId}-${type}`);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);

    try {
      const response = await fetch(`/api/partners/${partnerId}/images`, {
        method: "POST",
        body: formData,
      });

      const res = await response.json();
      if (res.success && res.partner) {
        setParceiros((prev) =>
          prev.map((p) => (p.id === partnerId ? { ...p, ...res.partner } : p))
        );
        showSuccess(
          type === "avatar" ? "Foto de perfil atualizada" : "Projeto adicionado",
          type === "avatar" ? "O avatar do parceiro foi salvo." : "A foto foi adicionada à galeria."
        );
      } else {
        showError("Erro no upload", res.error || "Não foi possível enviar o arquivo.");
      }
    } catch (err) {
      console.error(err);
      showError("Erro de conexão", "Falha de rede ao tentar subir a imagem.");
    } finally {
      setUploadingId(null);
    }
  };

  const handleDeleteImage = async (partnerId: string, imageUrl: string, isAvatar: boolean) => {
    confirmAction({
      title: "Excluir imagem?",
      message: "Tem certeza que deseja remover esta imagem permanentemente?",
      confirmLabel: "Sim, remover",
      onConfirm: async () => {
        try {
          const response = await fetch(
            `/api/partners/${partnerId}/images?url=${encodeURIComponent(imageUrl)}&avatar=${isAvatar}`,
            {
              method: "DELETE",
            }
          );
          const res = await response.json();
          if (res.success && res.partner) {
            setParceiros((prev) =>
              prev.map((p) => (p.id === partnerId ? { ...p, ...res.partner } : p))
            );
            showSuccess("Imagem removida", "A imagem foi excluída com sucesso.");
          } else {
            showError("Erro ao remover", res.error || "Não foi possível excluir a imagem.");
          }
        } catch (err) {
          console.error(err);
          showError("Erro de conexão", "Falha ao tentar excluir a imagem.");
        }
      },
    });
  };

  return (
    <>
      <div className="space-y-6">
        {/* Cabeçalho da Página com Modo Privacidade */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-slate-800">Projetistas e Arquitetos</h1>
              <InfoTooltip label="Sobre Projetistas e Arquitetos">
                <TooltipBody
                  title="Parceiros externos"
                  items={[
                    "Cadastre arquitetos e projetistas que indicam clientes.",
                    "Vincule um parceiro a um orçamento para dar o devido crédito.",
                    "Acompanhe indicações e desempenho de cada parceiro.",
                    "O modo privacidade oculta nomes e fotos em apresentações.",
                  ]}
                />
              </InfoTooltip>
              <button
                onClick={() => setPrivacyMode(!privacyMode)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-650 transition-colors cursor-pointer border border-slate-200 bg-white shadow-sm"
                title={privacyMode ? "Mostrar nomes e fotos" : "Ocultar nomes e fotos (Modo Privacidade)"}
              >
                {privacyMode ? <EyeOff className="h-4 w-4 text-indigo-600" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Cadastre parceiros profissionais — arquitetos, projetistas, decoradores e engenheiros — que indicam clientes ou co-projetam com a marcenaria.
            </p>
          </div>

          <Button 
            onClick={openCreate} 
            className="font-extrabold bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl h-10 px-4 border-none shadow-sm cursor-pointer flex items-center gap-2 shrink-0 self-start md:self-auto"
          >
            <UserPlus className="h-4 w-4" />
            Cadastrar Parceiro
          </Button>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, escritório ou cidade..."
              className="pl-9 bg-card"
            />
          </div>
          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="h-10 px-3 rounded-md border border-border bg-card text-sm cursor-pointer"
          >
            <option value="ALL">Todos os tipos</option>
            {PARTNER_TYPES.map((t) => (
              <option key={t} value={t}>
                {PARTNER_TYPE_STYLES[t].label}
              </option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <Card className="p-10 text-center glass-card border-border">
            <p className="text-muted-foreground text-sm">
              Nenhum projetista ou arquiteto encontrado. Cadastre parceiros que indicam ou co-projetam com a marcenaria.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <PartnerCard
                key={p.id}
                p={p}
                privacyMode={privacyMode}
                uploadingId={uploadingId}
                handleUploadImage={handleUploadImage}
                handleDeleteImage={handleDeleteImage}
                handleViewProject={handleViewProject}
                openEdit={openEdit}
                handleDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog
        isOpen={isCreateOpen}
        onClose={() => {
          if (loading) return;
          setIsCreateOpen(false);
          resetForm();
        }}
        className="max-w-lg"
      >
        <div className="space-y-4 pr-6">
          <div>
            <h3 className="text-lg font-bold">
              {editing ? "Editar parceiro" : "Cadastrar projetista / arquiteto"}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Profissionais externos que indicam clientes ou co-projetam com a marcenaria.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-muted-foreground">Nome completo *</label>
                <Input required value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">Tipo *</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as PartnerType)}
                  className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm"
                >
                  {PARTNER_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {PARTNER_TYPE_STYLES[t].label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">Cidade</label>
                <Input value={cidade} onChange={(e) => setCidade(e.target.value)} />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-muted-foreground">Escritório / Studio</label>
                <Input value={escritorio} onChange={(e) => setEscritorio(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">Telefone</label>
                <Input
                  type="tel"
                  placeholder={PHONE_PLACEHOLDER}
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">E-mail</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-muted-foreground">Link do Portfolio ou Instagram</label>
                <Input type="url" placeholder="https://..." value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-muted-foreground">URL da Foto de Perfil (Avatar)</label>
                <Input type="url" placeholder="https://..." value={fotoUrl} onChange={(e) => setFotoUrl(e.target.value)} />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-muted-foreground">Observações</label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateOpen(false);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editing ? "Salvar" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </div>
      </Dialog>

      {/* Dialog de Visualização de Detalhes do Projeto */}
      <Dialog
        isOpen={!!activeProjectId}
        onClose={() => {
          setActiveProjectId(null);
          setSelectedProject(null);
        }}
        className="max-w-5xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <div>
              <h3 className="text-lg font-bold">Ficha de Controle do Projeto</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Visualização e gerenciamento de ambientes, tarefas e financeiro.</p>
            </div>
            <button 
              onClick={() => { setActiveProjectId(null); setSelectedProject(null); }}
              className="p-1 hover:bg-slate-100 rounded-md text-muted-foreground transition-colors cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
          {selectedProject ? (
            <div className="max-h-[75vh] overflow-y-auto pr-2">
              <ProjectDetails 
                initialProject={selectedProject} 
                companyId={companyId} 
                colaboradores={colaboradores} 
                isMock={false}
                embedded={true}
                onClose={() => { setActiveProjectId(null); setSelectedProject(null); }}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-semibold text-slate-500">Carregando detalhes do projeto...</p>
            </div>
          )}
        </div>
      </Dialog>

      <ActionDialogHost dialog={dialog} />
    </>
  );
}
