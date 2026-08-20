"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  Eye,
  EyeOff,
  FileText,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import type { ProjectStatus } from "@/app/actions/kanban";
import { Button } from "@/components/ui/button";
import { PrivacyMoney } from "@/components/privacy/PrivacyMoney";
import { useSensitiveDisplay } from "@/hooks/useSensitiveDisplay";
import {
  getDaysSinceContact,
  getFollowUpLevel,
  getFollowUpMessage,
  type FollowUpSlaConfig,
} from "@/lib/followUp";
import { labelOrigin } from "@/lib/navLabels";
import { navigateApp } from "@/lib/navigateApp";
import { formatQuoteViewLabel } from "@/lib/quoteViewTracking";
import { cn } from "@/lib/utils";

export type NegotiationLeadForm = {
  nome: string;
  email: string;
  telefone: string;
  cidade: string;
  origem: string;
  valor_previsto: string;
  [key: string]: string;
};

export type NegotiationTimelineItem = {
  id?: string;
  acao: string;
  data: string;
  user?: { name?: string | null } | null;
};

export type NegotiationProject = {
  id: string;
  status_geral: string;
  valor_previsto: number;
  ultimo_contato_em?: string | null;
  createdAt?: string | null;
  observacoes?: string | null;
  client: {
    id?: string;
    nome: string;
    telefone: string;
    email: string;
    cidade: string;
    origem: string;
  };
  quoteShare?: {
    sharedAt: string | null;
    viewCount: number;
    firstViewedAt: string | null;
    lastViewedAt: string | null;
    neverOpened: boolean;
    lastDevice?: string | null;
    lastOs?: string | null;
    lastDeviceLabel?: string | null;
  } | null;
  briefing?: { score: number; roteiro_sugerido?: string | null } | null;
};

const STATUS_OPTIONS: { id: ProjectStatus; title: string }[] = [
  { id: "LEAD", title: "Prospecção" },
  { id: "ORCAMENTO", title: "Orçamentos" },
  { id: "NEGOCIACAO", title: "Negociação" },
  { id: "APROVADO", title: "Aprovados" },
  { id: "CONFERENCIA_TECNICA", title: "Conf. Técnica" },
  { id: "PRODUCAO", title: "Produção" },
];

interface KanbanNegotiationPanelProps {
  project: NegotiationProject;
  leadForm: NegotiationLeadForm;
  editingStatusGeral: ProjectStatus;
  setEditingStatusGeral: (status: ProjectStatus) => void;
  editingObservacoes: string;
  setEditingObservacoes: (value: string) => void;
  timeline: NegotiationTimelineItem[];
  newTimelineText: string;
  setNewTimelineText: (value: string) => void;
  onAddTimeline: (e: React.FormEvent) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  onMarkContacted: () => void;
  onMarkLost?: () => void;
  followUpSla: FollowUpSlaConfig;
  loading: boolean;
  isReadOnly: boolean;
  displayPhone: string;
  displayEmail: string;
  whatsappHref: string | null;
  /** Sem abas no topo: reserva espaço sob o X de fechar no mobile. */
  reserveCloseSpace?: boolean;
  /** Destaca o campo de observações (ex.: observação não lida). */
  highlightObservacoes?: boolean;
}

