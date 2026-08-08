"use client";

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { updateEnvironmentStatus } from "@/app/actions/project";
import { updateEnvironmentResponsavel, updateEnvironmentAjudante } from "@/app/actions/colaboradores";
import { getFactoryLiveSnapshot } from "@/app/actions/liveSnapshots";
import { useLiveEntity } from "@/context/LiveSyncContext";
import { Card } from "@/components/ui/card";
import SlaRadar from "@/components/SlaRadar";
import SlaVerificationModal from "@/components/SlaVerificationModal";
import FactoryEnvironmentDetailModal from "@/components/FactoryEnvironmentDetailModal";
import type { ProjectSlaView } from "@/lib/productionSla";
import {
  getClientColor,
  type FactoryBoardEnvironment,
} from "@/lib/factoryEnvironment";
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
  Users,
  ChevronDown,
  ChevronUp,
  ChevronsDownUp,
  ChevronsUpDown,
  FileStack,
  ClipboardCheck,
} from "lucide-react";

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
];

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

function TeamSelect({
  label,
  optional,
  value,
  excludeId,
  colaboradores,
  onChange,
}: {
  label: string;
  optional?: boolean;
  value: string | null | undefined;
  excludeId?: string | null;
  colaboradores: ColaboradorSelect[];
  onChange: (id: string) => void;
}) {
  const selected = colaboradores.find((c) => c.id === value);
  const options = colaboradores.filter((c) => c.id !== excludeId);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
          {label}
          {optional && (
            <span className="ml-1 font-normal normal-case text-muted-foreground/60">(opcional)</span>
          )}
        </span>
        {selected && (
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary"
            title={selected.name}
          >
            {getInitials(selected.name)}
          </span>
        )}
      </div>
      <select
        value={value || "none"}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-8 text-xs font-medium text-foreground bg-secondary/60 border border-border rounded-md px-2 cursor-pointer outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
      >
        <option value="none">{optional ? "Sem ajudante" : "Nenhum"}</option>
        {options.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.cargo})
          </option>
        ))}
      </select>
    </div>
  );
}

