"use client";

import React from "react";
import Link from "next/link";
import {
  ExternalLink,
  MapPin,
  MessageCircle,
  Phone,
  Layers,
} from "lucide-react";
import type { ProjectStatus } from "@/app/actions/kanban";
import { Button } from "@/components/ui/button";
import { OPS_FUNNEL_COLUMNS } from "@/lib/crmOpsAccess";
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
  displayPhone,
  displayEmail,
  whatsappHref,
  reserveCloseSpace = false,
}: KanbanOpsPanelProps) {
  const stageTitle =
    OPS_FUNNEL_COLUMNS.find((o) => o.id === editingStatusGeral)?.title ||
    editingStatusGeral;

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "space-y-4",
        reserveCloseSpace && "pt-8 sm:pt-0"
      )}
    >
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Acompanhamento operacional · {stageTitle}
        </p>
        <h3 className="text-lg font-black text-foreground leading-tight">
          {leadForm.nome || project.client.nome}
        </h3>
        <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {leadForm.cidade || project.client.cidade || "Cidade não informada"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
            <Phone className="h-3 w-3" /> Telefone
          </span>
          <p className="text-sm font-semibold text-foreground">{displayPhone || "—"}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400">E-mail</span>
          <p className="text-sm font-semibold text-foreground break-all">
            {displayEmail || "—"}
          </p>
        </div>
      </div>

      {(project.conf_tecnica_resp1Nome || project.conf_tecnica_resp2Nome) && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-1">
          <span className="text-[10px] font-bold uppercase text-emerald-800">
            Conf. técnica — responsáveis
          </span>
          <p className="text-sm font-semibold text-foreground">
            {[project.conf_tecnica_resp1Nome, project.conf_tecnica_resp2Nome]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      )}

      <label className="block space-y-1.5">
        <span className="text-[11px] font-bold text-slate-600">Etapa do funil</span>
        <select
          value={editingStatusGeral}
          disabled={isReadOnly || loading}
          onChange={(e) => setEditingStatusGeral(e.target.value as ProjectStatus)}
          className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60"
        >
          {OPS_FUNNEL_COLUMNS.map((col) => (
            <option key={col.id} value={col.id}>
              {col.title}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1.5">
        <span className="text-[11px] font-bold text-slate-600">Observações operacionais</span>
        <textarea
          value={editingObservacoes}
          disabled={isReadOnly || loading}
          onChange={(e) => setEditingObservacoes(e.target.value)}
          rows={4}
          placeholder="Medidas, acessos, datas de visita, pendências da obra…"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60 resize-y min-h-[96px]"
        />
      </label>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {whatsappHref ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            WhatsApp
          </a>
        ) : null}
        {project.client.id ? (
          <Link
            href={`/clientes/${project.client.id}`}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Ficha do cliente
          </Link>
        ) : null}
        <Link
          href={`/projects/${project.id}`}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
        >
          <Layers className="h-3.5 w-3.5" />
          Projeto / fábrica
        </Link>
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="text-xs font-bold"
          disabled={loading}
        >
          Fechar
        </Button>
        {!isReadOnly && (
          <Button
            type="submit"
            className="text-xs font-bold btn-metallic"
            disabled={loading}
          >
            {loading ? "Salvando…" : "Salvar"}
          </Button>
        )}
      </div>
    </form>
  );
}
