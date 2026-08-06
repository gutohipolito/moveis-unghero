"use client";

import React, { useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Layers,
  Loader2,
  MapPin,
  MessageSquare,
  Paperclip,
  Phone,
  Mail,
  Trash2,
  ExternalLink,
  Upload,
} from "lucide-react";
import type {
  PartnerPortalData,
  PartnerProjectDetail,
  PartnerProjectFileDTO,
  PartnerProjectNoteDTO,
} from "@/lib/partnerPortal";
import ParceiroPortalShell from "@/app/parceiro/ParceiroPortalShell";
import {
  addPartnerProjectNoteAction,
  deletePartnerProjectFileAction,
  deletePartnerProjectNoteAction,
} from "@/app/actions/parceiroPortal";
import { cn } from "@/lib/utils";
import { formatPartnerClientAddress } from "@/lib/partnerPortal";

const PROJECT_STEPS = [
  { id: "LEAD", label: "Briefing" },
  { id: "ORCAMENTO", label: "Orçamento" },
  { id: "NEGOCIACAO", label: "Negociação" },
  { id: "CONFERENCIA_TECNICA", label: "Detalhe" },
  { id: "APROVADO", label: "Aprovado" },
  { id: "PRODUCAO", label: "Fábrica" },
  { id: "INSTALACAO", label: "Montagem" },
  { id: "FINALIZADO", label: "Entregue" },
] as const;

type TabId = "resumo" | "orcamentos" | "arquivos" | "notas";

const moneyFmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function stepIndex(status: string) {
  if (status === "PERDIDO") return -1;
  const idx = PROJECT_STEPS.findIndex((s) => s.id === status);
  return idx >= 0 ? idx : 0;
}

function formatBytes(bytes: number | null) {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  partner: PartnerPortalData;
  project: PartnerProjectDetail;
  isAdminPreview?: boolean;
}

