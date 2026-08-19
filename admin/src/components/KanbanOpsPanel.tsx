"use client";

import React from "react";
import {
  ExternalLink,
  MapPin,
  MessageCircle,
  Layers,
} from "lucide-react";
import type { ProjectStatus } from "@/app/actions/kanban";
import { Button } from "@/components/ui/button";
import { OPS_FUNNEL_COLUMNS } from "@/lib/crmOpsAccess";
import { navigateApp } from "@/lib/navigateApp";
import { cn } from "@/lib/utils";

export type OpsLeadForm = {
  nome: string;
  email: string;
  telefone: string;
  cidade: string;
  [key: string]: string;
};

interface KanbanOpsPanelProps {
  project: {
    id: string;
    status_geral: string;
    client: { id?: string; nome: string; cidade: string };
    conf_tecnica_resp1Nome?: string | null;
    conf_tecnica_resp2Nome?: string | null;
  };
  leadForm: OpsLeadForm;
  editingStatusGeral: ProjectStatus;
  setEditingStatusGeral: (status: ProjectStatus) => void;
  editingObservacoes: string;
  setEditingObservacoes: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  loading: boolean;
  isReadOnly: boolean;
  /** Marceneiro: etapa/observações só leitura. */
  isFactoryRole?: boolean;
  /** Projetista/Marceneiro: sem telefone/e-mail/WhatsApp do cliente. */
  hideClientContact?: boolean;
  displayPhone: string;
  displayEmail: string;
  whatsappHref: string | null;
  reserveCloseSpace?: boolean;
}

export default function KanbanOpsPanel({
  project,
  leadForm,
  editingStatusGeral,
  setEditingStatusGeral,
  editingObservacoes,
  setEditingObservacoes,
  onSubmit,
  onClose,
  loading,
  isReadOnly,
  isFactoryRole = false,
  hideClientContact = false,
  displayPhone,
  displayEmail,
  whatsappHref,
  reserveCloseSpace = false,
}: KanbanOpsPanelProps) {
  const stageTitle =
    OPS_FUNNEL_COLUMNS.find((o) => o.id === editingStatusGeral)?.title ||
    editingStatusGeral;
  const stageLocked = isReadOnly || isFactoryRole || hideClientContact;
  // Projetista: salva observações, mas não muda etapa.
  const canSave = !isReadOnly && !isFactoryRole;
  const showClientContact = !isFactoryRole && !hideClientContact;

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "flex flex-col gap-4 p-4 sm:p-5 min-h-0",
        reserveCloseSpace && "pt-10 sm:pt-5"
      )}
    >
      <div className="space-y-1.5 shrink-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Acompanhamento operacional
        </p>
        <h3 className="text-lg sm:text-xl font-black text-foreground leading-tight break-words">
          {leadForm.nome || project.client.nome}
        </h3>
        <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {leadForm.cidade || project.client.cidade || "Cidade não informada"}
          </span>
        </p>
      </div>

      {showClientContact && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-1 min-w-0">
            <span className="text-[10px] font-bold uppercase text-slate-400">Telefone</span>
            <p className="text-sm font-semibold text-foreground break-all">{displayPhone || "—"}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-1 min-w-0">
            <span className="text-[10px] font-bold uppercase text-slate-400">E-mail</span>
            <p className="text-sm font-semibold text-foreground break-all">
              {displayEmail || "—"}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-1 shrink-0">
        <span className="text-[10px] font-bold uppercase text-slate-400">Etapa do funil</span>
        {stageLocked ? (
          <p className="text-sm font-bold text-foreground">{stageTitle}</p>
        ) : (
          <select
            value={editingStatusGeral}
            disabled={loading}
            onChange={(e) => setEditingStatusGeral(e.target.value as ProjectStatus)}
            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/30"
          >
            {OPS_FUNNEL_COLUMNS.map((col) => (
              <option key={col.id} value={col.id}>
                {col.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {(project.conf_tecnica_resp1Nome || project.conf_tecnica_resp2Nome) && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-1 shrink-0">
          <span className="text-[10px] font-bold uppercase text-emerald-800">
            Conf. técnica — responsáveis
          </span>
          <p className="text-sm font-semibold text-foreground break-words">
            {[project.conf_tecnica_resp1Nome, project.conf_tecnica_resp2Nome]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      )}

      <label className="block space-y-1.5 min-w-0">
        <span className="text-[11px] font-bold text-slate-600">Observações operacionais</span>
        {isFactoryRole || isReadOnly ? (
          <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 min-h-[5rem] whitespace-pre-wrap">
            {editingObservacoes.trim() || "Nenhuma observação registrada."}
          </div>
        ) : (
          <textarea
            value={editingObservacoes}
            disabled={loading}
            onChange={(e) => setEditingObservacoes(e.target.value)}
            rows={4}
            placeholder="Medidas, acessos, datas de visita, pendências da obra…"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/30 resize-y min-h-[96px]"
          />
        )}
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 shrink-0">
        {showClientContact && whatsappHref ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 min-h-10 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors"
          >
            <MessageCircle className="h-3.5 w-3.5 shrink-0" />
            WhatsApp
          </a>
        ) : null}
        {project.client.id && !isFactoryRole ? (
          <button
            type="button"
            onClick={() => navigateApp(`/clientes/${project.client.id}?back=/crm`)}
            className="inline-flex items-center justify-center gap-1.5 min-h-10 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            Ficha do cliente
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => navigateApp(`/projects/${project.id}?back=/crm`)}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 min-h-10 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors",
            isFactoryRole || !showClientContact || !whatsappHref || !project.client.id
              ? "sm:col-span-2"
              : ""
          )}
        >
          <Layers className="h-3.5 w-3.5 shrink-0" />
          Ver projeto
        </button>
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="text-xs font-bold w-full sm:w-auto min-h-11"
          disabled={loading}
        >
          Fechar
        </Button>
        {canSave && (
          <Button
            type="submit"
            className="text-xs font-bold btn-metallic w-full sm:w-auto min-h-10"
            disabled={loading}
          >
            {loading ? "Salvando…" : "Salvar"}
          </Button>
        )}
      </div>
    </form>
  );
}
