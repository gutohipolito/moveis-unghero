"use client";

import React, { useState, useCallback } from "react";
import { createTask, toggleTaskStatus } from "@/app/actions/operations";
import { getAgendaLiveSnapshot } from "@/app/actions/liveSnapshots";
import { useLiveEntity } from "@/context/LiveSyncContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  MapPin, 
  CheckCircle2, 
  AlertCircle,
  Filter,
  Layers,
  Sparkles
} from "lucide-react";

interface AgendaEvent {
  id: string;
  titulo: string;
  descricao: string;
  responsavel: string;
  data: string;
  status: string;
  tipo: string;
  projectName: string;
  projectId: string;
}

interface ProjectOption {
  id: string;
  clientName: string;
}

interface AgendaClientProps {
  initialEvents: AgendaEvent[];
  projects: ProjectOption[];
  companyId: string;
}

const TIPO_COMPROMISSO: Record<string, { label: string; color: string; border: string; bg: string }> = {
  VISITA_COMERCIAL: { label: "Visita Comercial", color: "text-amber-400", border: "border-amber-500/20", bg: "bg-amber-500/10" },
  MEDICAO_TECNICA: { label: "Medição Técnica", color: "text-blue-400", border: "border-blue-500/20", bg: "bg-blue-500/10" },
  ENTREGA_MOVEIS: { label: "Entrega de Móveis", color: "text-purple-400", border: "border-purple-500/20", bg: "bg-purple-500/10" },
  INSTALACAO: { label: "Instalação", color: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/10" },
  OUTROS: { label: "Outros", color: "text-slate-400", border: "border-slate-500/20", bg: "bg-slate-500/10" }
};

export default function AgendaClient({ initialEvents, projects, companyId }: AgendaClientProps) {
  const [events, setEvents] = useState<AgendaEvent[]>(initialEvents);
  const [currentDate, setCurrentDate] = useState(new Date("2026-07-01T00:00:00Z")); // Fixado em julho/2026 para os mocks
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null);

  // Estados dos Filtros
  const [filterTipo, setFilterTipo] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Form de Novo Agendamento
  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    responsavel: "",
    data: "2026-07-01",
    hora: "09:00",
    tipo: "MEDICAO_TECNICA" as any,
    projectId: projects[0]?.id || ""
  });

  const [loading, setLoading] = useState(false);

  const syncAgenda = useCallback(async () => {
    const result = await getAgendaLiveSnapshot(companyId);
    if (result.success && result.events) {
      setEvents(result.events);
    }
  }, [companyId]);

  useLiveEntity("agenda", {
    sync: syncAgenda,
    enabled: !loading && !isAddEventOpen && !selectedEvent,
  });

  // Lógica do Calendário (Mês)
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Dom, 1 = Seg...
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Dias vazios que precedem o dia 1 do mês
  const prevMonthEmptyDays = Array.from({ length: firstDayIndex }, (_, i) => null);
  // Dias do mês
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const calendarCells = [...prevMonthEmptyDays, ...monthDays];

  // Navegação
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Filtragem dos eventos
  const filteredEvents = events.filter(e => {
    const matchTipo = filterTipo === "ALL" || e.tipo === filterTipo;
    const matchStatus = filterStatus === "ALL" || e.status === filterStatus;
    return matchTipo && matchStatus;
  });

  // Salvar novo agendamento
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titulo || !form.responsavel || !form.projectId) return;

    setLoading(true);
    const dataHoraIso = new Date(`${form.data}T${form.hora}:00Z`).toISOString();
    
    const result = await createTask(form.projectId, {
      titulo: form.titulo,
      descricao: form.descricao,
      responsavel: form.responsavel,
      data: dataHoraIso,
      tipo: form.tipo
    });

    if (result.success && result.task) {
      const p = projects.find(item => item.id === form.projectId);
      const newEvent: AgendaEvent = {
        id: result.task.id,
        titulo: result.task.titulo,
        descricao: result.task.descricao || "",
        responsavel: result.task.responsavel,
        data: result.task.data.toISOString ? result.task.data.toISOString() : new Date(result.task.data).toISOString(),
        status: result.task.status,
        tipo: result.task.tipo,
        projectName: p?.clientName || "Projeto",
        projectId: form.projectId
      };

      setEvents([newEvent, ...events]);
      setIsAddEventOpen(false);
      // Reseta form
      setForm({
        titulo: "",
        descricao: "",
        responsavel: "",
        data: "2026-07-01",
        hora: "09:00",
        tipo: "MEDICAO_TECNICA",
        projectId: projects[0]?.id || ""
      });
    }
    setLoading(false);
  };

  // Concluir / Reabrir tarefa
  const handleToggleStatus = async (evt: AgendaEvent) => {
    const newStatus = evt.status === "PENDENTE" ? "CONCLUIDA" : "PENDENTE";
    
    // Atualiza estado local
    setEvents(events.map(e => e.id === evt.id ? { ...e, status: newStatus } : e));
    if (selectedEvent?.id === evt.id) {
      setSelectedEvent({ ...selectedEvent, status: newStatus });
    }

    await toggleTaskStatus(evt.projectId, evt.id, newStatus === "CONCLUIDA");
  };

  // Formata hora do evento
  const formatEventTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Coluna Esquerda: Filtros e Calendário */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* Painel de Filtros e Controles */}
        <Card className="p-4 glass-card border-border flex flex-wrap items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              <span>Filtrar por:</span>
            </div>
            
            <Select 
              value={filterTipo} 
              onChange={(e) => setFilterTipo(e.target.value)}
              className="text-xs py-1 h-8 bg-slate-100"
            >
              <option value="ALL">Todos os Tipos</option>
              <option value="VISITA_COMERCIAL">Visitas Comerciais</option>
              <option value="MEDICAO_TECNICA">Medições Técnicas</option>
              <option value="ENTREGA_MOVEIS">Entregas de Móveis</option>
              <option value="INSTALACAO">Instalações</option>
              <option value="OUTROS">Outros</option>
            </Select>

            <Select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs py-1 h-8 bg-slate-100"
            >
              <option value="ALL">Todos os Status</option>
              <option value="PENDENTE">Pendentes</option>
              <option value="CONCLUIDA">Concluídos</option>
            </Select>
          </div>

          <Button onClick={() => setIsAddEventOpen(true)} size="sm" className="btn-metallic">
            <Plus className="h-4 w-4 mr-1.5" /> Agendar
          </Button>
        </Card>

        {/* Grade do Calendário */}
        <Card className="glass-card border-border overflow-hidden">
          {/* Cabeçalho do Calendário */}
          <div className="p-4 border-b border-border/50 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              <h2 className="font-bold text-lg text-foreground">
                {monthNames[month]} {year}
              </h2>
            </div>
            <div className="flex items-center gap-1">
              <Button onClick={handlePrevMonth} variant="outline" size="icon" className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button onClick={() => setCurrentDate(new Date("2026-07-01T00:00:00Z"))} variant="outline" size="sm" className="h-8 px-2.5 text-xs font-semibold">
                Julho 2026
              </Button>
              <Button onClick={handleNextMonth} variant="outline" size="icon" className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Dias da Semana */}
          <div className="grid grid-cols-7 text-center py-2 bg-slate-50 border-b border-border/40 text-xs font-bold text-muted-foreground">
            <div>DOM</div>
            <div>SEG</div>
            <div>TER</div>
            <div>QUA</div>
            <div>QUI</div>
            <div>SEX</div>
            <div>SÁB</div>
          </div>

          {/* Dias do Calendário */}
          <div className="grid grid-cols-7 grid-rows-5 border-collapse divide-x divide-y divide-border">
            {calendarCells.map((day, idx) => {
              if (day === null) {
                return (
                  <div key={`empty-${idx}`} className="h-28 bg-slate-50" />
                );
              }

              // Filtra eventos deste dia específico
              const cellDateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayEvents = filteredEvents.filter(e => {
                const eDate = new Date(e.data);
                const eDateStr = `${eDate.getUTCFullYear()}-${String(eDate.getUTCMonth() + 1).padStart(2, "0")}-${String(eDate.getUTCDate()).padStart(2, "0")}`;
                return eDateStr === cellDateStr;
              });

              return (
                <div 
                  key={`day-${day}`} 
                  className="h-28 p-1.5 flex flex-col justify-between hover:bg-slate-100 transition-colors group cursor-pointer"
                  onClick={() => {
                    if (dayEvents.length > 0) {
                      setSelectedEvent(dayEvents[0]);
                    }
                  }}
                >
                  <span className="text-xs font-bold text-muted-foreground/80 group-hover:text-primary transition-colors">
                    {day}
                  </span>
                  
                  {/* Eventos da Célula */}
                  <div className="flex-1 mt-1 space-y-1 overflow-y-auto max-h-[80px] scrollbar-thin">
                    {dayEvents.map(evt => {
                      const cfg = TIPO_COMPROMISSO[evt.tipo] || TIPO_COMPROMISSO.OUTROS;
                      const isCompleted = evt.status === "CONCLUIDA";
                      
                      return (
                        <div 
                          key={evt.id} 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(evt);
                          }}
                          className={`text-[9px] px-1 py-0.5 rounded border ${cfg.border} ${cfg.bg} ${cfg.color} font-semibold truncate leading-tight transition-all hover:brightness-125 hover:scale-101 ${
                            isCompleted ? "opacity-40 line-through" : ""
                          }`}
                          title={`${evt.titulo} (${evt.projectName})`}
                        >
                          {formatEventTime(evt.data)} {evt.projectName.split(" ")[0]}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Coluna Direita: Painel de Detalhes e Lista Geral */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Painel de Compromisso Selecionado */}
        <Card className="p-6 bg-card/35 backdrop-blur-xs border-border/40 flex flex-col justify-between min-h-[350px]">
          {selectedEvent ? (
            <div className="space-y-5 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    TIPO_COMPROMISSO[selectedEvent.tipo]?.border
                  } ${TIPO_COMPROMISSO[selectedEvent.tipo]?.bg} ${TIPO_COMPROMISSO[selectedEvent.tipo]?.color}`}>
                    {TIPO_COMPROMISSO[selectedEvent.tipo]?.label || "Compromisso"}
                  </span>
                  
                  <button 
                    onClick={() => handleToggleStatus(selectedEvent)}
                    className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-lg border cursor-pointer transition-all ${
                      selectedEvent.status === "CONCLUIDA"
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                        : "border-border/60 bg-transparent text-muted-foreground hover:bg-accent/40"
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    {selectedEvent.status === "CONCLUIDA" ? "Concluído" : "Pendente"}
                  </button>
                </div>

                <div className="space-y-1">
                  <h3 className="font-extrabold text-lg text-foreground leading-tight">
                    {selectedEvent.titulo}
                  </h3>
                  <span className="text-xs text-primary font-semibold flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> Projeto: {selectedEvent.projectName}
                  </span>
                </div>

                {selectedEvent.descricao && (
                  <p className="text-xs text-muted-foreground leading-relaxed italic">
                    "{selectedEvent.descricao}"
                  </p>
                )}

                <div className="space-y-2 border-t border-border/20 pt-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary/80" />
                    <span>
                      {new Date(selectedEvent.data).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })} às {formatEventTime(selectedEvent.data)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary/80" />
                    <span>Responsável: <strong>{selectedEvent.responsavel}</strong></span>
                  </div>
                </div>
              </div>

              <div className="border-t border-border/20 pt-4 flex gap-2">
                <Button 
                  onClick={() => setSelectedEvent(null)}
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs font-semibold"
                >
                  Fechar Detalhes
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-6 flex-1 text-muted-foreground">
              <CalendarIcon className="h-10 w-10 text-primary/30 mb-3" />
              <h3 className="font-bold text-sm text-foreground">Nenhum evento selecionado</h3>
              <p className="text-xs mt-1">
                Selecione uma data com bolinhas ou clique em um compromisso para visualizar seus detalhes operacionais completos.
              </p>
            </div>
          )}
        </Card>

        {/* Lista Geral Cronológica (Próximos Compromissos) */}
        <Card className="p-4 bg-card/35 backdrop-blur-xs border-border/40 space-y-4">
          <div className="flex items-center justify-between border-b border-border/30 pb-2">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" /> Próximos Compromissos
            </h3>
            <span className="text-[10px] text-muted-foreground font-semibold bg-secondary px-2 py-0.5 rounded">
              Total: {filteredEvents.length}
            </span>
          </div>

          <div className="space-y-2.5 max-h-[300px] overflow-y-auto scrollbar-thin">
            {filteredEvents.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-6">
                Nenhum compromisso correspondente encontrado para exibir.
              </div>
            ) : (
              filteredEvents.slice(0, 5).map(evt => {
                const cfg = TIPO_COMPROMISSO[evt.tipo] || TIPO_COMPROMISSO.OUTROS;
                const isCompleted = evt.status === "CONCLUIDA";
                
                return (
                  <div 
                    key={evt.id} 
                    onClick={() => setSelectedEvent(evt)}
                    className={`p-3 rounded-lg border ${cfg.border} bg-black/10 hover:bg-slate-100 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isCompleted ? "opacity-50" : ""
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <h4 className={`font-bold text-xs text-foreground truncate ${isCompleted ? "line-through" : ""}`}>
                        {evt.titulo}
                      </h4>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-2">
                        <span>{new Date(evt.data).toLocaleDateString("pt-BR")} às {formatEventTime(evt.data)}</span>
                        <span>•</span>
                        <span className="truncate">{evt.projectName.split(" ")[0]}</span>
                      </p>
                    </div>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded shrink-0 uppercase tracking-wider ${cfg.bg} ${cfg.color}`}>
                      {cfg.label.split(" ")[0]}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* Modal - Novo Agendamento */}
      <Dialog isOpen={isAddEventOpen} onClose={() => setIsAddEventOpen(false)}>
        <h3 className="text-lg font-bold tracking-tight text-gradient-gold mb-4">
          Agendar Compromisso Técnico
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Projeto / Cliente Associado
            </label>
            <Select
              value={form.projectId}
              onChange={(e) => setForm({ ...form, projectId: e.target.value })}
              required
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.clientName} (Projeto {p.id.split("-")[1] || p.id})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Título do Compromisso
            </label>
            <Input
              required
              
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Descrição Detalhada
            </label>
            <textarea
              className="w-full bg-card/60 border border-border/60 hover:border-border rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary placeholder-muted-foreground transition-all duration-200 resize-none h-16"
              
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Data do Compromisso
              </label>
              <Input
                required
                type="date"
                value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Horário
              </label>
              <Input
                required
                type="time"
                value={form.hora}
                onChange={(e) => setForm({ ...form, hora: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Responsável Técnico
              </label>
              <Input
                required
                
                value={form.responsavel}
                onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Tipo do Evento
              </label>
              <Select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value as any })}
              >
                <option value="MEDICAO_TECNICA">Medição Técnica</option>
                <option value="ENTREGA_MOVEIS">Entrega de Móveis</option>
                <option value="INSTALACAO">Instalação / Montagem</option>
                <option value="VISITA_COMERCIAL">Visita Comercial</option>
                <option value="OUTROS">Outros</option>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddEventOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="font-semibold btn-metallic">
              {loading ? "Agendando..." : "Confirmar Agendamento"}
            </Button>
          </div>
        </form>
      </Dialog>

    </div>
  );
}
