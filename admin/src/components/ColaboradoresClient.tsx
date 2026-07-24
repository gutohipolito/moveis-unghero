"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { Role } from "@prisma/client";
import {
  createColaborador,
  deleteColaborador,
  updateColaborador,
  ensureFactoryTeamSeeded,
} from "@/app/actions/colaboradores";
import { getColaboradoresLiveSnapshot } from "@/app/actions/liveSnapshots";
import { updateUserPreference } from "@/app/actions/preferences";
import { useLiveEntity } from "@/context/LiveSyncContext";
import { ADMIN_EMAIL } from "@/lib/constants";
import {
  TEAM_FUNCAO_IDS,
  TEAM_FUNCAO_META,
  COLABORADORES_VIEW_PREF_KEY,
  FUNCAO_BANNER_PATTERN_STYLE,
  isInternalTeamEmail,
  primaryFuncaoId,
  type ColaboradoresViewMode,
  type TeamFuncaoId,
} from "@/lib/teamFuncoes";
import { ActionDialogHost, useActionDialog } from "@/components/ActionDialogHost";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  Users,
  UserPlus,
  Search,
  Trash2,
  Loader2,
  ShieldCheck,
  UserCheck,
  Hammer,
  BadgePercent,
  Wallet,
  Eye,
  Mail,
  Calendar,
  Lock,
  Unlock,
  LayoutGrid,
  List,
  Camera,
  ImagePlus,
  X,
  Settings2,
} from "lucide-react";

interface ColaboradorItem {
  id: string;
  name: string;
  email: string;
  cargo: Role;
  areaAtuacao?: string | null;
  funcoes?: string[];
  tem_acesso?: boolean;
  image?: string | null;
  createdAt: Date;
}

interface ColaboradoresClientProps {
  initialColaboradores: ColaboradorItem[];
  companyId: string;
  canManageUsers: boolean;
  initialViewMode?: ColaboradoresViewMode;
}

const CARGO_META: Record<
  Role,
  {
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  ADMIN: { label: "Diretoria", shortLabel: "Admin", icon: ShieldCheck },
  COMERCIAL: { label: "Comercial", shortLabel: "Vendas", icon: BadgePercent },
  PROJETISTA: { label: "Projetista", shortLabel: "Projetos", icon: UserCheck },
  PRODUCAO: { label: "Fábrica", shortLabel: "Produção", icon: Hammer },
  FINANCEIRO: { label: "Financeiro", shortLabel: "Finanças", icon: Wallet },
  VIEWER: { label: "Somente leitura", shortLabel: "Leitura", icon: Eye },
};

const FALLBACK_BANNER = "bg-slate-500";
const FALLBACK_AVATAR = "bg-slate-100 text-slate-700 border-slate-200";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function resolveFuncaoVisual(funcoes: string[] | undefined) {
  const primary = primaryFuncaoId(funcoes);
  if (!primary) {
    return { banner: FALLBACK_BANNER, avatar: FALLBACK_AVATAR, primary: null as TeamFuncaoId | null };
  }
  const meta = TEAM_FUNCAO_META[primary];
  return { banner: meta.banner, avatar: meta.avatar, primary };
}

function FuncaoChips({ funcoes }: { funcoes: TeamFuncaoId[] }) {
  if (funcoes.length === 0) {
    return <span className="text-[10px] text-slate-400 italic">Sem função definida</span>;
  }
  return (
    <>
      {funcoes.map((f) => {
        const meta = TEAM_FUNCAO_META[f];
        return (
          <span
            key={f}
            className={`inline-flex items-center text-[10px] font-bold px-2 py-1 rounded-lg border ${meta.bg} ${meta.text} ${meta.border}`}
          >
            {meta.label}
          </span>
        );
      })}
    </>
  );
}

function AvatarBlock({
  name,
  image,
  avatarClass,
  size = "lg",
}: {
  name: string;
  image?: string | null;
  avatarClass: string;
  size?: "lg" | "md";
}) {
  const sizeClass =
    size === "lg"
      ? "w-16 h-16 text-lg rounded-2xl border-4"
      : "w-11 h-11 text-sm rounded-xl border-2";
  return (
    <div
      className={`${sizeClass} flex items-center justify-center font-bold border-white shadow-md shrink-0 overflow-hidden ${avatarClass}`}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={name} className="w-full h-full object-cover" />
      ) : (
        getInitials(name)
      )}
    </div>
  );
}

