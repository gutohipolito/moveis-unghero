"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Loader2,
  Check,
  X,
  PackageOpen,
  User,
  Link2,
  CheckCircle2,
  PlayCircle,
  RotateCcw,
  Ban,
  ImagePlus,
} from "lucide-react";
import { compressImageFile } from "@/lib/imageCompression";
import {
  SUPPLY_STATUS_LABELS,
  SUPPLY_PRIORITY_LABELS,
  type SupplyTicketDTO,
  type SupplyTicketPriority,
  type SupplyTicketStatus,
} from "@/lib/chamados";
import {
  createSupplyTicket,
  setSupplyTicketStatus,
  cancelSupplyTicket,
} from "@/app/actions/chamados";

export interface ChamadoProjectOption {
  id: string;
  label: string;
}

interface ChamadosClientProps {
  initialTickets: SupplyTicketDTO[];
  projects: ChamadoProjectOption[];
  isAdmin: boolean;
  currentUserId: string;
}

const STATUS_STYLES: Record<SupplyTicketStatus, string> = {
  ABERTO: "bg-amber-50 text-amber-700 border-amber-200",
  EM_ANDAMENTO: "bg-blue-50 text-blue-700 border-blue-200",
  RESOLVIDO: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELADO: "bg-slate-100 text-slate-500 border-slate-200",
};

const PRIORITY_STYLES: Record<SupplyTicketPriority, string> = {
  ALTA: "bg-red-50 text-red-700 border-red-200",
  MEDIA: "bg-amber-50 text-amber-700 border-amber-200",
  BAIXA: "bg-slate-100 text-slate-600 border-slate-200",
};

