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

  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<PartnerType>("PROJETISTA");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cidade, setCidade] = useState("");
  const [escritorio, setEscritorio] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const syncParceiros = useCallback(async () => {
    const result = await getParceirosLiveSnapshot(companyId);
    if (result.success && result.parceiros) {
      setParceiros(result.parceiros);
    }
  }, [companyId]);

  useLiveEntity("parceiros", {
    sync: syncParceiros,
    enabled: !loading && !isCreateOpen,
  });

  const resetForm = () => {
    setNome("");
    setTipo("PROJETISTA");
    setEmail("");
    setTelefone("");
    setCidade("");
    setEscritorio("");
    setObservacoes("");
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

              return (
                <Card
                  key={p.id}
                  className="glass-card glass-card-hover overflow-hidden flex flex-col border-border/80"
                >
                  <div className={`h-1 ${style.accent}`} />
                  <div className="p-4 flex flex-col gap-3 flex-1">
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-sm font-bold ${style.avatar}`}
                      >
                        {getInitials(p.nome)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-foreground leading-snug">{p.nome}</h3>
                        <span
                          className={`inline-flex items-center gap-1 mt-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md border ${style.bg} ${style.text} ${style.border}`}
                        >
                          <Icon className="h-3 w-3" />
                          {style.label}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      {p.escritorio && (
                        <p className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{p.escritorio}</span>
                        </p>
                      )}
                      {p.cidade && (
                        <p className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {p.cidade}
                        </p>
                      )}
                      {p.telefone && (
                        <p className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          {p.telefone}
                        </p>
                      )}
                      {p.email && (
                        <p className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{p.email}</span>
                        </p>
                      )}
                    </div>

                    {p.observacoes && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 border-t border-border/50 pt-2">
                        {p.observacoes}
                      </p>
                    )}

                    <div className="flex gap-2 pt-1 mt-auto">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
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

      <ActionDialogHost dialog={dialog} />
    </>
  );
}
