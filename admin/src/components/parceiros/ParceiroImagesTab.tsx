"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  FolderPlus,
  ImageIcon,
  Loader2,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModalShell } from "@/components/ui/modal-shell";
import { FinderFolderIcon } from "@/components/parceiros/FinderFolderIcon";
import { compressImageFile } from "@/lib/imageCompression";
import {
  countPartnerImages,
  imagesInFolder,
  parsePartnerGallery,
  type PartnerGallery,
} from "@/lib/partnerImages";

interface ParceiroImagesTabProps {
  partnerId: string;
  imagensRaw: string | null;
  canManage: boolean;
  onImagensChange: (imagens: string | null) => void;
  showError: (title: string, message: string) => void;
  confirmAction: (opts: {
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void | Promise<void>;
  }) => void;
}

export default function ParceiroImagesTab({
  partnerId,
  imagensRaw,
  canManage,
  onImagensChange,
  showError,
  confirmAction,
}: ParceiroImagesTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const gallery = useMemo(() => parsePartnerGallery(imagensRaw), [imagensRaw]);
  const totalImages = countPartnerImages(imagensRaw);
  const folderImages = openFolder ? imagesInFolder(gallery, openFolder) : [];

  function applyPartner(partner: { imagens?: string | null }, nextGallery?: PartnerGallery) {
    if (typeof partner.imagens !== "undefined") {
      onImagensChange(partner.imagens);
      return;
    }
    if (nextGallery) {
      onImagensChange(
        nextGallery.images.length || nextGallery.folders.length
          ? JSON.stringify(nextGallery)
          : null
      );
    }
  }

  async function createFolder() {
    if (!canManage || !newFolderName.trim()) return;
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("type", "folder");
      formData.append("folder", newFolderName.trim());
      const res = await fetch(`/api/partners/${partnerId}/images`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showError("Não foi possível criar a pasta", data.error || "Tente novamente.");
        return;
      }
      applyPartner(data.partner, data.gallery);
      const created = newFolderName.trim();
      setNewFolderName("");
      setCreatingFolder(false);
      setOpenFolder(created);
    } catch {
      showError("Erro de conexão", "Falha ao criar a pasta.");
    } finally {
      setBusy(false);
    }
  }

  async function renameFolder(from: string) {
    if (!canManage || !renameValue.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/partners/${partnerId}/images`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rename-folder",
          folder: from,
          nextName: renameValue.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showError("Não foi possível renomear", data.error || "Tente novamente.");
        return;
      }
      applyPartner(data.partner, data.gallery);
      if (openFolder === from) setOpenFolder(renameValue.trim());
      setRenamingFolder(null);
      setRenameValue("");
    } catch {
      showError("Erro de conexão", "Falha ao renomear a pasta.");
    } finally {
      setBusy(false);
    }
  }

  function deleteFolder(folder: string) {
    if (!canManage) return;
    const count = imagesInFolder(gallery, folder).length;
    confirmAction({
      title: count ? "Excluir pasta e fotos?" : "Excluir pasta?",
      message: count
        ? `A pasta “${folder}” e ${count} foto${count === 1 ? "" : "s"} serão removidas.`
        : `A pasta “${folder}” será removida.`,
      confirmLabel: "Sim, excluir",
      onConfirm: async () => {
        setBusy(true);
        try {
          const res = await fetch(`/api/partners/${partnerId}/images`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "delete-folder",
              folder,
              deleteImages: true,
            }),
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            showError("Não foi possível excluir", data.error || "Tente novamente.");
            return;
          }
          applyPartner(data.partner, data.gallery);
          if (openFolder === folder) setOpenFolder(null);
        } catch {
          showError("Erro de conexão", "Falha ao excluir a pasta.");
        } finally {
          setBusy(false);
        }
      },
    });
  }

  async function uploadFiles(fileList: FileList | null) {
    if (!canManage || !openFolder || !fileList?.length) return;
    setBusy(true);
    try {
      for (const file of Array.from(fileList)) {
        const compressed = await compressImageFile(file, {
          maxDimension: 1600,
          quality: 0.82,
        });
        const formData = new FormData();
        formData.append("file", compressed, file.name);
        formData.append("type", "galeria");
        formData.append("folder", openFolder);
        const res = await fetch(`/api/partners/${partnerId}/images`, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          showError("Upload falhou", data.error || "Não foi possível enviar a foto.");
          break;
        }
        applyPartner(data.partner, data.gallery);
      }
    } catch {
      showError("Erro de conexão", "Falha ao enviar as fotos.");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function deleteImage(url: string) {
    if (!canManage) return;
    confirmAction({
      title: "Excluir foto?",
      message: "A imagem será removida desta pasta.",
      confirmLabel: "Sim, excluir",
      onConfirm: async () => {
        setBusy(true);
        try {
          const res = await fetch(
            `/api/partners/${partnerId}/images?url=${encodeURIComponent(url)}&avatar=false`,
            { method: "DELETE" }
          );
          const data = await res.json();
          if (!res.ok || !data.success) {
            showError("Não foi possível excluir", data.error || "Tente novamente.");
            return;
          }
          applyPartner(data.partner, data.gallery);
        } catch {
          showError("Erro de conexão", "Falha ao excluir a foto.");
        } finally {
          setBusy(false);
        }
      },
    });
  }

  if (openFolder) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setOpenFolder(null)}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-muted-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-foreground truncate">{openFolder}</h3>
              <p className="text-[11px] text-muted-foreground">
                {folderImages.length} foto{folderImages.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          {canManage && (
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => void uploadFiles(e.target.files)}
              />
              <Button
                type="button"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-bold gap-1.5 btn-metallic h-9"
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                Adicionar fotos
              </Button>
            </div>
          )}
        </div>

        <Card className="p-4 glass-card">
          {folderImages.length === 0 ? (
            <div className="py-14 text-center space-y-2">
              <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Pasta vazia.</p>
              {canManage ? (
                <p className="text-xs text-muted-foreground">
                  Adicione fotos de projetos, renders ou referências.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {folderImages.map((item) => (
                <div
                  key={item.url}
                  className="group relative aspect-square rounded-xl overflow-hidden border border-border/60 bg-slate-50"
                >
                  <button
                    type="button"
                    onClick={() => setPreviewUrl(item.url)}
                    className="absolute inset-0 cursor-pointer"
                  >
                    <img
                      src={item.url}
                      alt=""
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  </button>
                  {canManage && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => deleteImage(item.url)}
                      className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-black/65 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="Excluir foto"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <ModalShell
          open={Boolean(previewUrl)}
          onClose={() => setPreviewUrl(null)}
          panelClassName="max-w-4xl w-full bg-transparent border-none shadow-none"
          bodyClassName="flex items-center justify-center p-0 min-h-[12rem]"
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt=""
              className="max-h-[70vh] w-full object-contain rounded-lg bg-slate-950"
            />
          ) : null}
        </ModalShell>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">Imagens por pastas</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Organize fotos do escritório e das obras como no Finder.
            {totalImages > 0 ? ` ${totalImages} foto${totalImages === 1 ? "" : "s"} no total.` : ""}
          </p>
        </div>
        {canManage && (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => setCreatingFolder(true)}
            className="text-xs font-bold gap-1.5 h-9"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            Nova pasta
          </Button>
        )}
      </div>

      {creatingFolder && canManage && (
        <Card className="p-4 glass-card flex flex-col sm:flex-row gap-2 sm:items-end">
          <div className="flex-1 space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Nome da pasta
            </label>
            <Input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Ex.: Portfólio, Obra Casa Silva…"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void createFolder();
                }
              }}
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCreatingFolder(false);
                setNewFolderName("");
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={busy || !newFolderName.trim()}
              onClick={() => void createFolder()}
              className="btn-metallic"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-5 glass-card">
        {gallery.folders.length === 0 ? (
          <div className="py-14 text-center text-sm text-muted-foreground">
            Nenhuma pasta ainda.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-6">
            {gallery.folders.map((folder) => {
              const imgs = imagesInFolder(gallery, folder);
              const cover = imgs[0]?.url ?? null;
              return (
                <div key={folder} className="group relative">
                  <button
                    type="button"
                    onClick={() => setOpenFolder(folder)}
                    className="w-full text-center cursor-pointer rounded-xl p-2 -m-2 hover:bg-slate-50/80 transition-colors"
                  >
                    <FinderFolderIcon previewUrl={cover} />
                    <span className="mt-2 block text-[12px] font-semibold text-foreground leading-snug line-clamp-2">
                      {folder}
                    </span>
                    <span className="block text-[10px] text-muted-foreground tabular-nums">
                      {imgs.length} item{imgs.length === 1 ? "" : "s"}
                    </span>
                  </button>
                  {canManage && (
                    <div className="absolute top-0 right-0 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        title="Renomear"
                        onClick={() => {
                          setRenamingFolder(folder);
                          setRenameValue(folder);
                        }}
                        className="p-1.5 rounded-lg bg-white border border-border text-muted-foreground hover:text-foreground cursor-pointer shadow-xs"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        title="Excluir pasta"
                        onClick={() => deleteFolder(folder)}
                        className="p-1.5 rounded-lg bg-white border border-border text-muted-foreground hover:text-rose-600 cursor-pointer shadow-xs"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {renamingFolder && canManage && (
        <Card className="p-4 glass-card flex flex-col sm:flex-row gap-2 sm:items-end">
          <div className="flex-1 space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Renomear pasta
            </label>
            <Input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void renameFolder(renamingFolder);
                }
              }}
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRenamingFolder(null);
                setRenameValue("");
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={busy || !renameValue.trim()}
              onClick={() => void renameFolder(renamingFolder)}
              className="btn-metallic"
            >
              Salvar
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
