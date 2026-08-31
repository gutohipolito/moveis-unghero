"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { updateEnvironmentStatus } from "@/app/actions/project";
import { updateEnvironmentResponsavel, updateEnvironmentAjudante } from "@/app/actions/colaboradores";
import { getFactoryLiveSnapshot } from "@/app/actions/liveSnapshots";
import { useLiveEntity } from "@/context/LiveSyncContext";
import { useProjectChatFocus } from "@/context/ProjectChatContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import SlaVerificationModal from "@/components/SlaVerificationModal";
import FactoryEnvironmentDetailModal from "@/components/FactoryEnvironmentDetailModal";
import type { ProjectSlaView } from "@/lib/productionSla";
import {
  formatSlaDueLabel,
  getFactorySlaSeverity,
  getStageConfig,
} from "@/lib/productionSla";
import {
  getClientColor,
  compareFactoryBoardEnvironments,
  formatFactoryBoardDate,
  getPromisedDeliverySeverity,
  sortFactoryBoardEnvironments,
  type FactoryBoardEnvironment,
} from "@/lib/factoryEnvironment";
import ApprovedQuoteSubitens from "@/components/environments/ApprovedQuoteSubitens";
import { usePermissions } from "@/context/PermissionsContext";
import { useTabletLayout } from "@/hooks/useTabletLayout";
import { cn } from "@/lib/utils";
import {
  Layers,
  ArrowRight,
  Package,
  Wrench,
  Truck,
  CheckCircle2,
  ClipboardList,
  User,
  ChevronUp,
  ClipboardCheck,
  AlertTriangle,
  Clock3,
  UserMinus,
  Search,
  Images,
  Flag,
  CalendarDays,
} from "lucide-react";
import PdfCoverThumb from "@/components/PdfCoverThumb";

type EnvironmentItem = FactoryBoardEnvironment;

interface ColaboradorSelect {
  id: string;
  name: string;
  cargo: string;
}

interface FactoryClientProps {
  initialEnvironments: EnvironmentItem[];
  colaboradores: ColaboradorSelect[];
  slaByProject: Record<string, ProjectSlaView>;
  companyId: string;
  currentUserId?: string | null;
  slaCheckProjectId?: string;
}

const COLUMNS = [
  {
    id: "PRONTO_PRODUCAO",
    name: "Fila de Produção",
    bg: "bg-purple-500/10 text-purple-700 border-purple-500/20",
    accent: "bg-gradient-to-r from-purple-500 to-purple-600",
    icon: ClipboardList,
  },
  {
    id: "EM_CORTE",
    name: "Corte / Usinagem",
    bg: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
    accent: "bg-gradient-to-r from-cyan-500 to-cyan-600",
    icon: Layers,
  },
  {
    id: "MONTAGEM_FABRICA",
    name: "Montagem Fábrica",
    bg: "bg-orange-500/10 text-orange-700 border-orange-500/20",
    accent: "bg-gradient-to-r from-orange-500 to-orange-600",
    icon: Wrench,
  },
  {
    id: "PRONTO_ENTREGA",
    name: "Pronto p/ Entrega",
    bg: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    accent: "bg-gradient-to-r from-emerald-500 to-emerald-600",
    icon: Package,
  },
  {
    id: "EM_INSTALACAO",
    name: "Instalação",
    bg: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20",
    accent: "bg-gradient-to-r from-indigo-500 to-indigo-600",
    icon: Truck,
  },
  {
    id: "FINALIZADO",
    name: "Finalizado",
    bg: "bg-slate-500/10 text-slate-600 border-slate-500/20",
    accent: "bg-gradient-to-r from-slate-400 to-slate-500",
    icon: CheckCircle2,
  },
] as const;

/** Coluna única para VIEWER — sem nomes de etapa. */
const VIEWER_COLUMNS = [
  {
    id: "OCULTO",
    name: "Cômodos em produção",
    bg: "bg-slate-500/10 text-slate-700 border-slate-500/20",
    accent: "bg-gradient-to-r from-slate-400 to-slate-500",
    icon: Layers,
  },
] as const;

