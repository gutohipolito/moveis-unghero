"use client";

import React, { useEffect, useRef, useState } from "react";
import { Camera, FileImage, Loader2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { compressImageFile } from "@/lib/imageCompression";

type Props = {
  open: boolean;
  onClose: () => void;
  currentFotoUrl: string | null;
  partnerName: string;
  onUploaded: (fotoUrl: string) => void;
};

export default function ParceiroAvatarModal({
  open,
  onClose,
  currentFotoUrl,
  partnerName,
  onUploaded,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPendingFile(null);
      setError(null);
      setUploading(false);
      setPreviewUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return null;
      });
    }
  }, [open]);

  const displayUrl = previewUrl || currentFotoUrl;

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPreviewUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setPendingFile(file);
    setError(null);
  };

  const submit = async () => {
    if (!pendingFile) {
      setError("Escolha uma imagem para enviar.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const compressed = await compressImageFile(pendingFile, {
        maxDimension: 1200,
        quality: 0.85,
      });
      const form = new FormData();
      form.append("file", compressed);
      const res = await fetch("/api/parceiro/avatar", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || !data.success || !data.fotoUrl) {
        setError(data.error || "Não foi possível atualizar a foto.");
        return;
      }
      onUploaded(data.fotoUrl);
      onClose();
    } catch {
      setError("Falha de conexão ao enviar a foto.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog
      isOpen={open}
      onClose={() => {
        if (!uploading) onClose();
      }}
      className="parceiro-info-modal max-w-md w-full"
      backdropClassName="parceiro-info-modal-backdrop"
      bodyClassName="max-h-[min(90svh,720px)] overflow-y-auto"
    >
      <div className="space-y-4 pr-10">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 inline-flex items-center gap-1.5">
            <Camera className="h-3.5 w-3.5" />
            Foto de perfil
          </p>
          <h3 className="text-lg font-display font-bold text-slate-900 tracking-tight">
            Alterar foto
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Envie uma foto ou logo profissional.
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[12px] leading-relaxed text-amber-950">
          <p className="font-semibold text-amber-900">Importante</p>
          <p className="mt-1 text-amber-900/90">
            A imagem que você enviar será a mesma que poderá aparecer no{" "}
            <strong>orçamento do cliente</strong>, no card do parceiro, quando a
            exibição no orçamento estiver autorizada nas configurações.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="h-28 w-28 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center shadow-sm">
            {displayUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displayUrl}
                alt={partnerName}
                className="h-full w-full object-cover"
              />
            ) : (
              <FileImage className="h-8 w-8 text-slate-400" />
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onPickFile}
          />
          <Button
            type="button"
            variant="outline"
            className="font-bold h-10"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {pendingFile ? "Trocar arquivo" : "Escolher imagem"}
          </Button>
          {pendingFile ? (
            <p className="text-[11px] text-slate-500 truncate max-w-full">
              {pendingFile.name}
            </p>
          ) : null}
        </div>

        {error ? (
          <p className="text-xs font-semibold text-rose-600">{error}</p>
        ) : null}

        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-1">
          <Button
            type="button"
            variant="outline"
            className="font-bold h-10"
            disabled={uploading}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="font-bold h-10 btn-metallic border-none gap-1.5"
            disabled={uploading || !pendingFile}
            onClick={() => void submit()}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {uploading ? "Enviando…" : "Salvar foto"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
