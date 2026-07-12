"use client";

import React, { useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Camera,
  FileText,
  FolderKanban,
  ImageIcon,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import {
  type ClientAttachmentDTO,
  formatAttachmentSize,
  isImageMime,
  CLIENT_ATTACHMENT_MAX_BYTES,
} from "@/lib/clientAttachments";
import { labelProjectStatus } from "@/lib/navLabels";
import { compressImageFile } from "@/lib/imageCompression";
import ClienteCameraModal from "@/components/clientes/ClienteCameraModal";
import { ModalShell } from "@/components/ui/modal-shell";

export interface DocumentsProjectOption {
  id: string;
  status_geral: string;
}

interface ClienteDocumentsTabProps {
  clientId: string;
  attachments: ClientAttachmentDTO[];
  onAttachmentsChange: (attachments: ClientAttachmentDTO[]) => void;
  projects?: DocumentsProjectOption[];
}

const NO_PROJECT = "__none__";

function projectShortLabel(project: DocumentsProjectOption) {
  return `#${project.id.slice(0, 8).toUpperCase()} · ${labelProjectStatus(project.status_geral)}`;
}

async function uploadClientFile(clientId: string, file: File, projectId: string | null) {
  const formData = new FormData();
  formData.append("file", file);
  if (projectId) formData.append("projectId", projectId);

  const response = await fetch(`/api/clients/${clientId}/attachments`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || "Falha no upload");
  }
  return data.attachment as ClientAttachmentDTO;
}

async function updateAttachmentProject(
  clientId: string,
  attachmentId: string,
  projectId: string | null
) {
  const response = await fetch(`/api/clients/${clientId}/attachments`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: attachmentId, projectId }),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || "Falha ao atualizar");
  }
  return data.attachment as ClientAttachmentDTO;
}

async function deleteClientFile(clientId: string, attachmentId: string) {
  const response = await fetch(
    `/api/clients/${clientId}/attachments?id=${encodeURIComponent(attachmentId)}`,
    { method: "DELETE" }
  );
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || "Falha ao excluir");
  }
}

function ProjectPicker({
  value,
  projects,
  onChange,
  disabled,
  className,
}: {
  value: string | null;
  projects: DocumentsProjectOption[];
  onChange: (projectId: string | null) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <select
      value={value ?? ""}
      disabled={disabled}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
      className={`w-full appearance-none bg-slate-50 border border-border rounded-lg text-[11px] font-semibold text-foreground px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary cursor-pointer disabled:opacity-60 ${className ?? ""}`}
    >
      <option value="">Sem projeto (geral)</option>
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {projectShortLabel(p)}
        </option>
      ))}
    </select>
  );
}

