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
  type EnvironmentAttachmentDTO,
} from "@/lib/factoryEnvironment";
import { uploadEnvironmentAttachmentFile } from "@/lib/environmentAttachmentUpload";
import { describeUploadException } from "@/lib/uploadErrors";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import CameraCaptureModal from "@/components/CameraCaptureModal";
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

const TOUR_STORAGE_KEY = "env-gallery-tour-v2";

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
    body: "Com o tipo escolhido, tire a foto na visita ou escolha arquivos já salvos no aparelho.",
    target: '[data-tour-id="env-capture"]',
  },
  {
    id: "filter",
    title: "Filtro da grade",
    body: "Organiza o que você vê abaixo. Não altera a categoria do próximo envio.",
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
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingCategory, setPendingCategory] =
    useState<EnvironmentAttachmentCategory | null>(null);
  const [preview, setPreview] = useState<PreviewTarget | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [pendingPreviewUrls, setPendingPreviewUrls] = useState<string[]>([]);
  const [showPendingCategoryPicker, setShowPendingCategoryPicker] = useState(false);
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
      setPendingCategory(null);
      setPendingFiles([]);
      setShowPendingCategoryPicker(false);
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

  useEffect(() => {
    const urls = pendingFiles
      .filter((f) => f.type.startsWith("image/"))
      .map((f) => URL.createObjectURL(f));
    setPendingPreviewUrls(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [pendingFiles]);

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

  function clearPendingUpload() {
    setPendingFiles([]);
    setPendingCategory(null);
    setShowPendingCategoryPicker(false);
  }

  function queueFilesForUpload(fileList: FileList | File[] | null) {
    if (!fileList || !workCategory) return;
    const list = Array.isArray(fileList) ? fileList : Array.from(fileList);
    if (list.length === 0) return;
    setPendingFiles(list);
    setPendingCategory(workCategory);
    setShowPendingCategoryPicker(false);
    setError(null);
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

  async function confirmPendingUpload() {
    if (!environment || pendingFiles.length === 0 || !pendingCategory || !canManage) return;
    setUploading(true);
    setError(null);
    try {
      let firstImageAsCover = attachments.length === 0;
      for (const file of pendingFiles) {
        const mime = guessEnvironmentAttachmentMime(file.name, file.type);
        const setCover = firstImageAsCover && mime.startsWith("image/");
        if (setCover) firstImageAsCover = false;
        await uploadEnvironmentAttachmentFile(environment.id, file, {
          categoria: pendingCategory,
          setAsCover: setCover,
        });
      }
      setPendingFiles([]);
      setShowPendingCategoryPicker(false);
      await loadAttachments(environment.id);
    } catch (err) {
      setError(describeUploadException(err, { maxBytes: ENVIRONMENT_ATTACHMENT_MAX_BYTES }));
    } finally {
      setUploading(false);
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
                        ? " · escolha o tipo e depois capture"
                        : " · escolha o tipo, capture e confirme o envio"
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
              {canManage && pendingFiles.length > 0 && pendingCategory ? (
                <div className="rounded-xl border-2 border-primary/35 bg-primary/[0.06] p-4 sm:p-5 space-y-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
                        Revisar envio
                      </p>
                      <p className="text-sm sm:text-base font-semibold text-foreground">
                        {pendingFiles.length} arquivo{pendingFiles.length > 1 ? "s" : ""} pronto
                        {pendingFiles.length > 1 ? "s" : ""} para enviar
                      </p>
                      <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                        Confira as miniaturas e a categoria antes de publicar no ambiente.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={clearPendingUpload}
                      className="text-muted-foreground hover:text-foreground p-2 rounded-md cursor-pointer min-h-10 min-w-10 inline-flex items-center justify-center shrink-0"
                      title="Descartar seleção"
                      disabled={uploading}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {pendingPreviewUrls.length > 0 ? (
                    <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-0.5 px-0.5">
                      {pendingPreviewUrls.map((url) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={url}
                          src={url}
                          alt=""
                          className="h-24 w-24 sm:h-28 sm:w-28 rounded-xl object-cover border-2 border-background shadow-sm shrink-0"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border bg-background/80 px-4 py-6 text-center text-xs text-muted-foreground">
                      {pendingFiles.map((f) => f.name).join(", ")}
                    </div>
                  )}

                  <div className="rounded-lg border border-border bg-background p-3 sm:p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Categoria
                        </p>
                        <p className="text-sm font-semibold text-foreground">
                          {attachmentCategoryLabel(pendingCategory)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {CATEGORY_HINTS[pendingCategory]}
                        </p>
                      </div>
                      {!showPendingCategoryPicker ? (
                        <button
                          type="button"
                          onClick={() => setShowPendingCategoryPicker(true)}
                          disabled={uploading}
                          className="text-xs font-semibold text-primary hover:underline cursor-pointer min-h-10 px-2"
                        >
                          Alterar categoria
                        </button>
                      ) : null}
                    </div>

                    {showPendingCategoryPicker ? (
                      <div className="space-y-2 pt-1 border-t border-border">
                        <p className="text-[11px] text-muted-foreground">
                          Escolha outra categoria para este envio:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {ENVIRONMENT_ATTACHMENT_CATEGORIES.map((cat) => {
                            const active = pendingCategory === cat.value;
                            return (
                              <button
                                key={cat.value}
                                type="button"
                                onClick={() => {
                                  setPendingCategory(cat.value);
                                  setWorkCategory(cat.value);
                                  setShowPendingCategoryPicker(false);
                                }}
                                disabled={uploading}
                                className={`inline-flex items-center min-h-9 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors cursor-pointer touch-manipulation ${
                                  active
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-secondary/60 text-muted-foreground border-border hover:text-foreground"
                                }`}
                              >
                                {cat.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="hidden sm:flex gap-2 sm:gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 h-11 text-sm font-semibold touch-manipulation"
                      onClick={clearPendingUpload}
                      disabled={uploading}
                    >
                      Voltar
                    </Button>
                    <Button
                      type="button"
                      className="flex-1 h-11 text-sm font-semibold touch-manipulation"
                      onClick={() => void confirmPendingUpload()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-1.5" />
                      )}
                      Enviar agora
                    </Button>
                  </div>
                </div>
              ) : null}

              {canManage && pendingFiles.length === 0 ? (
                <div className="rounded-xl border border-border bg-secondary/20 p-3 sm:p-5 space-y-4 sm:space-y-5">
                  <div data-tour-id="env-category" className="space-y-2 sm:space-y-3">
                    <div className="space-y-1">
                      <p className="text-xs sm:text-sm font-semibold text-foreground">
                        1. O que você está registrando?
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
                          2. Adicionar arquivos
                        </p>
                        <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                          Registrando como{" "}
                          <strong className="text-foreground">
                            {attachmentCategoryLabel(workCategory)}
                          </strong>
                          . Depois você revisa antes de enviar.
                        </p>
                      </div>
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
                      queueFilesForUpload(e.target.files);
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
                      queueFilesForUpload(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </div>
              ) : null}

              <div data-tour-id="env-filter" className="space-y-2 sm:space-y-3">
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm font-semibold text-foreground">
                    Ver só (filtro da grade)
                  </p>
                  <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                    Organiza o que você vê abaixo. Não altera a categoria do próximo envio.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 sm:gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFilterCategory("ALL")}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border transition-colors cursor-pointer ${
                      filterCategory === "ALL"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    Todas
                    <span
                      className={`min-w-[1.25rem] text-center rounded-full px-1 text-[10px] ${
                        filterCategory === "ALL" ? "bg-white/20" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {attachments.length}
                    </span>
                  </button>
                  {ENVIRONMENT_ATTACHMENT_CATEGORIES.map((cat) => {
                    const count = attachments.filter((a) => a.categoria === cat.value).length;
                    const active = filterCategory === cat.value;
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setFilterCategory(cat.value)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border transition-colors cursor-pointer ${
                          active
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {cat.label}
                        <span
                          className={`min-w-[1.25rem] text-center rounded-full px-1 text-[10px] ${
                            active ? "bg-white/20" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
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
                    Nenhum arquivo neste filtro. Escolha “Todas” ou outra categoria
                    {canManage ? " — ou envie um novo." : "."}
                  </p>
                ) : (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {filteredAttachments.map((file) => {
                      const isCover = capaId === file.id;
                      const image = isImageMime(file.mime_type);
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
                          ) : (
                            <div className="h-28 rounded-lg border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">
                              PDF / documento
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
              {isMobile && canManage && pendingFiles.length > 0 ? (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-12 text-sm font-bold touch-manipulation"
                    onClick={clearPendingUpload}
                    disabled={uploading}
                  >
                    Voltar
                  </Button>
                  <Button
                    type="button"
                    className="flex-[1.4] h-12 text-sm font-bold gap-1.5 touch-manipulation shadow-md"
                    onClick={() => void confirmPendingUpload()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Upload className="h-5 w-5" />
                    )}
                    Enviar agora
                  </Button>
                </div>
              ) : isMobile && canManage && workCategory ? (
                <div data-tour-id={isMobile ? "env-capture" : undefined} className="flex gap-2">
                  <Button
                    type="button"
                    disabled={uploading}
                    onClick={openCamera}
                    className="flex-[1.4] h-12 text-sm font-bold gap-1.5 touch-manipulation shadow-md"
                  >
                    <Camera className="h-5 w-5" />
                    Abrir câmera
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
          queueFilesForUpload([file]);
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
