"use client";

import React, { useMemo, useState, useCallback } from "react";
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
  Globe
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
      <div className="space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
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
              className="h-10 px-3 rounded-md border border-border bg-card text-sm"
            >
              <option value="ALL">Todos os tipos</option>
              {PARTNER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {PARTNER_TYPE_STYLES[t].label}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={openCreate} className="font-bold shrink-0">
            <UserPlus className="h-4 w-4 mr-2" />
            Novo parceiro
          </Button>
        </div>

        {filtered.length === 0 ? (
          <Card className="p-10 text-center glass-card border-border">
            <p className="text-muted-foreground text-sm">
              Nenhum projetista ou arquiteto encontrado. Cadastre parceiros que indicam ou co-projetam com a marcenaria.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((p) => {
              const style = PARTNER_TYPE_STYLES[p.tipo];
              const Icon = style.icon;
              const hasImages = p.imagens && p.imagens.split(",").filter(Boolean).length > 0;
              const imagesList = p.imagens ? p.imagens.split(",").filter(Boolean) : [];

              return (
                <Card
                  key={p.id}
                  className="glass-card glass-card-hover overflow-hidden flex flex-col border-border/80"
                >
                  <div className={`h-1.5 ${style.accent}`} />
                  <div className="p-4 flex flex-col gap-3 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Avatar com upload rápido hover */}
                        <div className="relative group/avatar flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-sm font-bold bg-muted overflow-hidden">
                          {p.fotoUrl ? (
                            <img src={p.fotoUrl} alt={p.nome} className="h-full w-full object-cover" />
                          ) : (
                            <div className={`h-full w-full flex items-center justify-center font-black ${style.avatar}`}>
                              {getInitials(p.nome)}
                            </div>
                          )}
                          <label
                            htmlFor={`avatar-upload-${p.id}`}
                            className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer"
                          >
                            {uploadingId === `${p.id}-avatar` ? (
                              <Loader2 className="h-4.5 w-4.5 animate-spin" />
                            ) : (
                              <Camera className="h-4 w-4" />
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

                        <div className="min-w-0">
                          <h3 className="font-bold text-foreground text-sm leading-snug truncate">{p.nome}</h3>
                          <span
                            className={`inline-flex items-center gap-1 mt-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${style.bg} ${style.text} ${style.border}`}
                          >
                            <Icon className="h-3 w-3" />
                            {style.label}
                          </span>
                        </div>
                      </div>

                      {/* Botão de Excluir Foto do perfil, se houver */}
                      {p.fotoUrl && (
                        <button
                          type="button"
                          onClick={() => handleDeleteImage(p.id, p.fotoUrl!, true)}
                          title="Remover foto de perfil"
                          className="p-1 hover:bg-slate-100 rounded-md text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Informações Básicas */}
                    <div className="space-y-1.5 text-[11px] text-muted-foreground/90 border-t border-border/40 pt-2.5">
                      {p.escritorio && (
                        <p className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span className="font-semibold text-foreground/80 truncate">{p.escritorio}</span>
                        </p>
                      )}
                      {p.cidade && (
                        <p className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span>{p.cidade}</span>
                        </p>
                      )}
                      {p.telefone && (
                        <p className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span>{p.telefone}</span>
                        </p>
                      )}
                      {p.email && (
                        <p className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span className="truncate">{p.email}</span>
                        </p>
                      )}
                      {p.portfolioUrl && (
                        <p className="flex items-center gap-1.5">
                          <Globe className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <a
                            href={p.portfolioUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary font-semibold hover:underline flex items-center gap-0.5 truncate"
                          >
                            Portfolio / Social <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        </p>
                      )}
                    </div>

                    {p.observacoes && (
                      <p className="text-[10px] text-muted-foreground/80 leading-relaxed italic bg-slate-50 border border-slate-100 rounded-lg p-2 line-clamp-2">
                        "{p.observacoes}"
                      </p>
                    )}

                    {/* Galeria de Fotos / Projetos */}
                    <div className="border-t border-border/50 pt-3 space-y-2 mt-auto">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Projetos / Fotos</span>
                        <label
                          htmlFor={`gallery-upload-${p.id}`}
                          className="text-[9px] font-black text-primary hover:underline cursor-pointer flex items-center gap-0.5"
                        >
                          {uploadingId === `${p.id}-galeria` ? (
                            <Loader2 className="h-3 w-3 animate-spin text-primary" />
                          ) : (
                            <Plus className="h-3 w-3 text-primary" />
                          )}
                          Adicionar Foto
                        </label>
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
                      </div>

                      {/* Lista de Imagens */}
                      <div className="grid grid-cols-4 gap-1.5">
                        {imagesList.map((img, idx) => (
                          <div key={img} className="relative aspect-square rounded-lg overflow-hidden border border-border/80 group/img bg-slate-100 shadow-sm">
                            <img src={img} alt={`Projeto ${idx + 1}`} className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-300" />
                            <button
                              type="button"
                              onClick={() => handleDeleteImage(p.id, img, false)}
                              className="absolute top-0.5 right-0.5 p-0.5 bg-black/70 hover:bg-red-650 rounded-md text-white opacity-0 group-hover/img:opacity-100 transition-opacity"
                              title="Excluir imagem"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        ))}

                        {!hasImages && (
                          <label
                            htmlFor={`gallery-upload-${p.id}`}
                            className="col-span-4 py-4 rounded-xl border border-dashed border-border/60 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition-colors"
                          >
                            <ImageIcon className="h-5 w-5 text-slate-400 mb-1" />
                            <span className="text-[10px] text-muted-foreground font-semibold">Suba imagens de projetos</span>
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Projetos Integrados no CRM */}
                    <div className="border-t border-border/50 pt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Projetos no CRM</span>
                        <span className="text-[9px] font-black bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                          {p.projects?.length || 0}
                        </span>
                      </div>
                      {p.projects && p.projects.length > 0 ? (
                        <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                          {p.projects.map((proj) => {
                            let statusBg = "bg-slate-100 text-slate-700";
                            if (proj.status_geral === "APROVADO" || proj.status_geral === "FINALIZADO") statusBg = "bg-emerald-50 text-emerald-700 border-emerald-250";
                            else if (proj.status_geral === "LEAD" || proj.status_geral === "ORCAMENTO") statusBg = "bg-blue-50 text-blue-700 border-blue-250";
                            else if (proj.status_geral === "PRODUCAO" || proj.status_geral === "INSTALACAO") statusBg = "bg-orange-50 text-orange-700 border-orange-250";
                            
                            return (
                              <div 
                                key={proj.id} 
                                onClick={() => handleViewProject(proj.id)}
                                className="flex items-center justify-between p-2 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer text-[10px]"
                              >
                                <div className="min-w-0 flex-1 pr-2">
                                  <p className="font-bold text-slate-800 truncate">{proj.client.nome}</p>
                                  <p className="text-[9px] text-slate-400 font-semibold">
                                    {proj.valor_previsto ? Number(proj.valor_previsto).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "R$ 0,00"}
                                  </p>
                                </div>
                                <span className={`inline-flex items-center text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${statusBg}`}>
                                  {proj.status_geral}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-2.5 rounded-lg border border-dashed border-border/40 text-center">
                          <span className="text-[9px] text-muted-foreground font-semibold">Nenhum projeto vinculado</span>
                        </div>
                      )}
                    </div>

                    {/* Ações de Edição e Exclusão do Parceiro */}
                    <div className="flex gap-2 pt-2 border-t border-border/30 mt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1 text-[11px] font-bold h-8"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive h-8 px-2.5"
                        onClick={() => handleDelete(p)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
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