function stackKey(status: string, projectId: string) {
  return `${status}::${projectId || "sem-projeto"}`;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors min-h-8",
        active
          ? "bg-foreground text-background border-foreground"
          : "bg-background text-muted-foreground border-border hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

export default function FactoryClient({
  initialEnvironments,
  colaboradores,
  slaByProject: initialSlaByProject,
  companyId,
  currentUserId = null,
  slaCheckProjectId,
}: FactoryClientProps) {
  const { role, isReadOnly } = usePermissions();
  const { isTablet } = useTabletLayout();
  const isFactoryRole = role === "PRODUCAO";
  const compactBoard = isTablet || isFactoryRole;
  const canMove = !isReadOnly;
  const boardColumns = isReadOnly ? VIEWER_COLUMNS : COLUMNS;

  const [environments, setEnvironments] = useState<EnvironmentItem[]>(initialEnvironments);
  const [slaByProject, setSlaByProject] = useState(initialSlaByProject);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [didDrag, setDidDrag] = useState(false);
  const [expandedStacks, setExpandedStacks] = useState<Set<string>>(() => new Set());
  const [detailItem, setDetailItem] = useState<EnvironmentItem | null>(null);
  const [mineOnly, setMineOnly] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [clientFilter, setClientFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  useProjectChatFocus(
    detailItem
      ? { projectId: detailItem.projectId, clientName: detailItem.clientName }
      : null
  );
  const [slaModal, setSlaModal] = useState<{
    projectId: string;
    stageKey: string;
    clientName?: string;
  } | null>(null);

  const syncFactory = useCallback(async () => {
    const result = await getFactoryLiveSnapshot(companyId);
    if (result.success && result.environments) {
      setEnvironments(result.environments);
      setSlaByProject(result.slaByProject);
    }
  }, [companyId]);

  useLiveEntity("factory", {
    sync: syncFactory,
    enabled: !draggedId && !detailItem && !slaModal,
    skipInitialSync: true,
  });

  useEffect(() => {
    if (isReadOnly || !slaCheckProjectId) return;
    const sla = slaByProject[slaCheckProjectId];
    if (sla) {
      setSlaModal({
        projectId: sla.projectId,
        stageKey: sla.currentStage,
        clientName: sla.clientName,
      });
    }
  }, [slaCheckProjectId, slaByProject, isReadOnly]);

  const activeEnvironments = useMemo(
    () => environments.filter((item) => item.status !== "FINALIZADO"),
    [environments]
  );

  const clientOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of environments) {
      if (item.clientId) map.set(item.clientId, item.clientName);
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [environments]);

  const exceptions = useMemo(() => {
    const overdue: { projectId: string; clientName: string; label: string }[] = [];
    const due: { projectId: string; clientName: string; label: string }[] = [];
    const seenOverdue = new Set<string>();
    const seenDue = new Set<string>();

    for (const item of activeEnvironments) {
      if (!item.projectId) continue;
      const sla = slaByProject[item.projectId];
      const severity = getFactorySlaSeverity(sla);
      if (severity === "overdue" && !seenOverdue.has(item.projectId)) {
        seenOverdue.add(item.projectId);
        overdue.push({
          projectId: item.projectId,
          clientName: item.clientName,
          label: sla ? formatSlaDueLabel(sla) : "Atrasado",
        });
      }
      if (severity === "due" && !seenDue.has(item.projectId)) {
        seenDue.add(item.projectId);
        due.push({
          projectId: item.projectId,
          clientName: item.clientName,
          label: "Prazo hoje",
        });
      }
    }

    const unassigned = activeEnvironments.filter((item) => !item.responsavelId);
    const incompleteSheet = activeEnvironments.filter(
      (item) => item.status === "EM_CORTE" && !item.techSheetComplete
    );

    return { overdue, due, unassigned, incompleteSheet };
  }, [activeEnvironments, slaByProject]);

  const visibleEnvironments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return environments.filter((item) => {
      if (mineOnly && currentUserId) {
        if (item.responsavelId !== currentUserId && item.ajudanteId !== currentUserId) {
          return false;
        }
      }
      if (unassignedOnly && item.responsavelId) return false;
      if (overdueOnly) {
        const severity = getFactorySlaSeverity(item.projectId ? slaByProject[item.projectId] : null);
        if (severity === "ok") return false;
      }
      if (clientFilter !== "ALL" && item.clientId !== clientFilter) return false;
      if (query) {
        const haystack = `${item.nome} ${item.clientName} ${item.responsavelNome ?? ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [
    environments,
    mineOnly,
    currentUserId,
    unassignedOnly,
    overdueOnly,
    clientFilter,
    search,
    slaByProject,
  ]);

  const stacksByColumn = useMemo(() => {
    const result: Record<string, { key: string; projectId: string; items: EnvironmentItem[] }[]> = {};
    for (const col of boardColumns) {
      const colItems = sortFactoryBoardEnvironments(
        visibleEnvironments.filter((item) => (isReadOnly ? true : item.status === col.id))
      );
      const byProject = new Map<string, EnvironmentItem[]>();
      for (const item of colItems) {
        const pid = item.projectId || `loose-${item.id}`;
        const list = byProject.get(pid) ?? [];
        list.push(item);
        byProject.set(pid, list);
      }
      result[col.id] = Array.from(byProject.entries())
        .map(([projectId, items]) => ({
          key: stackKey(
            col.id,
            projectId.startsWith("loose-") ? items[0]?.id ?? projectId : projectId
          ),
          projectId: projectId.startsWith("loose-") ? items[0]?.projectId ?? "" : projectId,
          items: sortFactoryBoardEnvironments(items),
        }))
        .sort((a, b) => compareFactoryBoardEnvironments(a.items[0]!, b.items[0]!));
    }
    return result;
  }, [visibleEnvironments, boardColumns, isReadOnly]);

  const openSlaVerify = (projectId: string) => {
    const sla = slaByProject[projectId];
    if (!sla) return;
    setSlaModal({
      projectId: sla.projectId,
      stageKey: sla.currentStage,
      clientName: sla.clientName,
    });
  };

  const handleSlaSuccess = () => {
    setSlaModal(null);
    void syncFactory();
  };

  const toggleStackExpand = (key: string) => {
    setExpandedStacks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleResponsavelChange = async (environmentId: string, responsavelId: string) => {
    const cleanId = responsavelId === "none" ? null : responsavelId;
    const selected = colaboradores.find((c) => c.id === cleanId);

    setEnvironments((prev) =>
      prev.map((env) =>
        env.id === environmentId
          ? {
              ...env,
              responsavelId: cleanId,
              responsavelNome: selected?.name ?? null,
              ...(cleanId && env.ajudanteId === cleanId
                ? { ajudanteId: null, ajudanteNome: null }
                : {}),
            }
          : env
      )
    );

    if (cleanId) {
      const env = environments.find((e) => e.id === environmentId);
      if (env?.ajudanteId === cleanId) {
        await updateEnvironmentAjudante(environmentId, null);
      }
    }

    await updateEnvironmentResponsavel(environmentId, cleanId);
  };

  const handleAjudanteChange = async (environmentId: string, ajudanteId: string) => {
    const cleanId = ajudanteId === "none" ? null : ajudanteId;
    const selected = colaboradores.find((c) => c.id === cleanId);

    setEnvironments((prev) =>
      prev.map((env) =>
        env.id === environmentId
          ? { ...env, ajudanteId: cleanId, ajudanteNome: selected?.name ?? null }
          : env
      )
    );

    await updateEnvironmentAjudante(environmentId, cleanId);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (!canMove) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("text/plain", id);
    setDraggedId(id);
    setDidDrag(false);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    window.setTimeout(() => setDidDrag(false), 0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const applyStatusChange = async (item: EnvironmentItem, nextStatus: string) => {
    if (!canMove || item.status === nextStatus) return;
    const previous = item.status;
    const queuePatch =
      nextStatus === "PRONTO_PRODUCAO" && !item.filaEntradaEm
        ? { filaEntradaEm: new Date().toISOString() }
        : {};
    setEnvironments((prev) =>
      prev.map((env) =>
        env.id === item.id ? { ...env, status: nextStatus, ...queuePatch } : env
      )
    );
    if (detailItem?.id === item.id) {
      setDetailItem({ ...detailItem, status: nextStatus, ...queuePatch });
    }
    const result = await updateEnvironmentStatus(
      item.projectId,
      item.id,
      nextStatus as Parameters<typeof updateEnvironmentStatus>[2]
    );
    if (!result.success) {
      setEnvironments((prev) =>
        prev.map((env) => (env.id === item.id ? { ...env, status: previous } : env))
      );
      if (detailItem?.id === item.id) {
        setDetailItem({ ...detailItem, status: previous });
      }
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    if (!canMove) return;
    const id = e.dataTransfer.getData("text/plain") || draggedId;
    if (!id) return;

    const item = environments.find((env) => env.id === id);
    if (!item || item.status === targetStatus) return;
    setDraggedId(null);
    setDidDrag(true);
    await applyStatusChange(item, targetStatus);
  };

  const handleCardClick = (item: EnvironmentItem) => {
    if (isReadOnly) return;
    if (didDrag || draggedId) return;
    setDetailItem(item);
  };

  const handleProductionStatusChange = async (envId: string, status: string) => {
    const item = environments.find((e) => e.id === envId);
    if (!item || item.status === status) return;
    await applyStatusChange(item, status);
  };

  const handleDetailResponsavelChange = async (environmentId: string, responsavelId: string) => {
    await handleResponsavelChange(environmentId, responsavelId);
    const cleanId = responsavelId === "none" ? null : responsavelId;
    const selected = colaboradores.find((c) => c.id === cleanId);
    if (detailItem?.id === environmentId) {
      setDetailItem({
        ...detailItem,
        responsavelId: cleanId,
        responsavelNome: selected?.name ?? null,
      });
    }
  };

  const handleDetailAjudanteChange = async (environmentId: string, ajudanteId: string) => {
    await handleAjudanteChange(environmentId, ajudanteId);
    const cleanId = ajudanteId === "none" ? null : ajudanteId;
    const selected = colaboradores.find((c) => c.id === cleanId);
    if (detailItem?.id === environmentId) {
      setDetailItem({
        ...detailItem,
        ajudanteId: cleanId,
        ajudanteNome: selected?.name ?? null,
      });
    }
  };

  const handleBoardPatch = (envId: string, patch: Partial<EnvironmentItem>) => {
    setEnvironments((prev) =>
      prev.map((env) => (env.id === envId ? { ...env, ...patch } : env))
    );
    if (detailItem?.id === envId) {
      setDetailItem({ ...detailItem, ...patch });
    }
  };

  const handleMoveRight = async (item: EnvironmentItem) => {
    const currentIdx = COLUMNS.findIndex((col) => col.id === item.status);
    if (currentIdx === -1 || currentIdx === COLUMNS.length - 1) return;
    await applyStatusChange(item, COLUMNS[currentIdx + 1].id);
  };

  const renderRoomCard = (
    item: EnvironmentItem,
    col: (typeof boardColumns)[number],
    options?: { stackedExtra?: number; stackKey?: string; showStackToggle?: boolean }
  ) => {
    const clientColor = getClientColor(item.clientId);
    const stackedExtra = options?.stackedExtra ?? 0;
    const sla = !isReadOnly && item.projectId ? slaByProject[item.projectId] ?? null : null;
    const slaSeverity = getFactorySlaSeverity(sla);
    const slaStage = sla ? getStageConfig(sla.currentStage).name : null;
    const promisedSeverity = getPromisedDeliverySeverity(item.dataEntregaAcordada);
    const isPriority = item.prioridadeProducao === "PRIORITARIO";

    return (
      <Card
        key={item.id}
        draggable={canMove}
        onDragStart={(e) => handleDragStart(e, item.id)}
        onDragEnd={handleDragEnd}
        onClick={() => handleCardClick(item)}
        className={cn(
          "factory-card glass-card overflow-hidden active:scale-[0.98] transition-all duration-200 relative group",
          isReadOnly ? "cursor-default" : "glass-card-hover cursor-pointer",
          draggedId === item.id && "opacity-40 scale-[0.98]",
          slaSeverity === "overdue"
            ? "border-red-500/60"
            : slaSeverity === "due"
              ? "border-amber-500/50"
              : isPriority
                ? "border-orange-500/55"
                : promisedSeverity === "overdue"
                  ? "border-red-400/45"
                  : clientColor.border,
          compactBoard ? "border" : "border-2"
        )}
      >
        <div
          className={cn(
            compactBoard ? "h-1" : "h-1.5",
            slaSeverity === "overdue"
              ? "bg-red-500"
              : slaSeverity === "due"
                ? "bg-amber-500"
                : isPriority
                  ? "bg-orange-500"
                  : promisedSeverity === "overdue"
                    ? "bg-red-400"
                    : clientColor.swatch
          )}
        />

        <div
          className={cn(
            "factory-card-body bg-card/85",
            compactBoard ? "p-2 space-y-1.5" : "p-3 space-y-2"
          )}
        >
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span
                className={cn(
                  "shrink-0 rounded-full",
                  compactBoard ? "h-2 w-2" : "h-2.5 w-2.5",
                  clientColor.swatch
                )}
                title="Cliente"
              />
              <span
                className={cn(
                  "bg-slate-100 text-neutral-900 rounded-md font-extrabold tracking-wide inline-flex items-center gap-1 min-w-0 border border-slate-200",
                  compactBoard ? "text-[10px] px-1.5 py-0.5" : "text-[11px] px-2 py-0.5"
                )}
                title={item.clientName}
              >
                <User className={cn("shrink-0 text-slate-500", compactBoard ? "h-2.5 w-2.5" : "h-3 w-3")} />
                <span className="truncate">{item.clientName}</span>
              </span>
              {stackedExtra > 0 && (
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (options?.stackKey) toggleStackExpand(options.stackKey);
                  }}
                  className={cn(
                    "font-extrabold rounded-full text-white shrink-0",
                    compactBoard ? "text-[10px] px-1.5 py-0.5" : "text-[10px] px-1.5 py-0.5",
                    clientColor.swatch
                  )}
                  title="Expandir pilha do projeto"
                >
                  +{stackedExtra}
                </button>
              )}
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              {options?.showStackToggle && options.stackKey && (
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleStackExpand(options.stackKey!);
                  }}
                  className="rounded-md transition-all cursor-pointer inline-flex items-center justify-center min-h-8 min-w-8 bg-background/90 text-foreground border border-border/80 hover:bg-background"
                  title="Expandir ou recolher pilha"
                >
                  <Layers className="h-3.5 w-3.5" />
                </button>
              )}
              {canMove && col.id !== "FINALIZADO" && (
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleMoveRight(item);
                  }}
                  className="rounded-md transition-all cursor-pointer inline-flex items-center justify-center min-h-8 min-w-8 bg-background/90 text-foreground border border-border/80 hover:bg-background"
                  title="Avançar etapa de produção"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-start justify-between gap-2">
            <h4
              className={cn(
                "factory-card-title font-bold text-foreground leading-snug group-hover:text-primary transition-colors min-w-0",
                compactBoard ? "text-[13px]" : "text-[15px] leading-[1.2]"
              )}
            >
              {item.nome}
            </h4>
            <div className="flex flex-col items-end gap-1 shrink-0">
              {isPriority && !isReadOnly && (
                <span className="inline-flex items-center gap-0.5 rounded-md bg-orange-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-orange-800 border border-orange-500/25">
                  <Flag className="h-2.5 w-2.5" />
                  Prioridade
                </span>
              )}
              {(item.coverUrl || item.coverPdfUrl) && !isReadOnly && (
                <span className="h-10 w-10 overflow-hidden rounded-md border border-border bg-slate-100">
                  {item.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.coverUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : item.coverPdfUrl ? (
                    <PdfCoverThumb url={item.coverPdfUrl} className="h-full w-full" />
                  ) : null}
                </span>
              )}
            </div>
          </div>

          {!isReadOnly && (item.hasFactoryProjectImages || item.hasFactoryProject) && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                item.hasFactoryProjectImages
                  ? "bg-emerald-600/95 text-white"
                  : "bg-emerald-500/15 text-emerald-800"
              )}
            >
              <Images className="h-3 w-3" />
              {item.hasFactoryProjectImages ? "Imagens da fábrica" : "Projeto fábrica"}
            </span>
          )}

          {!isReadOnly ? (
            <ApprovedQuoteSubitens
              items={item.approvedSubitens ?? []}
              variant="preview"
              previewLimit={2}
            />
          ) : null}

          {!isReadOnly && (item.filaEntradaEm || item.dataEntregaAcordada) && (
            <div className="space-y-0.5 rounded-md border border-border/40 bg-slate-50/80 px-2 py-1.5">
              {item.filaEntradaEm && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <ClipboardList className="h-3 w-3 shrink-0" />
                  Entrou na fila em:{" "}
                  <span className="font-semibold text-foreground">
                    {formatFactoryBoardDate(item.filaEntradaEm)}
                  </span>
                </p>
              )}
              {item.dataEntregaAcordada && (
                <p className="text-[10px] flex items-center gap-1">
                  <CalendarDays className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span
                    className={cn(
                      "factory-delivery-until-shine font-semibold",
                      promisedSeverity === "overdue"
                        ? "factory-delivery-until-shine--overdue"
                        : promisedSeverity === "due"
                          ? "factory-delivery-until-shine--due"
                          : "factory-delivery-until-shine--ok"
                    )}
                  >
                    Entrega até: {formatFactoryBoardDate(item.dataEntregaAcordada)}
                  </span>
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            {isReadOnly ? (
              <span className="text-[11px] font-semibold text-muted-foreground">—</span>
            ) : item.responsavelNome ? (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground min-w-0"
                title={`Responsável: ${item.responsavelNome}`}
              >
                <span
                  className={cn(
                    "flex items-center justify-center rounded-full font-bold text-white h-6 w-6 text-[9px] shrink-0",
                    clientColor.swatch
                  )}
                >
                  {getInitials(item.responsavelNome)}
                </span>
                <span className="truncate">{item.responsavelNome}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800">
                <UserMinus className="h-3.5 w-3.5" />
                Sem responsável
              </span>
            )}
            {!isReadOnly && !item.techSheetComplete ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-500/10 rounded-md px-1.5 py-0.5 shrink-0">
                <ClipboardCheck className="h-3 w-3" />
                Ficha {item.techSheetFilled}/{item.techSheetTotal}
              </span>
            ) : null}
          </div>

          {sla && slaSeverity !== "ok" ? (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                openSlaVerify(item.projectId);
              }}
              className={cn(
                "w-full text-left rounded-md px-2 py-1 text-[11px] font-semibold",
                slaSeverity === "overdue"
                  ? "bg-red-500/10 text-red-800"
                  : "bg-amber-500/10 text-amber-800"
              )}
            >
              <span className="inline-flex items-center gap-1">
                {slaSeverity === "overdue" ? (
                  <AlertTriangle className="h-3.5 w-3.5" />
                ) : (
                  <Clock3 className="h-3.5 w-3.5" />
                )}
                {formatSlaDueLabel(sla)}
                {slaStage ? ` · ${slaStage}` : ""}
              </span>
            </button>
          ) : null}
        </div>
      </Card>
    );
  };

  return (
    <div
      className={cn(
        "factory-board flex-1 min-h-0 flex flex-col overflow-hidden",
        compactBoard ? "gap-0" : "space-y-[var(--space-3)]"
      )}
    >
      {!compactBoard && !isReadOnly && (
      <div className="shrink-0 space-y-2">
        {(exceptions.overdue.length > 0 ||
          exceptions.due.length > 0 ||
          exceptions.unassigned.length > 0 ||
          exceptions.incompleteSheet.length > 0) && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 px-3 py-2 space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-900">
              Exceções agora
            </p>
            <div className="flex flex-wrap gap-1.5">
              {exceptions.overdue.map((item) => (
                <button
                  key={`overdue-${item.projectId}`}
                  type="button"
                  onClick={() => {
                    setOverdueOnly(true);
                    openSlaVerify(item.projectId);
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-red-500/15 text-red-800 text-[11px] font-semibold px-2 py-1 min-h-8"
                >
                  <AlertTriangle className="h-3 w-3" />
                  {item.clientName} · {item.label}
                </button>
              ))}
              {exceptions.due.map((item) => (
                <button
                  key={`due-${item.projectId}`}
                  type="button"
                  onClick={() => {
                    setOverdueOnly(true);
                    openSlaVerify(item.projectId);
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-900 text-[11px] font-semibold px-2 py-1 min-h-8"
                >
                  <Clock3 className="h-3 w-3" />
                  {item.clientName} · prazo hoje
                </button>
              ))}
              {exceptions.unassigned.length > 0 && (
                <button
                  type="button"
                  onClick={() => setUnassignedOnly(true)}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-500/15 text-slate-800 text-[11px] font-semibold px-2 py-1 min-h-8"
                >
                  <UserMinus className="h-3 w-3" />
                  {exceptions.unassigned.length} sem responsável
                </button>
              )}
              {exceptions.incompleteSheet.map((item) => (
                <button
                  key={`sheet-${item.id}`}
                  type="button"
                  onClick={() => setDetailItem(item)}
                  className="inline-flex items-center gap-1 rounded-full bg-cyan-500/15 text-cyan-900 text-[11px] font-semibold px-2 py-1 min-h-8"
                >
                  <ClipboardCheck className="h-3 w-3" />
                  {item.nome} · ficha incompleta no corte
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cômodo, cliente ou responsável..."
              className="pl-8 h-9 min-h-9 text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {currentUserId && (
              <FilterChip active={mineOnly} onClick={() => setMineOnly((v) => !v)}>
                Meus cômodos
              </FilterChip>
            )}
            <FilterChip active={overdueOnly} onClick={() => setOverdueOnly((v) => !v)}>
              Só atrasados
            </FilterChip>
            <FilterChip active={unassignedOnly} onClick={() => setUnassignedOnly((v) => !v)}>
              Sem responsável
            </FilterChip>
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="h-8 min-h-8 rounded-full border border-border bg-background px-2.5 text-[11px] font-semibold text-muted-foreground"
            >
              <option value="ALL">Todos os clientes</option>
              {clientOptions.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      )}

      <div className="factory-board-scroll flex-1 min-h-0 overflow-x-auto overflow-y-hidden custom-scrollbar">
        <div
          className={cn(
            "flex items-stretch h-full min-w-max print:flex-col print:h-auto print:min-w-0",
            compactBoard ? "gap-3" : "gap-4 print:gap-6"
          )}
        >
        {boardColumns.map((col) => {
          const stacks = stacksByColumn[col.id] ?? [];
          const colItems = stacks.flatMap((stack) => stack.items);
          const Icon = col.icon;
          const colOverdue = colItems.filter((item) => {
            const sla = item.projectId ? slaByProject[item.projectId] : null;
            return getFactorySlaSeverity(sla) === "overdue";
          }).length;

          return (
            <div
              key={col.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
              className={cn(
                "factory-column shrink-0 flex flex-col h-full bg-slate-50 border border-border rounded-xl overflow-hidden shadow-xs print:h-auto print:w-full",
                compactBoard ? "w-[18.5rem]" : "w-72 xl:w-80"
              )}
            >
              <div
                className={cn(
                  "factory-column-header flex items-center justify-between border-b border-border/50 font-bold uppercase tracking-wider shrink-0",
                  compactBoard ? "p-2 text-[10px]" : "p-3.5 text-xs",
                  col.bg
                )}
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <Icon className={cn("shrink-0", compactBoard ? "h-3.5 w-3.5" : "h-4 w-4")} />
                  <span className="truncate">{col.name}</span>
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {colOverdue > 0 && (
                    <span className="bg-red-500/15 text-red-700 text-[10px] px-2 py-0.5 rounded-full font-extrabold">
                      {colOverdue} atraso{colOverdue === 1 ? "" : "s"}
                    </span>
                  )}
                  <span className="bg-background/80 text-[10px] px-2 py-0.5 rounded-full font-extrabold text-muted-foreground">
                    {colItems.length}
                  </span>
                </div>
              </div>

              <div
                className={cn(
                  "factory-column-body flex-1 min-h-0 overflow-y-auto scrollbar-thin",
                  compactBoard ? "p-2 space-y-2" : "p-3 space-y-3"
                )}
              >
                {stacks.length === 0 ? (
                  <div
                    className={cn(
                      "h-full flex items-center justify-center text-center text-muted-foreground text-[10px]",
                      compactBoard ? "min-h-[5rem] p-3" : "min-h-[8rem] p-6"
                    )}
                  >
                    Nenhum cômodo nesta etapa
                  </div>
                ) : (
                  stacks.map((stack) => {
                    const isExpanded = expandedStacks.has(stack.key) || stack.items.length === 1;
                    const top = stack.items[0];
                    const clientColor = getClientColor(top.clientId);

                    if (!isExpanded) {
                      return (
                        <div key={stack.key} className="relative">
                          {stack.items.length > 1 && (
                            <>
                              <div
                                className={`absolute inset-x-2 top-2 h-full rounded-xl border ${clientColor.border} bg-card/70 -z-10 translate-y-1.5 opacity-70`}
                              />
                              <div
                                className={`absolute inset-x-1 top-1 h-full rounded-xl border ${clientColor.border} bg-card/80 -z-10 translate-y-0.5 opacity-85`}
                              />
                            </>
                          )}
                          {renderRoomCard(top, col, {
                            stackedExtra: stack.items.length - 1,
                            stackKey: stack.key,
                            showStackToggle: stack.items.length > 1,
                          })}
                        </div>
                      );
                    }

                    return (
                      <div key={stack.key} className="space-y-2">
                        {stack.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => toggleStackExpand(stack.key)}
                            className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border ${clientColor.border} ${clientColor.soft} text-[10px] font-bold uppercase tracking-wide text-foreground`}
                          >
                            <span className="flex items-center gap-1.5 min-w-0">
                              <span className={`h-2 w-2 rounded-full ${clientColor.swatch}`} />
                              <span className="truncate">{top.clientName}</span>
                              <span className="text-muted-foreground">· {stack.items.length} cômodos</span>
                            </span>
                            <ChevronUp className="h-3.5 w-3.5 shrink-0 text-foreground" />
                          </button>
                        )}
                        {stack.items.map((item) => renderRoomCard(item, col))}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
        </div>
      </div>

      {!isReadOnly && slaModal && (
        <SlaVerificationModal
          projectId={slaModal.projectId}
          stageKey={slaModal.stageKey}
          clientName={slaModal.clientName}
          isOpen
          onClose={() => setSlaModal(null)}
          onSuccess={handleSlaSuccess}
        />
      )}

      {!isReadOnly ? (
        <FactoryEnvironmentDetailModal
          item={detailItem}
          sla={detailItem?.projectId ? slaByProject[detailItem.projectId] ?? null : null}
          productionColumns={COLUMNS.map((c) => ({ id: c.id, name: c.name }))}
          colaboradores={colaboradores}
          siblingEnvironments={
            detailItem
              ? environments.filter((e) => e.projectId === detailItem.projectId)
              : []
          }
          onClose={() => setDetailItem(null)}
          onProductionStatusChange={handleProductionStatusChange}
          onResponsavelChange={handleDetailResponsavelChange}
          onAjudanteChange={handleDetailAjudanteChange}
          onBoardPatch={handleBoardPatch}
          onSlaUpdated={(projectId, updated) => {
            setSlaByProject((prev) => ({ ...prev, [projectId]: updated }));
          }}
          onOpenSlaVerify={(projectId) => {
            setDetailItem(null);
            openSlaVerify(projectId);
          }}
        />
      ) : null}
    </div>
  );
}
