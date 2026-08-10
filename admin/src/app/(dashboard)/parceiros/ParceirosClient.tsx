"use client";

import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import InfoTooltip, { TooltipBody } from "@/components/ui/InfoTooltip";
import { PartnerType, type PartnerQuoteCardMode } from "@prisma/client";
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
  getPartnerRoleLabel,
  partnerRegistroLabel,
} from "@/lib/partnerTypes";
import { PARTNER_QUOTE_CARD_MODE_OPTIONS } from "@/lib/partnerQuoteCard";
import { ActionDialogHost, useActionDialog } from "@/components/ActionDialogHost";
import PartnerCommissionsTab from "@/components/PartnerCommissionsTab";
import { PrivacyMoney } from "@/components/privacy/PrivacyMoney";
import { usePrivacy } from "@/context/PrivacyContext";
import { usePermissions } from "@/context/PermissionsContext";
import { canManageParceiros } from "@/lib/permissions";
import { useSensitiveDisplay } from "@/hooks/useSensitiveDisplay";
import CityField from "@/components/forms/CityField";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { getColaboradores } from "@/app/actions/colaboradores";
import { getProjectDetailsAction } from "@/app/actions/project";
import { adminEnterPartnerPortal } from "@/app/actions/parceiroPortal";
import ProjectDetails from "@/components/ProjectDetails";
import { compressImageFile } from "@/lib/imageCompression";
import { primaryPortfolioUrl } from "@/lib/portfolioUrls";
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
  ChevronDown,
  ChevronUp,
  Percent,
  CheckCircle2,
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
  hideValues?: boolean;
  canManage?: boolean;
  uploadingId: string | null;
  approvingId: string | null;
  handleUploadImage: (id: string, file: File, type: "avatar" | "galeria") => void;
  handleDeleteImage: (id: string, imageUrl: string, isAvatar: boolean) => void;
  handleViewProject: (projectId: string) => void;
  openEdit: (p: ParceiroDTO) => void;
  handleDelete: (p: ParceiroDTO) => void;
  onViewDetails: (p: ParceiroDTO) => void;
  onApprove: (p: ParceiroDTO) => void;
}

