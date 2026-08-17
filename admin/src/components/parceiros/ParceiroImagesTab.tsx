"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  FolderPlus,
  ImageIcon,
  LayoutGrid,
  List,
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
import { describeUploadException, readUploadResponse } from "@/lib/uploadErrors";
import {
  countPartnerImages,
  imagesInFolder,
  parsePartnerGallery,
  type PartnerGallery,
  type PartnerImageItem,
} from "@/lib/partnerImages";

type BrowseMode = "folders" | "list";
type PhotoMode = "grid" | "list";
type GridCols = 3 | 4 | 5;

const PREFS_KEY = "mu-partner-images-view";
const GRID_COL_CLASS: Record<GridCols, string> = {
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
};

function fileNameFromUrl(url: string) {
  try {
    const last = decodeURIComponent(url.split("/").pop() || "foto");
    return last.replace(/\?.*$/, "") || "foto";
  } catch {
    return "foto";
  }
}

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
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [browseMode, setBrowseMode] = useState<BrowseMode>("folders");
  const [photoMode, setPhotoMode] = useState<PhotoMode>("grid");
  const [gridCols, setGridCols] = useState<GridCols>(3);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PREFS_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        browseMode?: BrowseMode;
        photoMode?: PhotoMode;
        gridCols?: GridCols;
      };
      if (saved.browseMode === "folders" || saved.browseMode === "list") {
        setBrowseMode(saved.browseMode);
      }
      if (saved.photoMode === "grid" || saved.photoMode === "list") {
        setPhotoMode(saved.photoMode);
      }
      if (saved.gridCols === 3 || saved.gridCols === 4 || saved.gridCols === 5) {
        setGridCols(saved.gridCols);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ browseMode, photoMode, gridCols })
    );
  }, [browseMode, photoMode, gridCols]);

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
      const parsed = await readUploadResponse(res);
      if (!parsed.ok) {
        showError("Não foi possível criar a pasta", parsed.error);
        return;
      }
      applyPartner(
        (parsed.json?.partner as { imagens?: string | null }) ?? {},
        parsed.json?.gallery as PartnerGallery | undefined
      );
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
      const parsed = await readUploadResponse(res);
      if (!parsed.ok) {
        showError("Não foi possível renomear", parsed.error);
        return;
      }
      applyPartner(
        (parsed.json?.partner as { imagens?: string | null }) ?? {},
        parsed.json?.gallery as PartnerGallery | undefined
      );
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
    const files = Array.from(fileList).slice(0, 20);
    if (fileList.length > 20) {
      showError(
        "Muitas fotos",
        "Envie no máximo 20 fotos por vez. As primeiras 20 serão enviadas agora."
      );
    }
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("type", "galeria");
      formData.append("folder", openFolder);
      setUploadProgress(
        files.length === 1 ? "Otimizando foto…" : `Otimizando ${files.length} fotos…`
      );
      for (const file of files) {
        const compressed = await compressImageFile(file, {
          maxDimension: 1920,
          quality: 0.8,
        });
        formData.append("file", compressed, compressed.name);
      }
      setUploadProgress(
        files.length === 1 ? "Enviando foto…" : `Enviando ${files.length} fotos…`
      );
      const res = await fetch(`/api/partners/${partnerId}/images`, {
        method: "POST",
        body: formData,
      });
      const parsed = await readUploadResponse(res, {
        allowedHint: "Use JPG, PNG ou WEBP.",
        maxBytes: 10 * 1024 * 1024,
      });
      if (!parsed.ok) {
        showError("Upload falhou", parsed.error);
        return;
      }
      applyPartner(
        (parsed.json?.partner as { imagens?: string | null }) ?? {},
        parsed.json?.gallery as PartnerGallery | undefined
      );
    } catch (error) {
      showError(
        "Upload falhou",
        describeUploadException(error, {
          allowedHint: "Use JPG, PNG ou WEBP.",
          maxBytes: 10 * 1024 * 1024,
        })
      );
    } finally {
      setBusy(false);
      setUploadProgress(null);
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

  function folderActions(folder: string) {
    if (!canManage) return null;
    return (
      <div className="flex gap-0.5 shrink-0">
        <button
          type="button"
          title="Renomear"
          onClick={(e) => {
            e.stopPropagation();
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
          onClick={(e) => {
            e.stopPropagation();
            deleteFolder(folder);
          }}
          className="p-1.5 rounded-lg bg-white border border-border text-muted-foreground hover:text-rose-600 cursor-pointer shadow-xs"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    );
  }

  function renderPhotos(items: PartnerImageItem[]) {
    if (items.length === 0) {
      return (
        <div className="py-14 text-center space-y-2">
          <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Pasta vazia.</p>
          {canManage ? (
            <p className="text-xs text-muted-foreground">
              Adicione fotos de projetos, renders ou referências.
            </p>
          ) : null}
        </div>
      );
    }

    if (photoMode === "list") {
      return (
        <div className="divide-y divide-border/60">
          {items.map((item) => (
            <div
              key={item.url}
              className="flex items-center gap-3 py-2 first:pt-0 last:pb-0"
            >
              <button
                type="button"
                onClick={() => setPreviewUrl(item.url)}
                className="h-12 w-12 shrink-0 rounded-lg overflow-hidden border border-border/60 bg-slate-50 cursor-pointer"
              >
                <img src={item.url} alt="" className="h-full w-full object-cover" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewUrl(item.url)}
                className="min-w-0 flex-1 text-left cursor-pointer"
              >
                <p className="text-xs font-semibold text-foreground truncate">
                  {fileNameFromUrl(item.url)}
                </p>
                <p className="text-[10px] text-muted-foreground">Foto</p>
              </button>
              {canManage && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => deleteImage(item.url)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 cursor-pointer"
                  title="Excluir foto"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className={`grid ${GRID_COL_CLASS[gridCols]} gap-3 min-w-0`}>
        {items.map((item) => (
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
                className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-black/65 text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer"
                title="Excluir foto"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    );
  }

  const previewModal = (
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
  );

  const renameBar =
    renamingFolder && canManage ? (
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
    ) : null;

  if (openFolder) {
    return (
      <div className="space-y-4 min-w-0">
        <div className="flex flex-col gap-3 min-w-0">
          <div className="flex items-start gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setOpenFolder(null)}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-muted-foreground transition-colors cursor-pointer shrink-0"
              aria-label="Voltar às pastas"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-foreground truncate">{openFolder}</h3>
              <p className="text-[11px] text-muted-foreground">
                {folderImages.length} foto{folderImages.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <div className="inline-flex rounded-lg border border-border bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setPhotoMode("grid")}
                className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[11px] font-bold cursor-pointer ${
                  photoMode === "grid"
                    ? "bg-white text-foreground shadow-xs"
                    : "text-muted-foreground"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Grade</span>
              </button>
              <button
                type="button"
                onClick={() => setPhotoMode("list")}
                className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[11px] font-bold cursor-pointer ${
                  photoMode === "list"
                    ? "bg-white text-foreground shadow-xs"
                    : "text-muted-foreground"
                }`}
              >
                <List className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Lista</span>
              </button>
            </div>
            {photoMode === "grid" && (
              <div className="inline-flex rounded-lg border border-border bg-slate-50 p-0.5">
                {([3, 4, 5] as GridCols[]).map((cols) => (
                  <button
                    key={cols}
                    type="button"
                    title={`${cols} por linha`}
                    onClick={() => setGridCols(cols)}
                    className={`h-8 min-w-8 px-2 rounded-md text-[11px] font-bold tabular-nums cursor-pointer ${
                      gridCols === cols
                        ? "bg-white text-foreground shadow-xs"
                        : "text-muted-foreground"
                    }`}
                  >
                    {cols}
                  </button>
                ))}
              </div>
            )}
            {canManage && (
              <>
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
                  title="Selecione várias fotos de uma vez. Elas são otimizadas e convertidas para WebP."
                  className="text-xs font-bold gap-1.5 btn-metallic h-9 flex-1 sm:flex-none"
                >
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  <span className="sm:hidden">Adicionar</span>
                  <span className="hidden sm:inline">Adicionar fotos</span>
                </Button>
              </>
            )}
          </div>
        </div>
        {uploadProgress ? (
          <p className="text-[11px] text-muted-foreground">{uploadProgress}</p>
        ) : null}

        <Card className="p-3 sm:p-4 glass-card">{renderPhotos(folderImages)}</Card>
        {previewModal}
      </div>
    );
  }

  return (
    <div className="space-y-4 min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-foreground">Imagens</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Pastas para organizar fotos do escritório e das obras.
            {totalImages > 0 ? ` ${totalImages} foto${totalImages === 1 ? "" : "s"} no total.` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <div className="inline-flex rounded-lg border border-border bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={() => setBrowseMode("folders")}
              className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[11px] font-bold cursor-pointer ${
                browseMode === "folders"
                  ? "bg-white text-foreground shadow-xs"
                  : "text-muted-foreground"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Pastas
            </button>
            <button
              type="button"
              onClick={() => setBrowseMode("list")}
              className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[11px] font-bold cursor-pointer ${
                browseMode === "list"
                  ? "bg-white text-foreground shadow-xs"
                  : "text-muted-foreground"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              Lista
            </button>
          </div>
          {browseMode === "folders" && (
            <div className="inline-flex rounded-lg border border-border bg-slate-50 p-0.5">
              {([3, 4, 5] as GridCols[]).map((cols) => (
                <button
                  key={cols}
                  type="button"
                  title={`${cols} por linha`}
                  onClick={() => setGridCols(cols)}
                  className={`h-8 min-w-8 px-2 rounded-md text-[11px] font-bold tabular-nums cursor-pointer ${
                    gridCols === cols
                      ? "bg-white text-foreground shadow-xs"
                      : "text-muted-foreground"
                  }`}
                >
                  {cols}
                </button>
              ))}
            </div>
          )}
          {canManage && (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setCreatingFolder(true)}
              className="text-xs font-bold gap-1.5 h-9 w-full sm:w-auto"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              Nova pasta
            </Button>
          )}
        </div>
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

      {renameBar}

      <Card className="p-3 sm:p-5 glass-card overflow-hidden">
        {gallery.folders.length === 0 ? (
          <div className="py-14 text-center text-sm text-muted-foreground">
            Nenhuma pasta ainda.
          </div>
        ) : browseMode === "list" ? (
          <div className="divide-y divide-border/60">
            {gallery.folders.map((folder) => {
              const imgs = imagesInFolder(gallery, folder);
              return (
                <div
                  key={folder}
                  className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0 group"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFolder(folder)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left cursor-pointer"
                  >
                    <div className="h-10 w-10 shrink-0">
                      <FinderFolderIcon />
                    </div>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-foreground truncate">
                        {folder}
                      </span>
                      <span className="block text-[10px] text-muted-foreground tabular-nums">
                        {imgs.length} item{imgs.length === 1 ? "" : "s"}
                      </span>
                    </span>
                  </button>
                  <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    {folderActions(folder)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={`grid ${GRID_COL_CLASS[gridCols]} gap-x-3 sm:gap-x-4 gap-y-5 sm:gap-y-6 min-w-0`}>
            {gallery.folders.map((folder) => {
              const imgs = imagesInFolder(gallery, folder);
              return (
                <div key={folder} className="group relative">
                  <button
                    type="button"
                    onClick={() => setOpenFolder(folder)}
                    className="w-full text-center cursor-pointer rounded-xl p-2 -m-2 hover:bg-slate-50/80 transition-colors"
                  >
                    <FinderFolderIcon />
                    <span className="mt-2 block text-[12px] font-semibold text-foreground leading-snug line-clamp-2">
                      {folder}
                    </span>
                    <span className="block text-[10px] text-muted-foreground tabular-nums">
                      {imgs.length} item{imgs.length === 1 ? "" : "s"}
                    </span>
                  </button>
                  <div className="absolute top-0 right-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    {folderActions(folder)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