export default function ColaboradoresClient({
  initialColaboradores,
  companyId,
  canManageUsers,
  initialViewMode = "grid",
}: ColaboradoresClientProps) {
  const [colaboradores, setColaboradores] = useState<ColaboradorItem[]>(initialColaboradores);
  const [search, setSearch] = useState("");
  const [filterFuncao, setFilterFuncao] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<ColaboradoresViewMode>(
    initialViewMode === "list" ? "list" : "grid"
  );
  const [controlsUnlocked, setControlsUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ColaboradorItem | null>(null);
  const [seedDone, setSeedDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dialog = useActionDialog();
  const { showSuccess, showError, confirmAction } = dialog;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cargo, setCargo] = useState<Role>("PRODUCAO");
  const [funcoes, setFuncoes] = useState<TeamFuncaoId[]>([]);
  const [image, setImage] = useState("");
  const [password, setPassword] = useState("");
  const [temAcesso, setTemAcesso] = useState(false);

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setCargo("PRODUCAO");
    setFuncoes([]);
    setImage("");
    setTemAcesso(false);
  };

  const openCreate = () => {
    setEditing(null);
    resetForm();
    setIsCreateOpen(true);
  };

  const openEdit = (c: ColaboradorItem) => {
    setEditing(c);
    setName(c.name);
    setEmail(isInternalTeamEmail(c.email) ? "" : c.email);
    setCargo(c.cargo);
    setFuncoes((c.funcoes || []).filter((f): f is TeamFuncaoId =>
      (TEAM_FUNCAO_IDS as readonly string[]).includes(f)
    ));
    setImage(c.image || "");
    setPassword("");
    setTemAcesso(c.tem_acesso !== false && !isInternalTeamEmail(c.email));
    setIsCreateOpen(true);
  };

  const toggleFuncao = (id: TeamFuncaoId) => {
    setFuncoes((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const setViewAndPersist = (mode: ColaboradoresViewMode) => {
    setViewMode(mode);
    void updateUserPreference(COLABORADORES_VIEW_PREF_KEY, mode);
  };

  const handleImageFile = async (file: File | undefined) => {
    if (!file) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/colaboradores/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showError("Upload falhou", data.error || "Não foi possível enviar a foto.");
        return;
      }
      setImage(data.url as string);
      showSuccess("Foto enviada", "A imagem foi anexada ao cadastro.");
    } catch {
      showError("Upload falhou", "Erro de rede ao enviar a foto.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const syncColaboradores = useCallback(async () => {
    const result = await getColaboradoresLiveSnapshot(companyId);
    if (result.success && result.colaboradores) {
      setColaboradores(result.colaboradores as ColaboradorItem[]);
    }
  }, [companyId]);

  useLiveEntity("colaboradores", {
    sync: syncColaboradores,
    enabled: !loading && !isCreateOpen,
  });

  useEffect(() => {
    if (!canManageUsers || seedDone) return;
    let cancelled = false;
    (async () => {
      const res = await ensureFactoryTeamSeeded(companyId);
      if (cancelled) return;
      setSeedDone(true);
      if (res.success && res.created > 0) {
        await syncColaboradores();
        showSuccess(
          "Equipe cadastrada",
          `${res.created} colaborador(es) operacional(is) adicionado(s) sem acesso ao painel.`
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canManageUsers, companyId, seedDone, syncColaboradores, showSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showError("Nome obrigatório", "Informe o nome do colaborador.");
      return;
    }
    if (funcoes.length === 0) {
      showError("Função obrigatória", "Selecione ao menos uma função operacional.");
      return;
    }
    if (temAcesso && !editing && (!email.trim() || !password)) {
      showError("Acesso ao painel", "Para liberar acesso, informe e-mail e senha.");
      return;
    }

    setLoading(true);

    if (editing) {
      const res = await updateColaborador(editing.id, {
        name,
        ...(temAcesso && email.trim() ? { email: email.trim() } : {}),
        cargo,
        funcoes,
        image,
      });

      if (res.success && res.user) {
        setColaboradores((prev) =>
          prev.map((c) =>
            c.id === editing.id
              ? {
                  ...c,
                  name: res.user.name,
                  email: res.user.email,
                  cargo: res.user.cargo as Role,
                  areaAtuacao: res.user.areaAtuacao,
                  funcoes: res.user.funcoes,
                  tem_acesso: res.user.tem_acesso,
                  image: res.user.image,
                }
              : c
          )
        );
        setIsCreateOpen(false);
        setEditing(null);
        resetForm();
        showSuccess("Cadastro atualizado", `Os dados de ${res.user.name} foram salvos.`);
      } else {
        showError("Não foi possível atualizar", res.error || "Erro ao salvar.");
      }
    } else {
      const res = await createColaborador({
        name,
        email: temAcesso ? email.trim() : undefined,
        cargo,
        senhaRaw: temAcesso ? password : undefined,
        companyId,
        funcoes,
        image: image || undefined,
        temAcesso,
      });

      if (res.success && res.user) {
        setColaboradores((prev) => [
          ...prev,
          {
            id: res.user.id,
            name: res.user.name,
            email: res.user.email,
            cargo: res.user.cargo as Role,
            areaAtuacao: res.user.areaAtuacao,
            funcoes: res.user.funcoes,
            tem_acesso: res.user.tem_acesso,
            image: res.user.image,
            createdAt: new Date(res.user.createdAt),
          },
        ]);
        setIsCreateOpen(false);
        resetForm();
        showSuccess(
          "Colaborador adicionado",
          temAcesso
            ? `${res.user.name} foi cadastrado com acesso ao painel.`
            : `${res.user.name} entrou na equipe (sem login por enquanto).`
        );
      } else {
        showError("Não foi possível cadastrar", res.error || "Erro ao criar.");
      }
    }

    setLoading(false);
  };

  const requestDelete = (c: ColaboradorItem) => {
    confirmAction({
      title: "Remover colaborador",
      message: `Remover ${c.name} da equipe?`,
      confirmLabel: "Remover",
      onConfirm: async () => {
        setLoading(true);
        const res = await deleteColaborador(c.id);
        if (res.success) {
          setColaboradores((prev) => prev.filter((x) => x.id !== c.id));
          showSuccess("Removido", `${c.name} foi removido da equipe.`);
        } else {
          showError("Erro", res.error || "Não foi possível remover.");
        }
        setLoading(false);
      },
    });
  };

  const filtered = colaboradores.filter((c) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.funcoes || []).some((f) => f.toLowerCase().includes(q));
    const matchesFuncao =
      filterFuncao === "ALL" || (c.funcoes || []).includes(filterFuncao);
    return matchesSearch && matchesFuncao;
  });

  const semAcessoCount = colaboradores.filter(
    (c) => c.tem_acesso === false || isInternalTeamEmail(c.email)
  ).length;

  const renderGridCard = (c: ColaboradorItem) => {
    const cargoMeta = CARGO_META[c.cargo] || CARGO_META.PRODUCAO;
    const formattedDate = new Date(c.createdAt).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const isProtected = c.email === ADMIN_EMAIL;
    const semAcesso = c.tem_acesso === false || isInternalTeamEmail(c.email);
    const funcoesList = (c.funcoes || []).filter((f): f is TeamFuncaoId =>
      (TEAM_FUNCAO_IDS as readonly string[]).includes(f)
    );
    const visual = resolveFuncaoVisual(funcoesList);
    const primaryLabel = visual.primary
      ? TEAM_FUNCAO_META[visual.primary].label
      : cargoMeta.label;

    return (
      <Card
        key={c.id}
        role={canManageUsers ? "button" : undefined}
        tabIndex={canManageUsers ? 0 : undefined}
        onClick={() => {
          if (canManageUsers && !loading) openEdit(c);
        }}
        onKeyDown={(e) => {
          if (!canManageUsers || loading) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openEdit(c);
          }
        }}
        className={`bg-white border border-slate-100/90 hover:border-slate-200 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden group/card relative ${
          canManageUsers ? "cursor-pointer" : ""
        }`}
      >
        <div className={`h-20 w-full ${visual.banner} relative overflow-hidden`}>
          <div className="absolute inset-0" style={FUNCAO_BANNER_PATTERN_STYLE} />
          {semAcesso ? (
            <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-black/25 backdrop-blur px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
              <Lock className="h-2.5 w-2.5" />
              Sem acesso
            </span>
          ) : (
            <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-white/25 backdrop-blur px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
              <Unlock className="h-2.5 w-2.5" />
              Painel
            </span>
          )}
        </div>

        <div className="px-5 pb-5 flex flex-col flex-1 gap-3 -mt-8 relative z-10">
          <div className="flex items-end justify-between gap-3">
            <AvatarBlock name={c.name} image={c.image} avatarClass={visual.avatar} />
            {visual.primary ? (
              <span
                className={`inline-flex items-center text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border shrink-0 mb-1 ${TEAM_FUNCAO_META[visual.primary].bg} ${TEAM_FUNCAO_META[visual.primary].text} ${TEAM_FUNCAO_META[visual.primary].border}`}
              >
                {TEAM_FUNCAO_META[visual.primary].shortLabel}
              </span>
            ) : null}
          </div>

          <div className="min-w-0">
            <h3 className="font-extrabold text-slate-800 text-[15px] leading-tight tracking-tight truncate">
              {c.name}
            </h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              {primaryLabel}
              {semAcesso ? " · só operação" : " · acesso liberado"}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 min-h-[28px]">
            <FuncaoChips funcoes={funcoesList} />
          </div>

          <div className="space-y-1.5 text-xs text-slate-500 pt-1">
            {!semAcesso && (
              <p className="flex items-center gap-2 min-w-0">
                <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="truncate font-semibold">{c.email}</span>
              </p>
            )}
            <p className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="font-medium">Desde {formattedDate}</span>
            </p>
          </div>

          {canManageUsers && controlsUnlocked ? (
            <div className="mt-auto pt-3 border-t border-slate-100 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  requestDelete(c);
                }}
                className="text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 border-slate-200 h-9 px-3 rounded-xl cursor-pointer"
                disabled={isProtected || loading}
                title="Remover colaborador"
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Remover
              </Button>
            </div>
          ) : (
            <div className="mt-auto pt-3" />
          )}
        </div>
      </Card>
    );
  };

  const renderListRow = (c: ColaboradorItem) => {
    const cargoMeta = CARGO_META[c.cargo] || CARGO_META.PRODUCAO;
    const formattedDate = new Date(c.createdAt).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const isProtected = c.email === ADMIN_EMAIL;
    const semAcesso = c.tem_acesso === false || isInternalTeamEmail(c.email);
    const funcoesList = (c.funcoes || []).filter((f): f is TeamFuncaoId =>
      (TEAM_FUNCAO_IDS as readonly string[]).includes(f)
    );
    const visual = resolveFuncaoVisual(funcoesList);

    return (
      <div
        key={c.id}
        role={canManageUsers ? "button" : undefined}
        tabIndex={canManageUsers ? 0 : undefined}
        onClick={() => {
          if (canManageUsers && !loading) openEdit(c);
        }}
        onKeyDown={(e) => {
          if (!canManageUsers || loading) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openEdit(c);
          }
        }}
        className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 hover:bg-slate-50/80 transition-colors ${
          canManageUsers ? "cursor-pointer" : ""
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative shrink-0">
            <div className={`absolute -inset-0.5 rounded-xl ${visual.banner} opacity-90`} />
            <div className="relative">
              <AvatarBlock name={c.name} image={c.image} avatarClass={visual.avatar} size="md" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-slate-800 text-sm truncate">{c.name}</h3>
              {semAcesso ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                  <Lock className="h-2.5 w-2.5" />
                  Sem acesso
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                  <Unlock className="h-2.5 w-2.5" />
                  Painel
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">
              {cargoMeta.label}
              {!semAcesso ? ` · ${c.email}` : ""}
              {" · "}
              desde {formattedDate}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <FuncaoChips funcoes={funcoesList} />
            </div>
          </div>
        </div>

        {canManageUsers && controlsUnlocked ? (
          <div className="flex gap-2 sm:shrink-0 pl-14 sm:pl-0">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                requestDelete(c);
              }}
              className="text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 border-slate-200 h-8 px-2.5 rounded-lg cursor-pointer"
              disabled={isProtected || loading}
              title="Remover colaborador"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Remover
            </Button>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-500">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1">
          <Users className="h-3.5 w-3.5" />
          {colaboradores.length} na equipe
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-800 px-3 py-1">
          <Lock className="h-3.5 w-3.5" />
          {semAcessoCount} sem acesso ao painel
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou função…"
              className="pl-9 h-10"
            />
          </div>
          <select
            value={filterFuncao}
            onChange={(e) => setFilterFuncao(e.target.value)}
            className="h-10 rounded-lg border border-border bg-muted/40 text-foreground text-sm px-3 font-medium cursor-pointer outline-none min-w-[180px]"
          >
            <option value="ALL">Todas as funções</option>
            {TEAM_FUNCAO_IDS.map((id) => (
              <option key={id} value={id}>
                {TEAM_FUNCAO_META[id].label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm"
            role="group"
            aria-label="Modo de visualização"
          >
            <button
              type="button"
              onClick={() => setViewAndPersist("grid")}
              className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                viewMode === "grid"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
              title="Ver em grade"
              aria-pressed={viewMode === "grid"}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Grade
            </button>
            <button
              type="button"
              onClick={() => setViewAndPersist("list")}
              className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                viewMode === "list"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
              title="Ver em lista"
              aria-pressed={viewMode === "list"}
            >
              <List className="h-3.5 w-3.5" />
              Lista
            </button>
          </div>

          {canManageUsers ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setControlsUnlocked((v) => !v)}
                className={`font-semibold text-xs px-3 h-10 rounded-lg flex items-center gap-1.5 cursor-pointer ${
                  controlsUnlocked
                    ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                    : "border-slate-200"
                }`}
                title={
                  controlsUnlocked
                    ? "Ocultar botões de remoção"
                    : "Liberar controles de remoção nos cards"
                }
              >
                {controlsUnlocked ? (
                  <>
                    <Lock className="h-3.5 w-3.5" />
                    Ocultar controles
                  </>
                ) : (
                  <>
                    <Settings2 className="h-3.5 w-3.5" />
                    Liberar controles
                  </>
                )}
              </Button>
              <Button
                onClick={openCreate}
                className="font-semibold text-xs px-4 h-10 rounded-lg flex items-center gap-1.5 btn-metallic cursor-pointer"
              >
                <UserPlus className="h-4 w-4" />
                Adicionar Colaborador
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="glass-card p-12 text-center">
          <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-medium">
            Nenhum colaborador encontrado com os filtros selecionados.
          </p>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filtered.map(renderGridCard)}
        </div>
      ) : (
        <Card className="bg-white border border-slate-100/90 rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-100">
          {filtered.map(renderListRow)}
        </Card>
      )}

      <Dialog
        isOpen={isCreateOpen}
        onClose={() => {
          if (loading) return;
          setIsCreateOpen(false);
          setEditing(null);
          resetForm();
        }}
        className="max-w-md"
      >
        <div className="space-y-4 pr-6">
          <div className="flex items-center gap-2">
            {editing ? (
              <Camera className="h-5 w-5 text-indigo-650" />
            ) : (
              <UserPlus className="h-5 w-5 text-indigo-650" />
            )}
            <h3 className="font-bold text-lg text-foreground">
              {editing ? "Editar Colaborador" : "Novo Colaborador"}
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Nome</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">
                Funções operacionais (pode marcar mais de uma)
              </label>
              <div className="flex flex-wrap gap-2">
                {TEAM_FUNCAO_IDS.map((id) => {
                  const meta = TEAM_FUNCAO_META[id];
                  const active = funcoes.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleFuncao(id)}
                      className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                        active
                          ? `${meta.bg} ${meta.text} ${meta.border}`
                          : "bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Foto</label>
              <div className="flex items-center gap-3">
                <div className="relative h-16 w-16 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt="Prévia" className="h-full w-full object-cover" />
                  ) : (
                    <Camera className="h-5 w-5 text-slate-300" />
                  )}
                </div>
                <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                    className="hidden"
                    onChange={(e) => void handleImageFile(e.target.files?.[0])}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 justify-start text-xs font-semibold cursor-pointer"
                    disabled={loading || uploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadingImage ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <ImagePlus className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    {image ? "Trocar foto" : "Enviar foto"}
                  </Button>
                  {image ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-red-600 cursor-pointer w-fit"
                      onClick={() => setImage("")}
                      disabled={loading || uploadingImage}
                    >
                      <X className="h-3 w-3" />
                      Remover foto
                    </button>
                  ) : (
                    <p className="text-[10px] text-slate-400">JPG, PNG ou WEBP até 5 MB</p>
                  )}
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={temAcesso}
                onChange={(e) => setTemAcesso(e.target.checked)}
                className="rounded border-slate-300"
                disabled={Boolean(editing && !isInternalTeamEmail(editing.email) && editing.tem_acesso !== false)}
              />
              <span className="text-xs font-semibold text-slate-700">
                Liberar acesso ao painel (e-mail e senha)
              </span>
            </label>

            {temAcesso && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">E-mail</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required={temAcesso && !editing}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Cargo no painel</label>
                  <select
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value as Role)}
                    className="w-full h-10 rounded-lg border border-border bg-card text-foreground text-sm px-3 font-medium cursor-pointer outline-none"
                  >
                    <option value="PRODUCAO">Fábrica</option>
                    <option value="COMERCIAL">Comercial</option>
                    <option value="PROJETISTA">Projetista</option>
                    <option value="FINANCEIRO">Financeiro</option>
                    <option value="ADMIN">Diretoria</option>
                  </select>
                </div>
                {!editing && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Senha provisória</label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required={temAcesso}
                      minLength={6}
                    />
                  </div>
                )}
              </>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 font-semibold"
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditing(null);
                  resetForm();
                }}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 font-semibold btn-metallic cursor-pointer"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "Salvar" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </div>
      </Dialog>

      <ActionDialogHost dialog={dialog} />
    </div>
  );
}
