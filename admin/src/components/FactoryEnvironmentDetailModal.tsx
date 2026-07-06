"use client";

import { useState } from "react";
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
import { ExternalLink, Layers, User, Users } from "lucide-react";

export interface FactoryEnvironmentItem {
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
  onSlaUpdated,
  onOpenSlaVerify,
}: FactoryEnvironmentDetailModalProps) {
  const [slaStageDraft, setSlaStageDraft] = useState<ProductionSlaStageKey | "">("");
  const [savingSla, setSavingSla] = useState(false);
  const [slaError, setSlaError] = useState<string | null>(null);

  if (!item) return null;

  const currentItem = item;
  const currentProductionCol = productionColumns.find((c) => c.id === currentItem.status);
  const effectiveSlaStage = slaStageDraft || sla?.currentStage || PRODUCTION_SLA_STAGES[0].key;

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

  return (
    <Dialog isOpen={!!item} onClose={onClose} className="max-w-2xl">
      <div className="space-y-5 pr-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
            {TIPO_LABELS[item.tipo] || item.tipo}
          </p>
          <h2 className="text-lg font-bold text-foreground leading-snug">{item.nome}</h2>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 shrink-0" />
            {item.clientName}
          </p>
        </div>

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
              <label className="text-[10px] font-semibold text-muted-foreground uppercase">Responsável</label>
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
              <label className="text-[10px] font-semibold text-muted-foreground uppercase">Ajudante</label>
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
                  Vinculada ao <strong>projeto</strong>, não ao cômodo. Inicia ao liberar arquivo para fábrica.
                  Cada etapa tem prazo próprio (não soma com a anterior).
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

        {siblingEnvironments.length > 1 && (
          <section className="rounded-xl border border-border/60 p-3 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Outros cômodos deste projeto na fábrica
            </p>
            <ul className="space-y-1">
              {siblingEnvironments
                .filter((e) => e.id !== item.id)
                .map((e) => (
                  <li key={e.id} className="text-xs text-muted-foreground flex justify-between gap-2">
                    <span className="truncate">{e.nome}</span>
                    <span className="shrink-0 font-medium">
                      {productionColumns.find((c) => c.id === e.status)?.name ?? e.status}
                    </span>
                  </li>
                ))}
            </ul>
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
