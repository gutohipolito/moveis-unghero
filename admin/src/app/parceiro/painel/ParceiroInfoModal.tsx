"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { PartnerPortalData } from "@/lib/partnerPortal";
import { formatPartnerRegistro, partnerRegistroLabel } from "@/lib/partnerTypes";
import { updateParceiroProfileAction } from "@/app/actions/parceiroPortal";

type ProfileFields = {
  nome: string;
  email: string;
  telefone: string;
  cidade: string;
  endereco: string;
  escritorio: string;
  registro_profissional: string;
  portfolioUrl: string;
};

function toFields(partner: PartnerPortalData): ProfileFields {
  return {
    nome: partner.nome || "",
    email: partner.email || "",
    telefone: partner.telefone || "",
    cidade: partner.cidade || "",
    endereco: partner.endereco || "",
    escritorio: partner.escritorio || "",
    registro_profissional: partner.registro_profissional || "",
    portfolioUrl: partner.portfolioUrl || "",
  };
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
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<ProfileFields>(() => toFields(partner));

  useEffect(() => {
    if (open) {
      setFields(toFields(partner));
      setEditing(false);
      setError(null);
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
      endereco: res.profile.endereco,
      escritorio: res.profile.escritorio,
      registro_profissional: res.profile.registro_profissional,
      portfolioUrl: res.profile.portfolioUrl,
    });
    setEditing(false);
  };

  const rows: Array<{ label: string; value: string; href?: string }> = [
    { label: "Nome", value: fields.nome || "—" },
    { label: "E-mail", value: fields.email || "—" },
    { label: "Telefone", value: fields.telefone || "—" },
    { label: "Cidade", value: fields.cidade || "—" },
    { label: "Endereço", value: fields.endereco || "—" },
    { label: "Empresa / escritório", value: fields.escritorio || "—" },
    { label: registroHint || "Registro", value: registroLabel || fields.registro_profissional || "—" },
    {
      label: "Portfólio",
      value: fields.portfolioUrl || "—",
      href: fields.portfolioUrl || undefined,
    },
  ];

  return (
    <Dialog
      isOpen={open}
      onClose={onClose}
      className="max-w-lg w-full"
      bodyClassName="max-h-[min(90svh,720px)] overflow-y-auto"
    >
      <div className="space-y-5 pr-1">
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
          <div className="space-y-3">
            {(
              [
                ["nome", "Nome"],
                ["email", "E-mail"],
                ["telefone", "Telefone"],
                ["cidade", "Cidade"],
                ["endereco", "Endereço"],
                ["escritorio", "Empresa / escritório"],
                ["registro_profissional", registroHint || "Registro profissional"],
                ["portfolioUrl", "Portfólio (URL)"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {label}
                </label>
                <Input
                  value={fields[key]}
                  onChange={(e) => setField(key, e.target.value)}
                  className="h-10"
                  autoComplete="off"
                />
              </div>
            ))}

            {error && (
              <p className="text-xs font-semibold text-rose-600">{error}</p>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="font-bold"
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
                className="font-bold btn-metallic flex-1 gap-1.5"
                disabled={saving}
                onClick={() => void handleSave()}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando…
                  </>
                ) : (
                  "Salvar alterações"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <dl className="space-y-3">
            {rows.map((row) => (
              <div
                key={row.label}
                className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-3.5 py-2.5"
              >
                <dt className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  {row.label}
                </dt>
                <dd className="text-sm font-semibold text-slate-900 mt-0.5 break-all">
                  {row.href ? (
                    <a
                      href={row.href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-900 underline underline-offset-2"
                    >
                      {row.value}
                    </a>
                  ) : (
                    row.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </Dialog>
  );
}
