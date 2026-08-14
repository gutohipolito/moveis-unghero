"use client";

import React, { useEffect, useState } from "react";
import { ExternalLink, Loader2, Pencil, Plus, X } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ActionDialog from "@/components/ActionDialog";
import type { PartnerPortalData } from "@/lib/partnerPortal";
import { partnerRegistroLabel } from "@/lib/partnerTypes";
import { updateParceiroProfileAction } from "@/app/actions/parceiroPortal";
import { fetchViaCep } from "@/lib/viaCep";
import { normalizeCidade } from "@/lib/address";
import CityField from "@/components/forms/CityField";
import { faviconUrlFor } from "@/lib/accessCategories";
import {
  MAX_PORTFOLIO_URLS,
  parsePortfolioUrls,
  serializePortfolioUrls,
} from "@/lib/portfolioUrls";
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
  portfolioUrls: string[];
};

function formatCepDisplay(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function toFields(partner: PartnerPortalData): ProfileFields {
  const urls = parsePortfolioUrls(partner.portfolioUrl);
  return {
    nome: partner.nome || "",
    email: partner.email || "",
    telefone: partner.telefone || "",
    cep: partner.cep || "",
    cidade: partner.cidade || "",
    endereco: partner.endereco || "",
    escritorio: partner.escritorio || "",
    registro_profissional: partner.registro_profissional || "",
    portfolioUrls: urls.length ? urls : [""],
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

function PortfolioFavicon({ url }: { url: string }) {
  const src = faviconUrlFor(url.trim() || null);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [src]);

  return (
    <span className="parceiro-portfolio-favicon" aria-hidden>
      {src && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" width={16} height={16} onError={() => setBroken(true)} />
      ) : (
        <span className="parceiro-portfolio-favicon-fallback" />
      )}
    </span>
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
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<ProfileFields>(() => toFields(partner));

  useEffect(() => {
    if (open) {
      setFields(toFields(partner));
      setEditing(false);
      setError(null);
      setCepLoading(false);
      setConfirmSaveOpen(false);
    }
  }, [open, partner]);

  const registroHint = partnerRegistroLabel(partner.tipo);
  const inputClass = "h-10 parceiro-info-input";

  const setField = <K extends keyof ProfileFields>(key: K, value: ProfileFields[K]) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const setPortfolioUrlAt = (index: number, value: string) => {
    setFields((prev) => {
      const next = [...prev.portfolioUrls];
      next[index] = value;
      return { ...prev, portfolioUrls: next };
    });
  };

  const addPortfolioUrl = () => {
    setFields((prev) => {
      if (prev.portfolioUrls.length >= MAX_PORTFOLIO_URLS) return prev;
      return { ...prev, portfolioUrls: [...prev.portfolioUrls, ""] };
    });
  };

  const removePortfolioUrl = (index: number) => {
    setFields((prev) => {
      if (prev.portfolioUrls.length <= 1) {
        return { ...prev, portfolioUrls: [""] };
      }
      return {
        ...prev,
        portfolioUrls: prev.portfolioUrls.filter((_, i) => i !== index),
      };
    });
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
    const payload = {
      nome: fields.nome,
      email: fields.email,
      telefone: fields.telefone,
      cep: fields.cep,
      cidade: fields.cidade,
      endereco: fields.endereco,
      escritorio: fields.escritorio,
      registro_profissional: fields.registro_profissional,
      portfolioUrl: serializePortfolioUrls(fields.portfolioUrls) || "",
    };
    const res = await updateParceiroProfileAction(payload);
    setSaving(false);
    setConfirmSaveOpen(false);
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
  const isEmptyDisplay = (value: string) => !value.trim();
  const viewPortfolioUrls = fields.portfolioUrls.map((u) => u.trim()).filter(Boolean);

  const fieldInput = (
    key: Exclude<keyof ProfileFields, "portfolioUrls">,
    opts?: {
      type?: string;
      autoComplete?: string;
      placeholder?: string;
      className?: string;
      valueOverride?: string;
      onChange?: (raw: string) => void;
      inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
    }
  ) => {
    const raw = fields[key];
    const showEmpty = !editing && isEmptyDisplay(raw);
    return (
      <Input
        type={opts?.type || "text"}
        value={
          opts?.valueOverride !== undefined
            ? opts.valueOverride
            : editing
              ? raw
              : display(raw)
        }
        onChange={(e) =>
          opts?.onChange ? opts.onChange(e.target.value) : setField(key, e.target.value)
        }
        className={cn(
          inputClass,
          opts?.className,
          (editing ? !raw.trim() : showEmpty) && "parceiro-info-input-empty"
        )}
        readOnly={!editing}
        tabIndex={editing ? 0 : -1}
        autoComplete={opts?.autoComplete}
        placeholder={editing ? opts?.placeholder : undefined}
        inputMode={opts?.inputMode}
      />
    );
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
        <div className="flex items-start justify-between gap-3 pr-12">
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
              {fieldInput("nome", { autoComplete: "name" })}
            </Field>
            <Field label="E-mail">
              {fieldInput("email", {
                type: editing ? "email" : "text",
                autoComplete: "email",
              })}
            </Field>
            <Field label="Telefone">
              {fieldInput("telefone", { autoComplete: "tel" })}
            </Field>
          </div>

          <SectionDivider />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="CEP">
              <div className="relative">
                {fieldInput("cep", {
                  valueOverride: editing
                    ? formatCepDisplay(fields.cep)
                    : fields.cep
                      ? formatCepDisplay(fields.cep)
                      : "—",
                  onChange: handleCepChange,
                  inputMode: "numeric",
                  placeholder: "00000-000",
                  autoComplete: "postal-code",
                  className: cepLoading ? "pr-9" : undefined,
                })}
                {editing && cepLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
                )}
              </div>
            </Field>
            <Field label="Cidade">
              {editing ? (
                <CityField
                  value={fields.cidade}
                  onChange={(cidade) => setField("cidade", cidade)}
                  selectClassName={cn(inputClass, !fields.cidade.trim() && "parceiro-info-input-empty")}
                  inputClassName={cn(inputClass, !fields.cidade.trim() && "parceiro-info-input-empty")}
                />
              ) : (
                fieldInput("cidade", { autoComplete: "address-level2" })
              )}
            </Field>
            <Field label="Endereço" className="sm:col-span-2">
              {fieldInput("endereco", { autoComplete: "street-address" })}
            </Field>
          </div>

          <SectionDivider />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Empresa / escritório">
              {fieldInput("escritorio")}
            </Field>
            <Field label={registroHint}>
              {fieldInput("registro_profissional", {
                placeholder: "Número do registro",
              })}
            </Field>
            <Field label="Portfólio" className="sm:col-span-2">
              <div className="space-y-2">
                {editing
                  ? fields.portfolioUrls.map((url, index) => {
                      const canAdd =
                        index === fields.portfolioUrls.length - 1 &&
                        fields.portfolioUrls.length < MAX_PORTFOLIO_URLS;
                      const canRemove = fields.portfolioUrls.length > 1;
                      return (
                        <div key={index} className="parceiro-portfolio-row">
                          <PortfolioFavicon url={url} />
                          <Input
                            value={url}
                            onChange={(e) => setPortfolioUrlAt(index, e.target.value)}
                            className={cn(
                              inputClass,
                              "parceiro-portfolio-input",
                              !url.trim() && "parceiro-info-input-empty"
                            )}
                            placeholder="https://..."
                            autoComplete="url"
                          />
                          <div className="parceiro-portfolio-actions">
                            {canRemove ? (
                              <button
                                type="button"
                                className="parceiro-portfolio-icon-btn parceiro-portfolio-icon-btn-remove"
                                aria-label="Remover link"
                                onClick={() => removePortfolioUrl(index)}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            ) : (
                              <span className="parceiro-portfolio-actions-spacer" />
                            )}
                            {canAdd ? (
                              <button
                                type="button"
                                className="parceiro-portfolio-icon-btn parceiro-portfolio-icon-btn-add"
                                aria-label="Adicionar link"
                                onClick={addPortfolioUrl}
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            ) : (
                              <span className="parceiro-portfolio-actions-spacer" />
                            )}
                          </div>
                        </div>
                      );
                    })
                  : viewPortfolioUrls.length > 0
                    ? viewPortfolioUrls.map((url) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="parceiro-portfolio-row parceiro-portfolio-row-link"
                        >
                          <PortfolioFavicon url={url} />
                          <span className="parceiro-portfolio-link-text truncate">{url}</span>
                          <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-55" />
                        </a>
                      ))
                    : (
                        <Input
                          value="—"
                          className={cn(inputClass, "parceiro-info-input-empty")}
                          readOnly
                          tabIndex={-1}
                        />
                      )}
              </div>
            </Field>
          </div>

          {editing && error && (
            <p className="text-xs font-semibold text-rose-600">{error}</p>
          )}

          {editing && (
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <Button
                type="button"
                variant="ghost"
                className="font-bold h-11 btn-cancel-rose-glow hover:bg-transparent"
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
                className="font-bold h-11 btn-metallic btn-parceiro-save gap-1.5"
                disabled={saving || cepLoading}
                onClick={() => {
                  setError(null);
                  setConfirmSaveOpen(true);
                }}
              >
                Salvar
              </Button>
            </div>
          )}
        </div>
      </div>

      <ActionDialog
        open={confirmSaveOpen}
        variant="confirm"
        title="Salvar alterações?"
        message="As informações do seu cadastro serão atualizadas na Móveis Unghero."
        confirmLabel="Salvar"
        cancelLabel="Voltar"
        confirmTone="primary"
        loading={saving}
        onClose={() => {
          if (!saving) setConfirmSaveOpen(false);
        }}
        onConfirm={() => void handleSave()}
      />
    </Dialog>
  );
}
