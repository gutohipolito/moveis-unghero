"use client";

import React, { useState } from "react";
import { updateEnvironmentStatus } from "@/app/actions/project";
import { Card } from "@/components/ui/card";
import { 
  Layers, 
  ChevronRight, 
  ArrowRight,
  TrendingUp, 
  Package, 
  Wrench, 
  Truck, 
  CheckCircle2,
  Sparkles,
  ClipboardList
} from "lucide-react";

interface EnvironmentItem {
  id: string;
  nome: string;
  tipo: string;
  status: string;
  projectId: string;
  clientName: string;
}

interface FactoryClientProps {
  initialEnvironments: EnvironmentItem[];
}

const COLUMNS = [
  { id: "PRONTO_PRODUCAO", name: "Fila de Produção", bg: "bg-purple-500/10 text-purple-400 border-purple-500/20", icon: ClipboardList },
  { id: "EM_CORTE", name: "Corte / Usinagem", bg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20", icon: Layers },
  { id: "MONTAGEM_FABRICA", name: "Montagem Fábrica", bg: "bg-orange-500/10 text-orange-400 border-orange-500/20", icon: Wrench },
  { id: "PRONTO_ENTREGA", name: "Pronto p/ Entrega", bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: Package },
  { id: "EM_INSTALACAO", name: "Instalação", bg: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20", icon: Truck },
  { id: "FINALIZADO", name: "Finalizado", bg: "bg-slate-500/10 text-slate-400 border-slate-500/20", icon: CheckCircle2 }
];

const ENVIRONMENT_ICONS: Record<string, string> = {
  COZINHA: "🍳",
  CLOSET: "👔",
  DORMITORIO: "🛏️",
  BANHEIRO: "🚿",
  OUTROS: "🪵"
};

export default function FactoryClient({ initialEnvironments }: FactoryClientProps) {
  const [environments, setEnvironments] = useState<EnvironmentItem[]>(initialEnvironments);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggedId;
    if (!id) return;

    // Atualiza local
    const item = environments.find(env => env.id === id);
    if (!item || item.status === targetStatus) return;

    setEnvironments(environments.map(env => env.id === id ? { ...env, status: targetStatus } : env));
    setDraggedId(null);

    // Salva no banco de dados
    await updateEnvironmentStatus(item.projectId, item.id, targetStatus as any);
  };

  // Mover manual (útil em mobile)
  const handleMoveRight = async (item: EnvironmentItem) => {
    const currentIdx = COLUMNS.findIndex(col => col.id === item.status);
    if (currentIdx === -1 || currentIdx === COLUMNS.length - 1) return;

    const nextStatus = COLUMNS[currentIdx + 1].id;
    setEnvironments(environments.map(env => env.id === item.id ? { ...env, status: nextStatus } : env));
    
    await updateEnvironmentStatus(item.projectId, item.id, nextStatus as any);
  };

  // Estatísticas do painel
  const totalPecas = environments.length;
  const emCorteCount = environments.filter(e => e.status === "EM_CORTE").length;
  const emMontagemCount = environments.filter(e => e.status === "MONTAGEM_FABRICA").length;
  const prontoEntregaCount = environments.filter(e => e.status === "PRONTO_ENTREGA").length;

  return (
    <div className="space-y-6">
      
      {/* Cards de Métricas Operacionais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 glass-card border-border flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-lg">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Total na Fábrica</span>
            <strong className="text-xl text-foreground font-extrabold">{totalPecas} cômodos</strong>
          </div>
        </Card>

        <Card className="p-4 glass-card border-border flex items-center gap-4">
          <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-lg">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Em Corte/Usinagem</span>
            <strong className="text-xl text-foreground font-extrabold">{emCorteCount} cômodos</strong>
          </div>
        </Card>

        <Card className="p-4 glass-card border-border flex items-center gap-4">
          <div className="p-3 bg-orange-500/10 text-orange-400 rounded-lg">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Em Montagem</span>
            <strong className="text-xl text-foreground font-extrabold">{emMontagemCount} peças</strong>
          </div>
        </Card>

        <Card className="p-4 glass-card border-border flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Pronto p/ Expedição</span>
            <strong className="text-xl text-foreground font-extrabold">{prontoEntregaCount} cômodos</strong>
          </div>
        </Card>
      </div>

      {/* Grid de Colunas Kanban de Produção */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-start">
        {COLUMNS.map(col => {
          const colItems = environments.filter(item => item.status === col.id);
          const Icon = col.icon;
          
          return (
            <div 
              key={col.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
              className="flex flex-col bg-slate-50 border border-border rounded-xl overflow-hidden min-h-[480px]"
            >
              {/* Cabeçalho da Coluna */}
              <div className={`p-3.5 flex items-center justify-between border-b border-border/50 bg-slate-50 ${col.bg} font-bold text-xs uppercase tracking-wider`}>
                <span className="flex items-center gap-1.5">
                  <Icon className="h-4 w-4" />
                  {col.name}
                </span>
                <span className="bg-secondary text-[10px] px-2 py-0.5 rounded-full font-extrabold text-muted-foreground">
                  {colItems.length}
                </span>
              </div>

              {/* Lista de Cards da Coluna */}
              <div className="flex-1 p-3 space-y-3 max-h-[500px] overflow-y-auto scrollbar-thin">
                {colItems.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center p-6 text-muted-foreground text-[10px]">
                    Arrastar cômodo para esta fila...
                  </div>
                ) : (
                  colItems.map(item => (
                    <Card
                      key={item.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item.id)}
                      className={`p-3 glass-card hover:border-primary/30 active:scale-[0.97] transition-all duration-200 cursor-grab active:cursor-grabbing space-y-2.5 relative group ${
                        draggedId === item.id ? "opacity-30" : ""
                      }`}
                    >
                      <div className="space-y-1">
                        <span className="text-[9px] bg-secondary/80 text-muted-foreground px-1.5 py-0.2 rounded font-semibold tracking-wide uppercase inline-flex items-center gap-1">
                          {ENVIRONMENT_ICONS[item.tipo] || "🪵"} {item.tipo}
                        </span>
                        <h4 className="font-bold text-xs text-foreground leading-tight">
                          {item.nome}
                        </h4>
                      </div>

                      <div className="flex items-center justify-between border-t border-border/10 pt-2 text-[10px] text-muted-foreground">
                        <span className="truncate font-medium text-primary">
                          👤 {item.clientName.split(" ")[0]}
                        </span>
                        
                        {/* Botão de Avanço Rápido (para mobile/atalho) */}
                        {col.id !== "FINALIZADO" && (
                          <button
                            onClick={() => handleMoveRight(item)}
                            className="p-1 rounded bg-secondary hover:bg-primary/20 text-muted-foreground hover:text-primary transition-all cursor-pointer"
                            title="Avançar etapa de produção"
                          >
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
