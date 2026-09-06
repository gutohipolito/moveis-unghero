"use client";

import React, { useMemo, useRef, useState, useTransition } from "react";
import {
  Calendar,
  Check,
  Factory,
  FileText,
  Image as ImageIcon,
  Loader2,
  Mail,
  MessageSquare,
  Paperclip,
  Phone,
  Trash2,
  ExternalLink,
  Upload,
} from "lucide-react";
import type {
  PartnerProjectDetail,
  PartnerProjectFileDTO,
  PartnerProjectNoteDTO,
} from "@/lib/partnerPortal";
import { formatPartnerClientAddress, partnerProjectValueVisible } from "@/lib/partnerPortal";
import {
  buildPartnerProjectHistory,
  formatPartnerRelativeTime,
  PARTNER_PROJECT_STEPS,
  partnerEnvironmentStatusLabel,
  partnerFileIsImage,
  partnerProjectNextMilestone,
  partnerProjectStageLabel,
  partnerProjectStepIndex,
  type PartnerProjectHistoryKind,
} from "@/lib/partnerProjectLabels";
import {
  addPartnerProjectNoteAction,
  deletePartnerProjectFileAction,
  deletePartnerProjectNoteAction,
} from "@/app/actions/parceiroPortal";
import { cn } from "@/lib/utils";

type TabId = "resumo" | "orcamentos" | "arquivos" | "notas" | "historico";

const moneyFmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatBytes(bytes: number | null) {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function historyIcon(kind: PartnerProjectHistoryKind) {
  if (kind === "quote") return FileText;
  if (kind === "schedule") return Calendar;
  if (kind === "stage") return Factory;
  if (kind === "image") return ImageIcon;
  if (kind === "note") return MessageSquare;
  return Paperclip;
}

const UPLOAD_HINT =
  "PDF, JPG, PNG, WEBP, DOC ou DWG · até 20 MB por arquivo. O envio não altera a etapa do projeto.";

type Props = {
  project: PartnerProjectDetail;
  /** Partner session id — only own notes/files show delete. */
  currentPartnerId?: string;
  /** Compact header for modal; page can pass false and render its own title. */
  showHeader?: boolean;
  /** Layout compacto para modal (menos padding). */
  compact?: boolean;
};

export default function ParceiroProjetoDetailView({
  project: initial,
  currentPartnerId,
  showHeader = true,
  compact = false,
}: Props) {
  const [tab, setTab] = useState<TabId>("resumo");
  const [notes, setNotes] = useState<PartnerProjectNoteDTO[]>(initial.notes);
  const [files, setFiles] = useState<PartnerProjectFileDTO[]>(initial.files);
  const [noteBody, setNoteBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const current = partnerProjectStepIndex(initial.status_geral);
  const isLost = initial.status_geral === "PERDIDO";
  const address = formatPartnerClientAddress(initial.client);
  const valueVisible = partnerProjectValueVisible(initial.status_geral);
  const stageLabel = partnerProjectStageLabel(initial.status_geral);
  const nextMilestone = partnerProjectNextMilestone({
    statusGeral: initial.status_geral,
    dataEntregaPrevista: initial.data_entrega_prevista,
  });

  const history = useMemo(
    () =>
      buildPartnerProjectHistory({
        statusGeral: initial.status_geral,
        updatedAt: initial.updatedAt,
        dataEntregaPrevista: initial.data_entrega_prevista,
        quotes: initial.quotes,
        files,
        notes,
      }),
    [initial, files, notes]
  );

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: "resumo", label: "Resumo" },
    { id: "orcamentos", label: "Orçamentos", count: initial.quotes.filter((q) => q.publicUrl).length },
    { id: "arquivos", label: "Arquivos", count: files.length },
    { id: "notas", label: "Notas", count: notes.length },
    { id: "historico", label: "Atualizações", count: history.length },
  ];

  function clearFeedbackSoon() {
    window.setTimeout(() => setSuccess(null), 3200);
  }

  function submitNote() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await addPartnerProjectNoteAction(initial.id, noteBody);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setNotes((prev) => [res.note, ...prev]);
      setNoteBody("");
      setSuccess("Observação publicada.");
      clearFeedbackSoon();
    });
  }

  function removeNote(noteId: string) {
    if (!window.confirm("Excluir esta observação?")) return;
    setError(null);
    startTransition(async () => {
      const res = await deletePartnerProjectNoteAction(noteId);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      setSuccess("Observação excluída.");
      clearFeedbackSoon();
    });
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setSuccess(null);
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
      setSuccess("Arquivo enviado. A equipe da Móveis Unghero já pode consultar.");
      clearFeedbackSoon();
    } catch {
      setError("Não foi possível enviar o arquivo.");
    } finally {
      setUploading(false);
    }
  }

  function removeFile(fileId: string) {
    if (!window.confirm("Excluir este arquivo? Esta ação não pode ser desfeita.")) return;
    setError(null);
    startTransition(async () => {
      const res = await deletePartnerProjectFileAction(fileId);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      setSuccess("Arquivo excluído.");
      clearFeedbackSoon();
    });
  }

  return (
    <div className={cn("parceiro-veio-detail", compact ? "is-compact" : undefined)}>
      {showHeader && (
        <div className="parceiro-veio-detail-legacy-head">
          <p className="parceiro-veio-detail-kicker">Projeto</p>
          <h3 className="parceiro-veio-detail-legacy-title">{initial.client.nome}</h3>
          <p className="parceiro-veio-muted">{stageLabel}</p>
        </div>
      )}

      {error ? (
        <div className="parceiro-veio-banner is-error" role="alert">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="parceiro-veio-banner is-success" role="status">
          <Check className="h-4 w-4 shrink-0" aria-hidden />
          {success}
        </div>
      ) : null}

      <div className="parceiro-veio-tabs" role="tablist" aria-label="Seções do projeto">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn("parceiro-veio-tab", tab === t.id && "is-active")}
          >
            {t.label}
            {typeof t.count === "number" && t.count > 0 ? (
              <span className="parceiro-veio-tab-count">{t.count}</span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "resumo" && (
        <div className="parceiro-veio-detail-grid">
          <section className="parceiro-veio-panel parceiro-veio-detail-main">
            <div className="parceiro-veio-panel-head">
              <h2 className="parceiro-veio-panel-title">Andamento</h2>
              {nextMilestone ? (
                <p className="parceiro-veio-detail-milestone">{nextMilestone}</p>
              ) : null}
            </div>

            {isLost ? (
              <p className="parceiro-veio-detail-lost">Projeto perdido</p>
            ) : (
              <ol className="parceiro-veio-timeline" aria-label="Etapas do projeto">
                {PARTNER_PROJECT_STEPS.map((step, idx) => {
                  const done = idx < current;
                  const currentStep = idx === current;
                  return (
                    <li
                      key={step.id}
                      className={cn(
                        "parceiro-veio-timeline-step",
                        `is-${step.family}`,
                        done && "is-done",
                        currentStep && "is-current",
                        !done && !currentStep && "is-upcoming"
                      )}
                    >
                      <span className="parceiro-veio-timeline-rail" aria-hidden>
                        <span className="parceiro-veio-timeline-dot" />
                      </span>
                      <div className="parceiro-veio-timeline-body">
                        <p className="parceiro-veio-timeline-label">{step.label}</p>
                        {currentStep ? (
                          <p className="parceiro-veio-timeline-hint">Etapa atual</p>
                        ) : done ? (
                          <p className="parceiro-veio-timeline-hint">Concluída</p>
                        ) : (
                          <p className="parceiro-veio-timeline-hint">A seguir</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <aside className="parceiro-veio-detail-side">
            <section className="parceiro-veio-panel space-y-3">
              <h2 className="parceiro-veio-panel-title">Contato</h2>
              <p className="parceiro-veio-detail-copy">{address}</p>
              <div className="parceiro-veio-detail-links">
                {initial.client.telefone ? (
                  <a
                    href={`https://wa.me/55${initial.client.telefone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="parceiro-veio-detail-link"
                  >
                    <Phone className="h-3.5 w-3.5" aria-hidden />
                    {initial.client.telefone}
                  </a>
                ) : null}
                {initial.client.email && !initial.client.email.includes("placeholder") ? (
                  <a
                    href={`mailto:${initial.client.email}`}
                    className="parceiro-veio-detail-link"
                  >
                    <Mail className="h-3.5 w-3.5" aria-hidden />
                    {initial.client.email}
                  </a>
                ) : null}
              </div>
              {valueVisible ? (
                <p className="parceiro-veio-detail-value">
                  Valor previsto · {moneyFmt.format(initial.valor_previsto)}
                </p>
              ) : (
                <p className="parceiro-veio-detail-value is-muted">
                  Valor liberado após aprovação do orçamento
                </p>
              )}
            </section>

            {initial.environments.length > 0 ? (
              <section className="parceiro-veio-panel space-y-3">
                <h2 className="parceiro-veio-panel-title">Ambientes</h2>
                <ul className="parceiro-veio-env-list">
                  {initial.environments.map((env) => (
                    <li key={env.id} className="parceiro-veio-env-item">
                      <span className="parceiro-veio-env-name">{env.nome}</span>
                      <span className="parceiro-veio-env-status">
                        {partnerEnvironmentStatusLabel(env.status)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {history.length > 0 ? (
              <section className="parceiro-veio-panel space-y-3">
                <div className="parceiro-veio-panel-head">
                  <h2 className="parceiro-veio-panel-title">Últimas atualizações</h2>
                  <button
                    type="button"
                    className="parceiro-veio-text-btn"
                    onClick={() => setTab("historico")}
                  >
                    Ver todas
                  </button>
                </div>
                <ul className="parceiro-veio-history-list">
                  {history.slice(0, 4).map((item) => {
                    const Icon = historyIcon(item.kind);
                    return (
                      <li key={item.id} className="parceiro-veio-history-item">
                        <span className={cn("parceiro-veio-history-icon", `is-${item.kind}`)}>
                          <Icon className="h-3.5 w-3.5" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="parceiro-veio-history-label">{item.label}</p>
                          <p className="parceiro-veio-history-meta">
                            {item.author ? `${item.author} · ` : ""}
                            {formatPartnerRelativeTime(item.occurredAt)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}
          </aside>
        </div>
      )}

      {tab === "orcamentos" && (
        <div className="parceiro-veio-stack">
          {initial.quotes.filter((q) => q.publicUrl).length === 0 ? (
            <div className="parceiro-veio-empty is-inline">
              <p className="parceiro-veio-empty-title">Nenhum orçamento em PDF</p>
              <p className="parceiro-veio-empty-desc">
                Quando a Móveis Unghero liberar a proposta, o PDF aparece aqui para consulta.
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
                  className="parceiro-veio-file-row"
                >
                  <span className="parceiro-veio-file-thumb is-doc" aria-hidden>
                    <FileText className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="parceiro-veio-file-name">
                      Orçamento
                      {quote.versao > 1 ? ` v${quote.versao}` : ""}
                      {quote.codigo ? ` · ${quote.codigo}` : ""}
                    </span>
                    <span className="parceiro-veio-file-meta">Consultar proposta em PDF</span>
                  </span>
                  <span className="parceiro-veio-file-action">
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    Abrir
                  </span>
                </a>
              ))
          )}
        </div>
      )}

      {tab === "arquivos" && (
        <div className="parceiro-veio-stack">
          <section className="parceiro-veio-panel space-y-3">
            <h2 className="parceiro-veio-panel-title">Adicionar imagens ou arquivos</h2>
            <p className="parceiro-veio-detail-copy">{UPLOAD_HINT}</p>
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
              className="parceiro-veio-upload-btn"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Upload className="h-4 w-4" aria-hidden />
              )}
              {uploading ? "Enviando…" : "Adicionar arquivo"}
            </button>
          </section>

          {files.length === 0 ? (
            <div className="parceiro-veio-empty is-inline">
              <p className="parceiro-veio-empty-title">Nenhum arquivo ainda</p>
              <p className="parceiro-veio-empty-desc">
                Envie plantas e referências para a equipe da Móveis Unghero acompanhar no mesmo
                lugar.
              </p>
            </div>
          ) : (
            <ul className="parceiro-veio-stack">
              {files.map((file) => {
                const isImage = partnerFileIsImage(file.mime_type, file.nome);
                const isOwn = Boolean(currentPartnerId && file.partnerId === currentPartnerId);
                return (
                  <li key={file.id} className="parceiro-veio-file-row is-static">
                    {isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={file.url}
                        alt=""
                        className="parceiro-veio-file-thumb is-image"
                      />
                    ) : (
                      <span className="parceiro-veio-file-thumb is-doc" aria-hidden>
                        <Paperclip className="h-5 w-5" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="parceiro-veio-file-name hover:underline"
                      >
                        {file.nome}
                      </a>
                      <p className="parceiro-veio-file-meta">
                        {isOwn ? "Você" : file.partnerNome}
                        {" · "}
                        {formatPartnerRelativeTime(file.createdAt)}
                        {file.size_bytes ? ` · ${formatBytes(file.size_bytes)}` : ""}
                      </p>
                    </div>
                    {isOwn ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => removeFile(file.id)}
                        className="parceiro-veio-icon-btn is-danger"
                        title="Excluir arquivo"
                        aria-label={`Excluir ${file.nome}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {tab === "notas" && (
        <div className="parceiro-veio-stack">
          <section className="parceiro-veio-panel space-y-3">
            <h2 className="parceiro-veio-panel-title">Observações</h2>
            <textarea
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value.slice(0, 4000))}
              rows={compact ? 3 : 4}
              placeholder="Observação para a equipe da Móveis Unghero..."
              className="parceiro-veio-textarea"
            />
            <button
              type="button"
              disabled={pending || noteBody.trim().length < 2}
              onClick={submitNote}
              className="parceiro-veio-upload-btn"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Publicar observação
            </button>
          </section>

          {notes.length === 0 ? (
            <div className="parceiro-veio-empty is-inline">
              <p className="parceiro-veio-empty-title">Nenhuma observação</p>
              <p className="parceiro-veio-empty-desc">
                Use este espaço para combinar detalhes com a Móveis Unghero sem perder o histórico.
              </p>
            </div>
          ) : (
            <ul className="parceiro-veio-stack">
              {notes.map((note) => {
                const isOwn = Boolean(currentPartnerId && note.partnerId === currentPartnerId);
                return (
                  <li key={note.id} className="parceiro-veio-panel space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="parceiro-veio-file-meta">
                          {isOwn ? "Você" : note.partnerNome}
                          {" · "}
                          {formatPartnerRelativeTime(note.createdAt)}
                        </p>
                        <p className="parceiro-veio-detail-copy mt-1 whitespace-pre-wrap">
                          {note.body}
                        </p>
                      </div>
                      {isOwn ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => removeNote(note.id)}
                          className="parceiro-veio-icon-btn is-danger shrink-0"
                          title="Excluir observação"
                          aria-label="Excluir observação"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {tab === "historico" && (
        <section className="parceiro-veio-panel">
          {history.length === 0 ? (
            <div className="parceiro-veio-empty is-inline">
              <p className="parceiro-veio-empty-title">Sem atualizações registradas</p>
              <p className="parceiro-veio-empty-desc">
                Novidades de orçamento, arquivos e observações aparecem aqui.
              </p>
            </div>
          ) : (
            <ul className="parceiro-veio-history-list is-full">
              {history.map((item) => {
                const Icon = historyIcon(item.kind);
                return (
                  <li key={item.id} className="parceiro-veio-history-item">
                    <span className={cn("parceiro-veio-history-icon", `is-${item.kind}`)}>
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="parceiro-veio-history-label">{item.label}</p>
                      <p className="parceiro-veio-history-meta">
                        {item.author ? `${item.author} · ` : ""}
                        {formatPartnerRelativeTime(item.occurredAt)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

    </div>
  );
}
