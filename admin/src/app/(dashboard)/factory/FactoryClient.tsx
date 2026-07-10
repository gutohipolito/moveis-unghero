"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { updateEnvironmentStatus } from "@/app/actions/project";
import { updateEnvironmentResponsavel, updateEnvironmentAjudante } from "@/app/actions/colaboradores";
import { getFactoryLiveSnapshot } from "@/app/actions/liveSnapshots";
import { useLiveEntity } from "@/context/LiveSyncContext";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import SlaRadar from "@/components/SlaRadar";
import SlaVerificationModal from "@/components/SlaVerificationModal";
import FactoryEnvironmentDetailModal from "@/components/FactoryEnvironmentDetailModal";
import type { ProjectSlaView } from "@/lib/productionSla";
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
} from "lucide-react";

interface EnvironmentItem {
  id: string;
  nome: string;
  tipo: string;
  status: string;
  projectId: string;
  clientName: string;
  responsavelId?: string | null;
  responsavelNome?: string | null;
  ajudanteId?: string | null;
  ajudanteNome?: string | null;
}

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

const TIPO_LABELS: Record<string, string> = {
  COZINHA: "Cozinha",
  CLOSET: "Closet",
  DORMITORIO: "Dormitório",
  BANHEIRO: "Banheiro",
  OUTROS: "Outros",
};

const ENVIRONMENT_ICONS: Record<string, string> = {
  COZINHA: "🍳",
  CLOSET: "👔",
  DORMITORIO: "🛏️",
  BANHEIRO: "🚿",
  OUTROS: "🪵",
};

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

const KANBAN_BOARD_HEIGHT =
  "h-[calc(100dvh-32rem)] max-h-[calc(100dvh-32rem)] md:h-[calc(100dvh-23rem)] md:max-h-[calc(100dvh-23rem)]";