export default function FactoryClient({
  initialEnvironments,
  colaboradores,
  slaByProject: initialSlaByProject,
  companyId,
  slaCheckProjectId,
}: FactoryClientProps) {
  const { role } = usePermissions();
  const { isTablet } = useTabletLayout();
  const isFactoryRole = role === "PRODUCAO";
  const compactBoard = isTablet || isFactoryRole;

  const [environments, setEnvironments] = useState<EnvironmentItem[]>(initialEnvironments);
  const [slaByProject, setSlaByProject] = useState(initialSlaByProject);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [didDrag, setDidDrag] = useState(false);
  const [collapsedCards, setCollapsedCards] = useState<Set<string>>(
    () => new Set(initialEnvironments.map((e) => e.id))
  );
  const [expandedStacks, setExpandedStacks] = useState<Set<string>>(() => new Set());
  const knownEnvIdsRef = useRef(new Set(initialEnvironments.map((e) => e.id)));
  const [detailItem, setDetailItem] = useState<EnvironmentItem | null>(null);
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
  });

  useEffect(() => {
    setCollapsedCards((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const env of environments) {
        if (!knownEnvIdsRef.current.has(env.id)) {
          knownEnvIdsRef.current.add(env.id);
          next.add(env.id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [environments]);

  useEffect(() => {
    if (!slaCheckProjectId) return;
    const sla = slaByProject[slaCheckProjectId];
    if (sla) {
      setSlaModal({
        projectId: sla.projectId,
        stageKey: sla.currentStage,
        clientName: sla.clientName,
      });
    }
  }, [slaCheckProjectId, slaByProject]);

  const stacksByColumn = useMemo(() => {
    const result: Record<string, { key: string; projectId: string; items: EnvironmentItem[] }[]> = {};
    for (const col of COLUMNS) {
      const colItems = environments.filter((item) => item.status === col.id);
      const byProject = new Map<string, EnvironmentItem[]>();
      for (const item of colItems) {
        const pid = item.projectId || `loose-${item.id}`;
        const list = byProject.get(pid) ?? [];
        list.push(item);
        byProject.set(pid, list);
      }
      result[col.id] = Array.from(byProject.entries()).map(([projectId, items]) => ({
        key: stackKey(col.id, projectId.startsWith("loose-") ? items[0]?.id ?? projectId : projectId),
        projectId: projectId.startsWith("loose-") ? items[0]?.projectId ?? "" : projectId,
        items,
      }));
    }
    return result;
  }, [environments]);

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
    window.location.reload();
  };

  const toggleCardCollapse = (id: string) => {
    setCollapsedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleStackExpand = (key: string) => {
    setExpandedStacks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleColumnCollapse = (colId: string, itemIds: string[]) => {
    setCollapsedCards((prev) => {
      const allCollapsed = itemIds.length > 0 && itemIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allCollapsed) {
        itemIds.forEach((id) => next.delete(id));
      } else {
        itemIds.forEach((id) => next.add(id));
      }
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

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggedId;
    if (!id) return;

    const item = environments.find((env) => env.id === id);
    if (!item || item.status === targetStatus) return;

    setEnvironments((prev) =>
      prev.map((env) => (env.id === id ? { ...env, status: targetStatus } : env))
    );
    setDraggedId(null);
    setDidDrag(true);
    if (detailItem?.id === id) {
      setDetailItem({ ...detailItem, status: targetStatus });
    }

    await updateEnvironmentStatus(item.projectId, item.id, targetStatus as any);
  };

  const handleCardClick = (item: EnvironmentItem) => {
    if (didDrag || draggedId) return;
    setDetailItem(item);
  };

  const handleProductionStatusChange = async (envId: string, status: string) => {
    const item = environments.find((e) => e.id === envId);
    if (!item || item.status === status) return;

    setEnvironments((prev) =>
      prev.map((env) => (env.id === envId ? { ...env, status } : env))
    );
    if (detailItem?.id === envId) {
      setDetailItem({ ...detailItem, status });
    }

    await updateEnvironmentStatus(item.projectId, envId, status as Parameters<typeof updateEnvironmentStatus>[2]);
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

    const nextStatus = COLUMNS[currentIdx + 1].id;
    setEnvironments((prev) =>
      prev.map((env) => (env.id === item.id ? { ...env, status: nextStatus } : env))
    );

    await updateEnvironmentStatus(item.projectId, item.id, nextStatus as any);
  };

  const renderRoomCard = (
    item: EnvironmentItem,
    col: (typeof COLUMNS)[number],
    options?: { stackedExtra?: number; stackKey?: string; showStackToggle?: boolean }
  ) => {
    const isCollapsed = collapsedCards.has(item.id);
    const clientColor = getClientColor(item.clientId);
    const stackedExtra = options?.stackedExtra ?? 0;

    return (
      <Card
        key={item.id}
        draggable
        onDragStart={(e) => handleDragStart(e, item.id)}
        onDragEnd={handleDragEnd}
        onClick={() => handleCardClick(item)}
        className={cn(
          "factory-card glass-card glass-card-hover overflow-hidden active:scale-[0.98] transition-all duration-200 cursor-pointer relative group",
          draggedId === item.id && "opacity-40 scale-[0.98]",
          clientColor.border,
          clientColor.soft,
          compactBoard ? "border" : "border-2"
        )}
      >
        <div className={cn(compactBoard ? "h-1" : "h-1.5", clientColor.swatch)} />

        <div
          className={cn(
            "factory-card-body bg-card/85",
            compactBoard ? "p-2 space-y-1.5" : "p-3 space-y-2.5"
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
                title="Cor do cliente"
              />
              {item.projectId ? (
                <Link
                  href={`/projects/${item.projectId}`}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "bg-slate-100 hover:bg-slate-200 text-neutral-900 rounded-md font-extrabold tracking-wide inline-flex items-center gap-1 min-w-0 border border-slate-200 transition-colors",
                    compactBoard ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2 py-0.5"
                  )}
                  title={item.clientName}
                >
                  <User className={cn("shrink-0 text-slate-500", compactBoard ? "h-2.5 w-2.5" : "h-3 w-3")} />
                  <span className="truncate">{item.clientName}</span>
                </Link>
              ) : (
                <span
                  className={cn(
                    "bg-slate-100 text-neutral-900 rounded-md font-extrabold tracking-wide inline-flex items-center gap-1 min-w-0 border border-slate-200",
                    compactBoard ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2 py-0.5"
                  )}
                >
                  <User className={cn("shrink-0 text-slate-500", compactBoard ? "h-2.5 w-2.5" : "h-3 w-3")} />
                  <span className="truncate">{item.clientName}</span>
                </span>
              )}
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
                    compactBoard ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-1.5 py-0.5",
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
                  className={cn(
                    "rounded-md transition-all cursor-pointer inline-flex items-center justify-center",
                    compactBoard ? "p-0.5 h-6 w-6" : "p-1.5",
                    clientColor.soft,
                    clientColor.text,
                    `hover:ring-1 ${clientColor.ring}`
                  )}
                  title="Expandir ou recolher pilha"
                >
                  <Layers className={compactBoard ? "h-3 w-3" : "h-3.5 w-3.5"} />
                </button>
              )}
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCardCollapse(item.id);
                }}
                className={cn(
                  "rounded-md transition-all cursor-pointer inline-flex items-center justify-center",
                  compactBoard ? "p-0.5 h-6 w-6" : "p-1.5",
                  clientColor.soft,
                  clientColor.text,
                  `hover:ring-1 ${clientColor.ring}`
                )}
                title={isCollapsed ? "Expandir card" : "Recolher card"}
              >
                {isCollapsed ? (
                  <ChevronDown className={compactBoard ? "h-3 w-3" : "h-3.5 w-3.5"} />
                ) : (
                  <ChevronUp className={compactBoard ? "h-3 w-3" : "h-3.5 w-3.5"} />
                )}
              </button>

              {col.id !== "FINALIZADO" && (
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveRight(item);
                  }}
                  className={cn(
                    "rounded-md transition-all cursor-pointer inline-flex items-center justify-center",
                    compactBoard ? "p-0.5 h-6 w-6" : "p-1.5",
                    clientColor.soft,
                    clientColor.text,
                    `hover:ring-1 ${clientColor.ring}`
                  )}
                  title="Avançar etapa de produção"
                >
                  <ArrowRight className={compactBoard ? "h-3 w-3" : "h-3.5 w-3.5"} />
                </button>
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h4
              className={cn(
                "factory-card-title font-bold text-foreground leading-snug group-hover:text-primary transition-colors",
                compactBoard ? "text-[12.5px]" : "text-[15px] leading-[1.2]"
              )}
            >
              {item.nome}
            </h4>
            {!compactBoard && (
              <p className="text-[10px] text-muted-foreground/80 mt-1">
                Abrir ficha técnica
              </p>
            )}
          </div>

          {(item.materialsSummary || item.hardwareSummary) &&
            !(compactBoard && isCollapsed) && (
            <p
              className={cn(
                "text-muted-foreground",
                compactBoard ? "text-[9px] line-clamp-1" : "text-[10px] line-clamp-2"
              )}
            >
              {item.materialsSummary || item.hardwareSummary}
            </p>
          )}

          {item.projectId && !(compactBoard && isCollapsed) && (
            <SlaRadar
              sla={slaByProject[item.projectId] ?? null}
              compact
              onVerify={() => openSlaVerify(item.projectId)}
            />
          )}

          <div className="flex items-end justify-between gap-2 pt-0.5">
            <div className="flex flex-wrap items-center gap-1 min-w-0">
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-semibold rounded-md",
                  compactBoard ? "text-[9px] px-1 py-0.5" : "text-[10px] px-1.5 py-0.5",
                  item.techSheetComplete
                    ? "bg-emerald-500/10 text-emerald-700"
                    : item.techSheetFilled > 0
                      ? "bg-amber-500/10 text-amber-700"
                      : "bg-secondary text-muted-foreground"
                )}
              >
                <ClipboardCheck className={compactBoard ? "h-2.5 w-2.5" : "h-3 w-3"} />
                Ficha {item.techSheetFilled}/{item.techSheetTotal}
              </span>
              {item.attachmentCount > 0 && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 font-semibold rounded-md bg-secondary text-muted-foreground",
                    compactBoard ? "text-[9px] px-1 py-0.5" : "text-[10px] px-1.5 py-0.5"
                  )}
                >
                  <FileStack className={compactBoard ? "h-2.5 w-2.5" : "h-3 w-3"} />
                  {item.attachmentCount}
                </span>
              )}
            </div>

            {(item.responsavelNome || item.ajudanteNome) && (
              <div className="flex items-center -space-x-1 shrink-0">
                {item.responsavelNome && (
                  <span
                    className={cn(
                      "flex items-center justify-center rounded-full ring-2 ring-card font-bold text-white",
                      compactBoard ? "h-5 w-5 text-[8px]" : "h-6 w-6 text-[9px]",
                      clientColor.swatch
                    )}
                    title={`Responsável: ${item.responsavelNome}`}
                  >
                    {getInitials(item.responsavelNome)}
                  </span>
                )}
                {item.ajudanteNome && (
                  <span
                    className={cn(
                      "flex items-center justify-center rounded-full ring-2 ring-card bg-secondary font-bold text-muted-foreground",
                      compactBoard ? "h-5 w-5 text-[8px]" : "h-6 w-6 text-[9px]"
                    )}
                    title={`Ajudante: ${item.ajudanteNome}`}
                  >
                    {getInitials(item.ajudanteNome)}
                  </span>
                )}
              </div>
            )}
          </div>

          <div
            className={`grid transition-all duration-200 ease-in-out ${
              isCollapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
            }`}
          >
            <div className="overflow-hidden">
              <div
                className={cn(
                  "border-t",
                  clientColor.border,
                  compactBoard ? "space-y-1.5 pt-1.5" : "space-y-2.5 pt-2.5"
                )}
              >
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  <Users className="h-3 w-3" />
                  Equipe
                </div>

                <TeamSelect
                  label="Responsável"
                  value={item.responsavelId}
                  excludeId={item.ajudanteId}
                  colaboradores={colaboradores}
                  onChange={(id) => handleResponsavelChange(item.id, id)}
                />

                <TeamSelect
                  label="Ajudante"
                  optional
                  value={item.ajudanteId}
                  excludeId={item.responsavelId}
                  colaboradores={colaboradores}
                  onChange={(id) => handleAjudanteChange(item.id, id)}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div
      className={cn(
        "factory-board flex-1 min-h-0 flex flex-col overflow-hidden",
        compactBoard ? "space-y-2" : "space-y-[var(--space-3)]"
      )}
    >
      {!isFactoryRole && (
        <p className="factory-intro text-[11px] text-muted-foreground shrink-0 leading-normal">
          Cômodos do mesmo projeto formam uma <strong className="font-semibold text-foreground">pilha</strong> por etapa.
          A cor identifica o cliente. Arraste cômodos individualmente; clique para abrir a{" "}
          <strong className="font-semibold text-foreground">ficha técnica</strong> e detalhes.
        </p>
      )}

      <div className="factory-board-scroll flex-1 min-h-0 overflow-x-auto pb-2 custom-scrollbar">
        <div
          className={cn(
            "flex items-stretch h-full min-w-max print:flex-col print:h-auto print:min-w-0",
            compactBoard ? "gap-2.5" : "gap-4 print:gap-6"
          )}
        >
        {COLUMNS.map((col) => {
          const stacks = stacksByColumn[col.id] ?? [];
          const colItems = stacks.flatMap((stack) => stack.items);
          const Icon = col.icon;
          const colItemIds = colItems.map((item) => item.id);
          const allColCollapsed =
            colItemIds.length > 0 && colItemIds.every((id) => collapsedCards.has(id));

          return (
            <div
              key={col.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
              className={cn(
                "factory-column shrink-0 flex flex-col h-full bg-slate-50 border border-border rounded-xl overflow-hidden shadow-xs print:h-auto print:w-full",
                compactBoard ? "w-[15.5rem] xl:w-[16.5rem]" : "w-72 xl:w-80"
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
                  {colItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleColumnCollapse(col.id, colItemIds)}
                      className={cn(
                        "inline-flex items-center justify-center rounded-md bg-background/60 hover:bg-background text-muted-foreground hover:text-foreground transition-colors cursor-pointer",
                        compactBoard ? "h-6 w-6 p-0.5" : "h-7 w-7 p-1"
                      )}
                      title={allColCollapsed ? "Expandir todos os cards" : "Recolher todos os cards"}
                    >
                      {allColCollapsed ? (
                        <ChevronsUpDown className={compactBoard ? "h-3 w-3" : "h-3.5 w-3.5"} />
                      ) : (
                        <ChevronsDownUp className={compactBoard ? "h-3 w-3" : "h-3.5 w-3.5"} />
                      )}
                    </button>
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
                    Arrastar cômodo para esta fila...
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
                            className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border ${clientColor.border} ${clientColor.soft} text-[10px] font-bold uppercase tracking-wide ${clientColor.text}`}
                          >
                            <span className="flex items-center gap-1.5 min-w-0">
                              <span className={`h-2 w-2 rounded-full ${clientColor.swatch}`} />
                              <span className="truncate">{top.clientName}</span>
                              <span className="opacity-70">· {stack.items.length} cômodos</span>
                            </span>
                            <ChevronUp className="h-3.5 w-3.5 shrink-0" />
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

      {slaModal && (
        <SlaVerificationModal
          projectId={slaModal.projectId}
          stageKey={slaModal.stageKey}
          clientName={slaModal.clientName}
          isOpen
          onClose={() => setSlaModal(null)}
          onSuccess={handleSlaSuccess}
        />
      )}

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
    </div>
  );
}
