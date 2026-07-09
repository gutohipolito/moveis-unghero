"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Truck, 
  Wrench, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  User, 
  AlertCircle, 
  Plus, 
  ShieldCheck, 
  Calendar,
  Users,
  Signature,
  Settings2,
} from "lucide-react";
import { updateProjectStatus } from "@/app/actions/kanban";
import { ActionDialogHost, useActionDialog } from "@/components/ActionDialogHost";
import { Dialog } from "@/components/ui/dialog";

interface Project {
  id: string;
  valor_previsto: number;
  status_geral: string;
  client: {
    id: string;
    nome: string;
    cidade: string;
    telefone: string;
    email: string;
    observacoes?: string | null;
  };
}

interface VeiculoOption {
  id: string;
  label: string;
}

interface LogisticaClientProps {
  initialProjects: Project[];
  veiculos: VeiculoOption[];
}

interface ExpedicaoCarga {
  id: string;
  projectId: string;
  veiculo: string;
  dataEntrega: string;
  ajudantes: string;
  status: "PENDENTE" | "CARREGADO" | "EM_TRANSITO" | "ENTREGUE";
}

export default function LogisticaClient({ initialProjects, veiculos }: LogisticaClientProps) {
  const dialog = useActionDialog();
  const { showSuccess, showError } = dialog;
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [activeTab, setActiveTab] = useState<"expedicao" | "montagem">("expedicao");
  const [loading, setLoading] = useState(false);

  // Mocks de expedições agendadas
  const [expedicoes, setExpedicoes] = useState<ExpedicaoCarga[]>([
    {
      id: "exp-1",
      projectId: "proj-6", // Geraldo Magela (Produção)
      veiculo: "Caminhão 1 - Mercedes Accelo 815",
      dataEntrega: "2026-07-06",
      ajudantes: "Marcos & Cleber (Equipe A)",
      status: "CARREGADO"
    },
    {
      id: "exp-2",
      projectId: "proj-7", // Rodrigo Pinheiro (Instalação)
      veiculo: "Iveco Daily Cargo 30S13",
      dataEntrega: "2026-07-04",
      ajudantes: "Silas (Equipe B)",
      status: "EM_TRANSITO"
    }
  ]);

  // Formulário para nova expedição
  const defaultVeiculo = veiculos[0]?.label ?? "";
  const [newExpForm, setNewExpForm] = useState({
    projectId: "",
    veiculo: defaultVeiculo,
    dataEntrega: "",
    ajudantes: ""
  });
  const [isAddingExp, setIsAddingExp] = useState(false);

  // Controle de checklists de montagem
  const [checklists, setChecklists] = useState<Record<string, Record<string, boolean>>>({
    "proj-7": {
      dobradicas: true,
      amortecedores: true,
      limpeza: false,
      alinhamento: true
    }
  });

  // Controle de modal de assinatura digital
  const [signatureModalProjId, setSignatureModalProjId] = useState<string | null>(null);
  const [signatureForm, setSignatureForm] = useState({
    recebedorNome: "",
    recebedorDoc: "",
    assinaturaDesenhada: false
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(val);
  };

  const handleCreateExpedicao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpForm.projectId || !newExpForm.dataEntrega) {
      showError("Campos obrigatórios", "Selecione o projeto e a data de entrega.");
      return;
    }

    const newExp: ExpedicaoCarga = {
      id: `exp-${Date.now()}`,
      projectId: newExpForm.projectId,
      veiculo: newExpForm.veiculo,
      dataEntrega: newExpForm.dataEntrega,
      ajudantes: newExpForm.ajudantes || "Equipe Geral",
      status: "PENDENTE"
    };

    setExpedicoes([newExp, ...expedicoes]);
    setIsAddingExp(false);
    setNewExpForm({
      projectId: "",
      veiculo: defaultVeiculo,
      dataEntrega: "",
      ajudantes: ""
    });
    showSuccess("Expedição agendada", "Entrega registrada no calendário logístico.");
  };

  const handleUpdateExpStatus = (id: string, newStatus: any) => {
    setExpedicoes(expedicoes.map(exp => {
      if (exp.id === id) {
        // Se a expedição foi entregue, movemos o projeto de PRODUCAO/APROVADO para INSTALACAO no CRM automaticamente
        if (newStatus === "ENTREGUE") {
          const expProj = projects.find(p => p.id === exp.projectId);
          if (expProj && ["APROVADO", "PRODUCAO"].includes(expProj.status_geral)) {
            handleMoveProjectStatus(exp.projectId, "INSTALACAO");
          }
        }
        return { ...exp, status: newStatus };
      }
      return exp;
    }));
  };

  const handleMoveProjectStatus = async (projId: string, status: string) => {
    setProjects(projects.map(p => p.id === projId ? { ...p, status_geral: status } : p));
    await updateProjectStatus(projId, status as any);
  };

  const handleToggleCheckItem = (projId: string, itemKey: string) => {
    const projectCheck = checklists[projId] || { dobradicas: false, amortecedores: false, limpeza: false, alinhamento: false };
    setChecklists({
      ...checklists,
      [projId]: {
        ...projectCheck,
        [itemKey]: !projectCheck[itemKey as keyof typeof projectCheck]
      }
    });
  };

  const openSignatureModal = (projId: string) => {
    setSignatureModalProjId(projId);
    setSignatureForm({
      recebedorNome: "",
      recebedorDoc: "",
      assinaturaDesenhada: false
    });
  };

  const handleFinalizeProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signatureModalProjId) return;
    if (!signatureForm.recebedorNome || !signatureForm.recebedorDoc) {
      showError("Campos obrigatórios", "Informe o nome e documento do recebedor.");
      return;
    }

    setLoading(true);
    // Atualiza status no banco e no CRM para FINALIZADO
    await handleMoveProjectStatus(signatureModalProjId, "FINALIZADO");
    
    // Limpa estados
    setSignatureModalProjId(null);
    setLoading(false);
    showSuccess(
      "Projeto finalizado",
      "Termo assinado! Projeto arquivado com vistoria de marcenaria concluída."
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Abas Principais */}
      <div className="flex border-b border-border/40 pb-px">
        <button
          onClick={() => setActiveTab("expedicao")}
          className={`flex items-center gap-2 pb-3 px-4 font-bold text-sm border-b-2 transition-all cursor-pointer ${activeTab === "expedicao" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <Truck className="h-4 w-4" />
          Expedição & Cargas
        </button>
        <button
          onClick={() => setActiveTab("montagem")}
          className={`flex items-center gap-2 pb-3 px-4 font-bold text-sm border-b-2 transition-all cursor-pointer ${activeTab === "montagem" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <Wrench className="h-4 w-4" />
          Montagem & Checklist Fino
        </button>
      </div>

      {/* ABA 1: EXPEDIÇÃO E CARGAS */}
      {activeTab === "expedicao" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold tracking-tight text-neutral-900">Programação de Fretes e Entregas</h3>
              <p className="text-xs text-muted-foreground">Planeje a saída das peças acabadas de fábrica para a casa do cliente.</p>
            </div>
            {!isAddingExp && (
              <Button onClick={() => setIsAddingExp(true)} size="sm">
                <Plus className="h-4 w-4 mr-1" /> Agendar Entrega
              </Button>
            )}
          </div>

          {/* Form de Nova Expedição */}
          {isAddingExp && (
            <Card className="p-5 border-cyan-200/50 bg-cyan-500/5 rounded-2xl max-w-xl animate-in slide-in-from-top-4 duration-300">
              <h4 className="text-sm font-bold text-cyan-800 mb-3">Agendar Carregamento & Viagem</h4>
              <form onSubmit={handleCreateExpedicao} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">Projeto / Cliente</label>
                    <select
                      value={newExpForm.projectId}
                      onChange={(e) => setNewExpForm({ ...newExpForm, projectId: e.target.value })}
                      className="w-full bg-white border border-border/60 rounded-lg text-xs p-2 focus:ring-1 focus:ring-primary outline-none font-semibold"
                    >
                      <option value="">Selecione...</option>
                      {projects.filter(p => ["APROVADO", "PRODUCAO"].includes(p.status_geral)).map(p => (
                        <option key={p.id} value={p.id}>{p.client.nome} ({p.client.cidade})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <label className="text-[10px] font-bold text-muted-foreground">Veículo / Frete</label>
                      <Link
                        href="/cadastros?grupo=veiculos"
                        className="text-[10px] font-semibold text-primary hover:underline inline-flex items-center gap-0.5"
                      >
                        <Settings2 className="h-3 w-3" />
                        Cadastrar veículos
                      </Link>
                    </div>
                    <select
                      value={newExpForm.veiculo}
                      onChange={(e) => setNewExpForm({ ...newExpForm, veiculo: e.target.value })}
                      className="w-full bg-white border border-border/60 rounded-lg text-xs p-2 focus:ring-1 focus:ring-primary outline-none font-semibold"
                      disabled={veiculos.length === 0}
                    >
                      {veiculos.length === 0 ? (
                        <option value="">Nenhum veículo cadastrado</option>
                      ) : (
                        veiculos.map((v) => (
                          <option key={v.id} value={v.label}>
                            {v.label}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">Data de Carga / Entrega</label>
                    <Input
                      type="date"
                      required
                      value={newExpForm.dataEntrega}
                      onChange={(e) => setNewExpForm({ ...newExpForm, dataEntrega: e.target.value })}
                      className="bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">Ajudantes / Equipe</label>
                    <Input
                      
                      value={newExpForm.ajudantes}
                      onChange={(e) => setNewExpForm({ ...newExpForm, ajudantes: e.target.value })}
                      className="bg-white text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddingExp(false)} size="sm">Cancelar</Button>
                  <Button type="submit" size="sm">Confirmar Agendamento</Button>
                </div>
              </form>
            </Card>
          )}

          {/* Grid de Cards de Expedição */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {expedicoes.map((exp) => {
              const proj = projects.find(p => p.id === exp.projectId);
              if (!proj) return null;

              return (
                <Card key={exp.id} className="p-6 border-border/40 shadow-md bg-white rounded-2xl space-y-4 hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between border-b border-border/30 pb-2">
                    <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-500 font-bold px-2 py-0.5 rounded-md">
                      Carga: {exp.id}
                    </span>
                    <select
                      value={exp.status}
                      onChange={(e) => handleUpdateExpStatus(exp.id, e.target.value as any)}
                      className={`text-xs font-black rounded-lg px-2.5 py-1 border outline-none ${
                        exp.status === "ENTREGUE" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                        exp.status === "EM_TRANSITO" ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" :
                        exp.status === "CARREGADO" ? "bg-orange-500/10 text-orange-500 border-orange-500/20" :
                        "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      }`}
                    >
                      <option value="PENDENTE">⏳ Pendente</option>
                      <option value="CARREGADO">📦 Carregado</option>
                      <option value="EM_TRANSITO">🚚 Em Trânsito</option>
                      <option value="ENTREGUE">✓ Entregue</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-extrabold text-neutral-900 text-base">{proj.client.nome}</h4>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        <span>{proj.client.cidade}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        <span>{new Date(exp.dataEntrega).toLocaleDateString("pt-BR")}</span>
                      </div>
                      <div className="col-span-2 flex items-center gap-1.5 mt-1 border-t border-border/20 pt-1">
                        <Truck className="h-3.5 w-3.5 text-cyan-600" />
                        <span className="font-bold text-neutral-800">{exp.veiculo}</span>
                      </div>
                      <div className="col-span-2 flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-cyan-600" />
                        <span className="font-medium">{exp.ajudantes}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ABA 2: MONTAGEM E CHECKLIST TÉCNICO */}
      {activeTab === "montagem" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-neutral-900">Checklist e Vistoria Fina (Entrega Técnica)</h3>
            <p className="text-xs text-muted-foreground">Garantia técnica Móveis Unghero. Marque os itens inspecionados antes de colher a assinatura de entrega perfeita.</p>
          </div>

          <div className="space-y-4">
            {projects.filter(p => ["INSTALACAO", "FINALIZADO"].includes(p.status_geral)).map((proj) => {
              const chk = checklists[proj.id] || { dobradicas: false, amortecedores: false, limpeza: false, alinhamento: false };
              const isFinished = proj.status_geral === "FINALIZADO";
              const checklistCompleted = Object.values(chk).every(val => val === true);

              return (
                <Card key={proj.id} className="p-6 border-border/40 bg-white shadow-md rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:shadow-lg transition-all">
                  <div className="space-y-2 lg:max-w-md">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-neutral-900 text-base">{proj.client.nome}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                        isFinished ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-indigo-500/10 text-indigo-500 border-indigo-500/20 animate-pulse"
                      }`}>
                        {isFinished ? "✓ Finalizado" : "🔧 Em Montagem"}
                      </span>
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground gap-1">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      <span>{proj.client.cidade}</span>
                    </div>
                  </div>

                  {/* Checklist Items */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 border border-slate-100 p-4 rounded-xl flex-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-neutral-700">
                      <input
                        type="checkbox"
                        disabled={isFinished}
                        checked={chk.dobradicas}
                        onChange={() => handleToggleCheckItem(proj.id, "dobradicas")}
                        className="w-4 h-4 rounded text-primary focus:ring-primary border-border/60"
                      />
                      Dobradiças Reguladas
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-neutral-700">
                      <input
                        type="checkbox"
                        disabled={isFinished}
                        checked={chk.amortecedores}
                        onChange={() => handleToggleCheckItem(proj.id, "amortecedores")}
                        className="w-4 h-4 rounded text-primary focus:ring-primary border-border/60"
                      />
                      Amortecedores & LED
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-neutral-700">
                      <input
                        type="checkbox"
                        disabled={isFinished}
                        checked={chk.limpeza}
                        onChange={() => handleToggleCheckItem(proj.id, "limpeza")}
                        className="w-4 h-4 rounded text-primary focus:ring-primary border-border/60"
                      />
                      Limpeza & Sem Riscos
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-neutral-700">
                      <input
                        type="checkbox"
                        disabled={isFinished}
                        checked={chk.alinhamento}
                        onChange={() => handleToggleCheckItem(proj.id, "alinhamento")}
                        className="w-4 h-4 rounded text-primary focus:ring-primary border-border/60"
                      />
                      Alinhamento Frentes
                    </label>
                  </div>

                  {/* Ação */}
                  <div className="flex items-center justify-end">
                    {isFinished ? (
                      <span className="text-xs font-black text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-lg py-2 px-4 inline-flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4" /> Vistoria Aprovada
                      </span>
                    ) : (
                      <Button
                        disabled={!checklistCompleted}
                        onClick={() => openSignatureModal(proj.id)}
                        className={`font-semibold py-2 px-4 shadow-sm rounded-lg ${
                          checklistCompleted ? "btn-metallic" : "bg-slate-200 border-none text-muted-foreground/60 cursor-not-allowed"
                        }`}
                      >
                        <Signature className="h-4 w-4 mr-1.5" /> Assinar Termo
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal - Assinatura Eletrônica e Encerramento */}
      <Dialog
        isOpen={!!signatureModalProjId}
        onClose={() => setSignatureModalProjId(null)}
        className="max-w-md w-full"
      >
        <div className="space-y-4 pr-6">
            <h3 className="text-lg font-bold tracking-tight text-gradient-gold mb-1">
              Termo de Encerramento e Entrega Fina
            </h3>
            <p className="text-xs text-muted-foreground">
              Comprovante de que a montagem foi vistoriada e entregue em perfeitas condições.
            </p>

            <form onSubmit={handleFinalizeProject} className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Nome de quem recebeu o projeto</label>
                <Input
                  required
                  
                  value={signatureForm.recebedorNome}
                  onChange={(e) => setSignatureForm({ ...signatureForm, recebedorNome: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Documento de Identificação (RG / CPF)</label>
                <Input
                  required
                  
                  value={signatureForm.recebedorDoc}
                  onChange={(e) => setSignatureForm({ ...signatureForm, recebedorDoc: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Assinatura Eletrônica Simulada</label>
                <div 
                  onClick={() => setSignatureForm({ ...signatureForm, assinaturaDesenhada: true })}
                  className="w-full h-32 rounded-lg border border-dashed border-neutral-300 bg-slate-50 flex flex-col items-center justify-center cursor-pointer text-muted-foreground/60 hover:bg-slate-100/50 hover:border-primary/40 transition-all select-none"
                >
                  {signatureForm.assinaturaDesenhada ? (
                    <div className="text-center space-y-1 text-primary">
                      <CheckCircle2 className="h-6 w-6 mx-auto animate-bounce" />
                      <span className="text-xs font-bold font-mono italic">Assinado Eletronicamente</span>
                    </div>
                  ) : (
                    <div className="text-center space-y-1">
                      <Signature className="h-6 w-6 mx-auto opacity-70" />
                      <span className="text-xs font-medium">Clique aqui para assinar digitalmente</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSignatureModalProjId(null)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading || !signatureForm.assinaturaDesenhada} 
                  className="font-semibold"
                >
                  {loading ? "Finalizando..." : "Finalizar Entrega Técnica"}
                </Button>
              </div>
            </form>
        </div>
      </Dialog>

      <ActionDialogHost dialog={dialog} />
    </div>
  );
}
