"use client";

import React, { useState } from "react";
import { Role } from "@prisma/client";
import { createColaborador, deleteColaborador } from "@/app/actions/colaboradores";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  X 
} from "lucide-react";

interface ColaboradorItem {
  id: string;
  name: string;
  email: string;
  cargo: Role;
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

export default function ColaboradoresClient({ initialColaboradores, companyId }: ColaboradoresClientProps) {
  const [colaboradores, setColaboradores] = useState<ColaboradorItem[]>(initialColaboradores);
  const [search, setSearch] = useState("");
  const [filterCargo, setFilterCargo] = useState<string>("ALL");
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cargo, setCargo] = useState<Role>("PRODUCAO");
  const [password, setPassword] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setLoading(true);
    const res = await createColaborador({
      name,
      email,
      cargo,
      senhaRaw: password,
      companyId,
    });

    if (res.success && res.user) {
      setColaboradores([...colaboradores, {
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        cargo: res.user.cargo as Role,
        createdAt: new Date(res.user.createdAt)
      }]);
      setIsModalOpen(false);
      setName("");
      setEmail("");
      setPassword("");
      setCargo("PRODUCAO");
    } else {
      alert(res.error || "Ocorreu um erro ao salvar o colaborador.");
    }
    setLoading(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja mesmo remover o colaborador ${name} da equipe?`)) {
      return;
    }

    setLoading(true);
    const res = await deleteColaborador(id);
    if (res.success) {
      setColaboradores(colaboradores.filter(c => c.id !== id));
    } else {
      alert(res.error || "Erro ao deletar colaborador.");
    }
    setLoading(false);
  };

  // Filtragem
  const filtered = colaboradores.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
    const matchesCargo = filterCargo === "ALL" || c.cargo === filterCargo;
    return matchesSearch && matchesCargo;
  });

  // Estatísticas
  const total = colaboradores.length;
  const producaoCount = colaboradores.filter(c => c.cargo === "PRODUCAO").length;
  const comercialCount = colaboradores.filter(c => c.cargo === "COMERCIAL").length;
  const adminCount = colaboradores.filter(c => c.cargo === "ADMIN").length;

  return (
    <div className="space-y-6">
      
      {/* Cards de Indicadores da Equipe */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 glass-card border-border flex items-center gap-4">
          <div className="p-3 bg-[hsl(28_85%_95%)] text-[hsl(28_85%_45%)] rounded-lg">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Total de Colaboradores</span>
            <strong className="text-xl text-foreground font-extrabold">{total} pessoas</strong>
          </div>
        </Card>

        <Card className="p-4 glass-card border-border flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-lg">
            <Hammer className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Chão de Fábrica</span>
            <strong className="text-xl text-foreground font-extrabold">{producaoCount} marceneiros</strong>
          </div>
        </Card>

        <Card className="p-4 glass-card border-border flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg">
            <BadgePercent className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Equipe de Vendas</span>
            <strong className="text-xl text-foreground font-extrabold">{comercialCount} comerciais</strong>
          </div>
        </Card>

        <Card className="p-4 glass-card border-border flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-lg">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Gestores / ADMIN</span>
            <strong className="text-xl text-foreground font-extrabold">{adminCount} diretores</strong>
          </div>
        </Card>
      </div>

      {/* Ações e Filtros */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
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
          onClick={() => setIsModalOpen(true)}
          className="bg-[hsl(28_85%_45%)] hover:bg-[hsl(28_85%_40%)] text-white font-semibold text-xs px-4 py-2.5 h-10 rounded-lg flex items-center gap-1.5 cursor-pointer border-none shadow-sm transition-all"
        >
          <UserPlus className="h-4 w-4" />
          Adicionar Colaborador
        </Button>
      </div>

      {/* Grid de cards da equipe */}
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
            const badge =
              CARGO_BADGES[c.cargo] || {
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
            const isProtected = c.id === "system-admin-mock-id";

            return (
              <Card
                key={c.id}
                className="glass-card glass-card-hover overflow-hidden flex flex-col border-border/80"
              >
                <div className={`h-1.5 w-full ${badge.accent}`} />

                <div className="p-5 flex flex-col flex-1 gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg border shrink-0 ${badge.avatar}`}
                    >
                      {getInitials(c.name)}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${badge.bg} ${badge.text} ${badge.border}`}
                    >
                      <BadgeIcon className="h-3 w-3" />
                      {badge.shortLabel}
                    </span>
                  </div>

                  <div className="min-w-0 space-y-1">
                    <h3 className="text-base font-bold text-foreground leading-tight truncate">
                      {c.name}
                    </h3>
                    <p className="text-xs text-muted-foreground font-medium">{badge.label}</p>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2 min-w-0">
                      <Mail className="h-4 w-4 shrink-0 text-primary/70" />
                      <span className="truncate">{c.email}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 shrink-0 text-primary/70" />
                      <span>Desde {formattedDate}</span>
                    </p>
                  </div>

                  <div className="mt-auto pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground/70 uppercase tracking-wider">
                      #{c.id.substring(0, 8)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(c.id, c.name)}
                      className="h-8 px-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer transition-colors gap-1.5"
                      disabled={isProtected || loading}
                      title="Remover colaborador"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="text-xs font-semibold">Remover</span>
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal / Overlay para Criar Colaborador */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <Card className="w-full max-w-md bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden animate-scale-up">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-[hsl(28_85%_45%)]" />
                <h3 className="font-extrabold text-base text-slate-800">Novo Colaborador</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Nome Completo</label>
                <Input 
                  placeholder="Nome completo do colaborador"
                  className="bg-slate-50 border-slate-200 text-sm h-10 rounded-lg text-slate-800"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">E-mail Corporativo</label>
                <Input 
                  type="email"
                  placeholder="E-mail profissional"
                  className="bg-slate-50 border-slate-200 text-sm h-10 rounded-lg text-slate-800"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Cargo / Função</label>
                <select 
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value as Role)}
                  className="w-full h-10 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-sm px-3 font-semibold cursor-pointer outline-none"
                >
                  <option value="PRODUCAO">Fábrica</option>
                  <option value="COMERCIAL">Comercial</option>
                  <option value="PROJETISTA">Projetista</option>
                  <option value="FINANCEIRO">Financeiro</option>
                  <option value="ADMIN">Diretoria</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Senha Provisória</label>
                <Input 
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  className="bg-slate-50 border-slate-200 text-sm h-10 rounded-lg text-slate-800"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 h-10 border border-slate-200 hover:bg-slate-50 rounded-lg font-bold text-xs text-slate-500 cursor-pointer transition-all"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <Button
                  type="submit"
                  className="flex-1 h-10 bg-[hsl(28_85%_45%)] hover:bg-[hsl(28_85%_40%)] text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-sm border-none"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Cadastrar Equipe"
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

    </div>
  );
}
