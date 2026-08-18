"use client";

import React, { useState, useEffect } from "react";
import { 
  Home, 
  Building, 
  Briefcase, 
  Clock, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Upload, 
  Link as LinkIcon, 
  CheckCircle,
  FileText,
  Smartphone,
  Phone,
  Mail,
  User,
  AlertTriangle,
  ChevronDown
} from "lucide-react";
import { submitPublicBriefingAction } from "@/app/actions/briefing";
import { formatPhoneInput, isValidBrPhoneDigits, PHONE_PLACEHOLDER } from "@/lib/phone";
import { FORM_FIELD_LIMITS } from "@/lib/brDocuments";
import { validateOptionalEmail } from "@/lib/email";
import { preventEnterSubmit, useSubmitUnlock } from "@/hooks/useSubmitUnlock";
import FormProgressBar from "@/components/forms/FormProgressBar";
import { BAIRROS_FARROUPILHA } from "@/lib/address";

const TOTAL_STEPS = 11;
const STEP_LABELS = [
  "Ambientes",
  "Imóvel",
  "Fase",
  "Local",
  "Obra",
  "Projeto",
  "Estilo",
  "Investimento",
  "Prazo",
  "Referências",
  "Contato",
] as const;

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
  const [existingClientLinked, setExistingClientLinked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const submitUnlocked = useSubmitUnlock(step === TOTAL_STEPS);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Carregar rascunho do localStorage na montagem (client-side)
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("moveis_unghero_briefing_draft");
      const saved = localStorage.getItem("moveis_unghero_briefing_draft_v2");
      if (saved) {
        try {
          const draft = JSON.parse(saved);
          if (draft.step) setStep(draft.step);
          if (draft.selectedAmbientes) setSelectedAmbientes(draft.selectedAmbientes);
          if (draft.ambienteOpcoes) setAmbienteOpcoes(draft.ambienteOpcoes);
          if (draft.tipoImovel) setTipoImovel(draft.tipoImovel);
          if (draft.faseProjeto) setFaseProjeto(draft.faseProjeto);
          if (draft.cidade) setCidade(draft.cidade);
          if (draft.bairro) setBairro(draft.bairro);
          if (draft.pronto) setPronto(draft.pronto);
          if (draft.dataChaves) setDataChaves(draft.dataChaves);
          if (draft.temProjeto) setTemProjeto(draft.temProjeto);
          if (draft.estilo) setEstilo(draft.estilo);
          if (draft.faixaInvestimento) setFaixaInvestimento(draft.faixaInvestimento);
          if (draft.prazoInicio) setPrazoInicio(draft.prazoInicio);
          if (draft.pinterestLink) setPinterestLink(draft.pinterestLink);
          if (draft.referenciaUrl) setReferenciaUrl(draft.referenciaUrl);
          if (draft.nome) setNome(draft.nome);
          if (draft.telefone) setTelefone(draft.telefone);
          if (draft.email) setEmail(draft.email);
          if (draft.origemLead) setOrigemLead(draft.origemLead);
          if (draft.observacoesAdicionais) setObservacoesAdicionais(draft.observacoesAdicionais);
        } catch (e) {
          console.error("Erro ao recuperar rascunho:", e);
        }
      }
      setIsLoaded(true);
    }
  }, []);
  
  // Respostas do formulário
  const [selectedAmbientes, setSelectedAmbientes] = useState<string[]>([]);
  const [ambienteOpcoes, setAmbienteOpcoes] = useState<Record<string, string>>({});
  const [tipoImovel, setTipoImovel] = useState<string>("");
  const [faseProjeto, setFaseProjeto] = useState<string>("");
  const [cidade, setCidade] = useState("Farroupilha");
  const [bairro, setBairro] = useState("");
  const [bairroDropdownOpen, setBairroDropdownOpen] = useState(false);
  const filteredBairros = BAIRROS_FARROUPILHA.filter(b => 
    b.toLowerCase().includes(bairro.toLowerCase())
  );
  const [pronto, setPronto] = useState("");
  const [dataChaves, setDataChaves] = useState("");
  const [temProjeto, setTemProjeto] = useState("");
  const [estilo, setEstilo] = useState("");
  const [faixaInvestimento, setFaixaInvestimento] = useState("");
  const [prazoInicio, setPrazoInicio] = useState("");
  const [pinterestLink, setPinterestLink] = useState("");
  const [referenciaUrl, setReferenciaUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  // Contato
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [origemLead, setOrigemLead] = useState("");
  const [observacoesAdicionais, setObservacoesAdicionais] = useState("");

  // Metadados
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
    const params = new URLSearchParams(window.location.search);
    const width = window.screen.width;
    const height = window.screen.height;
    
    let device = "Desktop";
    if (window.innerWidth < 768) device = "Mobile";
    else if (window.innerWidth < 1024) device = "Tablet";

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

  // Salvar rascunho no localStorage apenas após carregar o estado inicial
  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      const draft = {
        step,
        selectedAmbientes,
        ambienteOpcoes,
        tipoImovel,
        faseProjeto,
        cidade,
        bairro,
        pronto,
        dataChaves,
        temProjeto,
        estilo,
        faixaInvestimento,
        prazoInicio,
        pinterestLink,
        referenciaUrl,
        nome,
        telefone,
        email,
        origemLead,
        observacoesAdicionais
      };
      localStorage.setItem("moveis_unghero_briefing_draft_v2", JSON.stringify(draft));
    }
  }, [
    isLoaded,
    step,
    selectedAmbientes,
    ambienteOpcoes,
    tipoImovel,
    faseProjeto,
    cidade,
    bairro,
    pronto,
    dataChaves,
    temProjeto,
    estilo,
    faixaInvestimento,
    prazoInicio,
    pinterestLink,
    referenciaUrl,
    nome,
    telefone,
    email,
    origemLead,
    observacoesAdicionais
  ]);

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTelefone(formatPhoneInput(e.target.value));
  };

  const toggleAmbiente = (id: string) => {
    if (selectedAmbientes.includes(id)) {
      setSelectedAmbientes(selectedAmbientes.filter(a => a !== id));
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
    }, 1200);
  };

  // Funções de Seleção Rápida com Auto-Avanço
  const handleSelectTipoImovel = (value: string) => {
    setTipoImovel(value);
    autoAdvance(3);
  };

  const handleSelectFaseProjeto = (value: string) => {
    setFaseProjeto(value);
    autoAdvance(4);
  };

  const handleSelectPronto = (value: string) => {
    setPronto(value);
    // Se for em construção ou entrega breve, não auto-avança para que informe a data
    if (value !== "Está em construção" && value !== "Será entregue em breve") {
      autoAdvance(6);
    }
  };

  const handleSelectTemProjeto = (value: string) => {
    setTemProjeto(value);
    if (value === "Sim" || value === "Está sendo desenvolvido") {
      setEstilo("");
      autoAdvance(8);
    } else if (value === "Não") {
      autoAdvance(7);
    }
  };

  const handleSelectEstilo = (value: string) => {
    setEstilo(value);
    autoAdvance(8);
  };

  const handleSelectFaixaInvestimento = (value: string) => {
    setFaixaInvestimento(value);
    autoAdvance(9);
  };

  const handleSelectPrazoInicio = (value: string) => {
    setPrazoInicio(value);
    autoAdvance(10);
  };

  const autoAdvance = (nextStep: number) => {
    setTimeout(() => {
      setStep(nextStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 250);
  };

  const nextStep = () => {
    setError(null);
    if (step === 1) {
      if (selectedAmbientes.length === 0) {
        setError("Por favor, selecione pelo menos um ambiente.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      // Validar se todas as perguntas condicionais dos ambientes selecionados foram respondidas
      for (const id of selectedAmbientes) {
        const amb = AMBIENTES.find(a => a.id === id);
        if (amb?.perguntaCondicional && !ambienteOpcoes[id]) {
          setError(`Por favor, responda a pergunta complementar do ambiente: ${amb.nome}`);
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
      }
    }
    if (step === 2 && !tipoImovel) {
      setError("Por favor, selecione o tipo do seu imóvel.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (step === 3 && !faseProjeto) {
      setError("Por favor, selecione em qual fase você está.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (step === 4) {
      if (!cidade.trim() || !bairro.trim()) {
        setError("Por favor, preencha a cidade e o bairro do imóvel.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }
    if (step === 5) {
      if (!pronto) {
        setError("Por favor, informe se o imóvel está pronto.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if ((pronto === "Está em construção" || pronto === "Será entregue em breve") && !dataChaves.trim()) {
        setError("Por favor, preencha a data de recebimento das chaves.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }
    if (step === 6) {
      if (!temProjeto) {
        setError("Por favor, informe se possui projeto de interiores.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (temProjeto === "Sim" || temProjeto === "Está sendo desenvolvido") {
        setStep(8);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }
    if (step === 7 && !estilo) {
      setError("Por favor, selecione um estilo estético.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (step === 9 && !prazoInicio) {
      setError("Por favor, informe quando pretende iniciar.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setStep(step + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const prevStep = () => {
    setError(null);
    if (step === 8 && (temProjeto === "Sim" || temProjeto === "Está sendo desenvolvido")) {
      setStep(6);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setStep(step - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!submitUnlocked || step !== TOTAL_STEPS) return;
    if (!nome.trim() || !telefone.trim()) {
      setError("Por favor, preencha seu nome e seu WhatsApp de contato.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (nome.trim().length < 3) {
      setError("Informe seu nome completo.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!isValidBrPhoneDigits(telefone)) {
      setError("Informe um telefone válido com DDD (fixo ou celular).");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const emailError = validateOptionalEmail(email);
    if (emailError) {
      setError(emailError);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setLoading(true);
    const tempoPreenchimento = Math.round((Date.now() - startTime) / 1000);
    const ambientesPayload = selectedAmbientes.map(a => ({
      nome: a,
      opcao: ambienteOpcoes[a] || undefined
    }));

    const payload = {
      nome: nome.trim(),
      telefone: telefone.trim(),
      email: email.trim() || undefined,
      cidade: cidade.trim(),
      bairro: bairro.trim(),
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
      if (typeof window !== "undefined") {
        localStorage.removeItem("moveis_unghero_briefing_draft_v2");
        localStorage.removeItem("moveis_unghero_briefing_draft");
      }
      setSuccess(true);
      setExistingClientLinked(Boolean(res.isExistingClient));
    } else {
      setError(res.error || "Erro ao processar as informações. Tente novamente.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Barra de progresso dinâmica
  if (success) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 px-6 space-y-8 animate-in fade-in duration-500">
        <div className="inline-flex p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-full">
          <CheckCircle className="h-14 w-14 animate-bounce" />
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {existingClientLinked ? "Nova solicitação recebida!" : "Recebemos seu projeto!"}
          </h2>
          <p className="text-sm text-slate-500 font-medium max-w-sm mx-auto">
            {existingClientLinked
              ? "Identificamos seu cadastro e registramos uma nova solicitação de orçamento. Nossa equipe entrará em contato em breve."
              : "Nossa equipe de design e orçamento já está analisando suas escolhas para entrar em contato com uma proposta alinhada."}
          </p>
        </div>

        <div className="p-6 bg-white border border-slate-200/80 rounded-2xl max-w-sm mx-auto space-y-4 shadow-sm">
          <p className="text-xs font-bold text-slate-800 uppercase tracking-widest">Ações Recomendadas</p>
          <div className="grid grid-cols-1 gap-2 text-left">
            <a 
              href="https://instagram.com" 
              target="_blank" 
              rel="noreferrer" 
              className="flex items-center gap-3 p-3 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5 text-pink-600 shrink-0">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
              Nosso Instagram Oficial
            </a>
            <a 
              href="#" 
              className="flex items-center gap-3 p-3 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all"
            >
              <FileText className="h-4.5 w-4.5 text-amber-600 shrink-0" />
              Catálogo de Inspirações (PDF)
            </a>
            <a 
              href="https://wa.me/5554999999999" 
              target="_blank" 
              rel="noreferrer" 
              className="flex items-center gap-3 p-3 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all"
            >
              <Phone className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
              WhatsApp Comercial Direto
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full briefing-container">
      <form
        onSubmit={handleSubmit}
        onKeyDown={preventEnterSubmit}
        className="bg-white border border-slate-200/80 rounded-2xl shadow-sm transition-all duration-300 briefing-card overflow-hidden"
      >
        <FormProgressBar
          step={step}
          totalSteps={TOTAL_STEPS}
          tone="slate"
          stepLabel={`Etapa ${step} de ${TOTAL_STEPS} · ${STEP_LABELS[step - 1]}`}
          className="border-b border-slate-100 bg-slate-50/80"
        />

        <div className="p-6 md:p-8">
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2.5 animate-in slide-in-from-top-4 duration-300">
            <AlertTriangle className="h-4.5 w-4.5 text-rose-600 shrink-0" />
            <span className="flex-1 text-left">{error}</span>
            <button 
              type="button" 
              onClick={() => setError(null)} 
              className="text-rose-450 hover:text-rose-600 font-extrabold text-sm ml-1 cursor-pointer leading-none"
            >
              ×
            </button>
          </div>
        )}
        
        {/* PASSO 1: AMBIENTES */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-1.5">
              <h2 className="text-lg font-black text-slate-900 leading-tight">Qual ambiente você deseja mobiliar?</h2>
              <p className="text-xs text-slate-400 font-semibold">Escolha um ou mais ambientes. Você pode detalhar cada um deles.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {AMBIENTES.map((amb) => {
                const isSelected = selectedAmbientes.includes(amb.id);
                return (
                  <button
                    key={amb.id}
                    type="button"
                    onClick={() => toggleAmbiente(amb.id)}
                    className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[90px] gap-1.5 ${
                      isSelected 
                        ? "border-primary bg-primary text-primary-foreground font-bold" 
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-350"
                    }`}
                  >
                    <span className="text-2xl shrink-0">{amb.icone}</span>
                    <span className="text-xs font-bold leading-tight">{amb.nome}</span>
                  </button>
                );
              })}
            </div>

            {/* Condicionais na mesma tela */}
            {selectedAmbientes.some(id => AMBIENTES.find(a => a.id === id)?.perguntaCondicional) && (
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3 animate-in slide-in-from-top duration-200">
                {selectedAmbientes.map((id) => {
                  const amb = AMBIENTES.find(a => a.id === id);
                  if (!amb || !amb.perguntaCondicional) return null;
                  return (
                    <div key={id} className="space-y-2">
                      <label className="text-xs font-bold text-slate-650 block">
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
                              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                isOpSelected
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
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
            )}

            <div className="flex justify-end pt-2">
              <button
                key="btn-next-step1"
                type="button"
                onClick={nextStep}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg shadow-sm cursor-pointer transition-all"
              >
                Continuar <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* PASSO 2: TIPO DO IMÓVEL */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-1.5">
              <h2 className="text-lg font-black text-slate-900 leading-tight">O imóvel é:</h2>
              <p className="text-xs text-slate-400 font-semibold">Selecione uma das opções abaixo.</p>
            </div>

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
                    onClick={() => handleSelectTipoImovel(item.id)}
                    className={`p-4 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                      isSelected 
                        ? "border-primary bg-primary text-primary-foreground font-bold" 
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-350"
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="text-xs font-bold">{item.nome}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 cursor-pointer transition-all"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>
            </div>
          </div>
        )}

        {/* PASSO 3: FASE DO PROJETO */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-1.5">
              <h2 className="text-lg font-black text-slate-900 leading-tight">Em que fase você está?</h2>
              <p className="text-xs text-slate-400 font-semibold font-bold">Isso define a velocidade do nosso contato.</p>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
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
                    onClick={() => handleSelectFaseProjeto(item.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected 
                        ? "border-primary bg-primary text-primary-foreground font-bold" 
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <span className="text-xs font-bold">{item.nome}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 cursor-pointer transition-all"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>
            </div>
          </div>
        )}

        {/* PASSO 4: LOCALIZAÇÃO */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-1.5">
              <h2 className="text-lg font-black text-slate-900 leading-tight">Onde fica o imóvel?</h2>
              <p className="text-xs text-slate-400 font-semibold font-bold">Informe a cidade e o bairro do imóvel.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-650">Cidade</label>
                <input
                  disabled
                  type="text"
                  value="Farroupilha - RS"
                  className="w-full border border-slate-200 bg-slate-50 text-slate-400 rounded-xl text-xs p-3.5 font-bold cursor-not-allowed border-dashed"
                />
              </div>
              <div className="space-y-1.5 relative">
                <label className="text-xs font-bold text-slate-650">Bairro</label>
                <div className="relative">
                  <input
                    required
                    type="text"
                    placeholder="Selecione ou digite o bairro..."
                    value={bairro}
                    onChange={e => {
                      setBairro(e.target.value);
                      setBairroDropdownOpen(true);
                    }}
                    onFocus={() => setBairroDropdownOpen(true)}
                    className="w-full border border-slate-200 rounded-xl text-xs p-3.5 focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 font-semibold pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setBairroDropdownOpen(!bairroDropdownOpen)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                  >
                    <ChevronDown className="h-4.5 w-4.5" />
                  </button>
                </div>

                {bairroDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40 cursor-default" 
                      onClick={() => setBairroDropdownOpen(false)}
                    />
                    <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-1 duration-150">
                      {filteredBairros.length > 0 ? (
                        filteredBairros.map((b) => (
                          <button
                            key={b}
                            type="button"
                            onClick={() => {
                              setBairro(b);
                              setBairroDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-all border-b border-slate-100 last:border-b-0 cursor-pointer"
                          >
                            {b}
                          </button>
                        ))
                      ) : (
                        <div className="p-3 text-center text-[10px] text-slate-400 font-semibold">
                          Nenhum bairro encontrado. Use o texto digitado.
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button
                key="btn-back-step4"
                type="button"
                onClick={prevStep}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 cursor-pointer transition-all"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>
              <button
                key="btn-next-step4"
                type="button"
                onClick={nextStep}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg shadow-sm cursor-pointer transition-all"
              >
                Continuar <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* PASSO 5: STATUS DA OBRA */}
        {step === 5 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-1.5">
              <h2 className="text-lg font-black text-slate-900 leading-tight">O imóvel já está pronto?</h2>
              <p className="text-xs text-slate-400 font-semibold">Escolha a opção que condiz com o estágio atual.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { id: "Sim", nome: "Sim, pronto para medição" },
                { id: "Não", nome: "Não, sem previsão imediata" },
                { id: "Está em construção", nome: "Está em construção" },
                { id: "Será entregue em breve", nome: "Será entregue em breve" }
              ].map((item) => {
                const isSelected = pronto === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectPronto(item.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected 
                        ? "border-primary bg-primary text-primary-foreground font-bold" 
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-350"
                    }`}
                  >
                    <span className="text-xs font-bold">{item.nome}</span>
                  </button>
                );
              })}
            </div>

            {/* Condicional na mesma tela */}
            {(pronto === "Está em construção" || pronto === "Será entregue em breve") && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-in slide-in-from-top duration-300 max-w-xs">
                <label className="text-xs font-bold text-slate-750 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-500" /> Quando recebe as chaves?
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Dezembro/2026"
                  value={dataChaves}
                  onChange={e => setDataChaves(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg text-xs p-2.5 bg-white focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 font-semibold"
                />
              </div>
            )}

            <div className="flex justify-between pt-2">
              <button
                key="btn-back-step5"
                type="button"
                onClick={prevStep}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 cursor-pointer transition-all"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>
              {/* Só exibe avançar manual se for condicional */}
              {(pronto === "Está em construção" || pronto === "Será entregue em breve") && (
                <button
                  key="btn-next-step5"
                  type="button"
                  onClick={nextStep}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg shadow-sm cursor-pointer transition-all"
                >
                  Continuar <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* PASSO 6: POSSE DE PROJETO */}
        {step === 6 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-1.5">
              <h2 className="text-lg font-black text-slate-900 leading-tight">Você já possui projeto de interiores?</h2>
              <p className="text-xs text-slate-400 font-semibold">Ajuda a pular etapas de design se já possuir.</p>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
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
                    onClick={() => handleSelectTemProjeto(item.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected 
                        ? "border-primary bg-primary text-primary-foreground font-bold" 
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-305"
                    }`}
                  >
                    <span className="text-xs font-bold">{item.nome}</span>
                  </button>
                );
              })}
            </div>

            {temProjeto === "Preciso que seja feito um" && (
              <p className="text-[10px] text-slate-400 font-semibold mt-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100 animate-in slide-in-from-top duration-300">
                * Desenvolvemos o projeto simples em 3D de modulação sem custo adicional no fechamento comercial.
              </p>
            )}

            <div className="flex justify-between pt-2">
              <button
                key="btn-back-step6"
                type="button"
                onClick={prevStep}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 cursor-pointer transition-all"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>
              {temProjeto === "Preciso que seja feito um" && (
                <button
                  key="btn-next-step6"
                  type="button"
                  onClick={nextStep}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg shadow-sm cursor-pointer transition-all"
                >
                  Continuar <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* PASSO 7: ESTILO */}
        {step === 7 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-1.5">
              <h2 className="text-lg font-black text-slate-900 leading-tight">Qual o estilo que você procura?</h2>
              <p className="text-xs text-slate-400 font-semibold font-bold font-semibold">Escolha o visual que mais te atrai.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {ESTILOS.map((est) => {
                const isSelected = estilo === est.id;
                return (
                  <button
                    key={est.id}
                    type="button"
                    onClick={() => handleSelectEstilo(est.id)}
                    className={`rounded-2xl overflow-hidden border text-left transition-all cursor-pointer flex flex-col group ${
                      isSelected 
                        ? "border-primary ring-1 ring-primary bg-primary/5 font-bold" 
                        : "border-slate-200 bg-white hover:border-slate-300"
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
                      <h4 className="text-xs font-black text-slate-950">{est.nome}</h4>
                      <p className="text-[9px] text-slate-450 leading-normal">{est.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 cursor-pointer transition-all"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>
            </div>
          </div>
        )}

        {/* PASSO 8: INVESTIMENTO */}
        {step === 8 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-1.5">
              <h2 className="text-lg font-black text-slate-900 leading-tight">Qual a sua expectativa de investimento? (Opcional)</h2>
              <p className="text-xs text-slate-400 font-semibold font-bold">Fique à vontade, serve apenas de guia inicial.</p>
            </div>

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
                    onClick={() => handleSelectFaixaInvestimento(item)}
                    className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected 
                        ? "border-primary bg-primary text-primary-foreground font-bold" 
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-350"
                    }`}
                  >
                    <span className="text-xs font-bold">{item}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 cursor-pointer transition-all"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>
            </div>
          </div>
        )}

        {/* PASSO 9: PRAZO */}
        {step === 9 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-1.5">
              <h2 className="text-lg font-black text-slate-900 leading-tight">Quando pretende iniciar a produção/fabricação?</h2>
              <p className="text-xs text-slate-400 font-semibold">Organizamos nossa fila de produção com base nisso.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                    onClick={() => handleSelectPrazoInicio(item)}
                    className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected 
                        ? "border-primary bg-primary text-primary-foreground font-bold" 
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-350"
                    }`}
                  >
                    <span className="text-xs font-bold">{item}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 cursor-pointer transition-all"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>
            </div>
          </div>
        )}

        {/* PASSO 10: REFERÊNCIAS */}
        {step === 10 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-1.5">
              <h2 className="text-lg font-black text-slate-900 leading-tight">Referências e Arquivos (Opcional)</h2>
              <p className="text-xs text-slate-400 font-semibold">Compartilhe ideias visuais ou a planta técnica do imóvel.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <LinkIcon className="h-3.5 w-3.5 text-slate-500" /> Link do Pinterest ou referências
                </label>
                <input
                  type="url"
                  placeholder="https://pinterest.com/..."
                  value={pinterestLink}
                  onChange={e => setPinterestLink(e.target.value)}
                  className="w-full border border-slate-200 bg-white rounded-xl text-xs p-3.5 focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Upload className="h-3.5 w-3.5 text-slate-500" /> Arquivo ou Planta do arquiteto
                </label>
                <button
                  type="button"
                  onClick={handleUploadFake}
                  disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 p-3.5 bg-white hover:bg-slate-50 border border-slate-200 border-dashed rounded-xl text-xs font-bold text-slate-600 transition-all cursor-pointer disabled:opacity-50"
                >
                  {uploading ? "Subindo arquivo..." : referenciaUrl ? "Arquivo adicionado! ✅" : "Anexar PDF ou imagem"}
                </button>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button
                key="btn-back-step10"
                type="button"
                onClick={prevStep}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 cursor-pointer transition-all"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>
              <button
                key="btn-next-step10"
                type="button"
                onClick={nextStep}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg shadow-sm cursor-pointer transition-all"
              >
                Continuar <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* PASSO 11: CONTATO */}
        {step === 11 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-1.5 text-center">
              <h2 className="text-lg font-black text-slate-900 leading-tight">Como podemos te retornar?</h2>
              <p className="text-xs text-slate-400 font-semibold font-bold">Preencha seus dados finais para enviar o orçamento.</p>
            </div>

            <div className="space-y-4 border border-slate-100 rounded-xl p-5 bg-slate-50/50">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-slate-400 shrink-0" /> Nome completo *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ex: João da Silva"
                  value={nome}
                  onChange={e => setNome(e.target.value.slice(0, FORM_FIELD_LIMITS.nome))}
                  maxLength={FORM_FIELD_LIMITS.nome}
                  className="w-full border border-slate-200 bg-white rounded-xl text-xs p-3.5 focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Smartphone className="h-3.5 w-3.5 text-slate-400 shrink-0" /> WhatsApp / Telefone *
                  </label>
                  <input
                    required
                    type="tel"
                    inputMode="numeric"
                    placeholder={PHONE_PLACEHOLDER}
                    value={telefone}
                    onChange={handleTelefoneChange}
                    maxLength={16}
                    className="w-full border border-slate-200 bg-white rounded-xl text-xs p-3.5 focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 font-semibold"
                  />
                  <p className="text-[10px] text-slate-400">Celular ou fixo com DDD</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" /> E-mail (Opcional)
                  </label>
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="joao@exemplo.com"
                    value={email}
                    onChange={e => setEmail(e.target.value.slice(0, FORM_FIELD_LIMITS.email))}
                    maxLength={FORM_FIELD_LIMITS.email}
                    className="w-full border border-slate-200 bg-white rounded-xl text-xs p-3.5 focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Como conheceu a nossa marcenaria?</label>
                <select
                  value={origemLead}
                  onChange={e => setOrigemLead(e.target.value)}
                  className="w-full border border-slate-200 bg-white rounded-xl text-xs p-3.5 focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 font-semibold cursor-pointer"
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

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Informações adicionais (Opcional)</label>
                <textarea
                  placeholder="Ex: Tenho preferência por tons amadeirados escuros..."
                  value={observacoesAdicionais}
                  onChange={e => setObservacoesAdicionais(e.target.value)}
                  rows={2}
                  className="w-full border border-slate-200 bg-white rounded-xl text-xs p-3.5 focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 font-semibold resize-none"
                />
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button
                key="btn-back-step11"
                type="button"
                onClick={prevStep}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 cursor-pointer transition-all"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>
              <button
                key="btn-submit-briefing"
                type="submit"
                disabled={loading || !submitUnlocked}
                title={!submitUnlocked ? "Aguarde um instante para enviar" : undefined}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg shadow-md cursor-pointer transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? "Processando..." : !submitUnlocked ? "Aguarde..." : "Enviar Qualificação"}
              </button>
            </div>
          </div>
        )}
        </div>
      </form>
    </div>
  );
}
