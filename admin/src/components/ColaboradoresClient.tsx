"use client";

import React, { useState, useCallback } from "react";
import { Role } from "@prisma/client";
import { createColaborador, deleteColaborador, updateColaborador } from "@/app/actions/colaboradores";
import { getColaboradoresLiveSnapshot } from "@/app/actions/liveSnapshots";
import { useLiveEntity } from "@/context/LiveSyncContext";
import { ADMIN_EMAIL } from "@/lib/constants";
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
  Briefcase,
} from "lucide-react";

interface ColaboradorItem {
  id: string;
  name: string;
  email: string;
  cargo: Role;
  areaAtuacao?: string | null;
  image?: string | null;
  createdAt: Date;
}

interface ColaboradoresClientProps {
  initialColaboradores: ColaboradorItem[];
  companyId: string;
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
    accent: "bg-gradient-to-r from-purple-500 to-purple-600",
    icon: ShieldCheck,
  },
  COMERCIAL: {
    label: "Comercial",
    shortLabel: "Vendas",
    bg: "bg-blue-500/10",
    text: "text-blue-700",
    border: "border-blue-500/20",
    avatar: "bg-blue-500/15 text-blue-700 border-blue-500/25",
    accent: "bg-gradient-to-r from-blue-500 to-blue-600",
    icon: BadgePercent,
  },
  PROJETISTA: {
    label: "Projetista",
    shortLabel: "Projetos",
    bg: "bg-cyan-500/10",
    text: "text-cyan-700",
    border: "border-cyan-500/20",
    avatar: "bg-cyan-500/15 text-cyan-700 border-cyan-500/25",
    accent: "bg-gradient-to-r from-cyan-500 to-cyan-600",
    icon: UserCheck,
  },
  PRODUCAO: {
    label: "Fábrica",
    shortLabel: "Produção",
    bg: "bg-amber-500/10",
    text: "text-amber-700",
    border: "border-amber-500/20",
    avatar: "bg-amber-500/15 text-amber-700 border-amber-500/25",
    accent: "bg-gradient-to-r from-amber-500 to-orange-500",
    icon: Hammer,
  },
  FINANCEIRO: {
    label: "Financeiro",
    shortLabel: "Finanças",
    bg: "bg-emerald-500/10",
    text: "text-emerald-700",
    border: "border-emerald-500/20",
    avatar: "bg-emerald-500/15 text-emerald-700 border-emerald-500/25",
    accent: "bg-gradient-to-r from-emerald-500 to-emerald-600",
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

function resetCreateForm(
  setName: (v: string) => void,
  setEmail: (v: string) => void,
  setPassword: (v: string) => void,
  setCargo: (v: Role) => void,
  setAreaAtuacao: (v: string) => void,
  setImage: (v: string) => void
) {
  setName("");
  setEmail("");
  setPassword("");
  setCargo("PRODUCAO");
  setAreaAtuacao("");
  setImage("");
}

export default function ColaboradoresClient({ initialColaboradores, companyId }: ColaboradoresClientProps) {
  const [colaboradores, setColaboradores] = useState<ColaboradorItem[]>(initialColaboradores);
  const [search, setSearch] = useState("");
  const [filterCargo, setFilterCargo] = useState<string>("ALL");
  const [loading, setLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ColaboradorItem | null>(null);
  
  const dialog = useActionDialog();
  const { showSuccess, showError, confirmAction } = dialog;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cargo, setCargo] = useState<Role>("PRODUCAO");
  const [areaAtuacao, setAreaAtuacao] = useState("");
  const [image, setImage] = useState("");
  const [password, setPassword] = useState("");

  const openCreate = () => {
    setEditing(null);
    setName("");
    setEmail("");
    setPassword("");
    setCargo("PRODUCAO");
    setAreaAtuacao("");
    setImage("");
    setIsCreateOpen(true);
  };

  const openEdit = (c: ColaboradorItem) => {
    setEditing(c);
    setName(c.name);
    setEmail(c.email);
    setCargo(c.cargo);
    setAreaAtuacao(c.areaAtuacao || "");
    setImage(c.image || "");
    setPassword("");
    setIsCreateOpen(true);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || (!editing && !password)) {
      showError(
        "Campos obrigatórios",
        "Preencha nome, e-mail e senha para prosseguir."
      );
      return;
    }

    setLoading(true);

    if (editing) {
      // Modo Edição
      const res = await updateColaborador(editing.id, {
        name,
        email,
        cargo,
        areaAtuacao,
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
                  image: res.user.image,
                }
              : c
          )
        );
        setIsCreateOpen(false);
        resetCreateForm(setName, setEmail, setPassword, setCargo, setAreaAtuacao, setImage);
        showSuccess(
          "Cadastro atualizado",
          `Os dados de ${res.user.name} foram salvos com sucesso.`
        );
      } else {
        showError(
          "Não foi possível atualizar",
          res.error || "Ocorreu um erro ao atualizar os dados."
        );
      }
    } else {
      // Modo Criação
      const res = await createColaborador({
        name,
        email,
        cargo,
        senhaRaw: password,
        companyId,
        areaAtuacao,
        image,
      });

      if (res.success && res.user) {
        const cargoLabel = CARGO_BADGES[res.user.cargo as Role]?.label || res.user.cargo;
        setColaboradores([
          ...colaboradores,
          {
            id: res.user.id,
            name: res.user.name,
            email: res.user.email,
            cargo: res.user.cargo as Role,
            areaAtuacao: res.user.areaAtuacao,
            image: res.user.image,
            createdAt: new Date(res.user.createdAt),
          },
        ]);
        setIsCreateOpen(false);
        resetCreateForm(setName, setEmail, setPassword, setCargo, setAreaAtuacao, setImage);
        showSuccess(
          "Colaborador cadastrado",
          `${res.user.name} foi adicionado à equipe como ${cargoLabel}.`
        );
      } else {
        showError(
          "Não foi possível cadastrar",
          res.error || "Ocorreu um erro ao salvar o colaborador. Tente novamente."
        );
      }
    }
    setLoading(false);
  };

  const requestDelete = (target: ColaboradorItem) => {
    confirmAction({
      title: "Remover colaborador?",
      message: `${target.name} será removido da equipe e perderá acesso ao painel. Esta ação não pode ser desfeita.`,
      confirmLabel: "Sim, remover",
      onConfirm: async () => {
        setLoading(true);
        const res = await deleteColaborador(target.id);
        if (res.success) {
          setColaboradores((prev) => prev.filter((c) => c.id !== target.id));
          showSuccess("Colaborador removido", `${target.name} foi removido da equipe com sucesso.`);
        } else {
          showError("Não foi possível remover", res.error || "Erro ao remover colaborador. Tente novamente.");
        }
        setLoading(false);
      },
    });
  };

  const filtered = colaboradores.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchesCargo = filterCargo === "ALL" || c.cargo === filterCargo;
    return matchesSearch && matchesCargo;
  });

  const total = colaboradores.length;
  const producaoCount = colaboradores.filter((c) => c.cargo === "PRODUCAO").length;
  const comercialCount = colaboradores.filter((c) => c.cargo === "COMERCIAL").length;
  const adminCount = colaboradores.filter((c) => c.cargo === "ADMIN").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 glass-card border-border flex items-center gap-4">
          <div className="p-3 bg-[hsl(28_85%_95%)] text-[hsl(28_85%_45%)] rounded-lg">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
              Total de Colaboradores
            </span>
            <strong className="text-xl text-foreground font-extrabold">{total} pessoas</strong>
          </div>
        </Card>

        <Card className="p-4 glass-card border-border flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-lg">
            <Hammer className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
              Chão de Fábrica
            </span>
            <strong className="text-xl text-foreground font-extrabold">{producaoCount} marceneiros</strong>
          </div>
        </Card>

        <Card className="p-4 glass-card border-border flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg">
            <BadgePercent className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
              Equipe de Vendas
            </span>
            <strong className="text-xl text-foreground font-extrabold">{comercialCount} comerciais</strong>
          </div>
        </Card>

        <Card className="p-4 glass-card border-border flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-lg">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
              Gestores / ADMIN
            </span>
            <strong className="text-xl text-foreground font-extrabold">{adminCount} diretores</strong>
          </div>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              className="pl-9 bg-muted/40 border-border text-sm h-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            value={filterCargo}
            onChange={(e) => setFilterCargo(e.target.value)}
            className="h-10 rounded-lg border border-border bg-muted/40 text-foreground text-sm px-3 font-medium cursor-pointer outline-none min-w-[180px]"
          >
            <option value="ALL">Todos os cargos</option>
            <option value="ADMIN">Diretoria</option>
            <option value="COMERCIAL">Comercial</option>
            <option value="PROJETISTA">Projetista</option>
            <option value="PRODUCAO">Fábrica</option>
            <option value="FINANCEIRO">Financeiro</option>
          </select>
        </div>

        <Button
          onClick={openCreate}
          className="font-semibold text-xs px-4 h-10 rounded-lg flex items-center gap-1.5 btn-metallic cursor-pointer"
        >
          <UserPlus className="h-4 w-4" />
          Adicionar Colaborador
        </Button>
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
            const badge = CARGO_BADGES[c.cargo] || {
              label: c.cargo,
              shortLabel: c.cargo,
              bg: "bg-muted",
              text: "text-muted-foreground",
              border: "border-border",
              avatar: "bg-muted text-muted-foreground border-border",
              accent: "bg-gradient-to-r from-muted to-muted",
              icon: Users,
            };
            const BadgeIcon = badge.icon;
            const formattedDate = new Date(c.createdAt).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });
            const isProtected = c.email === ADMIN_EMAIL;

            return (
              <Card
                key={c.id}
                className="bg-white border border-slate-100 hover:border-slate-200/80 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group/card relative"
              >
                <div className={`h-1.5 w-full ${badge.accent}`} />

                <div className="p-5 flex flex-col flex-1 gap-4">
                  {/* Cabeçalho do Card */}
                  <div className="flex items-center justify-between gap-3">
                    {/* Avatar robusto e premium */}
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg border shrink-0 ring-4 ring-slate-50 transition-all duration-300 group-hover/card:ring-slate-100 shadow-inner overflow-hidden ${badge.avatar}`}>
                      {c.image ? (
                        <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(c.name)
                      )}
                    </div>
                    {/* Badge do Cargo (User Role) */}
                    <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border shrink-0 ${badge.bg} ${badge.text} ${badge.border}`}>
                      <BadgeIcon className="h-3 w-3" />
                      {badge.shortLabel}
                    </span>
                  </div>

                  {/* Nome e Cargo */}
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-slate-800 text-sm leading-tight tracking-tight group-hover/card:text-indigo-650 transition-colors truncate">{c.name}</h3>
                    <span className="text-[10px] text-slate-400 font-bold block mt-0.5">{badge.label}</span>
                  </div>

                  {/* Área de Atuação em Destaque */}
                  <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                    <Briefcase className="h-3.5 w-3.5 text-slate-450 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-[8px] font-black text-slate-450 uppercase tracking-widest block leading-none">Área de Atuação</span>
                      <span className="text-[10px] font-bold text-slate-700 truncate block mt-1">
                        {c.areaAtuacao || <span className="text-slate-400 font-normal italic">Operação Geral</span>}
                      </span>
                    </div>
                  </div>

                  {/* E-mail e Admissão */}
                  <div className="space-y-1.5 text-xs text-slate-500">
                    <p className="flex items-center gap-2 min-w-0">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate font-semibold">{c.email}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="font-medium">Admitido em {formattedDate}</span>
                    </p>
                  </div>

                  {/* Ações no Rodapé */}
                  <div className="mt-auto pt-3 border-t border-slate-100 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(c)}
                      className="flex-1 text-[11px] font-extrabold h-9 rounded-xl border-slate-200 hover:border-slate-350 hover:bg-slate-50 transition-all cursor-pointer"
                      disabled={loading}
                    >
                      <Pencil className="h-3 w-3 mr-1.5 text-slate-500" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => requestDelete(c)}
                      className="text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 border-slate-200 h-9 px-3 rounded-xl transition-all cursor-pointer"
                      disabled={isProtected || loading}
                      title="Remover colaborador"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
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
          resetCreateForm(setName, setEmail, setPassword, setCargo, setAreaAtuacao, setImage);
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
              <label className="text-xs font-semibold text-muted-foreground">Nome completo</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">E-mail corporativo</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Foto de perfil (URL)</label>
              <Input
                type="url"
                value={image}
                onChange={(e) => setImage(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Cargo (User Role)</label>
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

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Área de Atuação</label>
                <select
                  value={areaAtuacao}
                  onChange={(e) => setAreaAtuacao(e.target.value)}
                  className="w-full h-10 rounded-lg border border-border bg-card text-foreground text-sm px-3 font-medium cursor-pointer outline-none"
                >
                  <option value="">Selecione uma área...</option>
                  <option value="Fábrica / Marcenaria">Fábrica / Marcenaria</option>
                  <option value="Projetos 3D / Design">Projetos 3D / Design</option>
                  <option value="Comercial / Vendas">Comercial / Vendas</option>
                  <option value="Administrativo">Administrativo</option>
                  <option value="Financeiro">Financeiro</option>
                  <option value="Montagem Externa">Montagem Externa</option>
                  <option value="Instalação e Logística">Instalação e Logística</option>
                  <option value="Diretoria">Diretoria</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">
                {editing ? "Senha provisória (Deixe em branco para não alterar)" : "Senha provisória"}
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!editing}
                minLength={6}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 font-semibold"
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditing(null);
                  resetCreateForm(setName, setEmail, setPassword, setCargo, setAreaAtuacao, setImage);
                }}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 font-semibold btn-metallic cursor-pointer" disabled={loading}>
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
