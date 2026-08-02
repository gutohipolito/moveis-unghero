"use client";

import React, { useState, useEffect } from "react";
import { 
  Building2, 
  Sliders, 
  Database, 
  Save, 
  CheckCircle2, 
  AlertTriangle,
  Info,
  HardDrive,
  ImageIcon,
  FileText,
  ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import InfoTooltip, { TooltipBody } from "@/components/ui/InfoTooltip";
import SettingsSectionTabs from "@/components/settings/SettingsSectionTabs";
import { getStorageUsageAction, type StorageUsage } from "@/app/actions/storage";
import { usePermissions } from "@/context/PermissionsContext";

// Referência do plano Vercel Blob (armazenamento incluído) para o medidor de uso.
const STORAGE_REFERENCE_BYTES = 5 * 1024 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 MB";
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
}

export default function SettingsPage() {
  const { isAdmin } = usePermissions();

  // Estados de Dados da Empresa
  const [razaoSocial, setRazaoSocial] = useState("Móveis Unghero Ltda");
  const [cnpj, setCnpj] = useState("12.345.678/0001-90");
  const [telefone, setTelefone] = useState("(54) 99997-1050");
  const [email, setEmail] = useState("parcerias@moveisunghero.com.br");
  const [endereco, setEndereco] = useState("Av. Júlio de Castilhos, 1420 - Centro, Caxias do Sul - RS");

  // Estados de Operação e Metas
  const [metaMensal, setMetaMensal] = useState("250000");
  const [prazoEntrega, setPrazoEntrega] = useState("45");
  const [margemPadrao, setMargemPadrao] = useState("35");

  // Status do Banco de Dados / Modo Offline
  const [offlineSimulado, setOfflineSimulado] = useState(false);

  // Estados de UI
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  // Uso de armazenamento (somente Admin)
  const [storage, setStorage] = useState<StorageUsage | null>(null);
  const [storageLoading, setStorageLoading] = useState(true);

  // Carrega configurações persistidas localmente se existirem
  useEffect(() => {
    const savedOffline = localStorage.getItem("db-offline-simulado");
    if (savedOffline === "true") {
      setOfflineSimulado(true);
    }
    
    const savedMeta = localStorage.getItem("settings-meta-mensal");
    if (savedMeta) setMetaMensal(savedMeta);

    const savedPrazo = localStorage.getItem("settings-prazo-entrega");
    if (savedPrazo) setPrazoEntrega(savedPrazo);

    const savedMargem = localStorage.getItem("settings-margem-padrao");
    if (savedMargem) setMargemPadrao(savedMargem);

    const savedRazao = localStorage.getItem("settings-razao-social");
    if (savedRazao) setRazaoSocial(savedRazao);
  }, []);

  useEffect(() => {
    let active = true;
    getStorageUsageAction()
      .then((res) => {
        if (!active) return;
        setStorage(res.success ? res.usage : null);
      })
      .catch(() => {
        if (active) setStorage(null);
      })
      .finally(() => {
        if (active) setStorageLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setSucesso(false);

    // Salva no LocalStorage simulando persistência
    localStorage.setItem("db-offline-simulado", String(offlineSimulado));
    localStorage.setItem("settings-meta-mensal", metaMensal);
    localStorage.setItem("settings-prazo-entrega", prazoEntrega);
    localStorage.setItem("settings-margem-padrao", margemPadrao);
    localStorage.setItem("settings-razao-social", razaoSocial);

    setTimeout(() => {
      setSalvando(false);
      setSucesso(true);
      
      // Auto-oculta a mensagem de sucesso depois de 3 segundos
      setTimeout(() => {
        setSucesso(false);
      }, 3000);
    }, 800);
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">Configurações</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Equipe, permissões e cadastros do sistema.
          </p>
        </div>
        <SettingsSectionTabs />
        <div className="max-w-2xl mx-auto">
          <div className="bg-white border border-slate-200/80 rounded-[var(--radius-md)] shadow-sm p-8 text-center space-y-3">
            <div className="mx-auto h-12 w-12 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center">
              <ShieldAlert className="h-6 w-6 text-amber-600" />
            </div>
            <h2 className="text-lg font-black text-slate-800">Acesso restrito</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Os dados da empresa estão disponíveis apenas para a Diretoria. Use as abas acima para as áreas liberadas ao seu cargo.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho de Título */}
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-black tracking-tight text-slate-800">Configurações</h1>
          <InfoTooltip label="Sobre Configurações">
            <TooltipBody
              title="Configurações"
              items={[
                "Dados institucionais, metas e parâmetros padrão da operação.",
                "Acompanhe o uso de armazenamento de fotos e documentos.",
                "Nas abas: colaboradores, permissões e cadastros do sistema.",
              ]}
            />
          </InfoTooltip>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Empresa, equipe, permissões e listas configuráveis do sistema.
        </p>
      </div>

      <SettingsSectionTabs />

      <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
        {/* Painel 1: Dados da Empresa */}
        <div className="bg-white border border-slate-200/80 rounded-[var(--radius-md)] shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 className="h-5 w-5 text-indigo-600" />
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Dados da Marcenaria</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-450">Razão Social</label>
              <input
                type="text"
                value={razaoSocial}
                onChange={(e) => setRazaoSocial(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-xs font-bold text-slate-700 transition-all focus:border-indigo-500 focus:outline-none"              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-450">CNPJ</label>
              <input
                type="text"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-xs font-bold text-slate-700 transition-all focus:border-indigo-500 focus:outline-none"              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-450">E-mail Comercial</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-xs font-bold text-slate-700 transition-all focus:border-indigo-500 focus:outline-none"              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-450">WhatsApp de Contato</label>
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-xs font-bold text-slate-700 transition-all focus:border-indigo-500 focus:outline-none"              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-450">Endereço da Fábrica / Showroom</label>
              <input
                type="text"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-xs font-bold text-slate-700 transition-all focus:border-indigo-500 focus:outline-none"              />
            </div>
          </div>
        </div>

        {/* Painel 2: Operação e Metas */}
        <div className="bg-white border border-slate-200/80 rounded-[var(--radius-md)] shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sliders className="h-5 w-5 text-indigo-600" />
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Operações e Parâmetros</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-450">Meta Mensal do Funil (R$)</label>
              <input
                type="number"
                value={metaMensal}
                onChange={(e) => setMetaMensal(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-xs font-bold text-slate-700 transition-all focus:border-indigo-500 focus:outline-none"              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-450">Dias para Entrega (Padrão)</label>
              <input
                type="number"
                value={prazoEntrega}
                onChange={(e) => setPrazoEntrega(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-xs font-bold text-slate-700 transition-all focus:border-indigo-500 focus:outline-none"              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-450">Margem de Lucro Alvo (%)</label>
              <input
                type="number"
                value={margemPadrao}
                onChange={(e) => setMargemPadrao(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-xs font-bold text-slate-700 transition-all focus:border-indigo-500 focus:outline-none"              />
            </div>
          </div>
        </div>

        {/* Painel 3: Infraestrutura e Status do Banco */}
        <div className="bg-white border border-slate-200/80 rounded-[var(--radius-md)] shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Database className="h-5 w-5 text-indigo-600" />
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Ambiente & Banco de Dados</h2>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-150">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-700 block">Modo Offline Simulado (Demonstração)</span>
              <p className="text-[10px] text-slate-450 font-medium leading-normal max-w-xl">
                Ativar o modo offline simula o desligamento de gravação no banco de dados Neon Postgres, permitindo visualizar como o sistema lida com falhas de rede no painel do administrador.
              </p>
            </div>
            
            <button
              type="button"
              onClick={() => setOfflineSimulado(!offlineSimulado)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                offlineSimulado ? "bg-indigo-650" : "bg-slate-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  offlineSimulado ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {offlineSimulado && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-amber-100 bg-amber-50/50 text-[11px] text-amber-800 font-medium">
              <AlertTriangle className="h-4.5 w-4.5 text-amber-650 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-900 block">Atenção: Modo Demonstração Ativo</span>
                Algumas operações de escrita (criar, editar e deletar itens) retornarão avisos de bloqueio offline para fins de homologação. Desative para voltar a persistir no Neon Postgres.
              </div>
            </div>
          )}
        </div>

        {/* Painel 4: Armazenamento (Admin) */}
        {(storageLoading || storage) && (
          <div className="bg-white border border-slate-200/80 rounded-[var(--radius-md)] shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <HardDrive className="h-5 w-5 text-indigo-600" />
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Armazenamento de Arquivos</h2>
            </div>

            {storageLoading ? (
              <div className="flex items-center gap-2 text-xs text-slate-450 font-medium py-2">
                <div className="h-4 w-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                Calculando uso de armazenamento...
              </div>
            ) : storage ? (
              (() => {
                const pct = Math.min(100, (storage.totalBytes / STORAGE_REFERENCE_BYTES) * 100);
                const barColor = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-indigo-600";
                return (
                  <div className="space-y-4">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-2xl font-black text-slate-800 tracking-tight">{formatBytes(storage.totalBytes)}</p>
                        <p className="text-[11px] text-slate-450 font-medium mt-0.5">
                          de {formatBytes(STORAGE_REFERENCE_BYTES)} de referência ({pct.toFixed(1)}% utilizado)
                        </p>
                      </div>
                      <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">
                        {storage.fileCount} arquivo{storage.fileCount === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.max(pct, 1)}%` }} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-150 rounded-xl px-3.5 py-3">
                        <ImageIcon className="h-4.5 w-4.5 text-indigo-600 shrink-0" />
                        <div>
                          <p className="text-sm font-black text-slate-800 leading-none">{storage.imageCount}</p>
                          <p className="text-[10px] text-slate-450 font-medium uppercase tracking-wider mt-1">Fotos</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-150 rounded-xl px-3.5 py-3">
                        <FileText className="h-4.5 w-4.5 text-indigo-600 shrink-0" />
                        <div>
                          <p className="text-sm font-black text-slate-800 leading-none">{storage.docCount}</p>
                          <p className="text-[10px] text-slate-450 font-medium uppercase tracking-wider mt-1">Documentos</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-slate-150 bg-slate-50/60 text-[11px] text-slate-500 font-medium">
                      <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                      <span>
                        Total de fotos e documentos anexados aos clientes (Vercel Blob). As imagens são otimizadas
                        automaticamente no upload para reduzir o consumo. A referência de {formatBytes(STORAGE_REFERENCE_BYTES)} serve
                        de parâmetro; acima do incluído no plano, o excedente é cobrado por uso.
                      </span>
                    </div>
                  </div>
                );
              })()
            ) : null}
          </div>
        )}

        {/* Barra de Ações do Formulário */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            {sucesso && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3.5 py-2 rounded-xl animate-fade-in">
                <CheckCircle2 className="h-4 w-4" />
                Configurações salvas com sucesso!
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={salvando}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold h-11 px-5 border-none shadow-sm flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-60 transition-all hover:scale-[1.01]"
          >
            {salvando ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Salvando dados...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Salvar Configurações
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
