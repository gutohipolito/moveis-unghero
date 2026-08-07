"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  FileText,
  Globe,
  Layers,
  Mail,
  MapPin,
  Percent,
  Phone,
  User,
} from "lucide-react";
import type { ParceiroDTO } from "@/app/actions/parceiros";
import {
  getPartnerCommissionTotals,
} from "@/app/actions/partnerCommissions";
import PartnerCommissionsTab from "@/components/PartnerCommissionsTab";
import ParceiroComprovantesTab from "@/components/ParceiroComprovantesTab";
import { ActionDialogHost, useActionDialog } from "@/components/ActionDialogHost";
import { Card } from "@/components/ui/card";
import HowToAccordion from "@/components/ui/HowToAccordion";
import { PrivacyMoney } from "@/components/privacy/PrivacyMoney";
import { usePrivacy } from "@/context/PrivacyContext";
import { usePermissions } from "@/context/PermissionsContext";
import { canManageParceiros } from "@/lib/permissions";
import { useSensitiveDisplay } from "@/hooks/useSensitiveDisplay";
import {
  PARTNER_TYPE_STYLES,
  formatPartnerRegistro,
  getPartnerRoleLabel,
} from "@/lib/partnerTypes";
import { primaryPortfolioUrl } from "@/lib/portfolioUrls";

type DetailTab = "overview" | "projects" | "comissoes" | "comprovantes";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function projectStatusClass(status: string) {
  if (status === "APROVADO" || status === "FINALIZADO") {
    return "bg-emerald-50 text-emerald-700 border-emerald-100";
  }
  if (
    status === "LEAD" ||
    status === "ORCAMENTO" ||
    status === "NEGOCIACAO"
  ) {
    return "bg-blue-50 text-blue-700 border-blue-100";
  }
  if (
    status === "PRODUCAO" ||
    status === "INSTALACAO" ||
    status === "CONFERENCIA_TECNICA"
  ) {
    return "bg-amber-50/70 text-amber-700 border-amber-100";
  }
  return "bg-slate-50 text-slate-700 border-slate-200";
}

interface ParceiroDetailsClientProps {
  initialParceiro: ParceiroDTO;
  companyId: string;
}

