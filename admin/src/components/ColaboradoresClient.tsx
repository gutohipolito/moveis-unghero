"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Role } from "@prisma/client";
import {
  createColaborador,
  deleteColaborador,
  updateColaborador,
  ensureFactoryTeamSeeded,
} from "@/app/actions/colaboradores";
import { getColaboradoresLiveSnapshot } from "@/app/actions/liveSnapshots";
import { useLiveEntity } from "@/context/LiveSyncContext";
import { ADMIN_EMAIL } from "@/lib/constants";
import {
  TEAM_FUNCAO_IDS,
  TEAM_FUNCAO_META,
  isInternalTeamEmail,
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
  Mail,
  Calendar,
  Pencil,
  Lock,
  Unlock,
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
}

const CARGO_BADGES: Record<
  Role,
  {
    label: string;
    shortLabel: string;
    bg: string;
    text: string;
    border: string;
    avatar: string;
    accent: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  ADMIN: {
    label: "Diretoria",
    shortLabel: "Admin",
    bg: "bg-purple-500/10",
    text: "text-purple-700",
    border: "border-purple-500/20",
    avatar: "bg-purple-500/15 text-purple-700 border-purple-500/25",
    accent: "bg-gradient-to-br from-purple-500 to-purple-700",
    icon: ShieldCheck,
  },
  COMERCIAL: {
    label: "Comercial",
    shortLabel: "Vendas",
    bg: "bg-blue-500/10",
    text: "text-blue-700",
    border: "border-blue-500/20",
    avatar: "bg-blue-500/15 text-blue-700 border-blue-500/25",
    accent: "bg-gradient-to-br from-blue-500 to-indigo-600",
    icon: BadgePercent,
  },
  PROJETISTA: {
    label: "Projetista",
    shortLabel: "Projetos",
    bg: "bg-cyan-500/10",
    text: "text-cyan-700",
    border: "border-cyan-500/20",
    avatar: "bg-cyan-500/15 text-cyan-700 border-cyan-500/25",
    accent: "bg-gradient-to-br from-violet-500 to-purple-600",
    icon: UserCheck,
  },
  PRODUCAO: {
    label: "Fábrica",
    shortLabel: "Produção",
    bg: "bg-amber-500/10",
    text: "text-amber-700",
    border: "border-amber-500/20",
    avatar: "bg-amber-500/15 text-amber-700 border-amber-500/25",
    accent: "bg-gradient-to-br from-amber-500 to-orange-600",
    icon: Hammer,
  },
  FINANCEIRO: {
    label: "Financeiro",
    shortLabel: "Finanças",
    bg: "bg-emerald-500/10",
    text: "text-emerald-700",
    border: "border-emerald-500/20",
    avatar: "bg-emerald-500/15 text-emerald-700 border-emerald-500/25",
    accent: "bg-gradient-to-br from-emerald-500 to-teal-600",
    icon: Wallet,
  },
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function primaryFuncaoAccent(funcoes: string[] | undefined, cargo: Role) {
  const first = funcoes?.[0];
  if (first && first in TEAM_FUNCAO_META) {
    return `bg-gradient-to-br ${TEAM_FUNCAO_META[first as TeamFuncaoId].accent}`;
  }
  return CARGO_BADGES[cargo]?.accent || "bg-gradient-to-br from-slate-400 to-slate-600";
}

export default function ColaboradoresClient({
  initialColaboradores,
  companyId,
  canManageUsers,
}: ColaboradoresClientProps) {
  const [colaboradores, setColaboradores] = useState<ColaboradorItem[]>(initialColaboradores);
  const [search, setSearch] = useState("");
  const [filterFuncao, setFilterFuncao] = useState<string>("ALL");
  const [loading, setLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ColaboradorItem | null>(null);
  const [seedDone, setSeedDone] = useState(false);

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

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
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

        {canManageUsers ? (
          <Button
            onClick={openCreate}
            className="font-semibold text-xs px-4 h-10 rounded-lg flex items-center gap-1.5 btn-metallic cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            Adicionar Colaborador
          </Button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <Card className="glass-card p-12 text-center">
          <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-medium">
            Nenhum colaborador encontrado com os filtros selecionados.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filtered.map((c) => {
            const badge = CARGO_BADGES[c.cargo] || CARGO_BADGES.PRODUCAO;
            const BadgeIcon = badge.icon;
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

            return (
              <Card
                key={c.id}
                className="bg-white border border-slate-100/90 hover:border-slate-200 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden group/card relative"
              >
                <div className={`h-20 w-full ${primaryFuncaoAccent(funcoesList, c.cargo)} relative`}>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.22),transparent_45%)]" />
                  {semAcesso && (
                    <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-black/25 backdrop-blur px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                      <Lock className="h-2.5 w-2.5" />
                      Sem acesso
                    </span>
                  )}
                  {!semAcesso && (
                    <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-white/25 backdrop-blur px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                      <Unlock className="h-2.5 w-2.5" />
                      Painel
                    </span>
                  )}
                </div>

                <div className="px-5 pb-5 flex flex-col flex-1 gap-3 -mt-8 relative z-10">
                  <div className="flex items-end justify-between gap-3">
                    <div
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-lg border-4 border-white shadow-md shrink-0 overflow-hidden ${badge.avatar}`}
                    >
                      {c.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(c.name)
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border shrink-0 mb-1 ${badge.bg} ${badge.text} ${badge.border}`}
                    >
                      <BadgeIcon className="h-3 w-3" />
                      {badge.shortLabel}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-extrabold text-slate-800 text-[15px] leading-tight tracking-tight truncate">
                      {c.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      {badge.label}
                      {semAcesso ? " · só operação" : " · acesso liberado"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                    {funcoesList.length > 0 ? (
                      funcoesList.map((f) => {
                        const meta = TEAM_FUNCAO_META[f];
                        return (
                          <span
                            key={f}
                            className={`inline-flex items-center text-[10px] font-bold px-2 py-1 rounded-lg border ${meta.bg} ${meta.text} ${meta.border}`}
                          >
                            {meta.label}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Sem função definida</span>
                    )}
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

                  {canManageUsers ? (
                    <div className="mt-auto pt-3 border-t border-slate-100 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(c)}
                        className="flex-1 text-[11px] font-extrabold h-9 rounded-xl border-slate-200 hover:bg-slate-50 cursor-pointer"
                        disabled={loading}
                      >
                        <Pencil className="h-3 w-3 mr-1.5 text-slate-500" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => requestDelete(c)}
                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 border-slate-200 h-9 px-3 rounded-xl cursor-pointer"
                        disabled={isProtected || loading}
                        title="Remover colaborador"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-auto pt-3 border-t border-slate-100" />
                  )}
                </div>
              </Card>
            );
          })}
        </div>
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
            <UserPlus className="h-5 w-5 text-indigo-650" />
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

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Foto (URL, opcional)</label>
              <Input type="url" value={image} onChange={(e) => setImage(e.target.value)} />
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