export default function ClienteDocumentsTab({
  clientId,
  attachments,
  onAttachmentsChange,
  projects = [],
}: ClienteDocumentsTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reassigningId, setReassigningId] = useState<string | null>(null);

  // Projeto selecionado para novos uploads e filtro da galeria
  const [uploadProjectId, setUploadProjectId] = useState<string | null>(null);
  const [filterProject, setFilterProject] = useState<string>("ALL"); // ALL | NO_PROJECT | projectId

  const counts = useMemo(() => {
    const byProject = new Map<string, number>();
    let unassigned = 0;
    for (const a of attachments) {
      if (a.project_id) byProject.set(a.project_id, (byProject.get(a.project_id) ?? 0) + 1);
      else unassigned += 1;
    }
    return { byProject, unassigned };
  }, [attachments]);

  const visible = useMemo(() => {
    if (filterProject === "ALL") return attachments;
    if (filterProject === NO_PROJECT) return attachments.filter((a) => !a.project_id);
    return attachments.filter((a) => a.project_id === filterProject);
  }, [attachments, filterProject]);

  const photos = visible.filter((a) => a.tipo === "FOTO" || isImageMime(a.mime_type));
  const documents = visible.filter((a) => a.tipo === "DOCUMENTO" && !isImageMime(a.mime_type));

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      const uploaded: ClientAttachmentDTO[] = [];
      for (const original of list) {
        const file = await compressImageFile(original);
        const attachment = await uploadClientFile(clientId, file, uploadProjectId);
        uploaded.push(attachment);
      }
      onAttachmentsChange([...uploaded, ...attachments]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar arquivo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  }

  async function handleReassign(attachment: ClientAttachmentDTO, projectId: string | null) {
    setReassigningId(attachment.id);
    setError(null);
    try {
      const updated = await updateAttachmentProject(clientId, attachment.id, projectId);
      onAttachmentsChange(
        attachments.map((a) => (a.id === updated.id ? updated : a))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar vínculo");
    } finally {
      setReassigningId(null);
    }
  }

  async function handleDelete(attachment: ClientAttachmentDTO) {
    if (!window.confirm(`Excluir "${attachment.nome}"?`)) return;

    setDeletingId(attachment.id);
    setError(null);
    try {
      await deleteClientFile(clientId, attachment.id);
      onAttachmentsChange(attachments.filter((a) => a.id !== attachment.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir");
    } finally {
      setDeletingId(null);
    }
  }

  const filterChips: { key: string; label: string; count: number }[] = [
    { key: "ALL", label: "Todos", count: attachments.length },
    ...projects.map((p) => ({
      key: p.id,
      label: projectShortLabel(p),
      count: counts.byProject.get(p.id) ?? 0,
    })),
    ...(counts.unassigned > 0
      ? [{ key: NO_PROJECT, label: "Sem projeto", count: counts.unassigned }]
      : []),
  ];

  return (
    <div className="space-y-6">
      <Card className="p-5 glass-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
              <ImageIcon className="h-4.5 w-4.5 text-primary" /> Fotos & Documentos
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Envie fotos do local, medições, contratos e PDFs. Vincule cada arquivo a um projeto para manter tudo organizado.
            </p>
          </div>
          <span className="text-xs font-bold text-muted-foreground bg-slate-100 px-2.5 py-0.5 rounded-full shrink-0">
            {attachments.length} arquivo{attachments.length === 1 ? "" : "s"}
          </span>
        </div>

        {/* Seletor de projeto para novos uploads */}
        {projects.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1 shrink-0">
              <FolderKanban className="h-3.5 w-3.5" /> Enviar para
            </span>
            <div className="sm:max-w-xs w-full">
              <ProjectPicker
                value={uploadProjectId}
                projects={projects}
                onChange={setUploadProjectId}
                disabled={uploading}
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="text-xs font-bold gap-1.5"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Enviar arquivo
          </Button>

          <Button
            type="button"
            className="text-xs font-bold gap-1.5 btn-metallic"
            disabled={uploading}
            onClick={() => {
              if (typeof navigator !== "undefined" && /Mobi|Android/i.test(navigator.userAgent)) {
                cameraInputRef.current?.click();
              } else {
                setCameraOpen(true);
              }
            }}
          >
            <Camera className="h-4 w-4" />
            Tirar foto
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Formatos aceitos: <span className="font-semibold text-foreground">JPG, PNG, WEBP, HEIC/HEIF e PDF</span>{" "}
          · até <span className="font-semibold text-foreground">{Math.round(CLIENT_ATTACHMENT_MAX_BYTES / (1024 * 1024))} MB</span> por arquivo.
          <br />
          As imagens são otimizadas automaticamente (redimensionadas para até 1600px) para ocupar menos espaço, sem perda perceptível.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />

        {error ? <p className="text-xs text-destructive font-medium">{error}</p> : null}

        {/* Filtro por projeto */}
        {filterChips.length > 1 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {filterChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => setFilterProject(chip.key)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                  filterProject === chip.key
                    ? "bg-primary/10 border-primary/40 text-primary"
                    : "bg-slate-50 border-slate-200 text-muted-foreground hover:bg-slate-100"
                }`}
              >
                {chip.label}
                <span className="tabular-nums opacity-70">{chip.count}</span>
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5 glass-card space-y-4">
        <h4 className="text-sm font-black text-foreground uppercase tracking-wider">Fotos</h4>

        {photos.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground border-2 border-dashed border-border/60 rounded-2xl">
            Nenhuma foto {filterProject !== "ALL" ? "neste filtro" : "enviada ainda"}. Use &quot;Tirar foto&quot; na visita ou envie imagens do ambiente.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="group rounded-xl border border-border overflow-hidden bg-white flex flex-col"
              >
                <div className="relative aspect-square bg-slate-50">
                  <button
                    type="button"
                    className="absolute inset-0"
                    onClick={() => setPreviewUrl(photo.url)}
                    aria-label={`Visualizar ${photo.nome}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.nome}
                      className="h-full w-full object-cover"
                    />
                  </button>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-8 pointer-events-none">
                    <p className="text-[10px] font-semibold text-white truncate">{photo.nome}</p>
                    <p className="text-[9px] text-white/80">
                      {new Date(photo.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(photo)}
                    disabled={deletingId === photo.id}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                    aria-label="Excluir foto"
                  >
                    {deletingId === photo.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                {projects.length > 0 && (
                  <div className="p-1.5 flex items-center gap-1">
                    <ProjectPicker
                      value={photo.project_id}
                      projects={projects}
                      onChange={(pid) => handleReassign(photo, pid)}
                      disabled={reassigningId === photo.id}
                    />
                    {reassigningId === photo.id && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5 glass-card space-y-4">
        <h4 className="text-sm font-black text-foreground uppercase tracking-wider">Documentos</h4>

        {documents.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground border-2 border-dashed border-border/60 rounded-2xl">
            Nenhum PDF ou documento {filterProject !== "ALL" ? "neste filtro" : "anexado"}.
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-border/60 bg-slate-50/80"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-foreground hover:underline truncate block"
                    >
                      {doc.nome}
                    </a>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(doc.createdAt).toLocaleString("pt-BR")}{" "}
                      {formatAttachmentSize(doc.size_bytes) && `· ${formatAttachmentSize(doc.size_bytes)}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {projects.length > 0 && (
                    <div className="w-44">
                      <ProjectPicker
                        value={doc.project_id}
                        projects={projects}
                        onChange={(pid) => handleReassign(doc, pid)}
                        disabled={reassigningId === doc.id}
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(doc)}
                    disabled={deletingId === doc.id}
                    className="p-2 rounded-lg text-destructive hover:bg-destructive/10 shrink-0 disabled:opacity-50"
                    aria-label="Excluir documento"
                  >
                    {deletingId === doc.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ModalShell
        open={!!previewUrl}
        onClose={() => setPreviewUrl(null)}
        panelClassName="max-w-4xl w-full bg-transparent border-none shadow-none"
        bodyClassName="flex items-center justify-center p-0 min-h-[12rem]"
      >
        {previewUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={previewUrl}
            alt="Visualização ampliada"
            className="max-h-[min(80dvh,calc(100dvh-6rem))] max-w-full rounded-lg object-contain"
          />
        ) : null}
      </ModalShell>

      <ClienteCameraModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={async (file) => {
          setCameraOpen(false);
          await handleFiles([file]);
        }}
      />
    </div>
  );
}