const PartnerCard = ({
  p,
  privacyMode,
  hideValues = false,
  canManage = true,
  uploadingId,
  approvingId,
  handleUploadImage,
  handleDeleteImage,
  handleViewProject,
  openEdit,
  handleDelete,
  onViewDetails,
  onApprove,
}: PartnerCardProps) => {
  const style = PARTNER_TYPE_STYLES[p.tipo];
  const Icon = style.icon;
  const sensitive = useSensitiveDisplay();
  const projectCount = p.projects?.length ?? 0;
  const totalLinkedValue = (p.projects ?? []).reduce(
    (sum, proj) => sum + Number(proj.valor_previsto || 0),
    0
  );
  const registroLabel = formatPartnerRegistro(p.tipo, p.registro_profissional);

  return (
    <div
      key={p.id}
      onClick={() => onViewDetails(p)}
      className="partner-card partner-card-interactive group/card"
    >
      <div className="partner-card-accent" />

      <div className="p-5 flex flex-col gap-3.5 flex-1">
        <div className="flex items-start gap-3.5">
          <div
            onClick={(e) => e.stopPropagation()}
            className="partner-card-avatar relative group/avatar h-16 w-auto min-w-16 max-w-28 shrink-0"
          >
            {p.fotoUrl ? (
              <img
                src={p.fotoUrl}
                alt={p.nome}
                className="h-full w-auto max-w-28 object-contain group-hover/avatar:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="partner-card-avatar-fallback h-16 w-16 text-lg rounded-[inherit]">
                {getInitials(p.nome)}
              </div>
            )}
            <label
              htmlFor={`avatar-upload-${p.id}`}
              className={`absolute inset-0 bg-black/60 text-white flex flex-col items-center justify-center opacity-0 ${canManage ? "group-hover/avatar:opacity-100 cursor-pointer" : "pointer-events-none"} transition-opacity text-[9px] font-bold gap-1`}
            >
              {canManage ? (
                uploadingId === `${p.id}-avatar` ? (
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                ) : (
                  <>
                    <Camera className="h-4 w-4" />
                    <span>Alterar</span>
                  </>
                )
              ) : null}
            </label>
            {canManage && (
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
            )}
            {canManage && p.fotoUrl && (
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
            <div className="flex items-start gap-2">
              <h3
                className={`min-w-0 flex-1 font-display font-bold text-foreground text-sm leading-tight tracking-tight truncate group-hover/card:text-primary transition-colors ${privacyMode && !hideValues ? "blur-[6px] select-none" : ""}`}
              >
                {p.nome}
              </h3>
              {!p.ativo && (
                <span className="shrink-0 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                  Aguardando
                </span>
              )}
              {canManage && (
                <div className="flex items-center gap-0.5 shrink-0 -mt-0.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => openEdit(p)}
                    title="Editar cadastro"
                    className="p-1.5 rounded-lg text-muted-foreground/70 hover:text-primary hover:bg-white/80 transition-colors cursor-pointer"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p)}
                    title="Excluir parceiro"
                    className="p-1.5 rounded-lg text-muted-foreground/70 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mt-1.5 min-h-[1.375rem]">
              <span className="partner-card-badge text-[9px] px-2 py-0.5">
                <Icon className="h-2.5 w-2.5" />
                {getPartnerRoleLabel(p.tipo, p.nome)}
              </span>

              <span
                className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                  p.cidade
                    ? "text-muted-foreground bg-white/70 border-border/60"
                    : "invisible border-transparent"
                }`}
                aria-hidden={!p.cidade}
              >
                <MapPin className="h-2.5 w-2.5 text-muted-foreground/70" />
                {p.cidade || "—"}
              </span>
            </div>

            <p
              className={`mt-1.5 text-[10px] font-semibold text-muted-foreground truncate min-h-[1.25rem] ${
                registroLabel ? "" : "invisible"
              }`}
              aria-hidden={!registroLabel}
            >
              {registroLabel || "\u00A0"}
            </p>
          </div>
        </div>

        <div
          className={`flex items-center gap-2 p-2 partner-card-metric ${
            p.escritorio ? "" : "invisible"
          }`}
          aria-hidden={!p.escritorio}
        >
          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest block leading-none">
              Escritório / Studio
            </span>
            <span className="text-[10px] font-extrabold text-foreground truncate block mt-0.5">
              {p.escritorio || "\u00A0"}
            </span>
          </div>
        </div>

        <div className="partner-card-metric p-3.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              Projetos vinculados
            </span>
            <span className="text-[10px] font-black tabular-nums text-foreground bg-white border border-border/70 px-2 py-0.5 rounded-full">
              {projectCount}
            </span>
          </div>
          {!hideValues && (
            <>
              <p className="text-lg font-display font-bold tracking-tight tabular-nums leading-none">
                <PrivacyMoney value={totalLinkedValue} className="text-gradient-gold" />
              </p>
              <p className="text-[9px] font-semibold text-muted-foreground">
                Valor total dos projetos no CRM
              </p>
            </>
          )}
        </div>

        <div className="mt-auto space-y-2" onClick={(e) => e.stopPropagation()}>
          {!p.ativo && canManage && (
            <button
              type="button"
              disabled={approvingId === p.id}
              onClick={() => onApprove(p)}
              className="w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-md text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition-colors"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {approvingId === p.id ? "Aprovando…" : "Aprovar"}
            </button>
          )}
          <div className="grid grid-cols-3 gap-2">
          {p.telefone ? (
            sensitive.whatsappHref(p.telefone) ? (
              <a
                href={sensitive.whatsappHref(p.telefone)!}
                target="_blank"
                rel="noreferrer"
                className="partner-card-action partner-card-action-whatsapp"
                title={`Falar no WhatsApp: ${sensitive.phone(p.telefone)}`}
              >
                <Phone className="h-4 w-4 shrink-0" />
                <span className="text-[9px] font-bold">WhatsApp</span>
              </a>
            ) : (
              <div
                className="partner-card-action partner-card-action-muted cursor-not-allowed"
                title="Contato oculto"
              >
                <Phone className="h-4 w-4 shrink-0" />
                <span className="text-[9px] font-bold">WhatsApp</span>
              </div>
            )
          ) : (
            <div className="partner-card-action partner-card-action-muted">
              <Phone className="h-4 w-4 shrink-0" />
              <span className="text-[9px] font-bold">WhatsApp</span>
            </div>
          )}

          {p.email ? (
            sensitive.hide ? (
              <div
                className="partner-card-action partner-card-action-muted cursor-not-allowed"
                title="E-mail oculto"
              >
                <Mail className="h-4 w-4 shrink-0" />
                <span className="text-[9px] font-bold">E-mail</span>
              </div>
            ) : (
              <a
                href={`mailto:${p.email}`}
                className="partner-card-action"
                title={`Enviar e-mail: ${p.email}`}
              >
                <Mail className="h-4 w-4 shrink-0" />
                <span className="text-[9px] font-bold">E-mail</span>
              </a>
            )
          ) : (
            <div className="partner-card-action partner-card-action-muted">
              <Mail className="h-4 w-4 shrink-0" />
              <span className="text-[9px] font-bold">E-mail</span>
            </div>
          )}

          {primaryPortfolioUrl(p.portfolioUrl) ? (
            <a
              href={primaryPortfolioUrl(p.portfolioUrl)!}
              target="_blank"
              rel="noreferrer"
              className="partner-card-action"
              title="Acessar Portfólio / Instagram"
            >
              <Globe className="h-4 w-4 shrink-0" />
              <span className="text-[9px] font-bold">Portfólio</span>
            </a>
          ) : (
            <div className="partner-card-action partner-card-action-muted">
              <Globe className="h-4 w-4 shrink-0" />
              <span className="text-[9px] font-bold">Portfólio</span>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ParceirosClient({ initialParceiros, companyId }: ParceirosClientProps) {
  const dialog = useActionDialog();
  const { showSuccess, showError, confirmAction } = dialog;
  const { isReadOnly, isOpsLimited, role, isAdmin } = usePermissions();
  const canManagePartners = canManageParceiros(role);
  const { privacyLocked, privacyMode } = usePrivacy();
  const sensitive = useSensitiveDisplay();

  const [parceiros, setParceiros] = useState<ParceiroDTO[]>(initialParceiros);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<"ACTIVE" | "PENDING" | "ALL">("ACTIVE");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "PENDING" || status === "ACTIVE" || status === "ALL") {
      setFilterStatus(status);
    }
  }, [searchParams]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ParceiroDTO | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  
  // Ops: sem blur de nomes e sem valores financeiros. Fotos ficam sempre visíveis.
  const effectivePrivacyMode = isOpsLimited
    ? false
    : privacyLocked || isReadOnly || privacyMode;
  const hidePartnerValues = isOpsLimited;
  const [pageTab, setPageTab] = useState<"cadastro" | "comissoes">("cadastro");
  const [isPortalPickerOpen, setIsPortalPickerOpen] = useState(false);
  const [portalSearch, setPortalSearch] = useState("");
  const [portalEnteringId, setPortalEnteringId] = useState<string | null>(null);
  const router = useRouter();

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
  const [quoteCardMode, setQuoteCardMode] = useState<PartnerQuoteCardMode>("HIDDEN");
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
      const { fetchCnpjCompany } = await import("@/lib/cnpjClient");
      const result = await fetchCnpjCompany(clean);
      if (!result.ok) {
        setFormError(result.error || "CNPJ não encontrado ou inválido.");
        return;
      }
      const json = result.data;
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
    setQuoteCardMode("HIDDEN");
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
    setQuoteCardMode(p.quote_card_mode ?? "HIDDEN");
    setIsCreateOpen(true);
  };

  const pendingCount = useMemo(
    () => parceiros.filter((p) => !p.ativo).length,
    [parceiros]
  );

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
      const matchesStatus =
        filterStatus === "ALL" ||
        (filterStatus === "ACTIVE" && p.ativo) ||
        (filterStatus === "PENDING" && !p.ativo);
      return matchesSearch && matchesTipo && matchesStatus;
    });
  }, [parceiros, search, filterTipo, filterStatus]);

  const portalCandidates = useMemo(() => {
    const q = portalSearch.trim().toLowerCase();
    return parceiros
      .filter((p) => p.ativo)
      .filter((p) => {
        if (!q) return true;
        return (
          p.nome.toLowerCase().includes(q) ||
          (p.escritorio?.toLowerCase().includes(q) ?? false) ||
          (p.cidade?.toLowerCase().includes(q) ?? false)
        );
      })
      .slice(0, 40);
  }, [parceiros, portalSearch]);

  const handleEnterPartnerPortal = async (partnerId: string) => {
    setPortalEnteringId(partnerId);
    try {
      const res = await adminEnterPartnerPortal(partnerId);
      if (!res.success) {
        showError("Não foi possível abrir", res.error || "Tente novamente.");
        return;
      }
      setIsPortalPickerOpen(false);
      setPortalSearch("");
      window.open("/parceiro/painel", "_blank", "noopener,noreferrer");
    } catch {
      showError("Erro de conexão", "Falha ao abrir o portal do parceiro.");
    } finally {
      setPortalEnteringId(null);
    }
  };

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
      quote_card_mode: quoteCardMode,
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

  const handleApprove = async (target: ParceiroDTO) => {
    if (target.ativo || approvingId) return;
    setApprovingId(target.id);
    try {
      const res = await updateParceiro(target.id, { ativo: true });
      if (res.success && res.parceiro) {
        setParceiros((prev) =>
          prev.map((p) => (p.id === target.id ? { ...p, ...res.parceiro!, ativo: true } : p))
        );
        showSuccess("Parceiro aprovado", `${target.nome} já pode acessar o portal.`);
      } else {
        showError("Erro ao aprovar", res.error || "Não foi possível aprovar o parceiro.");
      }
    } catch {
      showError("Erro ao aprovar", "Não foi possível aprovar o parceiro.");
    } finally {
      setApprovingId(null);
    }
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
                    "No CRM, vincule o parceiro ao projeto do cliente.",
                    "Clique no card do parceiro para abrir a ficha: comissões, comprovantes e projetos.",
                    "Na aba Comissões da lista: visão de todos os lançamentos de uma vez.",
                    "Parceiros com e-mail e telefone acessam o portal em moveisunghero.com.br/parceiro/login.",
                    "O olho de valores no topo do painel também oculta nomes em apresentações (fotos ficam visíveis).",
                  ]}
                />
              </InfoTooltip>
            </div>
            <p className="text-xs text-muted-foreground">
              Cadastro dos profissionais. Abra a ficha de cada um para lançar comissão e
              reabrir comprovantes — como nos clientes.
            </p>
            <div className="flex gap-1.5 pt-3">
              <button
                type="button"
                onClick={() => setPageTab("cadastro")}
                className={`h-9 px-3.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  pageTab === "cadastro"
                    ? "bg-foreground text-background"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                Cadastro
              </button>
              <button
                type="button"
                onClick={() => setPageTab("comissoes")}
                className={`h-9 px-3.5 rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                  pageTab === "comissoes"
                    ? "bg-foreground text-background"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                <Percent className="h-3.5 w-3.5" />
                Comissões
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 self-start md:self-auto">
            {isAdmin && pageTab === "cadastro" && (
              <Button
                type="button"
                variant="outline"
                className="font-bold gap-2 h-10 px-4"
                onClick={() => setIsPortalPickerOpen(true)}
              >
                <ExternalLink className="h-4 w-4" />
                Ver portal
              </Button>
            )}
            {canManagePartners && pageTab === "cadastro" && pendingCount > 0 && (
              <Button
                type="button"
                onClick={() => setFilterStatus("PENDING")}
                className="font-bold gap-2 h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white border-transparent shadow-sm"
              >
                <CheckCircle2 className="h-4 w-4" />
                Aprovar ({pendingCount})
              </Button>
            )}
            {canManagePartners && pageTab === "cadastro" && (
              <Button
                onClick={openCreate}
                className="font-bold btn-metallic gap-2 h-10 px-4"
              >
                <UserPlus className="h-4 w-4" />
                Cadastrar Parceiro
              </Button>
            )}
          </div>
        </div>

        {pageTab === "comissoes" ? (
          <PartnerCommissionsTab
            canManage={canManagePartners}
            showSuccess={showSuccess}
            showError={showError}
            confirmAction={confirmAction}
          />
        ) : (
          <>
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
          <select
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(e.target.value as "ACTIVE" | "PENDING" | "ALL")
            }
            className="h-10 px-3 rounded-md border border-border bg-card text-sm cursor-pointer"
          >
            <option value="ACTIVE">Ativos no portal</option>
            <option value="PENDING">
              Aguardando aprovação{pendingCount > 0 ? ` (${pendingCount})` : ""}
            </option>
            <option value="ALL">Todos</option>
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
                privacyMode={effectivePrivacyMode}
                hideValues={hidePartnerValues}
                canManage={canManagePartners}
                uploadingId={uploadingId}
                approvingId={approvingId}
                handleUploadImage={handleUploadImage}
                handleDeleteImage={handleDeleteImage}
                handleViewProject={handleViewProject}
                openEdit={openEdit}
                handleDelete={handleDelete}
                onViewDetails={(p) => router.push(`/parceiros/${p.id}`)}
                onApprove={handleApprove}
              />
            ))}
          </div>
        )}
          </>
        )}
      </div>

      <Dialog
        isOpen={isPortalPickerOpen}
        onClose={() => {
          if (portalEnteringId) return;
          setIsPortalPickerOpen(false);
          setPortalSearch("");
        }}
        className="max-w-md"
      >
        <div className="space-y-4 pr-2">
          <div>
            <h3 className="text-lg font-bold tracking-tight">Abrir portal do parceiro</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Entre direto no painel como a Diretoria — o parceiro não precisa digitar e-mail ou telefone.
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={portalSearch}
              onChange={(e) => setPortalSearch(e.target.value)}
              placeholder="Buscar parceiro..."
              className="pl-9 bg-card"
              autoFocus
            />
          </div>

          <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
            {portalCandidates.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                Nenhum parceiro ativo encontrado.
              </p>
            ) : (
              portalCandidates.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={portalEnteringId !== null}
                  onClick={() => void handleEnterPartnerPortal(p.id)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-border/70 bg-white hover:border-primary/35 hover:bg-amber-50/40 text-left transition-colors cursor-pointer disabled:opacity-60"
                >
                  <div className="partner-card-avatar h-10 w-10 shrink-0">
                    {p.fotoUrl ? (
                      <img src={p.fotoUrl} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <div className="partner-card-avatar-fallback h-10 w-10 text-[10px] rounded-[inherit]">
                        {p.nome.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground truncate">{p.nome}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {getPartnerRoleLabel(p.tipo, p.nome)}
                      {p.cidade ? ` · ${p.cidade}` : ""}
                    </p>
                  </div>
                  {portalEnteringId === p.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                  ) : (
                    <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </Dialog>

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
                <div className="relative group w-auto min-w-16 max-w-28 h-16 rounded-xl overflow-hidden bg-transparent flex items-center justify-center cursor-pointer transition-all">
                  {fotoUrl ? (
                    <img src={fotoUrl} alt="Logo" className="h-full w-auto max-w-28 object-contain" />
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
                <CityField
                  value={cidade}
                  onChange={setCidade}
                  selectClassName="w-full h-10 px-3 rounded-md border border-border bg-background text-sm"
                  inputClassName="w-full h-10 px-3 rounded-md border border-border bg-background text-sm"
                />
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

            <fieldset className="space-y-2 rounded-xl border border-border/80 bg-slate-50/40 p-3">
              <legend className="px-1 text-xs font-bold text-muted-foreground">
                Uso de dados e imagem no orçamento
              </legend>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Cadastro pelo link público já vem autorizado e verificado. No painel, escolha
                se o card pode aparecer no PDF.
              </p>
              <div className="space-y-2">
                {PARTNER_QUOTE_CARD_MODE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex gap-2.5 items-start rounded-lg border px-2.5 py-2 cursor-pointer transition-colors ${
                      quoteCardMode === opt.value
                        ? "border-primary/40 bg-white"
                        : "border-transparent hover:bg-white/70"
                    }`}
                  >
                    <input
                      type="radio"
                      name="quote_card_mode"
                      className="mt-0.5"
                      checked={quoteCardMode === opt.value}
                      onChange={() => setQuoteCardMode(opt.value)}
                    />
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-foreground">{opt.label}</span>
                      <span className="block text-[10px] text-muted-foreground leading-snug">
                        {opt.hint}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

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
