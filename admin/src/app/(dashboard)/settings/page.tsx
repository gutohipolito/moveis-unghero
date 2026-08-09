"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  Save,
  CheckCircle2,
  Info,
  HardDrive,
  ImageIcon,
  FileText,
  ShieldAlert,
  MapPin,
  Phone,
  Mail,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import InfoTooltip, { TooltipBody } from "@/components/ui/InfoTooltip";
import SettingsSectionTabs from "@/components/settings/SettingsSectionTabs";
import { getStorageUsageAction, type StorageUsage } from "@/app/actions/storage";
import { usePermissions } from "@/context/PermissionsContext";
import { EMAIL_SIGNATURE_BRAND } from "@/lib/emailSignature";
import { cn } from "@/lib/utils";

/** Referência do plano Vercel Blob (armazenamento incluído) para o medidor de uso. */
const STORAGE_REFERENCE_BYTES = 5 * 1024 * 1024 * 1024;

/** Dados oficiais — alinhados a orçamentos, contratos e assinatura de e-mail. */
const COMPANY_DEFAULTS = {
  razaoSocial: "Móveis Unghero LTDA",
  cnpj: "13.415.510/0001-71",
  telefone: EMAIL_SIGNATURE_BRAND.whatsappDisplay,
  email: "moveisunghero@gmail.com",
  endereco: `${EMAIL_SIGNATURE_BRAND.addressLines[0]} — ${EMAIL_SIGNATURE_BRAND.addressLines[1]}`,
  cep: "95170-308",
  site: EMAIL_SIGNATURE_BRAND.siteDisplay,
};

const LS_KEYS = {
  razaoSocial: "settings-razao-social",
  cnpj: "settings-cnpj",
  telefone: "settings-telefone",
  email: "settings-email",
  endereco: "settings-endereco",
  cep: "settings-cep",
  site: "settings-site",
} as const;

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 MB";
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
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

const inputClass =
  "w-full h-10 px-3 rounded-[var(--radius-sm)] border border-border bg-background text-sm font-medium text-foreground placeholder:text-muted-foreground transition-[border-color,box-shadow] focus:outline-none focus:border-primary/55 focus:ring-2 focus:ring-primary/15";

