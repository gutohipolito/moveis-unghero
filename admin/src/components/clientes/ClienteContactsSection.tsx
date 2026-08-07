"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  Mail,
  Phone,
  Plus,
  Star,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import {
  createClientContact,
  deleteClientContact,
  listClientContacts,
  setPrincipalClientContact,
  updateClientContact,
  type ClientContactDTO,
} from "@/app/actions/clientContacts";
import { formatPhoneDisplay } from "@/lib/phone";
import { useSensitiveDisplay } from "@/hooks/useSensitiveDisplay";

const AREA_SUGGESTIONS = [
  "Compras",
  "Projetos",
  "Financeiro",
  "Diretoria",
  "Obra",
  "Facilities",
  "Outro",
];

interface ClienteContactsSectionProps {
  clientId: string;
  canManage: boolean;
  showSuccess: (title: string, message: string) => void;
  showError: (title: string, message: string) => void;
  confirmAction: (options: {
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void | Promise<void>;
  }) => void;
}

export default function ClienteContactsSection({
  clientId,
  canManage,
  showSuccess,
  showError,
  confirmAction,
}: ClienteContactsSectionProps) {
  const sensitive = useSensitiveDisplay();
  const [contacts, setContacts] = useState<ClientContactDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClientContactDTO | null>(null);
  const [nome, setNome] = useState("");
  const [area, setArea] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [principal, setPrincipal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const res = await listClientContacts(clientId);
    setLoading(false);
    if (res.success) setContacts(res.contacts);
  }, [clientId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  function openCreate() {
    setEditing(null);
    setNome("");
    setArea("");
    setTelefone("");
    setEmail("");
    setPrincipal(contacts.length === 0);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(c: ClientContactDTO) {
    setEditing(c);
    setNome(c.nome);
    setArea(c.area || "");
    setTelefone(c.telefone || "");
    setEmail(c.email || "");
    setPrincipal(c.principal);
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setFormError(null);
    const res = editing
      ? await updateClientContact({
          id: editing.id,
          nome,
          area,
          telefone,
          email,
          principal,
        })
      : await createClientContact({
          clientId,
          nome,
          area,
          telefone,
          email,
          principal,
        });
    setSaving(false);
    if (!res.success) {
      setFormError(res.error);
      return;
    }
    setDialogOpen(false);
    showSuccess(
      editing ? "Representante atualizado" : "Representante cadastrado",
      "Use este contato como solicitante ao criar orçamentos."
    );
    await reload();
  }

  function handleDelete(c: ClientContactDTO) {
    confirmAction({
      title: "Excluir representante?",
      message: `${c.nome} será removido do cadastro. Orçamentos já emitidos mantêm o nome no snapshot.`,
      confirmLabel: "Excluir",
      onConfirm: async () => {
        const res = await deleteClientContact(c.id);
        if (!res.success) {
          showError("Não foi possível excluir", res.error);
          return;
        }
        showSuccess("Representante excluído", "Lista atualizada.");
        await reload();
      },
    });
  }

  return (
    <>
      <Card className="p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Users className="h-4 w-4 text-violet-600" />
              Representantes
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5 max-w-lg leading-relaxed">
              Contatos por setor (Compras, Projetos, Financeiro…). No orçamento, escolha quem
              solicitou — a empresa continua como Cliente e a pessoa aparece como Solicitante.
            </p>
          </div>
          {canManage && (
            <Button
              type="button"
              size="sm"
              className="font-bold gap-1.5 cursor-pointer h-9"
              onClick={openCreate}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Adicionar
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-6 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando representantes…
          </div>
        ) : contacts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 px-4 py-8 text-center space-y-2">
            <Users className="h-7 w-7 text-muted-foreground/40 mx-auto" />
            <p className="text-xs font-semibold text-foreground">Nenhum representante ainda</p>
            <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
              Cadastre quem pede orçamento nesta empresa para constar no PDF.
            </p>
            {canManage && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="font-bold cursor-pointer gap-1"
                onClick={openCreate}
              >
                <Plus className="h-3.5 w-3.5" />
                Cadastrar o primeiro
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-2">
            {contacts.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-border/50 bg-white/70 px-3.5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-foreground">{c.nome}</p>
                    {c.principal && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                        <Star className="h-2.5 w-2.5" />
                        Principal
                      </span>
                    )}
                    {c.area && (
                      <span className="text-[10px] font-bold text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full">
                        {c.area}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-[11px] text-muted-foreground">
                    {c.telefone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {sensitive.phone(formatPhoneDisplay(c.telefone) || c.telefone)}
                      </span>
                    )}
                    {c.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {sensitive.email(c.email)}
                      </span>
                    )}
                  </div>
                </div>
                {canManage && (
                  <div className="flex items-center gap-1 shrink-0">
                    {!c.principal && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 text-[10px] font-bold cursor-pointer"
                        onClick={async () => {
                          const res = await setPrincipalClientContact(c.id);
                          if (!res.success) {
                            showError("Erro", res.error);
                            return;
                          }
                          await reload();
                        }}
                      >
                        Torná-lo principal
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 text-[10px] font-bold cursor-pointer"
                      onClick={() => openEdit(c)}
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 text-rose-600 cursor-pointer"
                      onClick={() => handleDelete(c)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog
        isOpen={dialogOpen}
        onClose={() => !saving && setDialogOpen(false)}
        className="max-w-md"
      >
        <div className="space-y-4 pr-2">
          <div>
            <h3 className="text-base font-bold text-foreground">
              {editing ? "Editar representante" : "Novo representante"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pessoa de contato nesta empresa (não substitui a razão social no orçamento).
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Nome *
              </label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="mt-1 h-10"
                placeholder="Nome completo"
                autoFocus
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Área / setor
              </label>
              <Input
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="mt-1 h-10"
                list="client-contact-areas"
                placeholder="Ex.: Compras"
              />
              <datalist id="client-contact-areas">
                {AREA_SUGGESTIONS.map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                WhatsApp
              </label>
              <Input
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="mt-1 h-10"
                placeholder="(54) 9 9999-9999"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                E-mail
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 h-10"
                placeholder="nome@empresa.com"
              />
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={principal}
                onChange={(e) => setPrincipal(e.target.checked)}
                className="rounded border-border"
              />
              Contato principal (sugestão padrão no orçamento)
            </label>
          </div>

          {formError && <p className="text-xs text-rose-600 font-semibold">{formError}</p>}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              className="cursor-pointer"
              disabled={saving}
              onClick={() => setDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="font-bold cursor-pointer gap-2"
              disabled={saving}
              onClick={() => void handleSave()}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