export default function FactoryClient({
  initialEnvironments,
  colaboradores,
  slaByProject: initialSlaByProject,
  companyId,
  slaCheckProjectId,
}: FactoryClientProps) {
  const [environments, setEnvironments] = useState<EnvironmentItem[]>(initialEnvironments);
  const [slaByProject, setSlaByProject] = useState(initialSlaByProject);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [didDrag, setDidDrag] = useState(false);
  const [collapsedCards, setCollapsedCards] = useState<Set<string>>(new Set());
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

    setEnvironments(
      environments.map((env) =>
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

    setEnvironments(
      environments.map((env) =>
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

    setEnvironments(environments.map((env) => (env.id === id ? { ...env, status: targetStatus } : env)));
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

    setEnvironments(
      environments.map((env) => (env.id === envId ? { ...env, status } : env))
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

  const handleMoveRight = async (item: EnvironmentItem) => {
    const currentIdx = COLUMNS.findIndex((col) => col.id === item.status);
    if (currentIdx === -1 || currentIdx === COLUMNS.length - 1) return;

    const nextStatus = COLUMNS[currentIdx + 1].id;
    setEnvironments(environments.map((env) => (env.id === item.id ? { ...env, status: nextStatus } : env)));

    await updateEnvironmentStatus(item.projectId, item.id, nextStatus as any);
  };

  const totalPecas = environments.length;
  const emCorteCount = environments.filter((e) => e.status === "EM_CORTE").length;
  const emMontagemCount = environments.filter((e) => e.status === "MONTAGEM_FABRICA").length;
  const prontoEntregaCount = environments.filter((e) => e.status === "PRONTO_ENTREGA").length;

  return (
    <div className="space-y-[var(--space-5)]">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[var(--space-3)]">
        <KpiCard label="Total na fábrica" value={`${totalPecas} cômodos`} icon={ClipboardList} accent="neutral" />
        <KpiCard label="Em corte" value={`${emCorteCount} cômodos`} icon={Layers} accent="info" />
        <KpiCard label="Em montagem" value={`${emMontagemCount} peças`} icon={Wrench} accent="warning" />
        <KpiCard label="Pronto p/ expedição" value={`${prontoEntregaCount} cômodos`} icon={Package} accent="success" />
      </div>

      <p className="text-xs text-muted-foreground">
        Arraste entre colunas para a <strong className="font-semibold text-foreground">etapa de produção</strong> do cômodo.
        Clique no card para ver e editar equipe, etapa de fábrica e <strong className="font-semibold text-foreground">radar de prazos (SLA)</strong> do projeto.
      </p>

      <div
        className={`kanban-scroll lg:grid lg:grid-cols-3 xl:grid-cols-6 lg:gap-4 lg:overflow-visible lg:pb-0 items-stretch min-h-0 ${KANBAN_BOARD_HEIGHT}`}
      >
        {COLUMNS.map((col) => {
          const colItems = environments.filter((item) => item.status === col.id);
          const Icon = col.icon;
          const colItemIds = colItems.map((item) => item.id);
          const allColCollapsed =
            colItemIds.length > 0 && colItemIds.every((id) => collapsedCards.has(id));

          return (
            <div
              key={col.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
              className="kanban-column lg:w-auto flex flex-col h-full min-h-0 bg-secondary/30 border border-border rounded-xl overflow-hidden"
            >
              <div
                className={`p-3.5 flex items-center justify-between border-b border-border/50 font-bold text-xs uppercase tracking-wider shrink-0 ${col.bg}`}
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{col.name}</span>
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {colItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleColumnCollapse(col.id, colItemIds)}
                      className="p-1 rounded-md bg-background/60 hover:bg-background text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      title={allColCollapsed ? "Expandir todos os cards" : "Recolher todos os cards"}
                    >
                      {allColCollapsed ? (
                        <ChevronsUpDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronsDownUp className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                  <span className="bg-background/80 text-[10px] px-2 py-0.5 rounded-full font-extrabold text-muted-foreground">
                    {colItems.length}
                  </span>
                </div>
              </div>

              <div className="flex-1 min-h-0 p-3 space-y-3 overflow-y-auto scrollbar-thin">
                {colItems.length === 0 ? (
                  <div className="h-full min-h-[8rem] flex items-center justify-center text-center p-6 text-muted-foreground text-[10px]">
                    Arrastar cômodo para esta fila...
                  </div>
                ) : (
                  colItems.map((item) => {
                    const isCollapsed = collapsedCards.has(item.id);

                    return (
                    <Card
                      key={item.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => handleCardClick(item)}
                      className={`glass-card glass-card-hover overflow-hidden border-border/80 active:scale-[0.98] transition-all duration-200 cursor-pointer relative group ${
                        draggedId === item.id ? "opacity-40 scale-[0.98]" : ""
                      }`}
                    >
                      <div className={`h-1 ${col.accent}`} />

                      <div className="p-3.5 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-md font-semibold tracking-wide uppercase inline-flex items-center gap-1">
                              {ENVIRONMENT_ICONS[item.tipo] || "🪵"}{" "}
                              {TIPO_LABELS[item.tipo] || item.tipo}
                            </span>
                            <h4 className="font-bold text-sm text-foreground leading-snug group-hover:text-primary transition-colors">
                              {item.nome}
                            </h4>
                            <p className="text-[10px] text-muted-foreground/80">Clique para detalhes</p>
                          </div>

                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCardCollapse(item.id);
                              }}
                              className="p-1.5 rounded-md bg-secondary hover:bg-primary/15 text-muted-foreground hover:text-primary transition-all cursor-pointer opacity-70 group-hover:opacity-100"
                              title={isCollapsed ? "Expandir card" : "Recolher card"}
                            >
                              {isCollapsed ? (
                                <ChevronDown className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronUp className="h-3.5 w-3.5" />
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
                                className="p-1.5 rounded-md bg-secondary hover:bg-primary/15 text-muted-foreground hover:text-primary transition-all cursor-pointer opacity-70 group-hover:opacity-100"
                                title="Avançar etapa de produção"
                              >
                                <ArrowRight className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                            <User className="h-3 w-3 shrink-0" />
                            {item.projectId ? (
                              <Link
                                href={`/projects/${item.projectId}`}
                                className="truncate font-medium hover:text-primary transition-colors"
                                onPointerDown={(e) => e.stopPropagation()}
                              >
                                {item.clientName}
                              </Link>
                            ) : (
                              <span className="truncate font-medium">{item.clientName}</span>
                            )}
                          </div>

                          {isCollapsed && (item.responsavelNome || item.ajudanteNome) && (
                            <div className="flex items-center gap-1 shrink-0">
                              {item.responsavelNome && (
                                <span
                                  className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary"
                                  title={`Responsável: ${item.responsavelNome}`}
                                >
                                  {getInitials(item.responsavelNome)}
                                </span>
                              )}
                              {item.ajudanteNome && (
                                <span
                                  className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[9px] font-bold text-muted-foreground"
                                  title={`Ajudante: ${item.ajudanteNome}`}
                                >
                                  {getInitials(item.ajudanteNome)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {item.projectId && (
                          <SlaRadar
                            sla={slaByProject[item.projectId] ?? null}
                            compact
                            onVerify={() => openSlaVerify(item.projectId)}
                          />
                        )}

                        <div
                          className={`grid transition-all duration-200 ease-in-out ${
                            isCollapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
                          }`}
                        >
                          <div className="overflow-hidden">
                            <div className="space-y-2.5 pt-2.5 border-t border-border/50">
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
                  })
                )}
              </div>
            </div>
          );
        })}
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
