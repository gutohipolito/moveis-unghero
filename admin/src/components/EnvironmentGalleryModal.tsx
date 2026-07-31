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
  attachmentCategoryLabel,
  formatAttachmentSize,
  isImageMime,
  type EnvironmentAttachmentDTO,
} from "@/lib/factoryEnvironment";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
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
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingCategory, setPendingCategory] =
    useState<EnvironmentAttachmentCategory>("FOTO");
  const [preview, setPreview] = useState<PreviewTarget | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setPendingFiles([]);
      setPreview(null);
      setError(null);
      return;
    }
    void loadAttachments(environment.id);
  }, [environment, loadAttachments]);

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

  function queueFilesForUpload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setPendingFiles(Array.from(fileList));
    setPendingCategory(filterCategory === "ALL" ? "FOTO" : filterCategory);
    setError(null);
  }

  async function confirmPendingUpload() {
    if (!environment || pendingFiles.length === 0 || !canManage) return;
    setUploading(true);
    setError(null);
    try {
      let firstImageAsCover = attachments.length === 0;
      for (const file of pendingFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("categoria", pendingCategory);
        if (firstImageAsCover && file.type.startsWith("image/")) {
          formData.append("setAsCover", "true");
          firstImageAsCover = false;
        }
        const response = await fetch(
          `/api/factory/environments/${environment.id}/attachments`,
          { method: "POST", body: formData }
        );
        const payload = await response.json();
        if (!response.ok || !payload.success) {
          throw new Error(payload.error || "Falha no upload");
        }
      }
      setPendingFiles([]);
      await loadAttachments(environment.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro no upload");
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

  const tipoLabel = environment
    ? TIPO_LABELS[environment.tipo] || environment.tipo
    : "";

  return (
    <>
      <Dialog
        isOpen={Boolean(environment)}
        onClose={onClose}
        className="max-w-3xl"
        bodyClassName="p-0"
      >
        {environment ? (
          <div className="flex flex-col max-h-[min(88dvh,900px)]">
            <div className="shrink-0 border-b border-border px-4 sm:px-5 py-4 space-y-1">
              <div className="flex items-center gap-2 text-primary">
                <Images className="h-4 w-4 shrink-0" />
                <p className="text-[10px] font-bold uppercase tracking-wider">
                  Imagens do ambiente
                </p>
              </div>
              <h3 className="text-lg font-black text-foreground leading-tight break-words">
                {environment.nome}
              </h3>
              <p className="text-xs text-muted-foreground font-medium">
                {tipoLabel}
                {canManage
                  ? " · Você pode adicionar e organizar arquivos"
                  : " · Somente visualização"}
              </p>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-4 space-y-4">
              {canManage && (
                <div className="rounded-xl border border-border bg-secondary/20 p-3 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">
                        Enviar arquivos
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Projeto, conferência, medição, renders… JPG, PNG, WEBP ou PDF até 10 MB.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={uploading || pendingFiles.length > 0}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md bg-primary text-primary-foreground cursor-pointer hover:opacity-90 disabled:opacity-60"
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      {uploading ? "Enviando…" : "Selecionar arquivos"}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ENVIRONMENT_ATTACHMENT_ACCEPT}
                      multiple
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        queueFilesForUpload(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </div>

                  {pendingFiles.length > 0 && (
                    <div className="rounded-lg border border-primary/25 bg-background p-3 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-foreground">
                            {pendingFiles.length} arquivo
                            {pendingFiles.length > 1 ? "s" : ""} para enviar
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[280px]">
                            {pendingFiles.map((f) => f.name).join(", ")}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPendingFiles([])}
                          className="text-muted-foreground hover:text-foreground p-1 rounded-md cursor-pointer"
                          title="Cancelar seleção"
                          disabled={uploading}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">
                          Categoria
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {ENVIRONMENT_ATTACHMENT_CATEGORIES.map((cat) => {
                            const active = pendingCategory === cat.value;
                            return (
                              <button
                                key={cat.value}
                                type="button"
                                onClick={() => setPendingCategory(cat.value)}
                                disabled={uploading}
                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold border transition-colors cursor-pointer ${
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

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 h-9 text-xs font-semibold"
                          onClick={() => setPendingFiles([])}
                          disabled={uploading}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          className="flex-1 h-9 text-xs font-semibold"
                          onClick={() => void confirmPendingUpload()}
                          disabled={uploading}
                        >
                          {uploading ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <Upload className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          Confirmar envio
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">
                  Filtrar por categoria
                </p>
                <div className="flex flex-wrap gap-1.5">
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

              {loading ? (
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando arquivos…
                </p>
              ) : attachments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  Nenhuma imagem ou arquivo neste ambiente ainda.
                  {canManage ? " Use o envio acima para adicionar." : ""}
                </div>
              ) : filteredAttachments.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhum arquivo nesta categoria. Escolha outra
                  {canManage ? " ou envie um novo." : "."}
                </p>
              ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        <div className="flex flex-wrap gap-1">
                          {image ? (
                            <button
                              type="button"
                              onClick={() => openPreview(file)}
                              className="inline-flex items-center gap-1 h-7 px-2 text-[10px] font-semibold rounded-md border border-border hover:bg-secondary cursor-pointer"
                            >
                              Ampliar
                            </button>
                          ) : (
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 h-7 px-2 text-[10px] font-semibold rounded-md border border-border hover:bg-secondary"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Abrir PDF
                            </a>
                          )}
                          <a
                            href={file.url}
                            download={file.nome}
                            className="inline-flex items-center gap-1 h-7 px-2 text-[10px] font-semibold rounded-md border border-border hover:bg-secondary"
                          >
                            <Download className="h-3 w-3" />
                            Baixar
                          </a>
                          {canManage && image && (
                            <button
                              type="button"
                              onClick={() => void handleSetCover(file.id)}
                              className="inline-flex items-center gap-1 h-7 px-2 text-[10px] font-semibold rounded-md border border-border hover:bg-secondary cursor-pointer"
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
                              className="inline-flex items-center gap-1 h-7 px-2 text-[10px] font-semibold rounded-md border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer"
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

            <div className="shrink-0 border-t border-border px-4 sm:px-5 py-3 flex justify-end">
              <Button type="button" variant="secondary" onClick={onClose} className="min-h-10">
                Fechar
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>

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
