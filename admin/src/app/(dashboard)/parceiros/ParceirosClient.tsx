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
import {
  PARTNER_ORIGEM_OPTIONS,
  PARTNER_SIGNUP_TYPES,
  PARTNER_TYPE_STYLES,
  PARTNER_TYPES,
  formatPartnerRegistro,
  partnerRegistroLabel,
} from "@/lib/partnerTypes";
import { ActionDialogHost, useActionDialog } from "@/components/ActionDialogHost";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { getColaboradores } from "@/app/actions/colaboradores";
import { getProjectDetailsAction } from "@/app/actions/project";
import ProjectDetails from "@/components/ProjectDetails";
import { compressImageFile } from "@/lib/imageCompression";
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

const PALETTES = [
  {
    accent: "bg-gradient-to-r from-emerald-500 to-teal-600",
    bgCard: "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200/60 hover:border-emerald-350",
    hoverText: "group-hover/card:text-emerald-700",
    text: "text-emerald-700",
    badge: "bg-emerald-500/10 border-emerald-500/20 text-emerald-700",
    avatar: "bg-emerald-500/15 text-emerald-700 border-emerald-500/25",
    editHover: "hover:text-emerald-600 hover:bg-white hover:border-emerald-200",
  },
  {
    accent: "bg-gradient-to-r from-indigo-500 to-violet-600",
    bgCard: "bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-200/60 hover:border-indigo-350",
    hoverText: "group-hover/card:text-indigo-700",
    text: "text-indigo-700",
    badge: "bg-indigo-500/10 border-indigo-500/20 text-indigo-700",
    avatar: "bg-indigo-500/15 text-indigo-700 border-indigo-500/25",
    editHover: "hover:text-indigo-600 hover:bg-white hover:border-indigo-200",
  },
  {
    accent: "bg-gradient-to-r from-rose-500 to-pink-600",
    bgCard: "bg-gradient-to-br from-rose-50 to-pink-50 border-rose-200/60 hover:border-rose-350",
    hoverText: "group-hover/card:text-rose-700",
    text: "text-rose-700",
    badge: "bg-rose-500/10 border-rose-500/20 text-rose-700",
    avatar: "bg-rose-500/15 text-rose-700 border-rose-500/25",
    editHover: "hover:text-rose-600 hover:bg-white hover:border-rose-200",
  },
  {
    accent: "bg-gradient-to-r from-amber-500 to-orange-600",
    bgCard: "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200/60 hover:border-amber-350",
    hoverText: "group-hover/card:text-amber-700",
    text: "text-amber-700",
    badge: "bg-amber-500/10 border-amber-500/20 text-amber-700",
    avatar: "bg-amber-500/15 text-amber-700 border-amber-500/25",
    editHover: "hover:text-amber-600 hover:bg-white hover:border-amber-200",
  },
  {
    accent: "bg-gradient-to-r from-cyan-500 to-blue-600",
    bgCard: "bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-200/60 hover:border-cyan-350",
    hoverText: "group-hover/card:text-cyan-700",
    text: "text-cyan-700",
    badge: "bg-cyan-500/10 border-cyan-500/20 text-cyan-700",
    avatar: "bg-cyan-500/15 text-cyan-700 border-cyan-500/25",
    editHover: "hover:text-cyan-600 hover:bg-white hover:border-cyan-200",
  },
  {
    accent: "bg-gradient-to-r from-purple-500 to-fuchsia-600",
    bgCard: "bg-gradient-to-br from-purple-50 to-fuchsia-50 border-purple-200/60 hover:border-purple-350",
    hoverText: "group-hover/card:text-purple-700",
    text: "text-purple-700",
    badge: "bg-purple-500/10 border-purple-500/20 text-purple-700",
    avatar: "bg-purple-500/15 text-purple-700 border-purple-500/25",
    editHover: "hover:text-purple-600 hover:bg-white hover:border-purple-200",
  },
  {
    accent: "bg-gradient-to-r from-sky-500 to-indigo-600",
    bgCard: "bg-gradient-to-br from-sky-50 to-indigo-50 border-sky-200/60 hover:border-sky-350",
    hoverText: "group-hover/card:text-sky-700",
    text: "text-sky-700",
    badge: "bg-sky-500/10 border-sky-500/20 text-sky-700",
    avatar: "bg-sky-500/15 text-sky-700 border-sky-500/25",
    editHover: "hover:text-sky-600 hover:bg-white hover:border-sky-200",
  },
  {
    accent: "bg-gradient-to-r from-violet-500 to-fuchsia-600",
    bgCard: "bg-gradient-to-br from-violet-50 to-fuchsia-50 border-violet-200/60 hover:border-violet-350",
    hoverText: "group-hover/card:text-violet-700",
    text: "text-violet-700",
    badge: "bg-violet-500/10 border-violet-500/20 text-violet-700",
    avatar: "bg-violet-500/15 text-violet-700 border-violet-500/25",
    editHover: "hover:text-violet-600 hover:bg-white hover:border-violet-200",
  },
];

