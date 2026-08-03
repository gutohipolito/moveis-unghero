"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { Camera, Loader2, X } from "lucide-react";

export interface CameraCaptureModalProps {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void | Promise<void>;
  title?: string;
}

export default function CameraCaptureModal({
  open,
  onClose,
  onCapture,
  title = "Capturar foto",
}: CameraCaptureModalProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let active = true;
    setError(null);
    setReady(false);

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch {
        setError(
          "Não foi possível acessar a câmera. Verifique as permissões do navegador ou use a galeria."
        );
      }
    }

    void startCamera();

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [open]);

  async function handleCapture() {
    const video = videoRef.current;
    if (!video || !ready) return;

    setCapturing(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas indisponível");
      ctx.drawImage(video, 0, 0);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.88)
      );
      if (!blob) throw new Error("Falha ao capturar imagem");

      const file = new File([blob], `foto-${Date.now()}.jpg`, { type: "image/jpeg" });
      await onCapture(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao capturar foto");
    } finally {
      setCapturing(false);
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      showClose={false}
      panelClassName="max-w-lg w-full"
      bodyClassName="p-0 flex flex-col"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Camera className="h-4 w-4 text-primary" /> {title}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
          aria-label="Fechar câmera"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="relative aspect-[4/3] bg-black shrink-0">
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
        {!ready && !error ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-white/70" />
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="px-4 py-3 text-xs text-destructive font-medium shrink-0">{error}</p>
      ) : null}

      <div className="flex justify-end gap-2 px-4 py-3 border-t border-border shrink-0">
        <Button type="button" variant="outline" className="text-xs font-bold" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          type="button"
          className="text-xs font-bold gap-1.5 btn-metallic"
          disabled={!ready || capturing}
          onClick={() => void handleCapture()}
        >
          {capturing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
          Salvar foto
        </Button>
      </div>
    </ModalShell>
  );
}