export default function SettingsPage() {
  const { isAdmin } = usePermissions();

  const [razaoSocial, setRazaoSocial] = useState(String(COMPANY_DEFAULTS.razaoSocial));
  const [cnpj, setCnpj] = useState(String(COMPANY_DEFAULTS.cnpj));
  const [telefone, setTelefone] = useState(String(COMPANY_DEFAULTS.telefone));
  const [email, setEmail] = useState(String(COMPANY_DEFAULTS.email));
  const [endereco, setEndereco] = useState(String(COMPANY_DEFAULTS.endereco));
  const [cep, setCep] = useState(String(COMPANY_DEFAULTS.cep));
  const [site, setSite] = useState(String(COMPANY_DEFAULTS.site));

  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const [storage, setStorage] = useState<StorageUsage | null>(null);
  const [storageLoading, setStorageLoading] = useState(true);

  useEffect(() => {
    const read = (key: string, fallback: string) => {
      try {
        return localStorage.getItem(key) || fallback;
      } catch {
        return fallback;
      }
    };
    setRazaoSocial(read(LS_KEYS.razaoSocial, COMPANY_DEFAULTS.razaoSocial));
    setCnpj(read(LS_KEYS.cnpj, COMPANY_DEFAULTS.cnpj));
    setTelefone(read(LS_KEYS.telefone, COMPANY_DEFAULTS.telefone));
    setEmail(read(LS_KEYS.email, COMPANY_DEFAULTS.email));
    setEndereco(read(LS_KEYS.endereco, COMPANY_DEFAULTS.endereco));
    setCep(read(LS_KEYS.cep, COMPANY_DEFAULTS.cep));
    setSite(read(LS_KEYS.site, COMPANY_DEFAULTS.site));
  }, []);

  useEffect(() => {
    let active = true;
    getStorageUsageAction()
      .then((res) => {
        if (!active) return;
        setStorage(res.success ? res.usage : null);
      })
      .catch(() => {
        if (active) setStorage(null);
      })
      .finally(() => {
        if (active) setStorageLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setSucesso(false);

    try {
      localStorage.setItem(LS_KEYS.razaoSocial, razaoSocial.trim());
      localStorage.setItem(LS_KEYS.cnpj, cnpj.trim());
      localStorage.setItem(LS_KEYS.telefone, telefone.trim());
      localStorage.setItem(LS_KEYS.email, email.trim());
      localStorage.setItem(LS_KEYS.endereco, endereco.trim());
      localStorage.setItem(LS_KEYS.cep, cep.trim());
      localStorage.setItem(LS_KEYS.site, site.trim());
    } catch {
      // ignore quota / private mode
    }

    window.setTimeout(() => {
      setSalvando(false);
      setSucesso(true);
      window.setTimeout(() => setSucesso(false), 3000);
    }, 500);
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">Configurações</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Equipe, permissões e cadastros do sistema.
          </p>
        </div>
        <SettingsSectionTabs />
        <div className="max-w-2xl mx-auto">
          <div className="bg-card border border-border rounded-[var(--radius-md)] shadow-sm p-8 text-center space-y-3">
            <div className="mx-auto h-12 w-12 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center">
              <ShieldAlert className="h-6 w-6 text-amber-600" />
            </div>
            <h2 className="text-lg font-black text-slate-800">Acesso restrito</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Os dados da empresa estão disponíveis apenas para a Diretoria. Use as abas acima
              para as áreas liberadas ao seu cargo.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const storagePct = storage
    ? Math.min(100, (storage.totalBytes / STORAGE_REFERENCE_BYTES) * 100)
    : 0;
  const storageBarColor =
    storagePct >= 90 ? "bg-red-500" : storagePct >= 70 ? "bg-amber-500" : "bg-primary";

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-black tracking-tight text-slate-800">Configurações</h1>
          <InfoTooltip label="Sobre Configurações">
            <TooltipBody
              title="Configurações"
              items={[
                "Dados institucionais da Móveis Unghero usados como referência no painel.",
                "Acompanhe o uso de armazenamento de fotos e documentos.",
                "Nas abas: colaboradores, permissões e cadastros do sistema.",
              ]}
            />
          </InfoTooltip>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Empresa, equipe, permissões e listas configuráveis do sistema.
        </p>
      </div>

      <SettingsSectionTabs />

      <form onSubmit={handleSave} className="space-y-5">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
          {/* Dados da empresa */}
          <section className="bg-card border border-border rounded-[var(--radius-md)] shadow-sm overflow-hidden">
            <div className="flex items-start gap-3 px-5 sm:px-6 py-4 border-b border-border/80 bg-muted/25">
              <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10 text-primary shrink-0">
                <Building2 className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-black text-slate-800 tracking-tight">
                  Dados da empresa
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  Informações oficiais da Móveis Unghero (fábrica em Farroupilha-RS).
                </p>
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Field label="Razão social" className="sm:col-span-2">
                  <input
                    type="text"
                    value={razaoSocial}
                    onChange={(e) => setRazaoSocial(e.target.value)}
                    className={inputClass}
                    autoComplete="organization"
                  />
                </Field>

                <Field label="CNPJ">
                  <input
                    type="text"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    className={inputClass}
                    inputMode="numeric"
                  />
                </Field>

                <Field label="CEP">
                  <input
                    type="text"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    className={inputClass}
                    inputMode="numeric"
                  />
                </Field>

                <Field label="WhatsApp" className="sm:col-span-1">
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      className={cn(inputClass, "pl-9")}
                    />
                  </div>
                </Field>

                <Field label="E-mail">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={cn(inputClass, "pl-9")}
                    />
                  </div>
                </Field>

                <Field label="Site" className="sm:col-span-2">
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      value={site}
                      onChange={(e) => setSite(e.target.value)}
                      className={cn(inputClass, "pl-9")}
                    />
                  </div>
                </Field>

                <Field label="Endereço da fábrica" className="sm:col-span-2">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      value={endereco}
                      onChange={(e) => setEndereco(e.target.value)}
                      className={cn(inputClass, "pl-9")}
                    />
                  </div>
                </Field>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
                <div className="min-h-[2.25rem] flex items-center">
                  {sucesso && (
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-[var(--radius-sm)]">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Dados salvos neste dispositivo
                    </div>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={salvando}
                  className="btn-metallic border-none font-bold h-10 px-4 shrink-0"
                >
                  {salvando ? (
                    <>
                      <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Salvando…
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Salvar dados
                    </>
                  )}
                </Button>
              </div>
            </div>
          </section>

          {/* Armazenamento */}
          <section className="bg-card border border-border rounded-[var(--radius-md)] shadow-sm overflow-hidden">
            <div className="flex items-start gap-3 px-5 sm:px-6 py-4 border-b border-border/80 bg-muted/25">
              <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10 text-primary shrink-0">
                <HardDrive className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-black text-slate-800 tracking-tight">
                  Armazenamento
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  Fotos e documentos anexados aos clientes (Vercel Blob).
                </p>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              {storageLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium py-8 justify-center">
                  <div className="h-4 w-4 border-2 border-border border-t-primary rounded-full animate-spin" />
                  Calculando uso…
                </div>
              ) : storage ? (
                <div className="space-y-5">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-2xl font-black text-slate-800 tracking-tight tabular-nums">
                        {formatBytes(storage.totalBytes)}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                        de {formatBytes(STORAGE_REFERENCE_BYTES)} de referência (
                        {storagePct.toFixed(1)}%)
                      </p>
                    </div>
                    <span className="text-xs font-bold text-slate-600 bg-muted px-3 py-1.5 rounded-[var(--radius-sm)] tabular-nums">
                      {storage.fileCount} arquivo{storage.fileCount === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", storageBarColor)}
                      style={{ width: `${Math.max(storagePct, storage.totalBytes > 0 ? 1 : 0)}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2.5 rounded-[var(--radius-sm)] border border-border bg-muted/30 px-3.5 py-3">
                      <ImageIcon className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <p className="text-sm font-black text-slate-800 leading-none tabular-nums">
                          {storage.imageCount}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-1">
                          Fotos
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 rounded-[var(--radius-sm)] border border-border bg-muted/30 px-3.5 py-3">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <p className="text-sm font-black text-slate-800 leading-none tabular-nums">
                          {storage.docCount}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-1">
                          Documentos
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-3.5 rounded-[var(--radius-sm)] border border-border bg-muted/20 text-[11px] text-muted-foreground font-medium leading-relaxed">
                    <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>
                      Imagens são otimizadas no upload. A referência de{" "}
                      {formatBytes(STORAGE_REFERENCE_BYTES)} é o incluído no plano; acima disso, o
                      excedente é cobrado por uso.
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Não foi possível carregar o uso de armazenamento.
                </p>
              )}
            </div>
          </section>
        </div>
      </form>
    </div>
  );
}
