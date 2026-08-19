"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { EnvironmentAttachmentCategory } from "@prisma/client";
import {
  deleteEnvironmentAttachment,
  listEnvironmentAttachments,
  setEnvironmentCoverAttachment,
} from "@/app/actions/factoryEnvironment";
import {
  ENVIRONMENT_ATTACHMENT_ACCEPT,
  ENVIRONMENT_ATTACHMENT_CATEGORIES,
  ENVIRONMENT_ATTACHMENT_MAX_BYTES,
  attachmentCategoryLabel,
  formatAttachmentSize,
  guessEnvironmentAttachmentMime,
  isImageMime,
  isPdfMime,
  type EnvironmentAttachmentDTO,
} from "@/lib/factoryEnvironment";
import { uploadEnvironmentAttachmentFile } from "@/lib/environmentAttachmentUpload";
import { describeUploadException } from "@/lib/uploadErrors";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import CameraCaptureModal from "@/components/CameraCaptureModal";
import PdfCoverThumb from "@/components/PdfCoverThumb";
import SpotlightTour, {
  type SpotlightTourStep,
} from "@/components/ui/SpotlightTour";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Download,
  ExternalLink,
  Filter,
  Images,
  Loader2,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";

type AttachmentFilter = EnvironmentAttachmentCategory | "ALL";

type PreviewTarget = {
  id: string;
  url: string;
  nome: string;
  mime_type: string;
};

export type EnvironmentGalleryTarget = {
  id: string;
  nome: string;
  tipo: string;
};

const TIPO_LABELS: Record<string, string> = {
  COZINHA: "Cozinha",
  CLOSET: "Closet",
  DORMITORIO: "Dormitório",
  BANHEIRO: "Banheiro",
  OUTROS: "Outros",
};

const CATEGORY_HINTS: Record<EnvironmentAttachmentCategory, string> = {
  PROJETO_ARQUITETO: "Plantas e arquivos do arquiteto",
  PROJETO_FABRICA: "Desenhos técnicos da fábrica",
  RENDER: "Imagens 3D / fotorrealismo",
  REFERENCIA: "Inspiração e referências",
  MEDICAO: "Fotos da obra, cotas e medidas",
  CONFERENCIA: "Fotos da conferência técnica",
  FOTO: "Fotos gerais do cômodo / local",
};

const TOUR_STORAGE_KEY = "env-gallery-tour-v3";

const TOUR_STEPS: SpotlightTourStep[] = [
  {
    id: "category",
    title: "Passo 1 — tipo do registro",
    body: "Toque em medição, foto ou outro tipo. Só depois disso aparecem os botões de câmera e galeria.",
    target: '[data-tour-id="env-category"]',
  },
  {
    id: "capture",
    title: "Passo 2 — capturar",
    body: "Com o tipo escolhido, tire a foto ou escolha da galeria. O envio é automático — se errar, exclua na grade.",
    target: '[data-tour-id="env-capture"]',
  },
  {
    id: "filter",
    title: "Filtrar a grade",
    body: "Use o menu para ver só um tipo de arquivo. Isso não altera a categoria do próximo envio.",
    target: '[data-tour-id="env-filter"]',
  },
  {
    id: "grid",
    title: "Ampliar e capa",
    body: "Toque numa imagem para ampliar. Em cada card você pode definir a capa do ambiente ou excluir.",
    target: '[data-tour-id="env-grid"]',
  },
];

interface EnvironmentGalleryModalProps {
  environment: EnvironmentGalleryTarget | null;
  canManage: boolean;
  onClose: () => void;
}

