"use client";

import React, { useEffect, useState } from "react";
import { ExternalLink, Loader2, Pencil } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { PartnerPortalData } from "@/lib/partnerPortal";
import { partnerRegistroLabel } from "@/lib/partnerTypes";
import { updateParceiroProfileAction } from "@/app/actions/parceiroPortal";
import { fetchViaCep } from "@/lib/viaCep";
import { normalizeCidade } from "@/lib/address";
import { cn } from "@/lib/utils";

type ProfileFields = {
  nome: string;
  email: string;
  telefone: string;
  cep: string;
  cidade: string;
  endereco: string;
  escritorio: string;
  registro_profissional: string;
  portfolioUrl: string;
};

function formatCepDisplay(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function toFields(partner: PartnerPortalData): ProfileFields {
  return {
    nome: partner.nome || "",
    email: partner.email || "",
    telefone: partner.telefone || "",
    cep: partner.cep || "",
    cidade: partner.cidade || "",
    endereco: partner.endereco || "",
    escritorio: partner.escritorio || "",
    registro_profissional: partner.registro_profissional || "",
    portfolioUrl: partner.portfolioUrl || "",
  };
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}

function SectionDivider() {
  return <div className="parceiro-info-section-rule" role="separator" />;
}

type Props = {
  open: boolean;
  partner: PartnerPortalData;
  onClose: () => void;
  onSaved: (profile: Partial<PartnerPortalData>) => void;
};

export default function ParceiroInfoModal({ open, partner, onClose, onSaved }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<ProfileFields>(() => toFields(partner));

  useEffect(() => {
    if (open) {
      setFields(toFields(partner));
      setEditing(false);
      setError(null);
      setCepLoading(false);
    }
  }, [open, partner]);

  const registroHint = partnerRegistroLabel(partner.tipo);
  const inputClass = "h-10 parceiro-info-input";

  const setField = (key: keyof ProfileFields, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const lookupCep = async (cepValue: string) => {
    const digits = cepValue.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const addr = await fetchViaCep(digits);
      if (!addr) return;
      const { cidade } = normalizeCidade(addr.localidade);
      const street = [addr.logradouro, addr.bairro].filter(Boolean).join(" — ");
      setFields((prev) => ({
        ...prev,
        cep: digits,
        cidade: cidade || prev.cidade,
        endereco: street || prev.endereco,
      }));
    } finally {
      setCepLoading(false);
    }
  };

  const handleCepChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    setField("cep", digits);
    if (digits.length === 8) {
      void lookupCep(digits);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const res = await updateParceiroProfileAction(fields);
    setSaving(false);
    if (!res.success) {
      setError(res.error || "Não foi possível salvar.");
      return;
    }
    onSaved({
      nome: res.profile.nome,
      email: res.profile.email,
      telefone: res.profile.telefone,
      cidade: res.profile.cidade,
      cep: res.profile.cep,
      endereco: res.profile.endereco,
      escritorio: res.profile.escritorio,
      registro_profissional: res.profile.registro_profissional,
      portfolioUrl: res.profile.portfolioUrl,
    });
    setEditing(false);
  };

  const display = (value: string) => value.trim() || "—";

  return (
    <Dialog
      isOpen={open}
      onClose={onClose}
      className="parceiro-info-modal max-w-2xl w-full"
      backdropClassName="parceiro-info-modal-backdrop"
      bodyClassName="max-h-[min(90svh,820px)] overflow-y-auto"
    >
      <div className="space-y-5 pr-0.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Perfil
            </p>
            <h3 className="text-lg font-display font-bold text-slate-900 tracking-tight">
              Informações
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Dados do seu cadastro na Móveis Unghero.
            </p>
          </div>
          {!editing && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="font-bold gap-1.5 shrink-0"
              onClick={() => setEditing(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </Button>
          )}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nome" className="sm:col-span-2">
              <Input
                value={editing ? fields.nome : display(fields.nome)}
                onChange={(e) => setField("nome", e.target.value)}
                className={inputClass}
                readOnly={!editing}
                tabIndex={editing ? 0 : -1}
                autoComplete="name"
              />
            </Field>
            <Field label="E-mail">
              <Input
                type={editing ? "email" : "text"}
                value={editing ? fields.email : display(fields.email)}
                onChange={(e) => setField("email", e.target.value)}
                className={inputClass}
                readOnly={!editing}
                tabIndex={editing ? 0 : -1}
                autoComplete="email"
              />
            </Field>
            <Field label="Telefone">
              <Input
                value={editing ? fields.telefone : display(fields.telefone)}
                onChange={(e) => setField("telefone", e.target.value)}
                className={inputClass}
                readOnly={!editing}
                tabIndex={editing ? 0 : -1}
                autoComplete="tel"
              />
            </Field>
          </div>

          <SectionDivider />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="CEP">
              <div className="relative">
                <Input
                  value={
                    editing
                      ? formatCepDisplay(fields.cep)
                      : fields.cep
                        ? formatCepDisplay(fields.cep)
                        : "—"
                  }
                  onChange={(e) => handleCepChange(e.target.value)}
                  className={inputClass}
                  readOnly={!editing}
                  tabIndex={editing ? 0 : -1}
                  inputMode="numeric"
                  placeholder={editing ? "00000-000" : undefined}
                  autoComplete="postal-code"
                />
                {editing && cepLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
                )}
              </div>
            </Field>
            <Field label="Cidade">
              <Input
                value={editing ? fields.cidade : display(fields.cidade)}
                onChange={(e) => setField("cidade", e.target.value)}
                className={inputClass}
                readOnly={!editing}
                tabIndex={editing ? 0 : -1}
                autoComplete="address-level2"
              />
            </Field>
            <Field label="Endereço" className="sm:col-span-2">
              <Input
                value={editing ? fields.endereco : display(fields.endereco)}
                onChange={(e) => setField("endereco", e.target.value)}
                className={inputClass}
                readOnly={!editing}
                tabIndex={editing ? 0 : -1}
                autoComplete="street-address"
              />
            </Field>
          </div>

          <SectionDivider />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Empresa / escritório">
              <Input
                value={editing ? fields.escritorio : display(fields.escritorio)}
                onChange={(e) => setField("escritorio", e.target.value)}
                className={inputClass}
                readOnly={!editing}
                tabIndex={editing ? 0 : -1}
              />
            </Field>
            <Field label={registroHint}>
              <Input
                value={
                  editing
                    ? fields.registro_profissional
                    : display(fields.registro_profissional)
                }
                onChange={(e) => setField("registro_profissional", e.target.value)}
                className={inputClass}
                readOnly={!editing}
                tabIndex={editing ? 0 : -1}
                placeholder={editing ? "Número do registro" : undefined}
              />
            </Field>
            <Field label="Portfólio (URL)" className="sm:col-span-2">
              {editing ? (
                <Input
                  value={fields.portfolioUrl}
                  onChange={(e) => setField("portfolioUrl", e.target.value)}
                  className={inputClass}
                  placeholder="https://..."
                  autoComplete="url"
                />
              ) : fields.portfolioUrl ? (
                <a
                  href={fields.portfolioUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    inputClass,
                    "flex items-center gap-2 px-3 border border-input bg-transparent rounded-md text-sm font-medium text-slate-900 hover:underline"
                  )}
                >
                  <span className="truncate flex-1">{fields.portfolioUrl}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" />
                </a>
              ) : (
                <Input value="—" className={inputClass} readOnly tabIndex={-1} />
              )}
            </Field>
          </div>

          {editing && error && (
            <p className="text-xs font-semibold text-rose-600">{error}</p>
          )}

          {editing && (
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <Button
                type="button"
                className="font-bold h-11 btn-cancel-rose-glow"
                disabled={saving}
                onClick={() => {
                  setFields(toFields(partner));
                  setEditing(false);
                  setError(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="font-bold h-11 btn-metallic gap-1.5"
                disabled={saving || cepLoading}
                onClick={() => void handleSave()}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando…
                  </>
                ) : (
                  "Salvar"
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
