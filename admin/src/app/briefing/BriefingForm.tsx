"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Home, 
  Building, 
  Briefcase, 
  Sparkles, 
  Clock, 
  DollarSign, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Upload, 
  Link as LinkIcon, 
  CheckCircle,
  FileText,
  MapPin,
  Smartphone,
  Phone,
  Mail,
  User
} from "lucide-react";
import { submitPublicBriefingAction } from "@/app/actions/briefing";

// Estilos de imagens para os cards de estilo
const ESTILOS = [
  { id: "Minimalista", nome: "Minimalista", desc: "Cores neutras, linhas retas e funcionalidade.", img: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80" },
  { id: "Moderno", nome: "Moderno", desc: "Sofisticado, com uso de vidro, metal e lacas.", img: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=400&q=80" },
  { id: "Contemporâneo", nome: "Contemporâneo", desc: "Tendências atuais, formas orgânicas e aconchego.", img: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=400&q=80" },
  { id: "Industrial", nome: "Industrial", desc: "Tijolos expostos, tons escuros e metal preto.", img: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=400&q=80" },
  { id: "Clássico", nome: "Clássico", desc: "Móveis robustos, molduras e elegância tradicional.", img: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=400&q=80" },
  { id: "Escandinavo", nome: "Escandinavo", desc: "Madeira clara, muita luz natural e simplicidade.", img: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=400&q=80" },
  { id: "Rústico", nome: "Rústico", desc: "Madeira de demolição, aconchego e aspecto natural.", img: "https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=400&q=80" },
  { id: "Não sei", nome: "Ainda não sei", desc: "Preciso de ajuda de um designer para definir.", img: "https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=400&q=80" }
];

const AMBIENTES = [
  { id: "Cozinha", nome: "Cozinha", icone: "🍳", perguntaCondicional: "Você deseja:", opcoes: ["Apenas armários", "Cozinha completa", "Cozinha + Ilha"] },
  { id: "Quarto", nome: "Quarto", icone: "🛏️", perguntaCondicional: "Qual o tipo de quarto?", opcoes: ["Casal", "Solteiro", "Infantil"] },
  { id: "Closet", nome: "Closet", icone: "🧥", perguntaCondicional: "Como prefere o closet?", opcoes: ["Aberto", "Fechado", "Ainda não sei"] },
  { id: "Sala", nome: "Sala", icone: "📺" },
  { id: "Banheiro", nome: "Banheiro", icone: "🚿" },
  { id: "Lavanderia", nome: "Lavanderia", icone: "🧺" },
  { id: "Escritório", nome: "Escritório", icone: "💻" },
  { id: "Área Gourmet", nome: "Área Gourmet", icone: "🔥" },
  { id: "Apartamento completo", nome: "Apartamento completo", icone: "🏢", perguntaCondicional: "Quantos ambientes?", opcoes: ["1 a 3 ambientes", "4 a 6 ambientes", "Mais de 6 ambientes"] },
  { id: "Casa completa", nome: "Casa completa", icone: "🏡", perguntaCondicional: "Quantos ambientes?", opcoes: ["1 a 3 ambientes", "4 a 6 ambientes", "Mais de 6 ambientes"] },
  { id: "Outro", nome: "Outro", icone: "✨" }
];

export default function BriefingForm({ companyId }: { companyId?: string }) {
  const [step, setStep] = useState(1);
  const [startTime] = useState<number>(Date.now());
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Respostas do Step 1
  const [selectedAmbientes, setSelectedAmbientes] = useState<string[]>([]);
  const [ambienteOpcoes, setAmbienteOpcoes] = useState<Record<string, string>>({});
  const [tipoImovel, setTipoImovel] = useState<string>("");
  const [faseProjeto, setFaseProjeto] = useState<string>("");

  // Respostas do Step 2
  const [cidade, setCidade] = useState("");
  const [bairro, setBairro] = useState("");
  const [pronto, setPronto] = useState("");
  const [dataChaves, setDataChaves] = useState("");
  const [temProjeto, setTemProjeto] = useState("");

  // Respostas do Step 3
  const [estilo, setEstilo] = useState("");
  const [faixaInvestimento, setFaixaInvestimento] = useState("");
  const [prazoInicio, setPrazoInicio] = useState("");
  const [pinterestLink, setPinterestLink] = useState("");
  const [referenciaUrl, setReferenciaUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  // Respostas de Contato
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [origemLead, setOrigemLead] = useState("");
  const [observacoesAdicionais, setObservacoesAdicionais] = useState("");

  // Metadados ocultos coletados automaticamente
  const [utmData, setUtmData] = useState({
    utm_source: "",
    utm_medium: "",
    utm_campaign: "",
    gclid: "",
    fbclid: "",
    dispositivo: "Desktop",
    os: "Desconhecido",
    resolution: "",
    idioma: ""
  });

  useEffect(() => {
    // Coleta de UTMs e GCLID/FBCLID
    const params = new URLSearchParams(window.location.search);
    const width = window.screen.width;
    const height = window.screen.height;
    
    // Identificar dispositivo
    let device = "Desktop";
    if (window.innerWidth < 768) device = "Mobile";
    else if (window.innerWidth < 1024) device = "Tablet";

    // Identificar SO
    const ua = navigator.userAgent;
    let osName = "Desconhecido";
    if (ua.indexOf("Win") !== -1) osName = "Windows";
    if (ua.indexOf("Mac") !== -1) osName = "macOS";
    if (ua.indexOf("Linux") !== -1) osName = "Linux";
    if (ua.indexOf("Android") !== -1) osName = "Android";
    if (ua.indexOf("like Mac") !== -1) osName = "iOS";

    setUtmData({
      utm_source: params.get("utm_source") || "",
      utm_medium: params.get("utm_medium") || "",
      utm_campaign: params.get("utm_campaign") || "",
      gclid: params.get("gclid") || "",
      fbclid: params.get("fbclid") || "",
      dispositivo: device,
      os: osName,
      resolution: `${width}x${height}`,
      idioma: navigator.language || ""
    });
  }, []);

  // Formatador de telefone (xx) xxxxx-xxxx
  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    
    if (value.length > 6) {
      value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length > 0) {
      value = `(${value}`;
    }
    setTelefone(value);
  };

  const toggleAmbiente = (id: string) => {
    if (selectedAmbientes.includes(id)) {
      setSelectedAmbientes(selectedAmbientes.filter(a => a !== id));
      // Remove a opção condicional se desmarcado
      const newOpcoes = { ...ambienteOpcoes };
      delete newOpcoes[id];
      setAmbienteOpcoes(newOpcoes);
    } else {
      setSelectedAmbientes([...selectedAmbientes, id]);
    }
  };

  const handleOptionSelect = (ambienteId: string, opcao: string) => {
    setAmbienteOpcoes({
      ...ambienteOpcoes,
      [ambienteId]: opcao
    });
  };

  const handleUploadFake = () => {
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      setReferenciaUrl("https://arquivos-internos.moveisunghero.com.br/upload-" + Date.now() + ".pdf");
    }, 1500);
  };

  const nextStep = () => {
    // Validações simples
    if (step === 1) {
      if (selectedAmbientes.length === 0) {
        alert("Por favor, selecione pelo menos um ambiente que deseja mobiliar.");
        return;
      }
      if (!tipoImovel) {
        alert("Por favor, selecione o tipo do seu imóvel.");
        return;
      }
      if (!faseProjeto) {
        alert("Por favor, nos conte em que fase você está.");
        return;
      }
    }
    if (step === 2) {
      if (!cidade || !bairro) {
        alert("Por favor, informe a cidade e o bairro do imóvel.");
        return;
      }
      if (!pronto) {
        alert("Por favor, selecione se o imóvel já está pronto.");
        return;
      }
      if (pronto === "Está em construção" || pronto === "Será entregue em breve") {
        if (!dataChaves) {
          alert("Por favor, informe quando recebe as chaves.");
          return;
        }
      }
      if (!temProjeto) {
        alert("Por favor, nos informe se você já possui projeto de interiores.");
        return;
      }
    }
    if (step === 3) {
      if (!estilo) {
        alert("Por favor, selecione o estilo que você mais se identifica.");
        return;
      }
      if (!prazoInicio) {
        alert("Por favor, nos diga quando pretende iniciar.");
        return;
      }
    }
    setStep(step + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const prevStep = () => {
    setStep(step - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !telefone) {
      alert("Por favor, preencha seu nome e telefone de contato.");
      return;
    }

    setLoading(true);

    const tempoPreenchimento = Math.round((Date.now() - startTime) / 1000);
    const ambientesPayload = selectedAmbientes.map(a => ({
      nome: a,
      opcao: ambienteOpcoes[a] || undefined
    }));

    const payload = {
      nome,
      telefone,
      email: email || undefined,
      cidade: `${cidade} - ${bairro}`,
      origem_lead: origemLead || "SITE",
      ambientes: ambientesPayload,
      tipo_imovel: tipoImovel,
      fase_projeto: faseProjeto,
      pronto,
      data_chaves: dataChaves || undefined,
      tem_projeto: temProjeto,
      estilo,
      faixa_investimento: faixaInvestimento || "Prefiro conversar",
      prazo_inicio: prazoInicio,
      pinterest_link: pinterestLink || undefined,
      referencia_url: referenciaUrl || undefined,
      observacoes_adicionais: observacoesAdicionais || undefined,
      tempo_preenchimento: tempoPreenchimento,
      company_id: companyId,
      ...utmData
    };

    const res = await submitPublicBriefingAction(payload);
    setLoading(false);

    if (res.success) {
      setSuccess(true);
    } else {
      alert(res.error || "Ocorreu um erro ao enviar suas respostas. Tente novamente.");
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12 px-4 space-y-8 animate-in fade-in duration-500">
        <div className="inline-flex p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-full">
          <CheckCircle className="h-16 w-16" />
        </div>
        <div className="space-y-3">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Recebemos seu projeto!</h2>
          <p className="text-slate-650 font-medium max-w-md mx-auto">
            Nossa equipe comercial e de design já está analisando suas respostas para preparar um atendimento personalizado.
          </p>
        </div>

        <div className="p-6 bg-slate-50 border border-slate-200/60 rounded-2xl max-w-md mx-auto space-y-4">
          <p className="text-sm font-bold text-slate-800">O que você pode fazer agora?</p>
          <div className="grid grid-cols-1 gap-2.5 text-left">
            <a 
              href="https://instagram.com" 
              target="_blank" 
              rel="noreferrer" 
              className="flex items-center gap-3 p-3 bg-white hover:bg-slate-100/50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5 text-pink-600 shrink-0">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
              Acompanhar nosso Instagram
            </a>
            <a 
              href="#" 
              className="flex items-center gap-3 p-3 bg-white hover:bg-slate-100/50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all"
            >
              <FileText className="h-4.5 w-4.5 text-primary shrink-0" />
              Baixar Catálogo de Inspirações (PDF)
            </a>
            <a 
              href="https://wa.me/5554999999999" 
              target="_blank" 
              rel="noreferrer" 
              className="flex items-center gap-3 p-3 bg-white hover:bg-slate-100/50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all"
            >
              <Phone className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
              Chamar no WhatsApp Comercial
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Barra de Progresso */}
      <div className="mb-8 space-y-3">
        <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-widest">
          <span>Qualificação de Projeto</span>
          <span>Etapa {step} de 4</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
          <div 
            className="h-full bg-[hsl(28_85%_45%)] transition-all duration-300 ease-out" 
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in duration-300">
        
        {/* STEP 1: SOBRE O PROJETO */}
        {step === 1 && (
          <div className="space-y-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Qual ambiente você deseja mobiliar?</h2>
              <p className="text-sm text-slate-500">Selecione todos os ambientes que fazem parte da sua ideia. Escolha quantos quiser.</p>
            </div>

            {/* Grid de ambientes */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {AMBIENTES.map((amb) => {
                const isSelected = selectedAmbientes.includes(amb.id);
                return (
                  <button
                    key={amb.id}
                    type="button"
                    onClick={() => toggleAmbiente(amb.id)}
                    className={`p-4 rounded-2xl border text-center transition-all cursor-pointer space-y-2 flex flex-col items-center justify-center min-h-[100px] ${
                      isSelected 
                        ? "border-primary bg-primary/5 text-primary ring-1 ring-primary" 
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-350"
                    }`}
                  >
                    <span className="text-3xl shrink-0">{amb.icone}</span>
                    <span className="text-xs font-bold leading-tight">{amb.nome}</span>
                  </button>
                );
              })}
            </div>

            {/* Perguntas Condicionais de Ambientes */}
            {selectedAmbientes.some(id => AMBIENTES.find(a => a.id === id)?.perguntaCondicional) && (
              <div className="p-5 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-4 animate-in slide-in-from-top duration-300">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Detalhes Adicionais</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedAmbientes.map((id) => {
                    const amb = AMBIENTES.find(a => a.id === id);
                    if (!amb || !amb.perguntaCondicional) return null;
                    return (
                      <div key={id} className="space-y-2">
                        <label className="text-xs font-bold text-slate-750 block">
                          [{amb.nome}] {amb.perguntaCondicional}
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {amb.opcoes?.map((opcao) => {
                            const isOpSelected = ambienteOpcoes[id] === opcao;
                            return (
                              <button
                                key={opcao}
                                type="button"
                                onClick={() => handleOptionSelect(id, opcao)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                  isOpSelected
                                    ? "bg-primary text-white border-primary"
                                    : "bg-white text-slate-750 border-slate-200 hover:border-slate-300"
                                }`}
                              >
                                {opcao}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tipo do Imóvel */}
            <div className="space-y-3">
              <h3 className="text-base font-black text-slate-900">O imóvel é:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: "Apartamento", nome: "Apartamento", icone: Building },
                  { id: "Casa", nome: "Casa", icone: Home },
                  { id: "Comercial", nome: "Comercial", icone: Briefcase }
                ].map((item) => {
                  const isSelected = tipoImovel === item.id;
                  const Icon = item.icone;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTipoImovel(item.id)}
                      className={`p-4 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                        isSelected 
                          ? "border-primary bg-primary/5 text-primary ring-1 ring-primary" 
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-350"
                      }`}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="text-xs font-bold">{item.nome}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fase do Projeto */}
            <div className="space-y-3">
              <h3 className="text-base font-black text-slate-900">Em que fase você está?</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: "Apenas pesquisando", nome: "Apenas pesquisando" },
                  { id: "Comparando orçamentos", nome: "Comparando orçamentos" },
                  { id: "Já tenho o projeto", nome: "Já tenho o projeto" },
                  { id: "Quero iniciar o quanto antes", nome: "Quero iniciar o quanto antes" }
                ].map((item) => {
                  const isSelected = faseProjeto === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFaseProjeto(item.id)}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected 
                          ? "border-primary bg-primary/5 text-primary ring-1 ring-primary" 
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-350"
                      }`}
                    >
                      <span className="text-xs font-bold">{item.nome}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={nextStep}
                className="flex items-center gap-1.5 px-6 py-3 bg-[hsl(28_85%_45%)] hover:bg-[hsl(28_85%_40%)] text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all"
              >
                Próxima etapa <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: SOBRE O IMÓVEL */}
        {step === 2 && (
          <div className="space-y-8 animate-in slide-in-from-right duration-300">
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Onde fica o imóvel e qual o status atual?</h2>
              <p className="text-sm text-slate-500">Isso ajuda nosso projetista a mapear a logística e regras de condomínio.</p>
            </div>

            {/* Cidade e Bairro */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Cidade</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Caxias do Sul"
                  value={cidade}
                  onChange={e => setCidade(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl text-xs p-3 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Bairro</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Centro"
                  value={bairro}
                  onChange={e => setBairro(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl text-xs p-3 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-medium"
                />
              </div>
            </div>

            {/* Imóvel pronto? */}
            <div className="space-y-3">
              <h3 className="text-base font-black text-slate-900">O imóvel já está pronto?</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: "Sim", nome: "Sim, pronto para medir/instalar" },
                  { id: "Não", nome: "Não, sem previsão imediata" },
                  { id: "Está em construção", nome: "Está em construção" },
                  { id: "Será entregue em breve", nome: "Será entregue em breve" }
                ].map((item) => {
                  const isSelected = pronto === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPronto(item.id)}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected 
                          ? "border-primary bg-primary/5 text-primary ring-1 ring-primary" 
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-350"
                      }`}
                    >
                      <span className="text-xs font-bold">{item.nome}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pergunta condicional: Quando recebe as chaves? */}
            {(pronto === "Está em construção" || pronto === "Será entregue em breve") && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-in slide-in-from-top duration-300 max-w-sm">
                <label className="text-xs font-bold text-slate-750 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" /> Quando recebe as chaves?
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Dezembro/2026"
                  value={dataChaves}
                  onChange={e => setDataChaves(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg text-xs p-2.5 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-medium"
                />
              </div>
            )}

            {/* Possui projeto de interiores? */}
            <div className="space-y-3">
              <h3 className="text-base font-black text-slate-900">Você já possui projeto de interiores?</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: "Sim", nome: "Sim, já tenho o projeto em mãos" },
                  { id: "Não", nome: "Não possuo projeto" },
                  { id: "Está sendo desenvolvido", nome: "Está sendo desenvolvido pelo arquiteto" },
                  { id: "Preciso que seja feito um", nome: "Preciso que seja feito um *" }
                ].map((item) => {
                  const isSelected = temProjeto === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTemProjeto(item.id)}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected 
                          ? "border-primary bg-primary/5 text-primary ring-1 ring-primary" 
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-350"
                      }`}
                    >
                      <span className="text-xs font-bold">{item.nome}</span>
                    </button>
                  );
                })}
              </div>
              {temProjeto === "Preciso que seja feito um" && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  * Desenvolvemos o projeto simples em 3D de modulação sem custo adicional para fechamento.
                </p>
              )}
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center gap-1.5 px-5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-650 text-xs font-bold rounded-xl cursor-pointer transition-all"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>
              <button
                type="button"
                onClick={nextStep}
                className="flex items-center gap-1.5 px-6 py-3 bg-[hsl(28_85%_45%)] hover:bg-[hsl(28_85%_40%)] text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all"
              >
                Próxima etapa <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: O PROJETO */}
        {step === 3 && (
          <div className="space-y-8 animate-in slide-in-from-right duration-300">
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Qual o estilo que você procura?</h2>
              <p className="text-sm text-slate-500">Selecione a imagem que mais combina com a casa dos seus sonhos.</p>
            </div>

            {/* Grid de estilos com imagens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {ESTILOS.map((est) => {
                const isSelected = estilo === est.id;
                return (
                  <button
                    key={est.id}
                    type="button"
                    onClick={() => setEstilo(est.id)}
                    className={`rounded-2xl overflow-hidden border text-left transition-all cursor-pointer flex flex-col group ${
                      isSelected 
                        ? "border-primary ring-2 ring-primary bg-primary/5" 
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100 relative">
                      <img 
                        src={est.img} 
                        alt={est.nome} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                      />
                    </div>
                    <div className="p-3.5 space-y-1">
                      <h4 className="text-xs font-black text-slate-900">{est.nome}</h4>
                      <p className="text-[10px] text-slate-500 leading-normal">{est.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Faixa de Investimento (Opcional) */}
            <div className="space-y-3">
              <h3 className="text-base font-black text-slate-900">Qual o investimento estimado previsto para o projeto?</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  "Até R$15 mil",
                  "R$15 mil a R$30 mil",
                  "R$30 mil a R$60 mil",
                  "Acima de R$60 mil",
                  "Prefiro conversar"
                ].map((item) => {
                  const isSelected = faixaInvestimento === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setFaixaInvestimento(item)}
                      className={`p-4 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected 
                          ? "border-primary bg-primary/5 text-primary ring-1 ring-primary" 
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-350"
                      }`}
                    >
                      <span className="text-xs font-bold">{item}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Prazo para Iniciar */}
            <div className="space-y-3">
              <h3 className="text-base font-black text-slate-900">Quando pretende iniciar a produção/fabricação?</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {[
                  "Este mês",
                  "Em até 3 meses",
                  "Entre 3 e 6 meses",
                  "Mais de 6 meses"
                ].map((item) => {
                  const isSelected = prazoInicio === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setPrazoInicio(item)}
                      className={`p-4 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected 
                          ? "border-primary bg-primary/5 text-primary ring-1 ring-primary" 
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-350"
                      }`}
                    >
                      <span className="text-xs font-bold">{item}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Referências de imagens / Pinterest */}
            <div className="p-5 bg-slate-50 border border-slate-250/60 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-slate-800">Referências de Design (Opcional)</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <LinkIcon className="h-3.5 w-3.5 text-primary" /> Link do Pinterest ou referências
                  </label>
                  <input
                    type="url"
                    placeholder="https://pinterest.com/..."
                    value={pinterestLink}
                    onChange={e => setPinterestLink(e.target.value)}
                    className="w-full border border-slate-200 bg-white rounded-xl text-xs p-3 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Upload className="h-3.5 w-3.5 text-primary" /> Arquivo ou Planta do arquiteto
                  </label>
                  <button
                    type="button"
                    onClick={handleUploadFake}
                    disabled={uploading}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-white hover:bg-slate-100/50 border border-slate-200 border-dashed rounded-xl text-xs font-bold text-slate-650 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {uploading ? "Subindo arquivo..." : referenciaUrl ? "Arquivo adicionado! ✅" : "Clique para anexar (PDF ou PNG)"}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center gap-1.5 px-5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-650 text-xs font-bold rounded-xl cursor-pointer transition-all"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>
              <button
                type="button"
                onClick={nextStep}
                className="flex items-center gap-1.5 px-6 py-3 bg-[hsl(28_85%_45%)] hover:bg-[hsl(28_85%_40%)] text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all"
              >
                Última etapa <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: DADOS DE CONTATO */}
        {step === 4 && (
          <div className="space-y-8 animate-in slide-in-from-right duration-300 max-w-2xl mx-auto">
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Quase lá! Como podemos entrar em contato?</h2>
              <p className="text-sm text-slate-500">Insira suas informações abaixo para agendarmos a nossa conversa.</p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-750 flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-primary shrink-0" /> Nome completo *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ex: João da Silva"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl text-xs p-3 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-750 flex items-center gap-1">
                    <Smartphone className="h-3.5 w-3.5 text-primary shrink-0" /> Telefone / WhatsApp *
                  </label>
                  <input
                    required
                    type="tel"
                    placeholder="(54) 99999-9999"
                    value={telefone}
                    onChange={handleTelefoneChange}
                    className="w-full border border-slate-200 rounded-xl text-xs p-3 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-755 flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-primary shrink-0" /> E-mail (Opcional)
                  </label>
                  <input
                    type="email"
                    placeholder="joao@exemplo.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl text-xs p-3 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-medium"
                  />
                </div>
              </div>

              {/* Como conheceu a empresa */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-750">Como conheceu nossa marcenaria?</label>
                <select
                  value={origemLead}
                  onChange={e => setOrigemLead(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl text-xs p-3 bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-medium"
                >
                  <option value="">Selecione uma opção...</option>
                  <option value="INSTAGRAM">Instagram</option>
                  <option value="GOOGLE">Google</option>
                  <option value="INDICACAO">Indicação</option>
                  <option value="FACEBOOK">Facebook</option>
                  <option value="SITE">Nosso site</option>
                  <option value="OUTROS">Outro</option>
                </select>
              </div>

              {/* Informação adicional (textarea) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-750">Alguma informação importante que gostaria de compartilhar? (Opcional)</label>
                <textarea
                  placeholder="Ex: Gostaria de usar ferragens pretas, tenho urgência por causa da mudança..."
                  value={observacoesAdicionais}
                  onChange={e => setObservacoesAdicionais(e.target.value)}
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl text-xs p-3 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-medium"
                />
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center gap-1.5 px-5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-650 text-xs font-bold rounded-xl cursor-pointer transition-all"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl shadow-lg cursor-pointer transition-all w-48"
              >
                {loading ? "Processando..." : "Enviar Qualificação"}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
