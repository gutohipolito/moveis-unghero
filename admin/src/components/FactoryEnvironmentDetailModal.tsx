"use client";

import { useEffect, useState } from "react";
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
  ENVIRONMENT_ATTACHMENT_CATEGORIES,
  attachmentCategoryLabel,
  countTechSheetFields,
  formatAttachmentSize,
  getClientColor,
  isImageMime,
  summarizeText,
  type EnvironmentAttachmentDTO,
  type FactoryBoardEnvironment,
} from "@/lib/factoryEnvironment";
import type { EnvironmentAttachmentCategory } from "@prisma/client";
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
} from "lucide-react";

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
  const [tab, setTab] = useState<ModalTab>("ficha");
  const [slaStageDraft, setSlaStageDraft] = useState<ProductionSlaStageKey | "">("");
  const [savingSla, setSavingSla] = useState(false);
  const [slaError, setSlaError] = useState<string | null>(null);

  const [materiais, setMateriais] = useState("");
  const [ferragens, setFerragens] = useState("");
  const [acabamentos, setAcabamentos] = useState("");
  const [medidas, setMedidas] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [savingTech, setSavingTech] = useState(false);
  const [techMessage, setTechMessage] = useState<string | null>(null);
  const [techError, setTechError] = useState<string | null>(null);

  const [attachments, setAttachments] = useState<EnvironmentAttachmentDTO[]>([]);
  const [capaId, setCapaId] = useState<string | null>(null);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] =
    useState<EnvironmentAttachmentCategory>("FOTO");
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  useEffect(() => {
    if (!item) return;
    setTab("ficha");
    setSlaStageDraft("");
    setSlaError(null);
    setTechMessage(null);
    setTechError(null);
    setAttachmentError(null);
    setMateriais(item.materiais ?? "");
    setFerragens(item.ferragens ?? "");
    setAcabamentos(item.acabamentos ?? "");
    setMedidas(item.medidasObservacoes ?? "");
    setObservacoes(item.observacoesFabrica ?? "");

    let cancelled = false;
    (async () => {
      const result = await getEnvironmentTechSheet(item.id);
      if (cancelled || !result.success) return;
      setMateriais(result.tech.materiais);
      setFerragens(result.tech.ferragens);
      setAcabamentos(result.tech.acabamentos);
      setMedidas(result.tech.medidas_observacoes);
      setObservacoes(result.tech.observacoes_fabrica);
      setCapaId(result.tech.capa_attachment_id);
    })();

    return () => {
      cancelled = true;
    };
  }, [item?.id]);

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

  async function handleSaveTech() {
    setSavingTech(true);
    setTechError(null);
    setTechMessage(null);
    const result = await saveEnvironmentTechSheet(currentItem.id, {
      materiais,
      ferragens,
      acabamentos,
      medidas_observacoes: medidas,
      observacoes_fabrica: observacoes,
    });
    setSavingTech(false);
    if (!result.success) {
      setTechError(result.error);
      return;
    }
    setTechMessage("Ficha técnica salva.");
    onBoardPatch(currentItem.id, {
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
  }

  async function handleUpload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setAttachmentError(null);

    try {
      let nextCount = attachments.length;
      let firstImageAsCover = attachments.length === 0;

      for (const file of Array.from(fileList)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("categoria", uploadCategory);
        const setCover = firstImageAsCover && file.type.startsWith("image/");
        if (setCover) {
          formData.append("setAsCover", "true");
          firstImageAsCover = false;
        }

        const response = await fetch(`/api/factory/environments/${currentItem.id}/attachments`, {
          method: "POST",
          body: formData,
        });
        const payload = await response.json();
        if (!payload.success) {
          throw new Error(payload.error || "Falha no upload");
        }

        nextCount += 1;
        setAttachments((prev) => [payload.attachment, ...prev]);
        if (setCover) {
          setCapaId(payload.attachment.id);
          onBoardPatch(currentItem.id, {
            coverUrl: payload.attachment.url,
            attachmentCount: nextCount,
          });
        } else {
          onBoardPatch(currentItem.id, { attachmentCount: nextCount });
        }
      }
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : "Erro no upload");
    } finally {
      setUploading(false);
    }
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
    onBoardPatch(currentItem.id, { coverUrl: cover?.url ?? null });
  }

  const tabs: { id: ModalTab; label: string; icon: typeof ClipboardList }[] = [
    { id: "ficha", label: "Ficha técnica", icon: ClipboardList },
    { id: "arquivos", label: "Imagens e arquivos", icon: Images },
    { id: "producao", label: "Produção", icon: Factory },
    { id: "comodos", label: "Outros cômodos", icon: Layers },
  ];

  return (
    <Dialog isOpen={!!item} onClose={onClose} className="max-w-3xl">
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
          <p className={`text-sm mt-1 flex items-center gap-1.5 ${clientColor.text}`}>
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
            <p className="text-[11px] text-muted-foreground">
              Materiais, ferragens e observações de execução deste cômodo — visíveis no card da fábrica.
            </p>
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
            {techMessage && (
              <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1.5">
                {techMessage}
              </p>
            )}
            <Button type="button" size="sm" disabled={savingTech} onClick={handleSaveTech}>
              {savingTech ? "Salvando…" : "Salvar ficha técnica"}
            </Button>
          </section>
        )}

        {tab === "arquivos" && (
          <section className="space-y-4">
            <div className="rounded-xl border border-border bg-secondary/20 p-3 space-y-3">
              <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                <label className="flex-1 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Categoria</span>
                  <select
                    value={uploadCategory}
                    onChange={(e) =>
                      setUploadCategory(e.target.value as EnvironmentAttachmentCategory)
                    }
                    className="w-full h-9 text-sm bg-background border border-border rounded-lg px-3"
                  >
                    {ENVIRONMENT_ATTACHMENT_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md bg-primary text-primary-foreground cursor-pointer hover:opacity-90">
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {uploading ? "Enviando…" : "Enviar arquivo"}
                  <input
                    type="file"
                    accept={ENVIRONMENT_ATTACHMENT_ACCEPT}
                    multiple
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      void handleUpload(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              <p className="text-[10px] text-muted-foreground">
                JPG, PNG, WEBP ou PDF até 10 MB. Isolado por cômodo e empresa.
              </p>
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
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {attachments.map((file) => {
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
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={file.url}
                          alt={file.nome}
                          className="w-full h-28 object-cover rounded-lg border border-border"
                        />
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
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 h-7 px-2 text-[10px] font-semibold rounded-md border border-border hover:bg-secondary"
                        >
                          <Download className="h-3 w-3" />
                          Abrir
                        </a>
                        {image && (
                          <button
                            type="button"
                            onClick={() => void handleSetCover(file.id)}
                            className="inline-flex items-center gap-1 h-7 px-2 text-[10px] font-semibold rounded-md border border-border hover:bg-secondary"
                          >
                            <Star className={`h-3 w-3 ${isCover ? "fill-current text-amber-500" : ""}`} />
                            {isCover ? "Capa" : "Definir capa"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleDeleteAttachment(file.id)}
                          className="inline-flex items-center gap-1 h-7 px-2 text-[10px] font-semibold rounded-md border border-red-200 text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                          Excluir
                        </button>
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
                onChange={(e) => onProductionStatusChange(item.id, e.target.value)}
                className="w-full h-9 text-sm font-medium bg-background border border-border rounded-lg px-3 cursor-pointer outline-none focus:ring-2 focus:ring-primary/30"
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
                    onChange={(e) => onResponsavelChange(item.id, e.target.value)}
                    className="w-full h-9 text-xs bg-background border border-border rounded-lg px-2 cursor-pointer"
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
                    onChange={(e) => onAjudanteChange(item.id, e.target.value)}
                    className="w-full h-9 text-xs bg-background border border-border rounded-lg px-2 cursor-pointer"
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
              onClick={onClose}
              className="inline-flex flex-1 items-center justify-center h-9 px-4 text-sm font-medium rounded-md border border-border bg-background hover:bg-secondary transition-colors"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir projeto completo
            </Link>
          )}
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1 sm:flex-none">
            Fechar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