function getPartnerPalette(id: string) {
  let hash = 0;
  const seed = id || "default";
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PALETTES.length;
  return PALETTES[index];
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
  onViewDetails: (p: ParceiroDTO) => void;
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
  onViewDetails,
}: PartnerCardProps) => {
  const style = PARTNER_TYPE_STYLES[p.tipo];
  const Icon = style.icon;
  const projectCount = p.projects?.length ?? 0;
  const totalLinkedValue = (p.projects ?? []).reduce(
    (sum, proj) => sum + Number(proj.valor_previsto || 0),
    0
  );
  const registroLabel = formatPartnerRegistro(p.tipo, p.registro_profissional);
  const formatCurrency = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const palette = getPartnerPalette(p.id);

  return (
    <div
      key={p.id}
      onClick={() => onViewDetails(p)}
      className={`border rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group/card relative cursor-pointer ${palette.bgCard}`}
    >
      <div className={`h-1.5 w-full ${palette.accent}`} />
      
      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Perfil & Cabeçalho */}
        <div className="flex items-start gap-3.5">
          {/* Avatar com upload rápido */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`relative group/avatar flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/60 bg-white overflow-hidden shadow-sm ring-4 ring-white/40 transition-all duration-300 group-hover/card:ring-white/80 ${privacyMode ? "blur-md select-none" : ""}`}
          >
            {p.fotoUrl ? (
              <img src={p.fotoUrl} alt={p.nome} className="h-full w-full object-cover group-hover/avatar:scale-105 transition-transform duration-500" />
            ) : (
              <div className={`h-full w-full flex items-center justify-center text-lg font-black ${palette.avatar}`}>
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
            {p.fotoUrl && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteImage(p.id, p.fotoUrl!, true);
                }}
                title="Remover foto de perfil"
                className="absolute bottom-1 right-1 p-0.5 bg-black/70 hover:bg-red-600 rounded-md text-white opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer z-10"
              >
                <Trash2 className="h-2.5 w-2.5" />
              </button>
            )}
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className={`font-extrabold text-slate-800 text-sm leading-tight tracking-tight transition-colors truncate ${palette.hoverText} ${privacyMode ? "blur-[6px] select-none" : ""}`}>{p.nome}</h3>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${palette.badge}`}>
                <Icon className="h-2.5 w-2.5" />
                {style.label}
              </span>
              
              {p.cidade && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-slate-500 bg-white/70 px-2 py-0.5 rounded-full border border-white/90">
                  <MapPin className="h-2.5 w-2.5 text-slate-400" />
                  {p.cidade}
                </span>
              )}
            </div>
            {registroLabel && (
              <p className="mt-1.5 text-[10px] font-semibold text-slate-500 truncate">
                {registroLabel}
              </p>
            )}
          </div>

          {/* Editar / Excluir no topo (ícones) */}
          <div className="flex items-center gap-1 shrink-0 -mt-0.5" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => openEdit(p)}
              title="Editar cadastro"
              className={`p-2 rounded-xl border border-white/60 bg-white/80 text-slate-600 transition-colors cursor-pointer ${palette.editHover}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(p)}
              title="Excluir parceiro"
              className="p-2 rounded-xl border border-white/60 bg-white/80 text-slate-500 hover:text-red-650 hover:bg-red-50 hover:border-red-100 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Dados Comerciais / Escritório */}
        {p.escritorio && (
          <div className="flex items-center gap-2 p-2 bg-white/80 border border-white/90 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <Building2 className="h-4 w-4 text-slate-450 shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="text-[8px] font-black text-slate-455 uppercase tracking-widest block leading-none">Escritório / Studio</span>
              <span className="text-[10px] font-extrabold text-slate-700 truncate block mt-0.5">{p.escritorio}</span>
            </div>
          </div>
        )}

        {/* Projetos vinculados (sempre visível) */}
        <div className="rounded-xl border border-white/95 bg-white/90 p-3.5 space-y-2 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-450">
              Projetos vinculados
            </span>
            <span className="text-[10px] font-black tabular-nums text-slate-750 bg-white border border-slate-200/80 px-2 py-0.5 rounded-full">
              {projectCount}
            </span>
          </div>
          <p className="text-lg font-black tracking-tight text-slate-800 tabular-nums leading-none">
            {formatCurrency(totalLinkedValue)}
          </p>
          <p className="text-[9px] font-semibold text-slate-400">
            Valor total dos projetos no CRM
          </p>
        </div>

        {/* Contatos Rápidos em Grid */}
        <div className="grid grid-cols-3 gap-2" onClick={(e) => e.stopPropagation()}>
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
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/40 border border-white/60 text-slate-300 opacity-60">
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
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/40 border border-white/60 text-slate-300 opacity-60">
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
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/40 border border-white/60 text-slate-300 opacity-60">
              <Globe className="h-4 w-4 shrink-0" />
              <span className="text-[9px] font-bold">Portfólio</span>
            </div>
          )}
        </div>
      </div>
    </div>
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
  const [viewingPartner, setViewingPartner] = useState<ParceiroDTO | null>(null);

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
  const [tipo, setTipo] = useState<PartnerType>("ARQUITETO");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cidade, setCidade] = useState("");
  const [escritorio, setEscritorio] = useState("");
  const [registroProfissional, setRegistroProfissional] = useState("");
  const [origem, setOrigem] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [logoLoading, setLogoLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function fetchCompanyByCnpj(cnpjValue: string) {
    const clean = cnpjValue.replace(/\D/g, "");
    if (clean.length !== 14) return;
    setCnpjLoading(true);
    setFormError(null);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
      const json = await res.json();
      if (json && !json.message) {
        setNome(json.razao_social || json.nome_fantasia || "");
        setEscritorio(json.nome_fantasia || json.razao_social || "");
        setEmail(json.email || "");
        if (json.ddd_telefone_1) {
          const tel = json.ddd_telefone_1.replace(/\D/g, "");
          if (tel.length >= 10) {
            setTelefone(`(${tel.substring(0, 2)}) ${tel.substring(2)}`);
          } else {
            setTelefone(json.ddd_telefone_1);
          }
        }
        setCidade(json.municipio || "");
      } else {
        setFormError("CNPJ não encontrado ou inválido.");
      }
    } catch (err) {
      console.error("Erro ao buscar CNPJ:", err);
      setFormError("Erro ao buscar CNPJ. Verifique a conexão.");
    } finally {
      setCnpjLoading(false);
    }
  }

  const handleCnpjChange = (val: string) => {
    let clean = val.replace(/\D/g, "");
    if (clean.length > 14) clean = clean.substring(0, 14);
    
    let formatted = clean;
    if (clean.length > 12) {
      formatted = `${clean.substring(0, 2)}.${clean.substring(2, 5)}.${clean.substring(5, 8)}/${clean.substring(8, 12)}-${clean.substring(12)}`;
    } else if (clean.length > 8) {
      formatted = `${clean.substring(0, 2)}.${clean.substring(2, 5)}.${clean.substring(5, 8)}/${clean.substring(8)}`;
    } else if (clean.length > 5) {
      formatted = `${clean.substring(0, 2)}.${clean.substring(2, 5)}.${clean.substring(5)}`;
    } else if (clean.length > 2) {
      formatted = `${clean.substring(0, 2)}.${clean.substring(2)}`;
    }
    
    setCnpj(formatted);
    if (clean.length === 14) {
      fetchCompanyByCnpj(clean);
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoLoading(true);
    setFormError(null);
    try {
      const compressed = await compressImageFile(file, { maxDimension: 256, quality: 0.75 });
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoUrl(reader.result as string);
        setLogoLoading(false);
      };
      reader.onerror = () => {
        setFormError("Falha ao ler o arquivo de imagem.");
        setLogoLoading(false);
      };
      reader.readAsDataURL(compressed);
    } catch (err) {
      console.error("Erro no upload do logo:", err);
      setFormError("Erro ao processar imagem.");
      setLogoLoading(false);
    }
  };

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
    setTipo("ARQUITETO");
    setEmail("");
    setTelefone("");
    setCidade("");
    setEscritorio("");
    setRegistroProfissional("");
    setOrigem("");
    setObservacoes("");
    setFotoUrl("");
    setPortfolioUrl("");
    setEditing(null);
    setCnpj("");
    setCnpjLoading(false);
    setLogoLoading(false);
    setFormError(null);
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
    setRegistroProfissional(p.registro_profissional || "");
    setOrigem(p.origem || "");
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
        (p.cidade?.toLowerCase().includes(q) ?? false) ||
        (p.registro_profissional?.toLowerCase().includes(q) ?? false);
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
      escritorio: escritorio.trim() || nome.trim(),
      registro_profissional: registroProfissional || undefined,
      origem: origem || "PAINEL",
      observacoes: observacoes || undefined,
      fotoUrl,
      portfolioUrl: portfolioUrl || undefined,
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                onViewDetails={setViewingPartner}
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
              {editing ? "Editar parceiro" : "Cadastrar parceiro"}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Arquitetos, designers, projetistas e demais profissionais que indicam clientes ou co-projetam.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Bloco de Logo e CNPJ por primeiro */}
            <div className="flex gap-4 items-center p-3 border border-border/85 bg-slate-50/50 rounded-xl">
              {/* Logo / Avatar do Parceiro */}
              <div className="flex flex-col items-center gap-1 shrink-0">
                <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Logo / Foto</label>
                <div className="relative group w-16 h-16 rounded-xl overflow-hidden border border-border bg-background flex items-center justify-center cursor-pointer hover:border-primary transition-all">
                  {fotoUrl ? (
                    <img src={fotoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground/45" />
                  )}
                  {logoLoading ? (
                    <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                      <Loader2 className="h-4 w-4 text-primary animate-spin" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                      <Camera className="h-4 w-4" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={logoLoading}
                    onChange={handleLogoChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
                {fotoUrl && (
                  <button
                    type="button"
                    onClick={() => setFotoUrl("")}
                    className="text-[10px] text-rose-500 font-bold hover:underline"
                  >
                    Remover
                  </button>
                )}
              </div>

              {/* Busca de CNPJ */}
              <div className="flex-1 space-y-1">
                <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground/75" />
                  CNPJ do Parceiro
                  {cnpjLoading && <Loader2 className="h-3 w-3 text-primary animate-spin" />}
                </label>
                <Input
                  placeholder="00.000.000/0001-00"
                  value={cnpj}
                  onChange={(e) => handleCnpjChange(e.target.value)}
                  className="font-semibold text-xs"
                />
                {formError && (
                  <p className="text-[10px] text-rose-500 font-bold leading-tight mt-1 animate-in fade-in duration-200">
                    ⚠️ {formError}
                  </p>
                )}
              </div>
            </div>

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
                  {(editing && !PARTNER_SIGNUP_TYPES.includes(tipo)
                    ? PARTNER_TYPES
                    : PARTNER_SIGNUP_TYPES
                  ).map((t) => (
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
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">Telefone</label>
                <Input
                  type="tel"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">E-mail</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
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

      {/* Dialog de Detalhes Completos do Parceiro */}
      <Dialog
        isOpen={viewingPartner !== null}
        onClose={() => setViewingPartner(null)}
        className="max-w-2xl"
        viewportClassName="flex items-center justify-center p-4"
      >
        {viewingPartner && (() => {
          const p = viewingPartner;
          const style = PARTNER_TYPE_STYLES[p.tipo];
          const Icon = style.icon;
          const palette = getPartnerPalette(p.id);
          const imagesList = p.imagens ? p.imagens.split(",").filter(Boolean) : [];
          const projectCount = p.projects?.length ?? 0;
          const totalLinkedValue = (p.projects ?? []).reduce(
            (sum, proj) => sum + Number(proj.valor_previsto || 0),
            0
          );
          const registroLabel = formatPartnerRegistro(p.tipo, p.registro_profissional);
          const formatCurrency = (val: number) =>
            val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

          return (
            <div className="space-y-5 pr-6">
              {/* Header com destaque de gradiente */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-100 p-5 shadow-sm bg-slate-50/50 flex flex-col sm:flex-row items-center gap-5">
                <div className={`absolute inset-x-0 top-0 h-1.5 ${palette.accent}`} />
                
                {/* Avatar */}
                <div className={`relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-md ring-4 ring-white ${privacyMode ? "blur-md select-none" : ""}`}>
                  {p.fotoUrl ? (
                    <img src={p.fotoUrl} alt={p.nome} className="h-full w-full object-cover" />
                  ) : (
                    <div className={`h-full w-full flex items-center justify-center text-2xl font-black ${palette.avatar}`}>
                      {getInitials(p.nome)}
                    </div>
                  )}
                </div>

                <div className="text-center sm:text-left min-w-0 flex-1 space-y-1.5">
                  <h3 className={`font-extrabold text-slate-800 text-lg leading-tight tracking-tight ${privacyMode ? "blur-[6px] select-none" : ""}`}>
                    {p.nome}
                  </h3>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${palette.badge}`}>
                      <Icon className="h-3 w-3" />
                      {style.label}
                    </span>
                    {p.cidade && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        {p.cidade}
                      </span>
                    )}
                  </div>
                  {registroLabel && (
                    <p className="text-xs font-semibold text-slate-500">
                      {registroLabel}
                    </p>
                  )}
                </div>
              </div>

              {/* Informações Comerciais / Contatos / Obs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                    Detalhes do Profissional
                  </h4>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-2.5 text-xs text-slate-650">
                    {p.escritorio && (
                      <p className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                        <span><strong>Escritório:</strong> {p.escritorio}</span>
                      </p>
                    )}
                    {p.telefone && (
                      <p className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                        <span><strong>WhatsApp:</strong> {p.telefone}</span>
                      </p>
                    )}
                    {p.email && (
                      <p className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                        <span><strong>E-mail:</strong> {p.email}</span>
                      </p>
                    )}
                    {p.portfolioUrl && (
                      <p className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-slate-400 shrink-0" />
                        <span>
                          <strong>Portfólio: </strong>
                          <a href={p.portfolioUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold">
                            Link externo
                          </a>
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                    Projetos & Receita
                  </h4>
                  <div className="rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600">Projetos no CRM:</span>
                      <span className="text-xs font-extrabold text-slate-800 bg-white border border-slate-150 px-2 py-0.5 rounded-full">
                        {projectCount}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wide block">Total em Projetos</span>
                      <span className="text-xl font-black text-slate-800 leading-none">{formatCurrency(totalLinkedValue)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Observações */}
              {p.observacoes && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                    Observações internas
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed italic bg-slate-50 border border-slate-100 rounded-xl p-3.5">
                    "{p.observacoes}"
                  </p>
                </div>
              )}

              {/* Lista de Projetos Detalhada */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  Projetos Vinculados no CRM
                </h4>
                {p.projects && p.projects.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
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
                          onClick={() => {
                            setViewingPartner(null);
                            handleViewProject(proj.id);
                          }}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer text-xs group/project"
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="font-bold text-slate-700 group-hover/project:text-primary transition-colors truncate">
                              {proj.client.nome}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                              {proj.valor_previsto ? Number(proj.valor_previsto).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "R$ 0,00"}
                            </p>
                          </div>
                          <span className={`inline-flex items-center text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusBg}`}>
                            {proj.status_geral}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-4 rounded-xl border border-dashed border-slate-200 text-center bg-slate-50/30 text-xs text-slate-400">
                    Nenhum projeto vinculado a este parceiro.
                  </div>
                )}
              </div>

              {/* Galeria de Fotos / Projetos */}
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                    Galeria de Fotos
                  </h4>
                  <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                    {imagesList.length} fotos
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {imagesList.map((img, idx) => (
                    <div key={img} className="relative aspect-square rounded-xl overflow-hidden border border-slate-100 group/img bg-slate-50 shadow-inner">
                      <img src={img} alt={`Projeto ${idx + 1}`} className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-500" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteImage(p.id, img, false);
                          setViewingPartner(prev => {
                            if (!prev) return null;
                            const newImgs = imagesList.filter(i => i !== img).join(",");
                            return { ...prev, imagens: newImgs };
                          });
                        }}
                        title="Excluir imagem"
                        className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-red-650 rounded-md text-white opacity-0 group-hover/img:opacity-100 transition-opacity cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}

                  {imagesList.length < 10 && (
                    <label
                      htmlFor={`gallery-upload-modal-${p.id}`}
                      className="aspect-square rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 hover:border-slate-350 transition-all group/add shadow-sm"
                      title="Adicionar imagem ao portfólio"
                    >
                      {uploadingId === `${p.id}-galeria` ? (
                        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                      ) : (
                        <>
                          <Plus className="h-5 w-5 text-slate-400 group-hover/add:text-primary transition-colors" />
                          <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider mt-1 group-hover/add:text-primary transition-colors">Subir</span>
                        </>
                      )}
                    </label>
                  )}
                  
                  <input
                    id={`gallery-upload-modal-${p.id}`}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleUploadImage(p.id, file, "galeria");
                        setViewingPartner(null);
                      }
                    }}
                    disabled={uploadingId !== null}
                  />

                  {imagesList.length === 0 && (
                    <label
                      htmlFor={`gallery-upload-modal-${p.id}`}
                      className="col-span-5 py-5 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <ImageIcon className="h-5 w-5 text-slate-400 mb-1" />
                      <span className="text-[10px] text-slate-400 font-bold">Nenhuma imagem enviada</span>
                    </label>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </Dialog>

      <ActionDialogHost dialog={dialog} />
    </>
  );
}
