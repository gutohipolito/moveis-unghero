"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  Calendar,
  Check,
  Factory,
  FileText,
  Image as ImageIcon,
  Images,
  Loader2,
  Mail,
  MessageSquare,
  Paperclip,
  Phone,
  Trash2,
  ExternalLink,
  Upload,
  X,
} from "lucide-react";
import type { EnvironmentAttachmentCategory } from "@prisma/client";
import type {
  PartnerProjectDetail,
  PartnerProjectFileDTO,
  PartnerProjectNoteDTO,
} from "@/lib/partnerPortal";
import { formatPartnerClientAddress } from "@/lib/partnerPortal";
import {
  buildPartnerProjectHistory,
  formatPartnerRelativeTime,
  PARTNER_PROJECT_STEPS,
  partnerEnvironmentStatusLabel,
  partnerFileIsImage,
  buildPartnerSchedulePhases,
  partnerProjectReadyDateIso,
  partnerProjectStageLabel,
  partnerProjectStepIndex,
  type PartnerProjectHistoryKind,
} from "@/lib/partnerProjectLabels";
import {
  attachmentCategoryLabel,
} from "@/lib/factoryEnvironment";
import {
  addPartnerProjectNoteAction,
  deletePartnerProjectFileAction,
  deletePartnerProjectNoteAction,
} from "@/app/actions/parceiroPortal";
import ParceiroFilterPills from "@/app/parceiro/ParceiroFilterPills";
import { cn } from "@/lib/utils";

type TabId = "resumo" | "orcamentos" | "imagens" | "arquivos" | "notas" | "historico";
type ImageCategoryFilter = EnvironmentAttachmentCategory | "ALL";

const PARTNER_IMAGE_CATEGORY_ORDER: EnvironmentAttachmentCategory[] = [
  "RENDER",
  "FOTO",
  "REFERENCIA",
  "PROJETO_ARQUITETO",
  "MEDICAO",
  "CONFERENCIA",
  "PROJETO_FABRICA",
];

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

const UPLOAD_MAX_BYTES = 20 * 1024 * 1024;
const UPLOAD_HINT_ID = "parceiro-upload-hint";
const UPLOAD_HINT =
  "PDF, JPG, PNG, WEBP, HEIC, DOC ou DWG · até 20 MB por arquivo. Você pode selecionar vários. O envio não altera a etapa do projeto.";

function partnerUploadExtOk(name: string) {
  const lower = name.toLowerCase();
  return (
    lower.endsWith(".pdf") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png") ||
    lower.endsWith(".webp") ||
    lower.endsWith(".heic") ||
    lower.endsWith(".heif") ||
    lower.endsWith(".doc") ||
    lower.endsWith(".docx") ||
    lower.endsWith(".dwg") ||
    lower.endsWith(".dxf")
  );
}

