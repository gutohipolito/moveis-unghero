"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import SlaRadar from "@/components/SlaRadar";
import {
  PRODUCTION_SLA_STAGES,
  type ProjectSlaView,
  type ProductionSlaStageKey,
  formatSlaDueLabel,
} from "@/lib/productionSla";
import { updateProjectSlaStage } from "@/app/actions/productionSla";
import {
  deleteEnvironmentAttachment,
  getEnvironmentTechSheet,
  listEnvironmentAttachments,
  saveEnvironmentTechSheet,
  setEnvironmentCoverAttachment,
} from "@/app/actions/factoryEnvironment";
import {
  ENVIRONMENT_ATTACHMENT_ACCEPT,
  ENVIRONMENT_ATTACHMENT_ALLOWED_HINT,
  ENVIRONMENT_ATTACHMENT_CATEGORIES,
  ENVIRONMENT_ATTACHMENT_MAX_BYTES,
  attachmentCategoryLabel,
  canManageEnvironmentAttachments,
  countTechSheetFields,
  formatAttachmentSize,
  getClientColor,
  guessEnvironmentAttachmentMime,
  isImageMime,
  isPdfMime,
  summarizeText,
  type EnvironmentAttachmentDTO,
  type FactoryBoardEnvironment,
} from "@/lib/factoryEnvironment";
import { uploadEnvironmentAttachmentFile } from "@/lib/environmentAttachmentUpload";
import { describeUploadException } from "@/lib/uploadErrors";
import PdfCoverThumb from "@/components/PdfCoverThumb";
import type { EnvironmentAttachmentCategory } from "@prisma/client";
import { usePermissions } from "@/context/PermissionsContext";
import {
  ExternalLink,
  Layers,
  User,
  Users,
  ClipboardList,
  Images,
  Factory,
  Upload,
  Star,
  Trash2,
  Download,
  Loader2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const TECH_AUTOSAVE_MS = 900;

type AttachmentFilter = EnvironmentAttachmentCategory | "ALL";
type PreviewTarget = {
  id: string;
  url: string;
  nome: string;
  mime_type: string;
};

export type FactoryEnvironmentItem = FactoryBoardEnvironment;

interface ProductionColumn {
  id: string;
  name: string;
}

interface ColaboradorSelect {
  id: string;
  name: string;
  cargo: string;
}

const TIPO_LABELS: Record<string, string> = {
  COZINHA: "Cozinha",
  CLOSET: "Closet",
  DORMITORIO: "Dormitório",
  BANHEIRO: "Banheiro",
  OUTROS: "Outros",
};

type ModalTab = "ficha" | "arquivos" | "producao" | "comodos";

interface FactoryEnvironmentDetailModalProps {
  item: FactoryEnvironmentItem | null;
  sla: ProjectSlaView | null;
  productionColumns: ProductionColumn[];
  colaboradores: ColaboradorSelect[];
  siblingEnvironments: FactoryEnvironmentItem[];
  onClose: () => void;
  onProductionStatusChange: (envId: string, status: string) => void;
  onResponsavelChange: (envId: string, id: string) => void;
  onAjudanteChange: (envId: string, id: string) => void;
  onBoardPatch: (envId: string, patch: Partial<FactoryEnvironmentItem>) => void;
  onSlaUpdated: (projectId: string, sla: ProjectSlaView) => void;
  onOpenSlaVerify: (projectId: string) => void;
}

export default function FactoryEnvironmentDetailModal({
  item,
  sla,
  productionColumns,
  colaboradores,
  siblingEnvironments,
  onClose,
  onProductionStatusChange,
  onResponsavelChange,
  onAjudanteChange,
  onBoardPatch,
  onSlaUpdated,
  onOpenSlaVerify,
}: FactoryEnvironmentDetailModalProps) {
  const { role, isReadOnly } = usePermissions();
  const canMove = !isReadOnly;
  const canManageAttachments = canManageEnvironmentAttachments(role);
  const [tab, setTab] = useState<ModalTab>("ficha");
  const [slaStageDraft, setSlaStageDraft] = useState<ProductionSlaStageKey | "">("");
  const [savingSla, setSavingSla] = useState(false);
  const [slaError, setSlaError] = useState<string | null>(null);

  const [materiais, setMateriais] = useState("");
  const [ferragens, setFerragens] = useState("");
  const [acabamentos, setAcabamentos] = useState("");
  const [medidas, setMedidas] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [techReady, setTechReady] = useState(false);
  const [savingTech, setSavingTech] = useState(false);
  const [techDirty, setTechDirty] = useState(false);
  const [techMessage, setTechMessage] = useState<string | null>(null);
  const [techError, setTechError] = useState<string | null>(null);
  const lastSavedTechRef = useRef("");
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onBoardPatchRef = useRef(onBoardPatch);
  onBoardPatchRef.current = onBoardPatch;

  const [attachments, setAttachments] = useState<EnvironmentAttachmentDTO[]>([]);
  const [capaId, setCapaId] = useState<string | null>(null);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<AttachmentFilter>("ALL");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingCategory, setPendingCategory] =
    useState<EnvironmentAttachmentCategory>("FOTO");
  const [preview, setPreview] = useState<PreviewTarget | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const techSnapshot = useCallback(
    () =>
      JSON.stringify({
        materiais,
        ferragens,
        acabamentos,
        medidas,
        observacoes,
      }),
    [materiais, ferragens, acabamentos, medidas, observacoes]
  );

  const persistTechSheet = useCallback(
    async (environmentId: string, values: {
      materiais: string;
      ferragens: string;
      acabamentos: string;
      medidas: string;
      observacoes: string;
    }) => {
      setSavingTech(true);
      setTechError(null);
      const result = await saveEnvironmentTechSheet(environmentId, {
        materiais: values.materiais,
        ferragens: values.ferragens,
        acabamentos: values.acabamentos,
        medidas_observacoes: values.medidas,
        observacoes_fabrica: values.observacoes,
      });
      setSavingTech(false);
      if (!result.success) {
        setTechError(result.error);
        setTechDirty(true);
        return false;
      }
      const savedSnapshot = JSON.stringify({
        materiais: result.tech.materiais,
        ferragens: result.tech.ferragens,
        acabamentos: result.tech.acabamentos,
        medidas: result.tech.medidas_observacoes,
        observacoes: result.tech.observacoes_fabrica,
      });
      lastSavedTechRef.current = savedSnapshot;
      setTechDirty(false);
      setTechMessage("Salvo automaticamente");
      onBoardPatchRef.current(environmentId, {
        materiais: result.tech.materiais || null,
        ferragens: result.tech.ferragens || null,
        acabamentos: result.tech.acabamentos || null,
        medidasObservacoes: result.tech.medidas_observacoes || null,
        observacoesFabrica: result.tech.observacoes_fabrica || null,
        materialsSummary: summarizeText(result.tech.materiais),
        hardwareSummary: summarizeText(result.tech.ferragens),
        techSheetFilled: result.fill.filled,
        techSheetTotal: result.fill.total,
        techSheetComplete: result.fill.complete,
      });
      return true;
    },
    []
  );

  useEffect(() => {
    if (!item) return;
    setTab("ficha");
    setSlaStageDraft("");
    setSlaError(null);
    setTechMessage(null);
    setTechError(null);
    setAttachmentError(null);
    setFilterCategory("ALL");
    setPendingFiles([]);
    setPendingCategory("FOTO");
    setPreview(null);
    setTechReady(false);
    setTechDirty(false);
    setMateriais(item.materiais ?? "");
    setFerragens(item.ferragens ?? "");
    setAcabamentos(item.acabamentos ?? "");
    setMedidas(item.medidasObservacoes ?? "");
    setObservacoes(item.observacoesFabrica ?? "");

    let cancelled = false;
    (async () => {
      const result = await getEnvironmentTechSheet(item.id);
      if (cancelled) return;
      if (!result.success) {
        setTechReady(true);
        lastSavedTechRef.current = JSON.stringify({
          materiais: item.materiais ?? "",
          ferragens: item.ferragens ?? "",
          acabamentos: item.acabamentos ?? "",
          medidas: item.medidasObservacoes ?? "",
          observacoes: item.observacoesFabrica ?? "",
        });
        return;
      }
      setMateriais(result.tech.materiais);
      setFerragens(result.tech.ferragens);
      setAcabamentos(result.tech.acabamentos);
      setMedidas(result.tech.medidas_observacoes);
      setObservacoes(result.tech.observacoes_fabrica);
      setCapaId(result.tech.capa_attachment_id);
      lastSavedTechRef.current = JSON.stringify({
        materiais: result.tech.materiais,
        ferragens: result.tech.ferragens,
        acabamentos: result.tech.acabamentos,
        medidas: result.tech.medidas_observacoes,
        observacoes: result.tech.observacoes_fabrica,
      });
      setTechReady(true);
    })();

    return () => {
      cancelled = true;
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [item?.id]);

  useEffect(() => {
    if (!item || !techReady) return;
    const snapshot = techSnapshot();
    if (snapshot === lastSavedTechRef.current) {
      setTechDirty(false);
      return;
    }

    setTechDirty(true);
    setTechMessage(null);
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      void persistTechSheet(item.id, {
        materiais,
        ferragens,
        acabamentos,
        medidas,
        observacoes,
      });
    }, TECH_AUTOSAVE_MS);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [
    item?.id,
    techReady,
    materiais,
    ferragens,
    acabamentos,
    medidas,
    observacoes,
    techSnapshot,
    persistTechSheet,
  ]);

  useEffect(() => {
    if (!item || tab !== "arquivos") return;
    let cancelled = false;
    setLoadingAttachments(true);
    setAttachmentError(null);
    (async () => {
      const result = await listEnvironmentAttachments(item.id);
      if (cancelled) return;
      setLoadingAttachments(false);
      if (!result.success) {
        setAttachmentError(result.error);
        return;
      }
      setAttachments(result.attachments);
      setCapaId(result.capaAttachmentId);
    })();
    return () => {
      cancelled = true;
    };
  }, [item?.id, tab]);

  useEffect(() => {
    if (!preview) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopImmediatePropagation();
        setPreview(null);
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        event.stopImmediatePropagation();
        setPreview((current) => {
          if (!current) return current;
          const list =
            filterCategory === "ALL"
              ? attachments.filter((f) => isImageMime(f.mime_type))
              : attachments.filter(
                  (f) => f.categoria === filterCategory && isImageMime(f.mime_type)
                );
          if (list.length < 2) return current;
          const idx = list.findIndex((f) => f.id === current.id);
          const next = list[(idx - 1 + list.length) % list.length];
          return { id: next.id, url: next.url, nome: next.nome, mime_type: next.mime_type };
        });
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        event.stopImmediatePropagation();
        setPreview((current) => {
          if (!current) return current;
          const list =
            filterCategory === "ALL"
              ? attachments.filter((f) => isImageMime(f.mime_type))
              : attachments.filter(
                  (f) => f.categoria === filterCategory && isImageMime(f.mime_type)
                );
          if (list.length < 2) return current;
          const idx = list.findIndex((f) => f.id === current.id);
          const next = list[(idx + 1) % list.length];
          return { id: next.id, url: next.url, nome: next.nome, mime_type: next.mime_type };
        });
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [preview, attachments, filterCategory]);

  if (!item) return null;

  const currentItem = item;
  const currentProductionCol = productionColumns.find((c) => c.id === currentItem.status);
  const effectiveSlaStage = slaStageDraft || sla?.currentStage || PRODUCTION_SLA_STAGES[0].key;
  const clientColor = getClientColor(item.clientId);
  const fill = countTechSheetFields({
    materiais,
    ferragens,
    acabamentos,
    medidas_observacoes: medidas,
    observacoes_fabrica: observacoes,
  });

  async function handleSaveSlaStage() {
    if (!currentItem.projectId || !effectiveSlaStage) return;
    setSavingSla(true);
    setSlaError(null);
    const result = await updateProjectSlaStage(currentItem.projectId, effectiveSlaStage);
    setSavingSla(false);
    if (!result.success || !result.sla) {
      setSlaError(result.error ?? "Erro ao salvar etapa de SLA.");
      return;
    }
    onSlaUpdated(currentItem.projectId, result.sla);
    setSlaStageDraft("");
  }

  async function handleSaveTechNow() {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    await persistTechSheet(currentItem.id, {
      materiais,
      ferragens,
      acabamentos,
      medidas,
      observacoes,
    });
  }

  function handleModalClose() {
    if (autosaveTimerRef.current && item && techDirty) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
      void persistTechSheet(item.id, {
        materiais,
        ferragens,
        acabamentos,
        medidas,
        observacoes,
      });
    }
    setPreview(null);
    setPendingFiles([]);
    onClose();
  }

  async function handleUpload(files: File[], categoria: EnvironmentAttachmentCategory) {
    if (files.length === 0) return;
    setUploading(true);
    setAttachmentError(null);

    try {
      let nextCount = attachments.length;
      let firstImageAsCover = attachments.length === 0;

      for (const file of files) {
        const mime = guessEnvironmentAttachmentMime(file.name, file.type);
        const setCover = firstImageAsCover && mime.startsWith("image/");
        if (setCover) firstImageAsCover = false;

        const attachment = await uploadEnvironmentAttachmentFile(currentItem.id, file, {
          categoria,
          setAsCover: setCover,
        });

        nextCount += 1;
        setAttachments((prev) => [attachment, ...prev]);
        const factoryPatch =
          categoria === "PROJETO_FABRICA"
            ? {
                hasFactoryProject: true as const,
                ...(isImageMime(mime) ? { hasFactoryProjectImages: true as const } : {}),
                ...(isPdfMime(mime, attachment.nome) && !currentItem.coverUrl && !currentItem.coverPdfUrl
                  ? { coverPdfUrl: attachment.url }
                  : {}),
              }
            : {};
        if (setCover) {
          setCapaId(attachment.id);
          onBoardPatch(currentItem.id, {
            coverUrl: attachment.url,
            attachmentCount: nextCount,
            ...factoryPatch,
          });
        } else {
          onBoardPatch(currentItem.id, { attachmentCount: nextCount, ...factoryPatch });
        }
      }

      setFilterCategory(categoria);
      setPendingFiles([]);
    } catch (error) {
      setAttachmentError(describeUploadException(error, { maxBytes: ENVIRONMENT_ATTACHMENT_MAX_BYTES }));
    } finally {
      setUploading(false);
    }
  }

  function queueFilesForUpload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    setPendingFiles(files);
    setPendingCategory(filterCategory === "ALL" ? "FOTO" : filterCategory);
    setAttachmentError(null);
  }

  async function confirmPendingUpload() {
    if (pendingFiles.length === 0) return;
    await handleUpload(pendingFiles, pendingCategory);
  }

  async function handleDeleteAttachment(attachmentId: string) {
    const result = await deleteEnvironmentAttachment(currentItem.id, attachmentId);
    if (!result.success) {
      setAttachmentError(result.error);
      return;
    }
    const removed = attachments.find((a) => a.id === attachmentId);
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    const nextCapa = capaId === attachmentId ? null : capaId;
    if (capaId === attachmentId) setCapaId(null);
    const nextCover =
      nextCapa
        ? attachments.find((a) => a.id === nextCapa)?.url ?? null
        : attachments.find((a) => a.id !== attachmentId && isImageMime(a.mime_type))?.url ?? null;
    onBoardPatch(currentItem.id, {
      attachmentCount: Math.max(0, (currentItem.attachmentCount || 1) - 1),
      coverUrl: capaId === attachmentId ? nextCover : currentItem.coverUrl,
    });
    void removed;
  }

  async function handleSetCover(attachmentId: string) {
    const result = await setEnvironmentCoverAttachment(currentItem.id, attachmentId);
    if (!result.success) {
      setAttachmentError(result.error);
      return;
    }
    setCapaId(attachmentId);
    const cover = attachments.find((a) => a.id === attachmentId);
    onBoardPatch(currentItem.id, {
      coverUrl: cover?.url ?? null,
      coverPdfUrl: null,
    });
  }

  const tabs: { id: ModalTab; label: string; icon: typeof ClipboardList }[] = [
    { id: "ficha", label: "Ficha técnica", icon: ClipboardList },
    { id: "arquivos", label: "Imagens e arquivos", icon: Images },
    { id: "producao", label: "Produção", icon: Factory },
    { id: "comodos", label: "Outros cômodos", icon: Layers },
  ];

  const filteredAttachments =
    filterCategory === "ALL"
      ? attachments
      : attachments.filter((file) => file.categoria === filterCategory);

  const previewableAttachments = filteredAttachments.filter((file) => isImageMime(file.mime_type));
  const previewIndex = preview
    ? previewableAttachments.findIndex((file) => file.id === preview.id)
    : -1;

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
    if (previewIndex < 0 || previewableAttachments.length === 0) return;
    const next =
      previewableAttachments[
        (previewIndex + delta + previewableAttachments.length) % previewableAttachments.length
      ];
    openPreview(next);
  }

  return (
    <Dialog isOpen={!!item} onClose={handleModalClose} className="max-w-3xl">
      <div className="space-y-4 pr-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`h-2.5 w-2.5 rounded-full ${clientColor.swatch}`} />
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {TIPO_LABELS[item.tipo] || item.tipo}
            </p>
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                fill.complete
                  ? "bg-emerald-500/10 text-emerald-700"
                  : fill.filled > 0
                    ? "bg-amber-500/10 text-amber-700"
                    : "bg-secondary text-muted-foreground"
              }`}
            >
              Ficha {fill.filled}/{fill.total}
            </span>
          </div>
          <h2 className="text-lg font-bold text-foreground leading-snug">{item.nome}</h2>
          <p className="text-sm mt-1 flex items-center gap-1.5 text-foreground">
            <User className="h-3.5 w-3.5 shrink-0" />
            {item.clientName}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 border-b border-border pb-2">
          {tabs.map((entry) => {
            const Icon = entry.icon;
            const active = tab === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => setTab(entry.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {entry.label}
              </button>
            );
          })}
        </div>

        {tab === "ficha" && (
          <section className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] text-muted-foreground">
                Materiais, ferragens e observações de execução deste cômodo — visíveis no card da
                fábrica. As alterações são salvas automaticamente.
              </p>
              <div className="shrink-0 text-[10px] font-semibold whitespace-nowrap">
                {savingTech ? (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Salvando…
                  </span>
                ) : techError ? (
                  <button
                    type="button"
                    onClick={() => void handleSaveTechNow()}
                    className="text-red-700 underline-offset-2 hover:underline"
                  >
                    Erro — tocar para tentar
                  </button>
                ) : techDirty ? (
                  <span className="text-amber-700">Alterações pendentes…</span>
                ) : techMessage ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <Check className="h-3 w-3" />
                    {techMessage}
                  </span>
                ) : techReady ? (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Check className="h-3 w-3" />
                    Salvo
                  </span>
                ) : null}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <label className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Materiais</span>
                <textarea
                  value={materiais}
                  onChange={(e) => setMateriais(e.target.value)}
                  rows={3}
                  placeholder="MDF, cores, espessuras…"
                  className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Ferragens</span>
                <textarea
                  value={ferragens}
                  onChange={(e) => setFerragens(e.target.value)}
                  rows={3}
                  placeholder="Dobradiças, corrediças, puxadores…"
                  className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Acabamentos</span>
                <textarea
                  value={acabamentos}
                  onChange={(e) => setAcabamentos(e.target.value)}
                  rows={2}
                  placeholder="Fitas, pintura, tecido, vidro…"
                  className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">
                  Medidas e cuidados
                </span>
                <textarea
                  value={medidas}
                  onChange={(e) => setMedidas(e.target.value)}
                  rows={2}
                  placeholder="Medidas críticas e cuidados de execução…"
                  className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">
                  Observações de fábrica
                </span>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={2}
                  placeholder="Instruções livres para corte/montagem…"
                  className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
            </div>
            {techError && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-2 py-1.5">
                {techError}
              </p>
            )}
          </section>
        )}

        {tab === "arquivos" && (
          <section className="space-y-4">
            {canManageAttachments ? (
            <div className="rounded-xl border border-border bg-secondary/20 p-3 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Enviar arquivos</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {ENVIRONMENT_ATTACHMENT_ALLOWED_HINT} Depois escolha a categoria.
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
                        {pendingFiles.length} arquivo{pendingFiles.length > 1 ? "s" : ""} pronto
                        {pendingFiles.length > 1 ? "s" : ""} para enviar
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[280px]">
                        {pendingFiles.map((f) => f.name).join(", ")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPendingFiles([])}
                      className="text-muted-foreground hover:text-foreground p-1 rounded-md"
                      title="Cancelar seleção"
                      disabled={uploading}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">
                      Salvar nesta categoria
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
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold border transition-colors ${
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
            ) : (
              <p className="text-xs text-muted-foreground rounded-xl border border-border bg-secondary/20 px-3 py-2.5">
                Somente visualização — o Marceneiro não pode adicionar ou excluir arquivos.
              </p>
            )}

            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">
                Filtrar por categoria
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setFilterCategory("ALL")}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border transition-colors ${
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
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border transition-colors ${
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

            {attachmentError && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-2 py-1.5">
                {attachmentError}
              </p>
            )}

            {loadingAttachments ? (
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando arquivos…
              </p>
            ) : attachments.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum arquivo neste cômodo ainda.</p>
            ) : filteredAttachments.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhum arquivo nesta categoria. Escolha outra ou envie um novo.
              </p>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        <div className="h-28 rounded-lg border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground px-2 text-center">
                          {file.nome.split(".").pop()?.toUpperCase() || "Arquivo"}
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
                        {canManageAttachments && image && (
                          <button
                            type="button"
                            onClick={() => void handleSetCover(file.id)}
                            className="inline-flex items-center gap-1 h-7 px-2 text-[10px] font-semibold rounded-md border border-border hover:bg-secondary cursor-pointer"
                          >
                            <Star className={`h-3 w-3 ${isCover ? "fill-current text-amber-500" : ""}`} />
                            {isCover ? "Capa" : "Definir capa"}
                          </button>
                        )}
                        {canManageAttachments && (
                        <button
                          type="button"
                          onClick={() => void handleDeleteAttachment(file.id)}
                          className="inline-flex items-center gap-1 h-7 px-2 text-[10px] font-semibold rounded-md border border-red-200 text-red-700 hover:bg-red-50 cursor-pointer"
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
          </section>
        )}

        {tab === "producao" && (
          <div className="space-y-4">
            <section className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                Etapa de produção (fábrica)
              </h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                É a coluna do kanban onde o cômodo está. Altere aqui ou arraste o card entre as filas.
              </p>
              <select
                value={item.status}
                disabled={!canMove}
                onChange={(e) => onProductionStatusChange(item.id, e.target.value)}
                className="w-full h-9 text-sm font-medium bg-background border border-border rounded-lg px-3 cursor-pointer outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {productionColumns.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name}
                  </option>
                ))}
              </select>
              {currentProductionCol && (
                <p className="text-[10px] text-muted-foreground">
                  Atual: <span className="font-semibold text-foreground">{currentProductionCol.name}</span>
                </p>
              )}
            </section>

            <section className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Equipe neste cômodo
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">
                    Responsável
                  </label>
                  <select
                    value={item.responsavelId || "none"}
                    disabled={!canMove}
                    onChange={(e) => onResponsavelChange(item.id, e.target.value)}
                    className="w-full h-9 text-xs bg-background border border-border rounded-lg px-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="none">Nenhum</option>
                    {colaboradores
                      .filter((c) => c.id !== item.ajudanteId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.cargo})
                        </option>
                      ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">
                    Ajudante
                  </label>
                  <select
                    value={item.ajudanteId || "none"}
                    disabled={!canMove}
                    onChange={(e) => onAjudanteChange(item.id, e.target.value)}
                    className="w-full h-9 text-xs bg-background border border-border rounded-lg px-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="none">Sem ajudante</option>
                    {colaboradores
                      .filter((c) => c.id !== item.responsavelId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.cargo})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </section>

            {item.projectId && (
              <section className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wide text-foreground">
                      Etapa do radar de prazos (SLA)
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      Vinculada ao <strong>projeto</strong>, não ao cômodo. Inicia ao liberar arquivo para
                      fábrica. Cada etapa tem prazo próprio (não soma com a anterior).
                    </p>
                    <select
                      value={effectiveSlaStage}
                      onChange={(e) => setSlaStageDraft(e.target.value as ProductionSlaStageKey)}
                      className="w-full h-9 text-sm bg-background border border-border rounded-lg px-3 cursor-pointer mt-2"
                    >
                      {PRODUCTION_SLA_STAGES.map((stage) => (
                        <option key={stage.key} value={stage.key}>
                          {stage.name} — SLA {stage.slaDays}d
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={savingSla}
                    onClick={handleSaveSlaStage}
                    className="shrink-0"
                  >
                    {savingSla ? "Salvando..." : "Salvar etapa SLA"}
                  </Button>
                </div>
                {slaError && (
                  <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-2 py-1.5">
                    {slaError}
                  </p>
                )}
                {sla && (
                  <p className="text-[11px] text-muted-foreground">
                    Prazo da etapa atual: <span className="font-semibold">{formatSlaDueLabel(sla)}</span>
                  </p>
                )}
                <SlaRadar sla={sla} onVerify={() => onOpenSlaVerify(item.projectId)} />
              </section>
            )}
          </div>
        )}

        {tab === "comodos" && (
          <section className="rounded-xl border border-border/60 p-3 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Situação dos cômodos deste projeto na fábrica
            </p>
            {siblingEnvironments.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum cômodo listado.</p>
            ) : (
              <ul className="space-y-1.5">
                {siblingEnvironments.map((e) => (
                  <li
                    key={e.id}
                    className={`text-xs flex justify-between gap-2 rounded-md px-2 py-1.5 ${
                      e.id === item.id ? "bg-primary/10 font-semibold" : "text-muted-foreground"
                    }`}
                  >
                    <span className="truncate">{e.nome}</span>
                    <span className="shrink-0 font-medium">
                      {productionColumns.find((c) => c.id === e.status)?.name ?? e.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border">
          {item.projectId && (
            <Link
              href={`/projects/${item.projectId}`}
              onClick={handleModalClose}
              className="inline-flex flex-1 items-center justify-center h-9 px-4 text-sm font-medium rounded-md border border-border bg-background hover:bg-secondary transition-colors"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir projeto completo
            </Link>
          )}
          <Button type="button" variant="secondary" onClick={handleModalClose} className="flex-1 sm:flex-none">
            Fechar
          </Button>
        </div>
      </div>

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
                  {previewIndex >= 0 ? (
                    <span className="text-white/60 font-normal">
                      {" "}
                      · {previewIndex + 1}/{previewableAttachments.length}
                    </span>
                  ) : null}
                </p>
              </div>
            </div>,
            document.body
          )
        : null}
    </Dialog>
  );
}
