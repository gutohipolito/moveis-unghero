"use client";

import React, { useState, useCallback } from "react";
import { registerPonto } from "@/app/actions/ponto";
import { updateEnvironmentStatus } from "@/app/actions/project";
import { getPortalLiveSnapshot } from "@/app/actions/liveSnapshots";
import { useLiveEntity } from "@/context/LiveSyncContext";
import { ActionDialogHost, useActionDialog } from "@/components/ActionDialogHost";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  Play, 
  CheckCircle2, 
  Coffee, 
  Hourglass, 
  AlertCircle, 
  Calendar, 
  ChevronRight, 
  TrendingUp, 
  User, 
  Hammer, 
  Check,
  Briefcase
} from "lucide-react";

interface TimeCardItem {
  id: string;
  data: Date;
  entrada: Date | null;
  almoco_in: Date | null;
  almoco_out: Date | null;
  saida: Date | null;
  horas: number | null;
}

interface EnvironmentItem {
  id: string;
  nome: string;
  tipo: string;
  status: string;
  projectId: string;
  clientName: string;
}

interface PortalColaboradorClientProps {
  userId: string;
  userName: string;
  userCargo: string;
  initialTimeCards: TimeCardItem[];
  initialTasks: EnvironmentItem[];
  metrics: {
    ativos: number;
    finalizadosSemana: number;
    totalGeral: number;
    metaSemanal: number;
  };
}

const STATUS_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  PRONTO_PRODUCAO: { label: "Fila de Produção", bg: "bg-purple-500/10", text: "text-purple-400" },
  EM_CORTE: { label: "Corte / Usinagem", bg: "bg-cyan-500/10", text: "text-cyan-400" },
  MONTAGEM_FABRICA: { label: "Montagem Fábrica", bg: "bg-orange-500/10", text: "text-orange-400" },
  PRONTO_ENTREGA: { label: "Pronto p/ Entrega", bg: "bg-emerald-500/10", text: "text-emerald-400" },
  EM_INSTALACAO: { label: "Instalação", bg: "bg-indigo-500/10", text: "text-indigo-400" },
  FINALIZADO: { label: "Finalizado", bg: "bg-slate-500/10", text: "text-slate-400" }
};

const ENVIRONMENT_ICONS: Record<string, string> = {
  COZINHA: "🍳",
  CLOSET: "👔",
  DORMITORIO: "🛏️",
  BANHEIRO: "🚿",
  OUTROS: "🪵"
};