function formatAbsoluteDate(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function KanbanNegotiationPanel({
  project,
  leadForm,
  editingStatusGeral,
  setEditingStatusGeral,
  editingObservacoes,
  setEditingObservacoes,
  timeline,
  newTimelineText,
  setNewTimelineText,
  onAddTimeline,
  onSubmit,
  onClose,
  onMarkContacted,
  onMarkLost,
  followUpSla,
  loading,
  isReadOnly,
  displayPhone,
  displayEmail,
  whatsappHref,
  reserveCloseSpace = false,
  highlightObservacoes = false,
}: KanbanNegotiationPanelProps) {
  const [timelineOpen, setTimelineOpen] = useState(false);
  const sensitive = useSensitiveDisplay();

  const daysSilent = getDaysSinceContact(project);
  const followLevel = getFollowUpLevel(project, followUpSla);
  const followMessage = getFollowUpMessage(project, followUpSla);
  const quoteLabel = project.quoteShare
    ? formatQuoteViewLabel({
        sharedAt: project.quoteShare.sharedAt,
        viewCount: project.quoteShare.viewCount,
        firstViewedAt: project.quoteShare.firstViewedAt,
        lastViewedAt: project.quoteShare.lastViewedAt,
        neverOpened: project.quoteShare.neverOpened,
        lastDevice: project.quoteShare.lastDevice ?? null,
        lastOs: project.quoteShare.lastOs ?? null,
        lastDeviceLabel: project.quoteShare.lastDeviceLabel ?? null,
      })
    : null;

  const statusSelectOptions = useMemo(() => {
    const opts = [...STATUS_OPTIONS];
    if (!opts.some((o) => o.id === editingStatusGeral)) {
      opts.push({ id: editingStatusGeral, title: editingStatusGeral });
    }
    return opts;
  }, [editingStatusGeral]);

  const followTone =
    followLevel === "loss" || followLevel === "alert"
      ? "danger"
      : followLevel === "warning"
        ? "warn"
        : "ok";

  return (
    <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0 h-full">
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
      {/* Hero */}
      <div
        className={cn(
          "relative overflow-hidden border-b border-white/10 px-5 pb-4 sm:px-6 sm:pt-6 sm:pb-5 text-white bg-[linear-gradient(180deg,hsl(222_24%_12%)_0%,hsl(224_28%_7%)_55%,hsl(226_30%_5%)_100%)]",
          reserveCloseSpace
            ? "pt-[max(3.5rem,calc(env(safe-area-inset-top,0px)+2.75rem))] sm:pt-6"
            : "pt-5"
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(90% 60% at 80% -10%, hsl(38 90% 48% / 0.22), transparent 55%)",
          }}
        />
        <div className="relative space-y-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
                Negociação
              </p>
              <h3 className="text-xl sm:text-2xl font-semibold tracking-tight leading-tight truncate pr-2">
                {leadForm.nome || project.client.nome}
              </h3>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-white/65">
                <span className="inline-flex items-center gap-1 min-w-0">
                  <MapPin className="h-3 w-3 shrink-0 opacity-70" />
                  <span className="truncate">{leadForm.cidade}</span>
                </span>
                <span className="opacity-35">·</span>
                <span className="uppercase tracking-wide font-semibold text-white/55">
                  {labelOrigin(leadForm.origem)}
                </span>
              </div>
            </div>

            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold px-3.5 py-2 shadow-[0_8px_24px_-8px_rgba(16,185,129,0.7)] transition-colors"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </a>
            ) : (
              <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-white/10 text-white/50 text-xs font-semibold px-3.5 py-2">
                <Phone className="h-3.5 w-3.5" />
                {displayPhone}
              </span>
            )}
          </div>

          {followLevel !== "ok" ? (
            <div
              className={cn(
                "flex items-start gap-2 rounded-xl px-3 py-2.5 text-[11px] leading-snug border",
                followTone === "danger" &&
                  "bg-rose-500/15 border-rose-400/25 text-rose-100",
                followTone === "warn" &&
                  "bg-amber-500/15 border-amber-400/25 text-amber-50"
              )}
            >
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 opacity-90" />
              <div className="min-w-0">
                <p className="font-bold">
                  Sem resposta há {daysSilent} dia{daysSilent === 1 ? "" : "s"}
                </p>
                {followMessage ? (
                  <p className="opacity-80 mt-0.5">{followMessage}</p>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-white/50">
              Último contato há {daysSilent} dia{daysSilent === 1 ? "" : "s"}
            </p>
          )}
        </div>
      </div>

      <div className="px-5 py-4 sm:px-6 sm:py-5 space-y-4 bg-[linear-gradient(180deg,#f8f7f5_0%,#f3f1ed_100%)]">
        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <div className="rounded-2xl border border-black/5 bg-white/80 backdrop-blur-sm px-3.5 py-3 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset]">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Valor previsto
            </p>
            <PrivacyMoney
              value={Number(leadForm.valor_previsto) || project.valor_previsto || 0}
              className="text-sm font-black text-slate-900"
            />
          </div>
          <div className="rounded-2xl border border-black/5 bg-white/80 backdrop-blur-sm px-3.5 py-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Contato
            </p>
            <p className="text-sm font-bold text-slate-900 truncate">{displayPhone}</p>
            <p className="text-[10px] text-slate-500 truncate mt-0.5">{displayEmail}</p>
          </div>
          <div className="col-span-2 sm:col-span-1 rounded-2xl border border-black/5 bg-white/80 backdrop-blur-sm px-3.5 py-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Etapa
            </p>
            <select
              value={editingStatusGeral}
              onChange={(e) => setEditingStatusGeral(e.target.value as ProjectStatus)}
              disabled={isReadOnly}
              className="w-full h-8 bg-transparent text-sm font-bold text-slate-900 outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {statusSelectOptions.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quote intelligence */}
        <section className="rounded-2xl border border-black/5 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100/80">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 shrink-0">
                <FileText className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900">Orçamento compartilhado</p>
                <p className="text-[10px] text-slate-500 truncate">
                  Status de abertura da proposta enviada ao cliente
                </p>
              </div>
            </div>
          </div>

          <div className="px-4 py-3.5 space-y-2.5">
            {project.quoteShare?.sharedAt ? (
              <>
                <div className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      "mt-0.5 flex h-7 w-7 items-center justify-center rounded-full shrink-0",
                      project.quoteShare.neverOpened
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                    )}
                  >
                    {project.quoteShare.neverOpened ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900">
                      {quoteLabel || "Proposta compartilhada"}
                    </p>
                    <div className="mt-1 space-y-0.5 text-[11px] text-slate-500">
                      {project.quoteShare.sharedAt ? (
                        <p>
                          Enviado em{" "}
                          <span className="font-semibold text-slate-700">
                            {formatAbsoluteDate(project.quoteShare.sharedAt)}
                          </span>
                        </p>
                      ) : null}
                      {project.quoteShare.neverOpened ? (
                        <p className="text-amber-700 font-medium">
                          O cliente ainda não abriu o link da proposta.
                        </p>
                      ) : project.quoteShare.firstViewedAt &&
                        project.quoteShare.viewCount > 1 ? (
                        <p>
                          Primeira abertura{" "}
                          <span className="font-semibold text-slate-700">
                            {formatAbsoluteDate(project.quoteShare.firstViewedAt)}
                          </span>
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-start gap-2.5 text-[12px] text-slate-600">
                <CalendarClock className="h-4 w-4 mt-0.5 text-slate-400 shrink-0" />
                <p>
                  Ainda não há proposta compartilhada neste card. Gere o orçamento no projeto e
                  envie o link ao cliente para acompanhar as aberturas aqui.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Observações */}
        <div>
          <label
            className={cn(
              "text-[10px] font-bold uppercase tracking-wider block mb-1.5",
              highlightObservacoes ? "text-sky-700" : "text-slate-400"
            )}
          >
            Observações da negociação
            {highlightObservacoes ? (
              <span className="ml-1.5 normal-case tracking-normal font-semibold text-sky-600">
                · nova
              </span>
            ) : null}
          </label>
          <textarea
            value={editingObservacoes}
            onChange={(e) => setEditingObservacoes(e.target.value)}
            rows={2}
            disabled={isReadOnly}
            placeholder="Anotações rápidas para a próxima conversa…"
            className={cn(
              "w-full p-3 text-xs bg-white rounded-xl outline-none font-medium resize-none leading-relaxed disabled:opacity-60 border",
              highlightObservacoes
                ? "border-sky-400 ring-2 ring-sky-200/70 focus:ring-sky-400/50"
                : "border-slate-200 focus:ring-1 focus:ring-amber-500/40"
            )}
          />
        </div>

        {/* Timeline collapsed */}
        <div className="rounded-2xl border border-black/5 bg-white overflow-hidden">
          <button
            type="button"
            onClick={() => setTimelineOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50/80 transition-colors"
          >
            <div>
              <p className="text-xs font-bold text-slate-900">Histórico da venda</p>
              <p className="text-[10px] text-slate-500">
                {timeline.length === 0
                  ? "Nenhuma anotação ainda"
                  : `${timeline.length} registro${timeline.length === 1 ? "" : "s"}`}
              </p>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-slate-400 transition-transform duration-200",
                timelineOpen && "rotate-180"
              )}
            />
          </button>

          {timelineOpen ? (
            <div className="border-t border-slate-100 px-4 py-3 space-y-3">
              {!isReadOnly ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTimelineText}
                    onChange={(e) => setNewTimelineText(e.target.value)}
                    placeholder="Registrar conversa ou follow-up…"
                    className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500/40 outline-none font-medium"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        onAddTimeline(e);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={onAddTimeline}
                    disabled={loading || !newTimelineText.trim()}
                    className="px-3 h-9 text-xs font-bold shrink-0"
                  >
                    Salvar
                  </Button>
                </div>
              ) : null}

              <div className="max-h-44 overflow-y-auto space-y-2.5 pr-0.5">
                {timeline.length === 0 ? (
                  <p className="text-center py-3 text-[11px] text-slate-400">
                    O histórico aparece aqui conforme você registra contatos.
                  </p>
                ) : (
                  timeline.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="border-l-2 border-amber-400/50 pl-3 py-0.5"
                    >
                      <p className="text-xs font-medium text-slate-800 leading-snug">
                        {sensitive.text(item.acao)}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                        {new Date(item.data).toLocaleString("pt-BR")}
                        {item.user?.name ? ` · ${item.user.name}` : ""}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      </div>

      {/* Footer fixo — abaixo do scroll; safe-area para home indicator (modal cobre o bottom nav). */}
      <div className="shrink-0 z-10 border-t border-slate-200/80 bg-white px-5 pt-3.5 sm:px-6 sm:pt-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom,0px))]">
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="flex flex-wrap gap-2">
            {!isReadOnly ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  onClick={onMarkContacted}
                  className="text-xs font-bold h-10 sm:h-9 flex-1 sm:flex-none"
                >
                  Registrar contato
                </Button>
                {onMarkLost ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={onMarkLost}
                    className="text-xs font-bold h-10 sm:h-9 text-rose-700 border-rose-200 hover:bg-rose-50 flex-1 sm:flex-none"
                  >
                    Marcar perda
                  </Button>
                ) : null}
              </>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigateApp(`/projects/${project.id}?back=/crm`)}
              className="text-xs font-bold h-10 sm:h-9 flex-1 sm:flex-none"
            >
              Ver projeto
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="text-xs font-bold h-10 sm:h-9 flex-1 sm:flex-none"
            >
              {isReadOnly ? "Fechar" : "Cancelar"}
            </Button>
            {!isReadOnly ? (
              <Button
                type="submit"
                disabled={loading}
                className="text-xs font-bold h-10 sm:h-9 flex-1 sm:flex-none bg-[hsl(28_85%_42%)] hover:bg-[hsl(28_85%_36%)] text-white border-none"
              >
                {loading ? "Salvando…" : "Salvar"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </form>
  );
}