export default function ParceiroProjetoDetailClient({
  partner,
  project: initial,
  isAdminPreview = false,
}: Props) {
  const [tab, setTab] = useState<TabId>("resumo");
  const [notes, setNotes] = useState<PartnerProjectNoteDTO[]>(initial.notes);
  const [files, setFiles] = useState<PartnerProjectFileDTO[]>(initial.files);
  const [noteBody, setNoteBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const current = stepIndex(initial.status_geral);
  const isLost = initial.status_geral === "PERDIDO";
  const address = formatPartnerClientAddress(initial.client);

  const tabs: { id: TabId; label: string; icon: React.ElementType; count?: number }[] = [
    { id: "resumo", label: "Resumo", icon: Layers },
    { id: "orcamentos", label: "Orçamentos", icon: FileText, count: initial.quotes.length },
    { id: "arquivos", label: "Arquivos", icon: Paperclip, count: files.length },
    { id: "notas", label: "Notas", icon: MessageSquare, count: notes.length },
  ];

  function submitNote() {
    setError(null);
    startTransition(async () => {
      const res = await addPartnerProjectNoteAction(initial.id, noteBody);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setNotes((prev) => [res.note, ...prev]);
      setNoteBody("");
    });
  }

  function removeNote(noteId: string) {
    setError(null);
    startTransition(async () => {
      const res = await deletePartnerProjectNoteAction(noteId);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    });
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`/api/parceiro/projetos/${initial.id}/arquivos`, {
        method: "POST",
        body: formData,
      });
      const json = await response.json();
      if (!json.success) {
        setError(json.error || "Falha no upload.");
        return;
      }
      setFiles((prev) => [json.file, ...prev]);
      setTab("arquivos");
    } catch {
      setError("Não foi possível enviar o arquivo.");
    } finally {
      setUploading(false);
    }
  }

  function removeFile(fileId: string) {
    setError(null);
    startTransition(async () => {
      const res = await deletePartnerProjectFileAction(fileId);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    });
  }

  return (
    <ParceiroPortalShell partner={partner} isAdminPreview={isAdminPreview}>
      <div className="space-y-5">
        <div>
          <Link
            href="/parceiro/projetos"
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-[var(--radius-sm)] border border-white/20 bg-white/5 text-white text-sm font-bold hover:bg-white/10 w-fit mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            Projetos
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight">
                {initial.client.nome}
              </h1>
              <p className="text-xs text-white/60 mt-1 inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {initial.client.cidade || "Cidade não informada"}
              </p>
            </div>
            <p className="text-lg font-display font-extrabold text-white tabular-nums">
              {moneyFmt.format(initial.valor_previsto)}
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-400/40 bg-rose-500/15 px-4 py-3 text-sm font-semibold text-rose-100">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-[11px] font-bold border transition-colors",
                  tab === t.id
                    ? "bg-white text-slate-900 border-white"
                    : "bg-white/5 text-white/75 border-white/15 hover:bg-white/10"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
                {typeof t.count === "number" && t.count > 0 && (
                  <span className="opacity-70">({t.count})</span>
                )}
              </button>
            );
          })}
        </div>

        {tab === "resumo" && (
          <div className="space-y-4">
            <div className="partner-card p-5 space-y-3">
              <div className="partner-card-accent" />
              {isLost ? (
                <p className="text-sm font-bold text-rose-700">Projeto perdido</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-1">
                    {PROJECT_STEPS.map((step, idx) => (
                      <div
                        key={step.id}
                        title={step.label}
                        className={`parceiro-project-step ${
                          idx <= current ? "parceiro-project-step-done" : ""
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-sm font-semibold text-slate-700">
                    Etapa:{" "}
                    <span className="font-bold text-slate-900">
                      {PROJECT_STEPS[current]?.label ?? initial.status_geral}
                    </span>
                  </p>
                  {initial.data_entrega_prevista && (
                    <p className="text-xs text-slate-500">
                      Entrega prevista: {dateFmt.format(new Date(initial.data_entrega_prevista))}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="partner-card p-5 space-y-3">
              <div className="partner-card-accent" />
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">
                Cliente
              </h2>
              <p className="font-display font-bold text-slate-900">{initial.client.nome}</p>
              <p className="text-sm text-slate-600">{address}</p>
              <div className="flex flex-wrap gap-3 text-sm">
                {initial.client.telefone && (
                  <a
                    href={`https://wa.me/55${initial.client.telefone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 font-semibold text-slate-800 hover:text-primary"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {initial.client.telefone}
                  </a>
                )}
                {initial.client.email && !initial.client.email.includes("placeholder") && (
                  <a
                    href={`mailto:${initial.client.email}`}
                    className="inline-flex items-center gap-1.5 font-semibold text-slate-800 hover:text-primary"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {initial.client.email}
                  </a>
                )}
              </div>
            </div>

            {initial.environments.length > 0 && (
              <div className="partner-card p-5 space-y-3">
                <div className="partner-card-accent" />
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  Ambientes
                </h2>
                <ul className="space-y-2">
                  {initial.environments.map((env) => (
                    <li
                      key={env.id}
                      className="flex items-center justify-between gap-2 text-sm border-b border-slate-100 pb-2 last:border-0 last:pb-0"
                    >
                      <span className="font-semibold text-slate-900">{env.nome}</span>
                      <span className="text-xs text-slate-500 font-medium">
                        {env.status.replace(/_/g, " ").toLowerCase()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {tab === "orcamentos" && (
          <div className="space-y-3">
            {initial.quotes.filter((q) => q.publicUrl).length === 0 ? (
              <div className="partner-card p-8 text-center">
                <div className="partner-card-accent" />
                <p className="text-sm text-slate-600 font-semibold">
                  Nenhum orçamento em PDF disponível ainda.
                </p>
                <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto">
                  Quando a Móveis Unghero compartilhar o orçamento, o link aparece aqui.
                </p>
              </div>
            ) : (
              initial.quotes
                .filter((q) => q.publicUrl)
                .map((quote) => (
                  <a
                    key={quote.id}
                    href={quote.publicUrl!}
                    target="_blank"
                    rel="noreferrer"
                    className="partner-card p-4 flex items-center justify-between gap-3 no-underline hover:no-underline"
                  >
                    <div className="partner-card-accent" />
                    <div className="min-w-0 flex-1 px-1">
                      <p className="font-display font-bold text-slate-900 text-sm">
                        Orçamento
                        {quote.versao > 1 ? ` v${quote.versao}` : ""}
                        {quote.codigo ? ` · ${quote.codigo}` : ""}
                      </p>
                      <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                        Abrir PDF
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-slate-900 text-white text-xs font-bold shrink-0">
                      <ExternalLink className="h-3.5 w-3.5" />
                      PDF
                    </span>
                  </a>
                ))
            )}
          </div>
        )}

        {tab === "arquivos" && (
          <div className="space-y-4">
            <div className="partner-card p-5 space-y-3">
              <div className="partner-card-accent" />
              <p className="text-sm text-slate-600 font-semibold">
                Envie plantas, PDFs ou referências do projeto. A equipe Unghero também vê estes
                arquivos no CRM.
              </p>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.dwg,.dxf,application/pdf,image/*"
                onChange={onUpload}
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 disabled:opacity-60"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Enviar arquivo
              </button>
            </div>

            {files.length === 0 ? (
              <div className="partner-card p-8 text-center">
                <div className="partner-card-accent" />
                <p className="text-sm text-slate-600 font-semibold">Nenhum arquivo enviado ainda.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {files.map((file) => (
                  <li
                    key={file.id}
                    className="partner-card p-4 flex items-center justify-between gap-3"
                  >
                    <div className="partner-card-accent" />
                    <div className="min-w-0 flex-1">
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-slate-900 text-sm hover:text-primary truncate block"
                      >
                        {file.nome}
                      </a>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {dateFmt.format(new Date(file.createdAt))}
                        {file.size_bytes ? ` · ${formatBytes(file.size_bytes)}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => removeFile(file.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "notas" && (
          <div className="space-y-4">
            <div className="partner-card p-5 space-y-3">
              <div className="partner-card-accent" />
              <textarea
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value.slice(0, 4000))}
                rows={4}
                placeholder="Escreva uma observação para a equipe Unghero..."
                className="w-full border border-slate-200 bg-white rounded-xl text-sm p-3.5 focus:outline-none focus:ring-1 focus:ring-slate-800 font-semibold text-slate-900 placeholder:text-slate-400"
              />
              <button
                type="button"
                disabled={pending || noteBody.trim().length < 2}
                onClick={submitNote}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 disabled:opacity-60"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Publicar nota
              </button>
            </div>

            {notes.length === 0 ? (
              <div className="partner-card p-8 text-center">
                <div className="partner-card-accent" />
                <p className="text-sm text-slate-600 font-semibold">Nenhuma nota ainda.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {notes.map((note) => (
                  <li key={note.id} className="partner-card p-4 space-y-2">
                    <div className="partner-card-accent" />
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold text-slate-500">
                          {note.partnerNome} · {dateFmt.format(new Date(note.createdAt))}
                        </p>
                        <p className="text-sm text-slate-800 mt-1 whitespace-pre-wrap font-medium">
                          {note.body}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => removeNote(note.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </ParceiroPortalShell>
  );
}