export default function PortalColaboradorClient({
  userId,
  userName,
  userCargo,
  initialTimeCards,
  initialTasks,
  metrics: initialMetrics,
}: PortalColaboradorClientProps) {
  const [timeCards, setTimeCards] = useState<TimeCardItem[]>(initialTimeCards);
  const [tasks, setTasks] = useState<EnvironmentItem[]>(initialTasks);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [loading, setLoading] = useState(false);
  const dialog = useActionDialog();
  const { showSuccess, showError } = dialog;

  const syncPortal = useCallback(async () => {
    const result = await getPortalLiveSnapshot(userId);
    if (result.success) {
      if (result.tasks) setTasks(result.tasks);
      if (result.timeCards) setTimeCards(result.timeCards);
      if (result.metrics) setMetrics(result.metrics);
    }
  }, [userId]);

  useLiveEntity("portal", {
    sync: syncPortal,
    enabled: !loading,
  });

  // Calcula o cartão de ponto de hoje (se existir)
  const todayDateStr = new Date().toDateString();
  const todayCard = timeCards.find(c => new Date(c.data).toDateString() === todayDateStr);

  // Determina o próximo ponto a ser batido
  let nextPontoType: "entrada" | "almoco_in" | "almoco_out" | "saida" | "done" = "entrada";
  let buttonLabel = "Registrar Entrada";
  let buttonColor = "bg-[hsl(28_85%_45%)] hover:bg-[hsl(28_85%_40%)]";

  if (todayCard) {
    if (!todayCard.entrada) {
      nextPontoType = "entrada";
      buttonLabel = "Registrar Entrada";
    } else if (!todayCard.almoco_in) {
      nextPontoType = "almoco_in";
      buttonLabel = "Saída para Almoço";
      buttonColor = "bg-amber-500 hover:bg-amber-600";
    } else if (!todayCard.almoco_out) {
      nextPontoType = "almoco_out";
      buttonLabel = "Retorno do Almoço";
      buttonColor = "bg-blue-500 hover:bg-blue-600";
    } else if (!todayCard.saida) {
      nextPontoType = "saida";
      buttonLabel = "Registrar Saída";
      buttonColor = "bg-emerald-600 hover:bg-emerald-700";
    } else {
      nextPontoType = "done";
      buttonLabel = "Jornada Concluída";
      buttonColor = "bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed";
    }
  }

  const handleBaterPonto = async () => {
    if (nextPontoType === "done") return;
    setLoading(true);

    const res = await registerPonto(userId, nextPontoType);
    if (res.success && res.card) {
      // Atualiza o histórico local
      const exists = timeCards.some(c => c.id === res.card.id);
      if (exists) {
        setTimeCards(timeCards.map(c => c.id === res.card.id ? {
          ...res.card,
          data: new Date(res.card.data),
          entrada: res.card.entrada ? new Date(res.card.entrada) : null,
          almoco_in: res.card.almoco_in ? new Date(res.card.almoco_in) : null,
          almoco_out: res.card.almoco_out ? new Date(res.card.almoco_out) : null,
          saida: res.card.saida ? new Date(res.card.saida) : null,
        } : c));
      } else {
        setTimeCards([{
          ...res.card,
          data: new Date(res.card.data),
          entrada: res.card.entrada ? new Date(res.card.entrada) : null,
          almoco_in: res.card.almoco_in ? new Date(res.card.almoco_in) : null,
          almoco_out: res.card.almoco_out ? new Date(res.card.almoco_out) : null,
          saida: res.card.saida ? new Date(res.card.saida) : null,
        }, ...timeCards]);
      }
      const labels: Record<string, string> = {
        entrada: "Entrada registrada",
        almoco_in: "Início do almoço registrado",
        almoco_out: "Retorno do almoço registrado",
        saida: "Saída registrada",
      };
      showSuccess(labels[nextPontoType] || "Ponto registrado", "Horário salvo com sucesso.");
    } else {
      showError("Erro ao marcar ponto", res.error || "Não foi possível registrar o horário.");
    }
    setLoading(false);
  };

  const handleUpdateStatus = async (taskId: string, projectId: string, newStatus: string) => {
    setLoading(true);
    const res = await updateEnvironmentStatus(projectId, taskId, newStatus as any);
    if (res.success) {
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      showSuccess("Tarefa atualizada", "Status da tarefa alterado com sucesso.");
    } else {
      showError("Erro ao atualizar", res.error || "Falha ao atualizar status da tarefa.");
    }
    setLoading(false);
  };

  // Porcentagem de produtividade da semana
  const percentMet = Math.min(Math.round((metrics.finalizadosSemana / metrics.metaSemanal) * 100), 100);

  // Formata hora legível
  const formatTime = (date: Date | null) => {
    if (!date) return "--:--";
    return new Date(date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-6">
      
      {/* Informações Básicas do Colaborador */}
      <div className="p-5 rounded-2xl border border-border/80 glass-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[hsl(28_85%_95%)] text-[hsl(28_85%_45%)] flex items-center justify-center font-black text-lg border border-[hsl(28_85%_85%)]">
            {userName.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Bem-vindo ao Painel</span>
            <h2 className="text-xl font-extrabold text-foreground leading-tight">{userName}</h2>
            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-400 mt-1 uppercase">
              <Hammer className="h-3 w-3" />
              {userCargo}
            </span>
          </div>
        </div>

        {/* Relógio Digital em tempo real */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 self-start md:self-auto shadow-xs">
          <Clock className="h-5 w-5 text-[hsl(28_85%_45%)] animate-pulse" />
          <div className="text-right">
            <span className="text-xs text-slate-400 block font-semibold leading-none">Hora do Servidor</span>
            <strong className="text-sm font-extrabold text-slate-700 leading-tight">
              {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </strong>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Coluna 1: Bater Ponto e Evolução */}
        <div className="xl:col-span-1 space-y-6">
          {/* Cartão de Ponto Eletrônico */}
          <Card className="p-5 border-border glass-card space-y-4">
            <div className="flex items-center gap-2 border-b border-border/10 pb-3">
              <Clock className="h-5 w-5 text-[hsl(28_85%_45%)]" />
              <h3 className="font-extrabold text-sm text-foreground">Registrar Ponto Diário</h3>
            </div>

            {/* Marcadores de Horas */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Entrada</span>
                <strong className="text-base font-extrabold text-slate-800">{formatTime(todayCard?.entrada || null)}</strong>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Almoço (Ida)</span>
                <strong className="text-base font-extrabold text-slate-800">{formatTime(todayCard?.almoco_in || null)}</strong>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Almoço (Volta)</span>
                <strong className="text-base font-extrabold text-slate-800">{formatTime(todayCard?.almoco_out || null)}</strong>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Saída</span>
                <strong className="text-base font-extrabold text-slate-800">{formatTime(todayCard?.saida || null)}</strong>
              </div>
            </div>

            {/* Botão de Registro */}
            <Button
              onClick={handleBaterPonto}
              disabled={loading || nextPontoType === "done"}
              className={`w-full py-6 text-sm font-extrabold text-white rounded-[var(--radius-sm)] shadow-md border-none flex items-center justify-center gap-2 cursor-pointer transition-all ${buttonColor}`}
            >
              {loading ? (
                <Hourglass className="h-5 w-5 animate-spin" />
              ) : nextPontoType === "done" ? (
                <Check className="h-5 w-5" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {buttonLabel}
            </Button>
          </Card>

          {/* Gráfico de Evolução de Produtividade Semanal */}
          <Card className="p-5 border-border glass-card space-y-4">
            <div className="flex items-center gap-2 border-b border-border/10 pb-3">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              <h3 className="font-extrabold text-sm text-foreground">Produtividade Semanal</h3>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-muted-foreground">Cômodos Concluídos (Semana)</span>
                <strong className="text-foreground">{metrics.finalizadosSemana} de {metrics.metaSemanal}</strong>
              </div>
              {/* Barra de Progresso */}
              <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${percentMet}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400 font-semibold block text-right">{percentMet}% da meta cumprida</span>
            </div>

            {/* Métricas Globais rápidas */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                <strong className="text-xl font-extrabold text-slate-800">{metrics.ativos}</strong>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">Em Andamento</span>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                <strong className="text-xl font-extrabold text-slate-800">{metrics.totalGeral}</strong>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">Total Atribuído</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Coluna 2: Minhas Atribuições (Lista de Cômodos) */}
        <div className="xl:col-span-2 space-y-6">
          <Card className="p-5 border-border glass-card space-y-4">
            <div className="flex items-center justify-between border-b border-border/10 pb-3">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-indigo-500" />
                <h3 className="font-extrabold text-sm text-foreground">Minhas Atribuições na Fábrica</h3>
              </div>
              <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
                {tasks.length} pendentes
              </span>
            </div>

            {/* Lista de Atribuições */}
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {tasks.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400 font-medium">
                  Nenhum cômodo atribuído a você no momento.
                </div>
              ) : (
                tasks.map(task => {
                  const status = STATUS_LABELS[task.status] || { label: task.status, bg: "bg-slate-500/10", text: "text-slate-400" };
                  return (
                    <div key={task.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50 hover:border-slate-200 transition-colors space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-[9px] bg-secondary/80 text-muted-foreground px-1.5 py-0.2 rounded font-semibold tracking-wide uppercase inline-flex items-center gap-1 mb-1">
                            {ENVIRONMENT_ICONS[task.tipo] || "🪵"} {task.tipo}
                          </span>
                          <h4 className="font-extrabold text-sm text-slate-800 leading-tight">{task.nome}</h4>
                          <span className="text-[10px] text-slate-400 block font-semibold mt-0.5">Projeto: {task.clientName}</span>
                        </div>
                        <span className={`self-start sm:self-auto text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}>
                          {status.label}
                        </span>
                      </div>

                      {/* Botões Rápidos de Alteração de Etapa */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/50">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mr-2">Progresso:</span>
                        {task.status === "PRONTO_PRODUCAO" && (
                          <Button
                            onClick={() => handleUpdateStatus(task.id, task.projectId, "EM_CORTE")}
                            className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold text-xs px-3 py-2 min-h-11 rounded border-none cursor-pointer"
                          >
                            Iniciar Corte
                          </Button>
                        )}
                        {task.status === "EM_CORTE" && (
                          <Button
                            onClick={() => handleUpdateStatus(task.id, task.projectId, "MONTAGEM_FABRICA")}
                            className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs px-3 py-2 min-h-11 rounded border-none cursor-pointer"
                          >
                            Mandar p/ Montagem
                          </Button>
                        )}
                        {task.status === "MONTAGEM_FABRICA" && (
                          <Button
                            onClick={() => handleUpdateStatus(task.id, task.projectId, "PRONTO_ENTREGA")}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 min-h-11 rounded border-none cursor-pointer"
                          >
                            Pronto p/ Entrega
                          </Button>
                        )}
                        {task.status === "PRONTO_ENTREGA" && (
                          <Button
                            onClick={() => handleUpdateStatus(task.id, task.projectId, "EM_INSTALACAO")}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 py-2 min-h-11 rounded border-none cursor-pointer"
                          >
                            Iniciar Instalação
                          </Button>
                        )}
                        {task.status === "EM_INSTALACAO" && (
                          <Button
                            onClick={() => handleUpdateStatus(task.id, task.projectId, "FINALIZADO")}
                            className="bg-slate-600 hover:bg-slate-700 text-white font-bold text-xs px-3 py-2 min-h-11 rounded border-none cursor-pointer"
                          >
                            Finalizar Projeto
                          </Button>
                        )}
                        {task.status === "FINALIZADO" && (
                          <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                            Cômodo Finalizado com Sucesso!
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

      </div>

      {/* Histórico Mensal de Ponto */}
      <Card className="p-5 border-border glass-card space-y-4">
        <div className="flex items-center gap-2 border-b border-border/10 pb-3">
          <Calendar className="h-5 w-5 text-indigo-500" />
          <h3 className="font-extrabold text-sm text-foreground">Histórico de Ponto do Mês</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/40" style={{ background: "hsl(210 20% 97.5%)" }}>
                <th className="py-2.5 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Data</th>
                <th className="py-2.5 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Entrada</th>
                <th className="py-2.5 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Início Almoço</th>
                <th className="py-2.5 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Retorno Almoço</th>
                <th className="py-2.5 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Saída</th>
                <th className="py-2.5 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">Horas Trabalhadas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {timeCards.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400 font-medium">
                    Nenhum registro de ponto neste mês.
                  </td>
                </tr>
              ) : (
                timeCards.map(card => {
                  const dataStr = new Date(card.data).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
                  return (
                    <tr key={card.id} className="hover:bg-slate-50/50 transition-colors text-xs text-slate-700">
                      <td className="py-3 px-4 font-bold capitalize">{dataStr}</td>
                      <td className="py-3 px-4 font-mono font-medium">{formatTime(card.entrada)}</td>
                      <td className="py-3 px-4 font-mono font-medium text-amber-600/80">{formatTime(card.almoco_in)}</td>
                      <td className="py-3 px-4 font-mono font-medium text-blue-600/80">{formatTime(card.almoco_out)}</td>
                      <td className="py-3 px-4 font-mono font-medium">{formatTime(card.saida)}</td>
                      <td className="py-3 px-4 font-bold text-right text-slate-800">
                        {card.horas !== null ? `${card.horas.toFixed(2)}h` : "--"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <ActionDialogHost dialog={dialog} />
    </div>
  );
}
