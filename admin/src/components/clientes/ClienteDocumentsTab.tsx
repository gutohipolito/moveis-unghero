"use client";

import React, { useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Camera,
  FileText,
  Home,
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
import { compressImageFile } from "@/lib/imageCompression";
import ClienteCameraModal from "@/components/clientes/ClienteCameraModal";
import { ModalShell } from "@/components/ui/modal-shell";
import InfoTooltip, { TooltipBody } from "@/components/ui/InfoTooltip";

interface ClienteDocumentsTabProps {
  clientId: string;
  attachments: ClientAttachmentDTO[];
  onAttachmentsChange: (attachments: ClientAttachmentDTO[]) => void;
}

async function uploadClientFile(clientId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  // Sempre do cliente — arquivos de projeto ficam só dentro do projeto.

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

export default function ClienteDocumentsTab({
  clientId,
  attachments,
  onAttachmentsChange,
}: ClienteDocumentsTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /** Só anexos do cliente (sem vínculo com projeto). */
  const clientOnly = useMemo(
    () => attachments.filter((a) => !a.project_id),
    [attachments]
  );

  const photos = clientOnly.filter((a) => a.tipo === "FOTO" || isImageMime(a.mime_type));
  const documents = clientOnly.filter(
    (a) => a.tipo === "DOCUMENTO" && !isImageMime(a.mime_type)
  );

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      const uploaded: ClientAttachmentDTO[] = [];
      for (const original of list) {
        const file = await compressImageFile(original);
        const attachment = await uploadClientFile(clientId, file);
        uploaded.push(attachment);
      }
      onAttachmentsChange([...uploaded, ...clientOnly]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar arquivo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
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

  return (
    <div className="space-y-6">
      <Card className="p-5 glass-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-border/40 pb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                <Home className="h-4.5 w-4.5 text-primary" />
                Casa, acesso & documentos
              </h3>
              <InfoTooltip label="Sobre esta aba">
                <TooltipBody
                  title="Do cliente — útil para o montador"
                  items={[
                    "Fotos da casa, fachada, portão, vagas, escadas e passagens — para a equipe saber onde é e como chegar.",
                    "Documentos do cliente (contrato, identidade, etc.).",
                    "Não misture com fotos de ambientes da obra: essas ficam dentro de cada projeto.",
                  ]}
                />
              </InfoTooltip>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed max-w-xl">
              Registre{" "}
              <span className="font-semibold text-foreground">como chegar e acessar a casa</span>{" "}
              (fachada, entrada, dificuldade de passagem) e documentos do cliente. Fotos de
              medição/ambientes da obra ficam no{" "}
              <span className="font-semibold text-foreground">projeto</span>.
            </p>
          </div>
          <span className="text-xs font-bold text-muted-foreground bg-slate-100 px-2.5 py-0.5 rounded-full shrink-0 inline-flex items-center gap-1.5">
            {clientOnly.length} arquivo{clientOnly.length === 1 ? "" : "s"}
            <InfoTooltip label="Contagem desta aba">
              <TooltipBody
                title="Contagem"
                items={[
                  "Só arquivos do cliente (casa, acesso e documentos).",
                  "Arquivos ligados a um projeto não entram neste número.",
                ]}
              />
            </InfoTooltip>
          </span>
        </div>

        <div className="rounded-[var(--radius-md)] border border-sky-200/80 bg-sky-50/70 px-3 py-2.5 text-[11px] text-sky-950/90 leading-relaxed">
          <span className="font-bold">Para o montador:</span> priorize fotos da fachada, número da
          casa, portão, estacionamento e trechos apertados. Assim a equipe reconhece o local e se
          prepara para a entrega/instalação.
        </div>

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

          <div className="inline-flex items-center gap-1">
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
            <InfoTooltip label="Foto de acesso">
              <TooltipBody
                title="O que fotografar"
                items={[
                  "Fachada e número da casa, portão, vaga, escadas, corredores apertados.",
                  "Ajuda o montador a achar o endereço e planejar a entrada dos módulos.",
                  "Fotos dos ambientes (cozinha, quarto…) ficam na galeria do projeto.",
                ]}
              />
            </InfoTooltip>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Formatos aceitos:{" "}
          <span className="font-semibold text-foreground">JPG, PNG, WEBP, HEIC/HEIF e PDF</span> ·
          até{" "}
          <span className="font-semibold text-foreground">
            {Math.round(CLIENT_ATTACHMENT_MAX_BYTES / (1024 * 1024))} MB
          </span>{" "}
          por arquivo.
          <br />
          As imagens são otimizadas automaticamente (até 1600px) para ocupar menos espaço.
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
      </Card>

      <Card className="p-5 glass-card space-y-4">
        <div className="flex items-center gap-1.5">
          <h4 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <ImageIcon className="h-4 w-4 text-primary" />
            Fotos da casa e do acesso
          </h4>
          <InfoTooltip label="Fotos da casa e do acesso">
            <TooltipBody
              title="Para a equipe de montagem"
              items={[
                "Fachada, número, portão, vaga, escadas, elevador e passagens estreitas.",
                "Objetivo: achar a casa e saber se a entrada é fácil ou difícil.",
                "Fotos dos ambientes (cozinha, quarto…) ficam no projeto.",
              ]}
            />
          </InfoTooltip>
        </div>

        {photos.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground border-2 border-dashed border-border/60 rounded-2xl">
            Nenhuma foto de acesso ainda. Tire fotos da fachada e das passagens para o montador
            reconhecer a casa.
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
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5 glass-card space-y-4">
        <div className="flex items-center gap-1.5">
          <h4 className="text-sm font-black text-foreground uppercase tracking-wider">
            Documentos do cliente
          </h4>
          <InfoTooltip label="Documentos do cliente">
            <TooltipBody
              title="PDFs e arquivos"
              items={[
                "Contratos, documentos pessoais, propostas gerais do cliente.",
                "Arquivos técnicos da obra ficam dentro do projeto.",
              ]}
            />
          </InfoTooltip>
        </div>

        {documents.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground border-2 border-dashed border-border/60 rounded-2xl">
            Nenhum PDF ou documento do cliente anexado.
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
                      {formatAttachmentSize(doc.size_bytes) &&
                        `· ${formatAttachmentSize(doc.size_bytes)}`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(doc)}
                  disabled={deletingId === doc.id}
                  className="p-2 rounded-lg text-destructive hover:bg-destructive/10 shrink-0 disabled:opacity-50 self-end sm:self-auto"
                  aria-label="Excluir documento"
                >
                  {deletingId === doc.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
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