const FILTERS: { key: "TODOS" | SupplyTicketStatus; label: string }[] = [
  { key: "TODOS", label: "Todos" },
  { key: "ABERTO", label: "Abertos" },
  { key: "EM_ANDAMENTO", label: "Em andamento" },
  { key: "RESOLVIDO", label: "Resolvidos" },
  { key: "CANCELADO", label: "Cancelados" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChamadosClient({
  initialTickets,
  projects,
  isAdmin,
  currentUserId,
}: ChamadosClientProps) {
  const [tickets, setTickets] = useState<SupplyTicketDTO[]>(initialTickets);
  const [showForm, setShowForm] = useState(initialTickets.length === 0);
  const [filter, setFilter] = useState<"TODOS" | SupplyTicketStatus>("TODOS");

  // Form
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prioridade, setPrioridade] = useState<SupplyTicketPriority>("MEDIA");
  const [projectId, setProjectId] = useState("");
  const [notifyChat, setNotifyChat] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list).filter((f) => f.type.startsWith("image/"));
    setFiles((prev) => [...prev, ...incoming].slice(0, 6));
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  // Actions
  const [actionId, setActionId] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolucao, setResolucao] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(
    () => (filter === "TODOS" ? tickets : tickets.filter((t) => t.status === filter)),
    [tickets, filter]
  );

  const openCount = useMemo(
    () => tickets.filter((t) => t.status === "ABERTO" || t.status === "EM_ANDAMENTO").length,
    [tickets]
  );

  function upsertTicket(updated: SupplyTicketDTO) {
    setTickets((prev) => {
      const idx = prev.findIndex((t) => t.id === updated.id);
      if (idx === -1) return [updated, ...prev];
      const next = [...prev];
      next[idx] = updated;
      return next;
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const imagens: string[] = [];
      for (const file of files) {
        const compressed = await compressImageFile(file);
        const fd = new FormData();
        fd.append("file", compressed);
        const resp = await fetch("/api/chamados/upload", { method: "POST", body: fd });
        const data = await resp.json();
        if (!resp.ok || !data.success) {
          throw new Error(data.error || "Falha ao enviar a imagem.");
        }
        imagens.push(data.url as string);
      }

      const res = await createSupplyTicket({
        titulo,
        descricao,
        prioridade,
        projectId: projectId || null,
        imagens,
        notifyChat: Boolean(projectId) && notifyChat,
      });
      if (res.success) {
        upsertTicket(res.ticket);
        setTitulo("");
        setDescricao("");
        setPrioridade("MEDIA");
        setProjectId("");
        setNotifyChat(true);
        setFiles([]);
        setShowForm(false);
      } else {
        setFormError(res.error);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Não foi possível abrir o chamado.");
    } finally {
      setSubmitting(false);
    }
  }

  async function changeStatus(id: string, status: SupplyTicketStatus, nota?: string) {
    setActionId(id);
    setActionError(null);
    try {
      const res = await setSupplyTicketStatus(id, status, nota);
      if (res.success) {
        upsertTicket(res.ticket);
        setResolvingId(null);
        setResolucao("");
      } else {
        setActionError(res.error);
      }
    } catch {
      setActionError("Não foi possível atualizar o chamado.");
    } finally {
      setActionId(null);
    }
  }

  async function handleCancel(id: string) {
    setActionId(id);
    setActionError(null);
    try {
      const res = await cancelSupplyTicket(id);
      if (res.success) upsertTicket(res.ticket);
      else setActionError(res.error);
    } catch {
      setActionError("Não foi possível cancelar o chamado.");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Barra superior */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                filter === f.key
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[var(--radius-sm)] bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-extrabold transition-all w-full sm:w-auto cursor-pointer"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Fechar" : "Novo chamado"}
        </button>
      </div>

      {/* Formulário */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white border border-slate-200/80 rounded-[var(--radius-md)] shadow-sm p-5 space-y-4"
        >
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <PackageOpen className="h-5 w-5 text-indigo-600" />
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Abrir chamado de insumo
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-450">
                Insumo / Título
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                required
                maxLength={120}
                className="w-full h-10 px-3 rounded-[var(--radius-sm)] border border-slate-200 bg-slate-50/50 focus:bg-white text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-450">
                Prioridade
              </label>
              <select
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value as SupplyTicketPriority)}
                className="w-full h-10 px-3 rounded-[var(--radius-sm)] border border-slate-200 bg-slate-50/50 focus:bg-white text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none transition-all cursor-pointer"
              >
                <option value="BAIXA">Baixa</option>
                <option value="MEDIA">Média</option>
                <option value="ALTA">Alta</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-450">
              Descrição
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              required
              rows={3}
              className="w-full px-3 py-2.5 rounded-[var(--radius-sm)] border border-slate-200 bg-slate-50/50 focus:bg-white text-sm text-slate-700 focus:border-indigo-500 focus:outline-none transition-all resize-y"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-450">
              Projeto
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full h-10 px-3 rounded-[var(--radius-sm)] border border-slate-200 bg-slate-50/50 focus:bg-white text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none transition-all cursor-pointer"
            >
              <option value="">Nenhum projeto específico</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            {projectId ? (
              <label className="mt-2 flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-indigo-100 bg-indigo-50/60 px-3 py-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyChat}
                  onChange={(e) => setNotifyChat(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>
                  <span className="block text-xs font-bold text-slate-800">
                    Enviar aviso no chat do projeto
                  </span>
                  <span className="block text-[11px] text-slate-500 leading-snug">
                    A equipe vê no grupo interno qual insumo falta, sem depender só da lista de chamados.
                  </span>
                </span>
              </label>
            ) : (
              <p className="text-[11px] text-slate-400 font-medium">
                Vincule o projeto para avisar a equipe no chat interno.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-450">
              Fotos (opcional)
            </label>
            <div className="flex flex-wrap gap-2">
              {previews.map((src, i) => (
                <div
                  key={i}
                  className="relative h-20 w-20 rounded-[var(--radius-sm)] overflow-hidden border border-slate-200"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="Prévia" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center cursor-pointer"
                    aria-label="Remover imagem"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {files.length < 6 && (
                <label className="h-20 w-20 rounded-[var(--radius-sm)] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-0.5 cursor-pointer text-slate-400 hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50/40 transition-colors">
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-[9px] font-black uppercase tracking-wide">Adicionar</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      addFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              JPG, PNG ou WEBP · até 10 MB · máx. 6 imagens · otimizadas automaticamente.
            </p>
          </div>

          {formError && (
            <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-[var(--radius-sm)]">
              {formError}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-[var(--radius-sm)] bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-extrabold transition-all disabled:opacity-60 cursor-pointer"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {submitting
                ? files.length > 0
                  ? "Enviando imagens…"
                  : "Abrindo…"
                : "Abrir chamado"}
            </button>
          </div>
        </form>
      )}

      {actionError && (
        <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-3.5 py-2 rounded-[var(--radius-sm)]">
          {actionError}
        </p>
      )}

      {/* Resumo */}
      {isAdmin && openCount > 0 && (
        <div className="flex items-center gap-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-100 px-3.5 py-2 rounded-[var(--radius-sm)]">
          <PackageOpen className="h-4 w-4" />
          {openCount} chamado{openCount === 1 ? "" : "s"} aguardando resolução.
        </div>
      )}

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-[var(--radius-md)] p-10 text-center">
          <PackageOpen className="h-8 w-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-500">Nenhum chamado por aqui.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => {
            const busy = actionId === t.id;
            const canOwnerCancel = !isAdmin && t.requesterId === currentUserId && t.status === "ABERTO";
            return (
              <div
                key={t.id}
                className="bg-white border border-slate-200/80 rounded-[var(--radius-md)] shadow-sm p-4 sm:p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${STATUS_STYLES[t.status]}`}>
                        {SUPPLY_STATUS_LABELS[t.status]}
                      </span>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${PRIORITY_STYLES[t.prioridade]}`}>
                        {SUPPLY_PRIORITY_LABELS[t.prioridade]}
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-slate-800 mt-2 break-words">{t.titulo}</h3>
                    <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap break-words">{t.descricao}</p>
                  </div>
                </div>

                {t.imagens.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {t.imagens.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block h-16 w-16 rounded-lg overflow-hidden border border-slate-200 hover:opacity-80 transition-opacity"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="Anexo do chamado" className="h-full w-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-500 font-medium pt-1 border-t border-slate-100">
                  <span className="inline-flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> Solicitado por <span className="font-bold text-slate-700">{t.requesterName}</span>
                  </span>
                  <span>{formatDate(t.createdAt)}</span>
                  {t.projectId && (
                    <Link
                      href={`/projects/${t.projectId}`}
                      className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 font-bold"
                    >
                      <Link2 className="h-3.5 w-3.5" /> {t.projectLabel}
                    </Link>
                  )}
                  {t.resolverName && (
                    <span className="inline-flex items-center gap-1.5 text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Resolvido por <span className="font-bold">{t.resolverName}</span>
                    </span>
                  )}
                </div>

                {t.resolucao && (
                  <div className="text-xs text-slate-600 bg-emerald-50/50 border border-emerald-100 rounded-lg px-3 py-2">
                    <span className="font-bold text-emerald-800">Resolução: </span>
                    {t.resolucao}
                  </div>
                )}

                {/* Ações */}
                {(isAdmin || canOwnerCancel) && t.status !== "CANCELADO" && (
                  <div className="pt-1">
                    {resolvingId === t.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={resolucao}
                          onChange={(e) => setResolucao(e.target.value)}
                          rows={2}
                          placeholder="Observação da resolução (opcional)"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-indigo-500 focus:outline-none resize-y"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => changeStatus(t.id, "RESOLVIDO", resolucao)}
                            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors disabled:opacity-60 cursor-pointer"
                          >
                            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            Confirmar resolução
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setResolvingId(null);
                              setResolucao("");
                            }}
                            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        {isAdmin && t.status === "ABERTO" && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => changeStatus(t.id, "EM_ANDAMENTO")}
                            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition-colors disabled:opacity-60 cursor-pointer"
                          >
                            <PlayCircle className="h-3.5 w-3.5" /> Assumir
                          </button>
                        )}
                        {isAdmin && (t.status === "ABERTO" || t.status === "EM_ANDAMENTO") && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setResolvingId(t.id)}
                            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors disabled:opacity-60 cursor-pointer"
                          >
                            <Check className="h-3.5 w-3.5" /> Resolver
                          </button>
                        )}
                        {isAdmin && t.status === "RESOLVIDO" && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => changeStatus(t.id, "ABERTO")}
                            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors disabled:opacity-60 cursor-pointer"
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Reabrir
                          </button>
                        )}
                        {(isAdmin || canOwnerCancel) && t.status !== "RESOLVIDO" && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleCancel(t.id)}
                            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-bold transition-colors disabled:opacity-60 cursor-pointer"
                          >
                            <Ban className="h-3.5 w-3.5" /> Cancelar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