type UploadQueueItem = {
  id: string;
  name: string;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
};

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
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [imageCategory, setImageCategory] = useState<ImageCategoryFilter>("ALL");
  const [imageEnvId, setImageEnvId] = useState<string>("ALL");
  const [lightbox, setLightbox] = useState<{
    url: string;
    nome: string;
    envNome: string;
    categoria: EnvironmentAttachmentCategory;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const tablistRef = useRef<HTMLDivElement>(null);
  const timelineTrackRef = useRef<HTMLDivElement>(null);
  const timelineVeinRef = useRef<SVGSVGElement>(null);
  const currentDotRef = useRef<HTMLSpanElement>(null);
  const [veinProgressPct, setVeinProgressPct] = useState(0);

  const current = partnerProjectStepIndex(initial.status_geral);
  const isLost = initial.status_geral === "PERDIDO";
  const address = formatPartnerClientAddress(initial.client);
  const stageLabel = partnerProjectStageLabel(initial.status_geral);
  const schedulePhases = useMemo(
    () =>
      buildPartnerSchedulePhases({
        statusGeral: initial.status_geral,
        dataEntregaPrevista: initial.data_entrega_prevista,
        environmentReadyDates: initial.environments.map(
          (env) => env.data_entrega_acordada
        ),
      }),
    [initial]
  );

  useLayoutEffect(() => {
    if (isLost || current < 0) {
      setVeinProgressPct(0);
      return;
    }

    function measureVeinProgress() {
      const vein = timelineVeinRef.current;
      const dot = currentDotRef.current;
      if (!vein || !dot) return;
      const veinRect = vein.getBoundingClientRect();
      const dotRect = dot.getBoundingClientRect();
      if (veinRect.width <= 0) return;
      const centerX = dotRect.left + dotRect.width / 2;
      // Pequeno avanço para o tip do stroke “tocar” o centro do ponto.
      const pct = ((centerX - veinRect.left) / veinRect.width) * 100 + 0.6;
      setVeinProgressPct(Math.min(100, Math.max(0, pct)));
    }

    measureVeinProgress();

    const track = timelineTrackRef.current;
    if (!track || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measureVeinProgress());
    ro.observe(track);
    return () => ro.disconnect();
  }, [current, isLost]);

  const totalEnvImages = useMemo(
    () => initial.environments.reduce((sum, env) => sum + env.imageCount, 0),
    [initial.environments]
  );

  const imageCategoryCounts = useMemo(() => {
    const counts = new Map<EnvironmentAttachmentCategory, number>();
    for (const env of initial.environments) {
      for (const img of env.images) {
        counts.set(img.categoria, (counts.get(img.categoria) ?? 0) + 1);
      }
    }
    return counts;
  }, [initial.environments]);

  const filteredImageRooms = useMemo(() => {
    return initial.environments
      .map((env) => {
        const images = env.images.filter((img) => {
          if (imageCategory !== "ALL" && img.categoria !== imageCategory) return false;
          return true;
        });
        return { ...env, images };
      })
      .filter((env) => {
        if (imageEnvId !== "ALL" && env.id !== imageEnvId) return false;
        return env.images.length > 0;
      });
  }, [initial.environments, imageCategory, imageEnvId]);

  const history = useMemo(
    () =>
      buildPartnerProjectHistory({
        statusGeral: initial.status_geral,
        updatedAt: initial.updatedAt,
        dataEntregaPrevista:
          partnerProjectReadyDateIso({
            dataEntregaPrevista: initial.data_entrega_prevista,
            environmentReadyDates: initial.environments.map(
              (env) => env.data_entrega_acordada
            ),
          }) ?? initial.data_entrega_prevista,
        quotes: initial.quotes,
        files,
        notes,
      }),
    [initial, files, notes]
  );

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: "resumo", label: "Resumo" },
    { id: "orcamentos", label: "Orçamentos", count: initial.quotes.filter((q) => q.publicUrl).length },
    { id: "imagens", label: "Imagens", count: totalEnvImages },
    { id: "arquivos", label: "Arquivos", count: files.length },
    { id: "notas", label: "Notas", count: notes.length },
    { id: "historico", label: "Atualizações", count: history.length },
  ];

  useEffect(() => {
    if (!lightbox) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setLightbox(null);
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [lightbox]);

  function openImagesTab(envId?: string) {
    setImageEnvId(envId || "ALL");
    setImageCategory("ALL");
    setTab("imagens");
  }

  function clearFeedbackSoon() {
    window.setTimeout(() => setSuccess(null), 3200);
  }

  function onTabKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const idx = tabs.findIndex((t) => t.id === tab);
    if (idx < 0) return;
    let next = idx;
    if (event.key === "ArrowLeft") next = (idx - 1 + tabs.length) % tabs.length;
    if (event.key === "ArrowRight") next = (idx + 1) % tabs.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = tabs.length - 1;
    setTab(tabs[next].id);
    requestAnimationFrame(() => {
      tablistRef.current
        ?.querySelector<HTMLElement>(`#parceiro-tab-${tabs[next].id}`)
        ?.focus();
    });
  }

  async function uploadOneFile(file: File): Promise<PartnerProjectFileDTO | null> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`/api/parceiro/projetos/${initial.id}/arquivos`, {
      method: "POST",
      body: formData,
    });
    const json = await response.json();
    if (!json.success) {
      throw new Error(json.error || "Falha no upload.");
    }
    return json.file as PartnerProjectFileDTO;
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []);
    e.target.value = "";
    if (selected.length === 0) return;

    setError(null);
    setSuccess(null);
    setTab("arquivos");

    const queue: UploadQueueItem[] = selected.map((file, index) => ({
      id: `${file.name}-${file.size}-${index}-${Date.now()}`,
      name: file.name,
      status: "pending",
    }));
    setUploadQueue(queue);
    setUploading(true);

    let okCount = 0;
    let failCount = 0;
    const failNames: string[] = [];

    for (let i = 0; i < selected.length; i += 1) {
      const file = selected[i];
      const itemId = queue[i].id;

      if (!partnerUploadExtOk(file.name)) {
        failCount += 1;
        failNames.push(file.name);
        setUploadQueue((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? { ...item, status: "error", error: "Formato não permitido." }
              : item
          )
        );
        continue;
      }
      if (file.size > UPLOAD_MAX_BYTES) {
        failCount += 1;
        failNames.push(file.name);
        setUploadQueue((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? { ...item, status: "error", error: "Arquivo excede 20 MB." }
              : item
          )
        );
        continue;
      }

      setUploadQueue((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, status: "uploading" } : item
        )
      );

      try {
        const created = await uploadOneFile(file);
        if (created) {
          okCount += 1;
          setFiles((prev) => [created, ...prev]);
          setUploadQueue((prev) =>
            prev.map((item) =>
              item.id === itemId ? { ...item, status: "done" } : item
            )
          );
        }
      } catch (err) {
        failCount += 1;
        failNames.push(file.name);
        setUploadQueue((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: "error",
                  error: err instanceof Error ? err.message : "Falha no upload.",
                }
              : item
          )
        );
      }
    }

    setUploading(false);

    if (okCount > 0 && failCount === 0) {
      setSuccess(
        okCount === 1
          ? "Arquivo enviado. A equipe da Móveis Unghero já pode consultar."
          : `${okCount} arquivos enviados. A equipe da Móveis Unghero já pode consultar.`
      );
      clearFeedbackSoon();
      window.setTimeout(() => setUploadQueue([]), 1800);
    } else if (okCount > 0 && failCount > 0) {
      setSuccess(`${okCount} enviados com sucesso.`);
      setError(
        `${failCount} falharam${failNames.length ? `: ${failNames.slice(0, 3).join(", ")}` : "."}`
      );
      clearFeedbackSoon();
    } else {
      setError(
        failNames.length === 1
          ? `Não foi possível enviar ${failNames[0]}.`
          : "Nenhum arquivo foi enviado. Verifique formato e tamanho."
      );
    }
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

      <div
        ref={tablistRef}
        className="parceiro-veio-tabs"
        role="tablist"
        aria-label="Seções do projeto"
        onKeyDown={onTabKeyDown}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            id={`parceiro-tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`parceiro-panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
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
        <div
          id="parceiro-panel-resumo"
          role="tabpanel"
          aria-labelledby="parceiro-tab-resumo"
          className="parceiro-veio-detail-grid"
        >
          <section className="parceiro-veio-panel parceiro-veio-detail-progress">
            <div className="parceiro-veio-panel-head">
              <h2 className="parceiro-veio-panel-title">Andamento</h2>
            </div>

            {schedulePhases.length > 0 ? (
              <ol className="parceiro-veio-schedule" aria-label="Agenda de montagem">
                {schedulePhases.map((phase) => (
                  <li
                    key={phase.id}
                    className={cn("parceiro-veio-schedule-item", `is-${phase.state}`)}
                  >
                    <span className="parceiro-veio-schedule-mark" aria-hidden />
                    <div className="min-w-0">
                      <p className="parceiro-veio-schedule-title">{phase.title}</p>
                      <p className="parceiro-veio-schedule-date">{phase.dateLabel}</p>
                      <p className="parceiro-veio-schedule-hint">{phase.hint}</p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : null}

            {isLost ? (
              <p className="parceiro-veio-detail-lost">Projeto perdido</p>
            ) : (
              <div className="parceiro-veio-timeline-wrap">
                <div className="parceiro-veio-timeline-track" ref={timelineTrackRef}>
                  {(() => {
                    const fallbackPct =
                      current < 0
                        ? 0
                        : Math.min(
                            100,
                            ((current + 0.5) / PARTNER_PROJECT_STEPS.length) * 100
                          );
                    const progressPct = veinProgressPct > 0 ? veinProgressPct : fallbackPct;
                    const veinPath =
                      "M8 24 C 60 8, 100 40, 150 24 S 250 8, 300 24 S 400 42, 450 24 S 550 6, 600 24 S 700 40, 792 24";
                    return (
                      <>
                        <svg
                          ref={timelineVeinRef}
                          className="parceiro-veio-timeline-vein is-base"
                          viewBox="0 0 800 48"
                          preserveAspectRatio="none"
                          aria-hidden
                        >
                          <path
                            d={veinPath}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                        <svg
                          className="parceiro-veio-timeline-vein is-progress"
                          viewBox="0 0 800 48"
                          preserveAspectRatio="none"
                          aria-hidden
                          style={{
                            clipPath: `inset(0 ${Math.max(0, 100 - progressPct)}% 0 0)`,
                          }}
                        >
                          <path
                            d={veinPath}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.35"
                            strokeLinecap="round"
                          />
                        </svg>
                      </>
                    );
                  })()}
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
                            <span
                              ref={currentStep ? currentDotRef : undefined}
                              className="parceiro-veio-timeline-dot"
                            >
                              {currentStep ? (
                                <span className="parceiro-veio-timeline-sonar" />
                              ) : null}
                            </span>
                          </span>
                          <div className="parceiro-veio-timeline-body">
                            <p className="parceiro-veio-timeline-label">{step.label}</p>
                            {currentStep ? (
                              <p className="parceiro-veio-timeline-hint">Etapa atual</p>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </div>
            )}
          </section>

          <div className="parceiro-veio-detail-cards">
            <section className="parceiro-veio-panel parceiro-veio-detail-card">
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
            </section>

            {initial.environments.length > 0 ? (
              <section className="parceiro-veio-panel parceiro-veio-detail-card">
                <div className="parceiro-veio-panel-head">
                  <h2 className="parceiro-veio-panel-title">Ambientes</h2>
                  {totalEnvImages > 0 ? (
                    <button
                      type="button"
                      className="parceiro-veio-text-btn"
                      onClick={() => openImagesTab()}
                    >
                      Ver imagens
                    </button>
                  ) : null}
                </div>
                <ul className="parceiro-veio-env-gallery">
                  {initial.environments.map((env) => (
                    <li key={env.id}>
                      <button
                        type="button"
                        className="parceiro-veio-env-card"
                        onClick={() =>
                          env.imageCount > 0 ? openImagesTab(env.id) : undefined
                        }
                        disabled={env.imageCount === 0}
                      >
                        <span className="parceiro-veio-env-cover" aria-hidden>
                          {env.coverUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={env.coverUrl} alt="" />
                          ) : (
                            <Images className="h-5 w-5 opacity-40" />
                          )}
                        </span>
                        <span className="parceiro-veio-env-card-body">
                          <span className="parceiro-veio-env-name">{env.nome}</span>
                          <span className="parceiro-veio-env-status">
                            {partnerEnvironmentStatusLabel(env.status)}
                          </span>
                          <span className="parceiro-veio-env-count">
                            {env.imageCount === 0
                              ? "Sem imagens"
                              : `${env.imageCount} imagem${env.imageCount === 1 ? "" : "ns"}`}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {history.length > 0 ? (
              <section className="parceiro-veio-panel parceiro-veio-detail-card">
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
          </div>
        </div>
      )}

      {tab === "orcamentos" && (
        <div
          id="parceiro-panel-orcamentos"
          role="tabpanel"
          aria-labelledby="parceiro-tab-orcamentos"
          className="parceiro-veio-stack"
        >
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

      {tab === "imagens" && (
        <div
          id="parceiro-panel-imagens"
          role="tabpanel"
          aria-labelledby="parceiro-tab-imagens"
          className="parceiro-veio-images-panel"
        >
          {totalEnvImages === 0 ? (
            <div className="parceiro-veio-empty is-inline">
              <Images className="h-7 w-7 opacity-50" aria-hidden />
              <p className="parceiro-veio-empty-title">Nenhuma imagem ainda</p>
              <p className="parceiro-veio-empty-desc">
                Quando a equipe da Móveis Unghero anexar fotos, renders ou referências nos
                cômodos, elas aparecem aqui por ambiente e categoria.
              </p>
            </div>
          ) : (
            <>
              <ParceiroFilterPills
                variant="finance"
                aria-label="Filtrar imagens"
                value={imageCategory}
                onChange={(id) => setImageCategory(id as ImageCategoryFilter)}
                options={[
                  { id: "ALL", label: "Todas", count: totalEnvImages },
                  ...PARTNER_IMAGE_CATEGORY_ORDER.filter((cat) =>
                    imageCategoryCounts.has(cat)
                  ).map((cat) => ({
                    id: cat,
                    label: attachmentCategoryLabel(cat),
                    count: imageCategoryCounts.get(cat) ?? 0,
                  })),
                ]}
              />

              {initial.environments.length > 1 ? (
                <ParceiroFilterPills
                  variant="finance"
                  className="is-secondary"
                  aria-label="Filtrar por ambiente"
                  value={imageEnvId}
                  onChange={setImageEnvId}
                  options={[
                    { id: "ALL", label: "Todos os ambientes" },
                    ...initial.environments.map((env) => ({
                      id: env.id,
                      label: env.nome,
                      count: env.imageCount,
                      disabled: env.imageCount === 0,
                    })),
                  ]}
                />
              ) : null}

              {filteredImageRooms.length === 0 ? (
                <div className="parceiro-veio-empty is-inline">
                  <p className="parceiro-veio-empty-title">Nada neste filtro</p>
                  <p className="parceiro-veio-empty-desc">
                    Tente outra categoria ou ambiente.
                  </p>
                </div>
              ) : (
                <div className="parceiro-veio-images-rooms">
                  {filteredImageRooms.map((env) => (
                    <section key={env.id} className="parceiro-veio-panel">
                      <div className="parceiro-veio-panel-head">
                        <h2 className="parceiro-veio-panel-title">{env.nome}</h2>
                        <span className="parceiro-veio-muted">
                          {env.images.length} imagem
                          {env.images.length === 1 ? "" : "ns"}
                        </span>
                      </div>
                      <ul className="parceiro-veio-images-grid">
                        {env.images.map((img) => (
                          <li key={img.id}>
                            <button
                              type="button"
                              className="parceiro-veio-image-tile"
                              onClick={() =>
                                setLightbox({
                                  url: img.url,
                                  nome: img.nome,
                                  envNome: env.nome,
                                  categoria: img.categoria,
                                })
                              }
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={img.url} alt={img.nome} loading="lazy" />
                              <span className="parceiro-veio-image-tile-meta">
                                {attachmentCategoryLabel(img.categoria)}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === "arquivos" && (
        <div
          id="parceiro-panel-arquivos"
          role="tabpanel"
          aria-labelledby="parceiro-tab-arquivos"
          className="parceiro-veio-stack"
        >
          <section className="parceiro-veio-panel space-y-3">
            <h2 className="parceiro-veio-panel-title">Adicionar imagens ou arquivos</h2>
            <p id={UPLOAD_HINT_ID} className="parceiro-veio-detail-copy">
              {UPLOAD_HINT}
            </p>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,.doc,.docx,.dwg,.dxf,application/pdf,image/*"
              onChange={onUpload}
            />
            <button
              type="button"
              disabled={uploading}
              aria-busy={uploading}
              aria-describedby={UPLOAD_HINT_ID}
              onClick={() => fileRef.current?.click()}
              className="parceiro-veio-upload-btn"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Upload className="h-4 w-4" aria-hidden />
              )}
              {uploading ? "Enviando…" : "Adicionar arquivos"}
            </button>
            {uploadQueue.length > 0 ? (
              <ul className="parceiro-veio-upload-queue" aria-live="polite">
                {uploadQueue.map((item) => (
                  <li key={item.id} className={cn("parceiro-veio-upload-queue-item", `is-${item.status}`)}>
                    <span className="parceiro-veio-upload-queue-name">{item.name}</span>
                    <span className="parceiro-veio-upload-queue-status">
                      {item.status === "pending"
                        ? "Na fila"
                        : item.status === "uploading"
                          ? "Enviando…"
                          : item.status === "done"
                            ? "Enviado"
                            : item.error || "Falhou"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
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
                        alt={file.nome}
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
                        title={file.nome}
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
        <div
          id="parceiro-panel-notas"
          role="tabpanel"
          aria-labelledby="parceiro-tab-notas"
          className="parceiro-veio-stack"
        >
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
        <section
          id="parceiro-panel-historico"
          role="tabpanel"
          aria-labelledby="parceiro-tab-historico"
          className="parceiro-veio-panel"
        >
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

      {lightbox ? (
        <div
          className="parceiro-veio-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.nome}
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="parceiro-veio-lightbox-close"
            aria-label="Fechar imagem"
            onClick={() => setLightbox(null)}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
          <div
            className="parceiro-veio-lightbox-body"
            onClick={(event) => event.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightbox.url} alt={lightbox.nome} />
            <p className="parceiro-veio-lightbox-caption">
              {lightbox.envNome}
              {" · "}
              {attachmentCategoryLabel(lightbox.categoria)}
              {" · "}
              {lightbox.nome}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
