"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { PartnerPortalData } from "@/lib/partnerPortal";
import { formatPartnerRegistro, partnerRegistroLabel } from "@/lib/partnerTypes";
import { updateParceiroProfileAction } from "@/app/actions/parceiroPortal";
import { fetchViaCep } from "@/lib/viaCep";
import { normalizeCidade } from "@/lib/address";

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
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
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

function ViewRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="parceiro-info-view-row">
      <dt className="text-[10px] font-black uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd className="text-sm font-semibold text-slate-900 mt-0.5 break-all">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
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

  const registroLabel = formatPartnerRegistro(
    partner.tipo,
    fields.registro_profissional
  );
  const registroHint = partnerRegistroLabel(partner.tipo);

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

        {editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Field label="Nome">
                  <Input
                    value={fields.nome}
                    onChange={(e) => setField("nome", e.target.value)}
                    className="h-10"
                    autoComplete="name"
                  />
                </Field>
              </div>
              <Field label="E-mail">
                <Input
                  type="email"
                  value={fields.email}
                  onChange={(e) => setField("email", e.target.value)}
                  className="h-10"
                  autoComplete="email"
                />
              </Field>
              <Field label="Telefone">
                <Input
                  value={fields.telefone}
                  onChange={(e) => setField("telefone", e.target.value)}
                  className="h-10"
                  autoComplete="tel"
                />
              </Field>
            </div>

            <SectionDivider />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="CEP">
                <div className="relative">
                  <Input
                    value={formatCepDisplay(fields.cep)}
                    onChange={(e) => handleCepChange(e.target.value)}
                    className="h-10"
                    inputMode="numeric"
                    placeholder="00000-000"
                    autoComplete="postal-code"
                  />
                  {cepLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
                  )}
                </div>
              </Field>
              <Field label="Cidade">
                <Input
                  value={fields.cidade}
                  onChange={(e) => setField("cidade", e.target.value)}
                  className="h-10"
                  autoComplete="address-level2"
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Endereço">
                  <Input
                    value={fields.endereco}
                    onChange={(e) => setField("endereco", e.target.value)}
                    className="h-10"
                    autoComplete="street-address"
                  />
                </Field>
              </div>
            </div>

            <SectionDivider />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Empresa / escritório">
                <Input
                  value={fields.escritorio}
                  onChange={(e) => setField("escritorio", e.target.value)}
                  className="h-10"
                />
              </Field>
              <Field label={registroHint}>
                <Input
                  value={fields.registro_profissional}
                  onChange={(e) => setField("registro_profissional", e.target.value)}
                  className="h-10"
                  placeholder="Número do registro"
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Portfólio (URL)">
                  <Input
                    value={fields.portfolioUrl}
                    onChange={(e) => setField("portfolioUrl", e.target.value)}
                    className="h-10"
                    placeholder="https://..."
                    autoComplete="url"
                  />
                </Field>
              </div>
            </div>

            {error && (
              <p className="text-xs font-semibold text-rose-600">{error}</p>
            )}

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <Button
                type="button"
                className="font-bold h-11 btn-cancel-silver-rose"
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
          </div>
        ) : (
          <div className="space-y-4">
            <dl className="space-y-2.5">
              <ViewRow label="Nome" value={fields.nome || "—"} />
              <ViewRow label="E-mail" value={fields.email || "—"} />
              <ViewRow label="Telefone" value={fields.telefone || "—"} />
            </dl>

            <SectionDivider />

            <dl className="space-y-2.5">
              <ViewRow
                label="CEP"
                value={fields.cep ? formatCepDisplay(fields.cep) : "—"}
              />
              <ViewRow label="Cidade" value={fields.cidade || "—"} />
              <ViewRow label="Endereço" value={fields.endereco || "—"} />
            </dl>

            <SectionDivider />

            <dl className="space-y-2.5">
              <ViewRow label="Empresa / escritório" value={fields.escritorio || "—"} />
              <ViewRow
                label={registroHint}
                value={registroLabel || fields.registro_profissional || "—"}
              />
              <ViewRow
                label="Portfólio"
                value={fields.portfolioUrl || "—"}
                href={fields.portfolioUrl || undefined}
              />
            </dl>
          </div>
        )}
      </div>
    </Dialog>
  );
}