export default function EnvironmentGalleryModal({
  environment,
  canManage,
  onClose,
}: EnvironmentGalleryModalProps) {
  const [attachments, setAttachments] = useState<EnvironmentAttachmentDTO[]>([]);
  const [capaId, setCapaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<AttachmentFilter>("ALL");
  const [workCategory, setWorkCategory] =
    useState<EnvironmentAttachmentCategory | null>(null);
  const [preview, setPreview] = useState<PreviewTarget | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const modalBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px), (pointer: coarse)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const loadAttachments = useCallback(async (environmentId: string) => {
    setLoading(true);
    setError(null);
    const result = await listEnvironmentAttachments(environmentId);
    setLoading(false);
    if (!result.success) {
      setAttachments([]);
      setCapaId(null);
      setError(result.error);
      return;
    }
    setAttachments(result.attachments);
    setCapaId(result.capaAttachmentId);
  }, []);

  useEffect(() => {
    if (!environment) {
      setAttachments([]);
      setCapaId(null);
      setFilterCategory("ALL");
      setWorkCategory(null);
      setPreview(null);
      setError(null);
      setCameraOpen(false);
      setTourOpen(false);
      return;
    }
    void loadAttachments(environment.id);

    if (canManage) {
      try {
        const seen = window.localStorage.getItem(TOUR_STORAGE_KEY);
        if (!seen) {
          window.setTimeout(() => setTourOpen(true), 450);
        }
      } catch {
        /* ignore */
      }
    }
  }, [environment, loadAttachments, canManage]);

  const filteredAttachments =
    filterCategory === "ALL"
      ? attachments
      : attachments.filter((file) => file.categoria === filterCategory);

  const previewableAttachments = (
    filterCategory === "ALL"
      ? attachments
      : attachments.filter((file) => file.categoria === filterCategory)
  ).filter((file) => isImageMime(file.mime_type));

  function openPreview(file: EnvironmentAttachmentDTO) {
    if (!isImageMime(file.mime_type)) return;
    setPreview({
      id: file.id,
      url: file.url,
      nome: file.nome,
      mime_type: file.mime_type,
    });
  }

  function showAdjacentPreview(delta: number) {
    if (!preview || previewableAttachments.length === 0) return;
    const index = previewableAttachments.findIndex((f) => f.id === preview.id);
    if (index < 0) return;
    const next =
      previewableAttachments[
        (index + delta + previewableAttachments.length) % previewableAttachments.length
      ];
    openPreview(next);
  }

  useEffect(() => {
    if (!preview) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreview(null);
      if (event.key === "ArrowLeft") showAdjacentPreview(-1);
      if (event.key === "ArrowRight") showAdjacentPreview(1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- listeners bound to current preview set
  }, [preview, previewableAttachments]);

  async function uploadFiles(fileList: FileList | File[] | null) {
    if (!environment || !fileList || !workCategory || !canManage) return;
    const list = Array.isArray(fileList) ? fileList : Array.from(fileList);
    if (list.length === 0) return;

    setUploading(true);
    setError(null);
    try {
      let firstImageAsCover = attachments.length === 0;
      for (const file of list) {
        const mime = guessEnvironmentAttachmentMime(file.name, file.type);
        const setCover = firstImageAsCover && mime.startsWith("image/");
        if (setCover) firstImageAsCover = false;
        await uploadEnvironmentAttachmentFile(environment.id, file, {
          categoria: workCategory,
          setAsCover: setCover,
        });
      }
      setFilterCategory(workCategory);
      await loadAttachments(environment.id);
    } catch (err) {
      setError(describeUploadException(err, { maxBytes: ENVIRONMENT_ATTACHMENT_MAX_BYTES }));
    } finally {
      setUploading(false);
    }
  }

  function preferNativeCameraCapture() {
    if (typeof window === "undefined") return false;
    // Celular/tablet: sempre preferir câmera nativa do SO (mais estável que getUserMedia).
    if (isMobile) return true;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const narrow = window.matchMedia("(max-width: 900px)").matches;
    return coarse || narrow;
  }

  function openCamera() {
    if (!workCategory) return;
    if (preferNativeCameraCapture()) {
      cameraInputRef.current?.click();
    } else {
      setCameraOpen(true);
    }
  }

  async function handleDelete(attachmentId: string) {
    if (!environment || !canManage) return;
    const confirmed = window.confirm("Excluir este arquivo?");
    if (!confirmed) return;
    const result = await deleteEnvironmentAttachment(environment.id, attachmentId);
    if (!result.success) {
      setError(result.error);
      return;
    }
    if (preview?.id === attachmentId) setPreview(null);
    await loadAttachments(environment.id);
  }

  async function handleSetCover(attachmentId: string) {
    if (!environment || !canManage) return;
    const result = await setEnvironmentCoverAttachment(environment.id, attachmentId);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setCapaId(result.capaAttachmentId);
  }

  function markTourDone() {
    try {
      window.localStorage.setItem(TOUR_STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setTourOpen(false);
  }

  const tipoLabel = environment
    ? TIPO_LABELS[environment.tipo] || environment.tipo
    : "";

  const filterLabel =
    filterCategory === "ALL"
      ? `Todas (${attachments.length})`
      : `${attachmentCategoryLabel(filterCategory)} (${attachments.filter((a) => a.categoria === filterCategory).length})`;

  return (
    <>
      <Dialog
        isOpen={Boolean(environment)}
        onClose={onClose}
        className={isMobile ? undefined : "max-w-4xl"}
        bodyClassName="p-0"
        fullscreen={isMobile}
        showClose={!isMobile}
      >
        {environment ? (
          <div
            ref={modalBodyRef}
            className={`flex flex-col ${
              isMobile
                ? "h-[100svh] max-h-[100svh]"
                : "max-h-[min(88dvh,900px)]"
            }`}
          >
            <div className="shrink-0 border-b border-border px-4 sm:px-6 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-3 sm:pb-5 space-y-1 sm:space-y-1.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-primary">
                    <Images className="h-4 w-4 shrink-0" />
                    <p className="text-[11px] font-semibold tracking-wide text-primary">
                      Imagens do ambiente
                    </p>
                  </div>
                  <h3 className="text-base sm:text-xl font-black text-foreground leading-snug break-words pr-2 mt-1">
                    {environment.nome}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1 leading-relaxed">
                    {tipoLabel}
                    {canManage
                      ? isMobile
                        ? " · escolha o tipo e capture"
                        : " · escolha o tipo e capture — o envio é automático"
                      : " · somente visualização"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {canManage ? (
                    <button
                      type="button"
                      onClick={() => setTourOpen(true)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border min-h-10 min-w-10 sm:px-3 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                      title="Ver passo a passo"
                      aria-label="Como funciona"
                    >
                      <CircleHelp className="h-4 w-4" />
                      <span className="hidden sm:inline">Como funciona?</span>
                    </button>
                  ) : null}
                  {isMobile ? (
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex items-center justify-center min-h-10 min-w-10 rounded-lg border border-border text-muted-foreground hover:bg-muted cursor-pointer"
                      aria-label="Fechar"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:pb-6">
              {canManage ? (
                <div className="rounded-xl border border-border bg-secondary/20 p-3 sm:p-5 space-y-4 sm:space-y-5">
                  <div data-tour-id="env-category" className="space-y-2 sm:space-y-3">
                    <div className="space-y-1">
                      <p className="text-xs sm:text-sm font-semibold text-foreground">
                        O que você está registrando?
                      </p>
                      <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                        Toque no tipo do registro. A câmera e a galeria só aparecem depois
                        dessa escolha.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:gap-2.5">
                      {ENVIRONMENT_ATTACHMENT_CATEGORIES.map((cat) => {
                        const active = workCategory === cat.value;
                        return (
                          <button
                            key={cat.value}
                            type="button"
                            onClick={() => setWorkCategory(cat.value)}
                            disabled={uploading}
                            title={CATEGORY_HINTS[cat.value]}
                            className={`inline-flex items-center min-h-10 sm:min-h-9 rounded-full px-3 py-2 text-xs font-semibold border transition-colors cursor-pointer touch-manipulation ${
                              active
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background text-muted-foreground border-border hover:text-foreground"
                            }`}
                          >
                            {cat.label}
                          </button>
                        );
                      })}
                    </div>
                    {workCategory ? (
                      <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                        {CATEGORY_HINTS[workCategory]}
                      </p>
                    ) : (
                      <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed italic">
                        Nenhum tipo selecionado — escolha acima para continuar.
                      </p>
                    )}
                  </div>

                  {workCategory ? (
                    <div
                      data-tour-id={isMobile ? undefined : "env-capture"}
                      className="space-y-2 sm:space-y-3 pt-1 border-t border-border/70"
                    >
                      <div className="space-y-1">
                        <p className="text-xs sm:text-sm font-semibold text-foreground">
                          Adicionar arquivos
                        </p>
                        <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                          Registrando como{" "}
                          <strong className="text-foreground">
                            {attachmentCategoryLabel(workCategory)}
                          </strong>
                          . O envio é automático após capturar.
                        </p>
                      </div>
                      {uploading ? (
                        <p className="text-xs text-muted-foreground flex items-center gap-2 py-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Enviando…
                        </p>
                      ) : (
                        <div className="hidden sm:flex flex-row gap-3">
                          <Button
                            type="button"
                            disabled={uploading}
                            onClick={openCamera}
                            className="flex-1 h-11 text-sm font-semibold gap-1.5"
                          >
                            <Camera className="h-4 w-4" />
                            Abrir câmera
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={uploading}
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 h-11 text-sm font-semibold gap-1.5"
                          >
                            <Upload className="h-4 w-4" />
                            Da galeria
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : null}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ENVIRONMENT_ATTACHMENT_ACCEPT}
                    multiple
                    className="hidden"
                    disabled={uploading || !workCategory}
                    onChange={(e) => {
                      void uploadFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    disabled={uploading || !workCategory}
                    onChange={(e) => {
                      void uploadFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </div>
              ) : null}

              <div
                data-tour-id="env-filter"
                className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-4"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-xs sm:text-sm font-semibold text-foreground">
                    Arquivos do ambiente
                  </p>
                  <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                    {filteredAttachments.length} de {attachments.length} visíveis
                    {filterCategory !== "ALL"
                      ? ` · filtro: ${attachmentCategoryLabel(filterCategory)}`
                      : ""}
                  </p>
                </div>
                <div className="w-full sm:w-[min(100%,17.5rem)] shrink-0">
                  <label className="sr-only" htmlFor="env-gallery-filter">
                    Filtrar por tipo
                  </label>
                  <div className="relative">
                    <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-[1]" />
                    <Select
                      id="env-gallery-filter"
                      value={filterCategory}
                      onChange={(e) =>
                        setFilterCategory(e.target.value as AttachmentFilter)
                      }
                      disabled={loading || attachments.length === 0}
                      className="h-11 sm:h-10 pl-9 pr-9 text-sm font-medium bg-card shadow-sm border-border/80"
                    >
                      <option value="ALL">Todas ({attachments.length})</option>
                      {ENVIRONMENT_ATTACHMENT_CATEGORIES.map((cat) => {
                        const count = attachments.filter((a) => a.categoria === cat.value).length;
                        return (
                          <option key={cat.value} value={cat.value}>
                            {cat.label} ({count})
                          </option>
                        );
                      })}
                    </Select>
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-2 py-1.5">
                  {error}
                </p>
              )}

                  <div data-tour-id="env-grid" className="sm:pt-1">
                {loading ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando arquivos…
                  </p>
                ) : attachments.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-8 sm:p-10 text-center text-sm text-muted-foreground leading-relaxed">
                    Nenhuma imagem ou arquivo neste ambiente ainda.
                    {canManage
                      ? " Escolha o tipo do registro e depois use câmera ou galeria."
                      : ""}
                  </div>
                ) : filteredAttachments.length === 0 ? (
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Nenhum arquivo neste filtro ({filterLabel}).
                    {canManage ? " Envie um novo ou mude o filtro acima." : ""}
                  </p>
                ) : (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {filteredAttachments.map((file) => {
                      const isCover = capaId === file.id;
                      const image = isImageMime(file.mime_type);
                      const pdf = isPdfMime(file.mime_type, file.nome);
                      return (
                        <li
                          key={file.id}
                          className={`rounded-xl border p-2.5 space-y-2 ${
                            isCover ? "border-primary bg-primary/5" : "border-border"
                          }`}
                        >
                          {image ? (
                            <button
                              type="button"
                              onClick={() => openPreview(file)}
                              className="block w-full text-left cursor-pointer group"
                              title="Ampliar imagem"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={file.url}
                                alt={file.nome}
                                className="w-full h-28 object-cover rounded-lg border border-border group-hover:opacity-95 transition-opacity"
                              />
                            </button>
                          ) : pdf ? (
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noreferrer"
                              className="block"
                              title="Abrir PDF"
                            >
                              <PdfCoverThumb
                                url={file.url}
                                alt={file.nome}
                                className="w-full h-28 rounded-lg border border-border"
                              />
                            </a>
                          ) : (
                            <div className="h-28 rounded-lg border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">
                              Documento
                            </div>
                          )}
                          <div className="space-y-0.5">
                            <p className="text-xs font-semibold truncate" title={file.nome}>
                              {file.nome}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {attachmentCategoryLabel(file.categoria)}
                              {file.size_bytes ? ` · ${formatAttachmentSize(file.size_bytes)}` : ""}
                              {file.uploaded_by ? ` · ${file.uploaded_by}` : ""}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {image ? (
                              <button
                                type="button"
                                onClick={() => openPreview(file)}
                                className="inline-flex items-center gap-1 min-h-9 px-2.5 text-[11px] font-semibold rounded-md border border-border hover:bg-secondary cursor-pointer touch-manipulation"
                              >
                                Ampliar
                              </button>
                            ) : (
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 min-h-9 px-2.5 text-[11px] font-semibold rounded-md border border-border hover:bg-secondary touch-manipulation"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Abrir PDF
                              </a>
                            )}
                            <a
                              href={file.url}
                              download={file.nome}
                              className="inline-flex items-center gap-1 min-h-9 px-2.5 text-[11px] font-semibold rounded-md border border-border hover:bg-secondary touch-manipulation"
                            >
                              <Download className="h-3 w-3" />
                              Baixar
                            </a>
                            {canManage && image && (
                              <button
                                type="button"
                                onClick={() => void handleSetCover(file.id)}
                                className="inline-flex items-center gap-1 min-h-9 px-2.5 text-[11px] font-semibold rounded-md border border-border hover:bg-secondary cursor-pointer touch-manipulation"
                              >
                                <Star
                                  className={`h-3 w-3 ${isCover ? "fill-current text-amber-500" : ""}`}
                                />
                                {isCover ? "Capa" : "Definir capa"}
                              </button>
                            )}
                            {canManage && (
                              <button
                                type="button"
                                onClick={() => void handleDelete(file.id)}
                                className="inline-flex items-center gap-1 min-h-9 px-2.5 text-[11px] font-semibold rounded-md border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer touch-manipulation"
                              >
                                <Trash2 className="h-3 w-3" />
                                Excluir
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            <div
              className={`shrink-0 border-t border-border ${
                isMobile
                  ? "px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
                  : "px-6 py-4 flex justify-end"
              }`}
            >
              {isMobile && canManage && workCategory ? (
                <div data-tour-id={isMobile ? "env-capture" : undefined} className="flex gap-2">
                  <Button
                    type="button"
                    disabled={uploading}
                    onClick={openCamera}
                    className="flex-[1.4] h-12 text-sm font-bold gap-1.5 touch-manipulation shadow-md"
                  >
                    {uploading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Camera className="h-5 w-5" />
                    )}
                    {uploading ? "Enviando…" : "Abrir câmera"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 h-12 text-sm font-bold gap-1.5 touch-manipulation"
                  >
                    <Upload className="h-4 w-4" />
                    Galeria
                  </Button>
                </div>
              ) : isMobile && canManage ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onClose}
                  className="w-full h-12 text-sm font-semibold touch-manipulation"
                >
                  Fechar
                </Button>
              ) : (
                <Button type="button" variant="secondary" onClick={onClose} className="min-h-10">
                  Fechar
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </Dialog>

      <CameraCaptureModal
        open={cameraOpen && Boolean(workCategory)}
        onClose={() => setCameraOpen(false)}
        title={
          workCategory
            ? `Foto — ${attachmentCategoryLabel(workCategory)}`
            : "Foto do ambiente"
        }
        onCapture={async (file) => {
          await uploadFiles([file]);
          setCameraOpen(false);
        }}
      />

      <SpotlightTour
        open={tourOpen && Boolean(environment) && canManage}
        steps={TOUR_STEPS}
        rootRef={modalBodyRef}
        onClose={markTourDone}
        onFinish={markTourDone}
      />

      {preview && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/80 p-4"
              role="dialog"
              aria-modal="true"
              aria-label="Visualização da imagem"
              onClick={() => setPreview(null)}
            >
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="absolute top-4 right-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 cursor-pointer"
                aria-label="Fechar visualização"
              >
                <X className="h-5 w-5" />
              </button>

              {previewableAttachments.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      showAdjacentPreview(-1);
                    }}
                    className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 cursor-pointer"
                    aria-label="Imagem anterior"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      showAdjacentPreview(1);
                    }}
                    className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 cursor-pointer"
                    aria-label="Próxima imagem"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              ) : null}

              <div
                className="max-w-5xl w-full flex flex-col items-center gap-3"
                onClick={(e) => e.stopPropagation()}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview.url}
                  alt={preview.nome}
                  className="max-h-[min(78dvh,calc(100dvh-7rem))] max-w-full rounded-lg object-contain shadow-2xl"
                />
                <p className="text-sm text-white/90 font-medium text-center px-4 truncate max-w-full">
                  {preview.nome}
                </p>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
