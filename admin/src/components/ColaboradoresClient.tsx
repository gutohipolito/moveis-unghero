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

const CARGO_BADGES: Record<Role, { label: string; bg: string; text: string; border: string; icon: React.ComponentType<any> }> = {
  ADMIN: { label: "Diretoria (ADMIN)", bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20", icon: ShieldCheck },
  COMERCIAL: { label: "Vendas (COMERCIAL)", bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", icon: BadgePercent },
  PROJETISTA: { label: "Projetos (PROJETISTA)", bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20", icon: UserCheck },
  PRODUCAO: { label: "Fábrica (PRODUCAO)", bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", icon: Hammer },
  FINANCEIRO: { label: "Finanças (FINANCEIRO)", bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", icon: Wallet },
};

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
              className="pl-9 bg-slate-50 border-slate-200 text-sm h-10 rounded-lg text-slate-800"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select 
            value={filterCargo}
            onChange={(e) => setFilterCargo(e.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs px-3 font-semibold cursor-pointer outline-none min-w-[200px]"
          >
            <option value="ALL">Todos os Cargos</option>
            <option value="ADMIN">Administrador (ADMIN)</option>
            <option value="COMERCIAL">Comercial (COMERCIAL)</option>
            <option value="PROJETISTA">Projetista (PROJETISTA)</option>
            <option value="PRODUCAO">Fábrica (PRODUCAO)</option>
            <option value="FINANCEIRO">Financeiro (FINANCEIRO)</option>
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

      {/* Tabela de Equipe */}
      <Card className="border border-border/80 rounded-xl overflow-hidden glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/40" style={{ background: "hsl(210 20% 97.5%)" }}>
                <th className="py-3 px-5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Colaborador</th>
                <th className="py-3 px-5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">E-mail</th>
                <th className="py-3 px-5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Função / Cargo</th>
                <th className="py-3 px-5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Cadastrado em</th>
                <th className="py-3 px-5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sm text-slate-400 font-medium">
                    Nenhum colaborador encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filtered.map(c => {
                  const badge = CARGO_BADGES[c.cargo] || { label: c.cargo, bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/20", icon: Users };
                  const BadgeIcon = badge.icon;
                  const formattedDate = new Date(c.createdAt).toLocaleDateString("pt-BR");

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm bg-[hsl(28_85%_95%)] text-[hsl(28_85%_45%)] border border-[hsl(28_85%_85%)]">
                            {c.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <strong className="text-sm font-bold text-slate-800 block leading-tight">{c.name}</strong>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {c.id.substring(0, 8).toUpperCase()}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-sm text-slate-600 font-medium">{c.email}</td>
                      <td className="py-4 px-5">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg} ${badge.text} ${badge.border}`}>
                          <BadgeIcon className="h-3 w-3" />
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-sm text-slate-500 font-medium">{formattedDate}</td>
                      <td className="py-4 px-5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(c.id, c.name)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                          disabled={c.id === "system-admin-mock-id" || loading}
                          title="Remover Colaborador"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

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
                  placeholder="Ex: João da Silva"
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
                  placeholder="Ex: joao.marceneiro@moveisunghero.com.br"
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
                  <option value="PRODUCAO">Fábrica (PRODUCAO)</option>
                  <option value="COMERCIAL">Comercial (COMERCIAL)</option>
                  <option value="PROJETISTA">Projetista (PROJETISTA)</option>
                  <option value="FINANCEIRO">Financeiro (FINANCEIRO)</option>
                  <option value="ADMIN">Administrador (ADMIN)</option>
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