export default function ParceiroDetailsClient({
  initialParceiro,
}: ParceiroDetailsClientProps) {
  const searchParams = useSearchParams();
  const dialog = useActionDialog();
  const { showSuccess, showError, confirmAction } = dialog;
  const { privacyMode, privacyLocked } = usePrivacy();
  const { isOpsLimited, role, isReadOnly } = usePermissions();
  const sensitive = useSensitiveDisplay();
  const canManage = canManageParceiros(role);

  const [parceiro] = useState(initialParceiro);
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [commissionTotals, setCommissionTotals] = useState<{
    pendente: number;
    pago: number;
  } | null>(null);

  const hidePartnerValues = isOpsLimited;
  const effectivePrivacyMode = isOpsLimited
    ? false
    : privacyLocked || isReadOnly || privacyMode;

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (
      tab === "overview" ||
      tab === "projects" ||
      tab === "comissoes" ||
      tab === "comprovantes"
    ) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (isOpsLimited && (activeTab === "comissoes" || activeTab === "comprovantes")) {
      setActiveTab("overview");
    }
  }, [isOpsLimited, activeTab]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await getPartnerCommissionTotals(parceiro.id);
      if (cancelled) return;
      if (res.success) {
        setCommissionTotals({ pendente: res.pendente, pago: res.pago });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [parceiro.id]);

  const style = PARTNER_TYPE_STYLES[parceiro.tipo];
  const Icon = style.icon;
  const registroLabel = formatPartnerRegistro(
    parceiro.tipo,
    parceiro.registro_profissional
  );
  const projects = parceiro.projects ?? [];
  const projectCount = projects.length;
  const totalLinkedValue = projects.reduce(
    (sum, proj) => sum + Number(proj.valor_previsto || 0),
    0
  );
  const imagesList = parceiro.imagens
    ? parceiro.imagens.split(",").filter(Boolean)
    : [];
  const portfolio = primaryPortfolioUrl(parceiro.portfolioUrl);

  const tabs: { id: DetailTab; label: string; icon: React.ReactNode; hide?: boolean }[] = [
    { id: "overview", label: "Visão geral", icon: <User className="h-3.5 w-3.5" /> },
    {
      id: "projects",
      label: `Projetos (${projectCount})`,
      icon: <Layers className="h-3.5 w-3.5" />,
    },
    {
      id: "comissoes",
      label: "Comissões",
      icon: <Percent className="h-3.5 w-3.5" />,
      hide: isOpsLimited,
    },
    {
      id: "comprovantes",
      label: "Comprovantes",
      icon: <FileText className="h-3.5 w-3.5" />,
      hide: isOpsLimited,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/parceiros"
          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-muted-foreground transition-all flex items-center justify-center cursor-pointer"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </Link>
        <span className="text-xs font-bold text-muted-foreground">
          Voltar para Projetistas e Arquitetos
        </span>
      </div>

      <Card className="p-6 glass-card space-y-5">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
          <div className="partner-card-avatar relative flex h-20 w-auto min-w-20 max-w-36 shrink-0">
            {parceiro.fotoUrl ? (
              <img
                src={parceiro.fotoUrl}
                alt={parceiro.nome}
                className="h-full w-auto max-w-36 object-contain"
              />
            ) : (
              <div className="partner-card-avatar-fallback h-20 w-20 text-2xl rounded-[inherit]">
                {getInitials(parceiro.nome)}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1
                className={`text-2xl font-display font-bold text-foreground tracking-tight ${
                  effectivePrivacyMode ? "blur-[6px] select-none" : ""
                }`}
              >
                {parceiro.nome}
              </h1>
              {!parceiro.ativo && (
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                  Inativo
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="partner-card-badge text-[10px] px-2.5 py-0.5">
                <Icon className="h-3 w-3" />
                {getPartnerRoleLabel(parceiro.tipo, parceiro.nome)}
              </span>
              {parceiro.cidade && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-muted-foreground bg-white/80 px-2.5 py-0.5 rounded-full border border-border/60">
                  <MapPin className="h-3 w-3" />
                  {parceiro.cidade}
                </span>
              )}
              {registroLabel && (
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {registroLabel}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {parceiro.telefone && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {sensitive.phone(parceiro.telefone)}
                </span>
              )}
              {parceiro.email && (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {sensitive.email(parceiro.email)}
                </span>
              )}
              {parceiro.escritorio && (
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  {parceiro.escritorio}
                </span>
              )}
              {portfolio && (
                <a
                  href={portfolio}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-primary font-bold hover:underline"
                >
                  <Globe className="h-3.5 w-3.5" />
                  Portfólio
                </a>
              )}
            </div>
          </div>

          {!hidePartnerValues && (
            <div className="grid grid-cols-2 gap-3 w-full md:w-auto md:min-w-[240px]">
              <div className="rounded-xl border border-border/60 bg-white/70 px-3 py-2.5">
                <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                  A pagar
                </p>
                <PrivacyMoney
                  value={commissionTotals?.pendente ?? 0}
                  as="p"
                  className="text-sm font-bold tabular-nums"
                />
              </div>
              <div className="rounded-xl border border-border/60 bg-white/70 px-3 py-2.5">
                <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                  Já pagas
                </p>
                <PrivacyMoney
                  value={commissionTotals?.pago ?? 0}
                  as="p"
                  className="text-sm font-bold tabular-nums"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-slate-100/80 w-fit max-w-full overflow-x-auto">
          {tabs
            .filter((t) => !t.hide)
            .map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-white text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
        </div>
      </Card>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5 space-y-3">
            <HowToAccordion title="Como usar esta ficha" tone="neutral">
              <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed">
                <li>
                  Em <strong className="text-foreground">Comissões</strong>, lance o % depois que o
                  orçamento do cliente for aprovado.
                </li>
                <li>
                  Quando pagar o parceiro, marque como paga na mesma aba.
                </li>
                <li>
                  Em <strong className="text-foreground">Comprovantes</strong>, reabra os documentos
                  já emitidos para imprimir ou enviar ao parceiro.
                </li>
              </ol>
            </HowToAccordion>
            {!hidePartnerValues && (
              <div className="pt-1 space-y-2">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                  Projetos no CRM
                </p>
                <p className="text-2xl font-display font-bold">{projectCount}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                  Total previsto
                </p>
                <PrivacyMoney
                  value={totalLinkedValue}
                  as="p"
                  className="text-xl font-display font-bold text-gradient-gold"
                />
              </div>
            )}
          </Card>

          <Card className="p-5 space-y-3">
            <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
              Observações internas
            </h3>
            {parceiro.observacoes ? (
              <p className="text-xs text-foreground/80 leading-relaxed italic bg-slate-50 border border-slate-100 rounded-xl p-3.5">
                “{parceiro.observacoes}”
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Nenhuma observação cadastrada. Edite o parceiro na lista para incluir.
              </p>
            )}

            <div className="pt-2 border-t border-border/40 space-y-2">
              <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                Galeria ({imagesList.length})
              </h3>
              {imagesList.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Sem fotos. Adicione pela lista de parceiros (ícone na card).
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {imagesList.map((img, idx) => (
                    <div
                      key={img}
                      className="aspect-square rounded-xl overflow-hidden border border-slate-100 bg-slate-50"
                    >
                      <img
                        src={img}
                        alt={`Foto ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {activeTab === "projects" && (
        <Card className="p-5 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">Projetos vinculados no CRM</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Clique no projeto para abrir o card no CRM e acompanhar o andamento.
            </p>
          </div>
          {projects.length === 0 ? (
            <div className="py-10 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
              Nenhum projeto vinculado a este parceiro ainda.
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map((proj) => (
                <Link
                  key={proj.id}
                  href={`/crm?project=${proj.id}`}
                  className="flex items-center justify-between p-3 rounded-xl border border-border/60 hover:border-border bg-card hover:bg-slate-50/80 transition-all text-xs"
                >
                  <div className="min-w-0 pr-3">
                    <p className="font-bold text-foreground truncate">{proj.client.nome}</p>
                    {!hidePartnerValues && (
                      <p className="text-[10px] text-muted-foreground font-bold mt-0.5 privacy-value">
                        {Number(proj.valor_previsto || 0).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${projectStatusClass(
                      proj.status_geral
                    )}`}
                  >
                    {proj.status_geral}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === "comissoes" && !isOpsLimited && (
        <PartnerCommissionsTab
          initialPartnerId={parceiro.id}
          lockPartnerId
          canManage={canManage}
          showSuccess={showSuccess}
          showError={showError}
          confirmAction={confirmAction}
        />
      )}

      {activeTab === "comprovantes" && !isOpsLimited && (
        <ParceiroComprovantesTab partnerId={parceiro.id} />
      )}

      <ActionDialogHost dialog={dialog} />
    </div>
  );
}
