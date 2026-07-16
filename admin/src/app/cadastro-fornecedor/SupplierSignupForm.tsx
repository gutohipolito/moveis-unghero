"use client";

import React, { useState, useEffect } from "react";
import { 
  CheckCircle2, 
  Loader2, 
  Send, 
  ArrowLeft, 
  ArrowRight, 
  AlertCircle, 
  FileText, 
  Upload, 
  Building2, 
  PhoneCall, 
  PackageOpen, 
  BadgePercent, 
  Truck,
  Trash2,
  DollarSign
} from "lucide-react";
import { submitPublicSupplierSignupAction, SupplierSignupData } from "@/app/actions/supplierSignup";

const ESTADOS_BRASIL = [
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapá" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" },
  { value: "MA", label: "Maranhão" },
  { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" },
  { value: "PR", label: "Paraná" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondônia" },
  { value: "RR", label: "Roraima" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "São Paulo" },
  { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" },
];

export default function SupplierSignupForm({ companyId }: { companyId?: string }) {
  const [step, setStep] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // --- Estados do Formulário ---
  // 1. Gerais
  const [nome, setNome] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [inscricaoEstadual, setInscricaoEstadual] = useState("");
  const [categoria, setCategoria] = useState("");
  const [subcategoria, setSubcategoria] = useState("");
  const [site, setSite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [anoFundacao, setAnoFundacao] = useState("");
  const [numFuncionarios, setNumFuncionarios] = useState("");
  const [possuiShowroom, setPossuiShowroom] = useState<boolean | null>(null);

  // 2. Contato
  const [contatoRepresentante, setContatoRepresentante] = useState("");
  const [contatoCargo, setContatoCargo] = useState("");
  const [telefone, setTelefone] = useState("");
  const [contatoWhatsapp, setContatoWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [contatoSegundo, setContatoSegundo] = useState("");
  const [contatoTelefoneSecundario, setContatoTelefoneSecundario] = useState("");
  const [contatoCidade, setContatoCidade] = useState("");
  const [contatoEstado, setContatoEstado] = useState("");
  const [contatoEndereco, setContatoEndereco] = useState("");
  const [contatoCep, setContatoCep] = useState("");

  // 3. Produtos
  const [produtosFornecidos, setProdutosFornecidos] = useState("");
  const [marcasRepresentadas, setMarcasRepresentadas] = useState("");
  const [produtosCatalogoUrl, setProdutosCatalogoUrl] = useState("");
  const [produtosCatalogoName, setProdutosCatalogoName] = useState("");
  const [produtosTabelaPrecosUrl, setProdutosTabelaPrecosUrl] = useState("");
  const [produtosTabelaPrecosName, setProdutosTabelaPrecosName] = useState("");
  const [produtosLinkCatalogoOnline, setProdutosLinkCatalogoOnline] = useState("");
  const [produtosSobEncomenda, setProdutosSobEncomenda] = useState<boolean | null>(null);
  const [produtosQuantidadeMinima, setProdutosQuantidadeMinima] = useState("");
  const [produtosTempoFabricacao, setProdutosTempoFabricacao] = useState("");

  // Upload States
  const [uploadingCatalogo, setUploadingCatalogo] = useState(false);
  const [uploadingTabela, setUploadingTabela] = useState(false);
  const [cnpjLoading, setCnpjLoading] = useState(false);

  // 4. Comercial
  const [comercialCondicoesPagamento, setComercialCondicoesPagamento] = useState<string[]>([]);
  const [comercialDescontoMarceneiros, setComercialDescontoMarceneiros] = useState<boolean | null>(null);
  const [comercialTabelaDiferenciada, setComercialTabelaDiferenciada] = useState<boolean | null>(null);
  const [comercialRepresentanteExclusivo, setComercialRepresentanteExclusivo] = useState<boolean | null>(null);
  const [comercialPedidoMinimo, setComercialPedidoMinimo] = useState("");
  const [comercialFreteGratisAcima, setComercialFreteGratisAcima] = useState("");
  const [comercialComissao, setComercialComissao] = useState("");
  const [comercialObservacoes, setComercialObservacoes] = useState("");

  // 5. Logística
  const [logisticaCidadeEstoque, setLogisticaCidadeEstoque] = useState("");
  const [logisticaPrazoMedioEntrega, setLogisticaPrazoMedioEntrega] = useState("");
  const [logisticaEntregaPropria, setLogisticaEntregaPropria] = useState<boolean | null>(null);
  const [logisticaTransportadora, setLogisticaTransportadora] = useState<boolean | null>(null);
  const [logisticaRetiradaLocal, setLogisticaRetiradaLocal] = useState<boolean | null>(null);
  const [logisticaEstadosAtendidos, setLogisticaEstadosAtendidos] = useState<string[]>([]);
  const [logisticaFazEntregasUrgentes, setLogisticaFazEntregasUrgentes] = useState<boolean | null>(null);
  const [logisticaPossuiRastreamento, setLogisticaPossuiRastreamento] = useState<boolean | null>(null);
  const [logisticaAreaCobertura, setLogisticaAreaCobertura] = useState("");

  // --- Recuperação / Persistência do Rascunho ---
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("moveis_unghero_supplier_draft");
      if (saved) {
        try {
          const draft = JSON.parse(saved);
          if (draft.step) setStep(draft.step);
          
          // 1. Gerais
          if (draft.nome) setNome(draft.nome);
          if (draft.nomeFantasia) setNomeFantasia(draft.nomeFantasia);
          if (draft.cnpj) setCnpj(draft.cnpj);
          if (draft.inscricaoEstadual) setInscricaoEstadual(draft.inscricaoEstadual);
          if (draft.categoria) setCategoria(draft.categoria);
          if (draft.subcategoria) setSubcategoria(draft.subcategoria);
          if (draft.site) setSite(draft.site);
          if (draft.instagram) setInstagram(draft.instagram);
          if (draft.linkedin) setLinkedin(draft.linkedin);
          if (draft.anoFundacao) setAnoFundacao(draft.anoFundacao);
          if (draft.numFuncionarios) setNumFuncionarios(draft.numFuncionarios);
          if (draft.possuiShowroom !== undefined) setPossuiShowroom(draft.possuiShowroom);

          // 2. Contato
          if (draft.contatoRepresentante) setContatoRepresentante(draft.contatoRepresentante);
          if (draft.contatoCargo) setContatoCargo(draft.contatoCargo);
          if (draft.telefone) setTelefone(draft.telefone);
          if (draft.contatoWhatsapp) setContatoWhatsapp(draft.contatoWhatsapp);
          if (draft.email) setEmail(draft.email);
          if (draft.contatoSegundo) setContatoSegundo(draft.contatoSegundo);
          if (draft.contatoTelefoneSecundario) setContatoTelefoneSecundario(draft.contatoTelefoneSecundario);
          if (draft.contatoCidade) setContatoCidade(draft.contatoCidade);
          if (draft.contatoEstado) setContatoEstado(draft.contatoEstado);
          if (draft.contatoEndereco) setContatoEndereco(draft.contatoEndereco);
          if (draft.contatoCep) setContatoCep(draft.contatoCep);

          // 3. Produtos
          if (draft.produtosFornecidos) setProdutosFornecidos(draft.produtosFornecidos);
          if (draft.marcasRepresentadas) setMarcasRepresentadas(draft.marcasRepresentadas);
          if (draft.produtosCatalogoUrl) setProdutosCatalogoUrl(draft.produtosCatalogoUrl);
          if (draft.produtosCatalogoName) setProdutosCatalogoName(draft.produtosCatalogoName);
          if (draft.produtosTabelaPrecosUrl) setProdutosTabelaPrecosUrl(draft.produtosTabelaPrecosUrl);
          if (draft.produtosTabelaPrecosName) setProdutosTabelaPrecosName(draft.produtosTabelaPrecosName);
          if (draft.produtosLinkCatalogoOnline) setProdutosLinkCatalogoOnline(draft.produtosLinkCatalogoOnline);
          if (draft.produtosSobEncomenda !== undefined) setProdutosSobEncomenda(draft.produtosSobEncomenda);
          if (draft.produtosQuantidadeMinima) setProdutosQuantidadeMinima(draft.produtosQuantidadeMinima);
          if (draft.produtosTempoFabricacao) setProdutosTempoFabricacao(draft.produtosTempoFabricacao);

          // 4. Comercial
          if (draft.comercialCondicoesPagamento) setComercialCondicoesPagamento(draft.comercialCondicoesPagamento);
          if (draft.comercialDescontoMarceneiros !== undefined) setComercialDescontoMarceneiros(draft.comercialDescontoMarceneiros);
          if (draft.comercialTabelaDiferenciada !== undefined) setComercialTabelaDiferenciada(draft.comercialTabelaDiferenciada);
          if (draft.comercialRepresentanteExclusivo !== undefined) setComercialRepresentanteExclusivo(draft.comercialRepresentanteExclusivo);
          if (draft.comercialPedidoMinimo) setComercialPedidoMinimo(draft.comercialPedidoMinimo);
          if (draft.comercialFreteGratisAcima) setComercialFreteGratisAcima(draft.comercialFreteGratisAcima);
          if (draft.comercialComissao) setComercialComissao(draft.comercialComissao);
          if (draft.comercialObservacoes) setComercialObservacoes(draft.comercialObservacoes);

          // 5. Logística
          if (draft.logisticaCidadeEstoque) setLogisticaCidadeEstoque(draft.logisticaCidadeEstoque);
          if (draft.logisticaPrazoMedioEntrega) setLogisticaPrazoMedioEntrega(draft.logisticaPrazoMedioEntrega);
          if (draft.logisticaEntregaPropria !== undefined) setLogisticaEntregaPropria(draft.logisticaEntregaPropria);
          if (draft.logisticaTransportadora !== undefined) setLogisticaTransportadora(draft.logisticaTransportadora);
          if (draft.logisticaRetiradaLocal !== undefined) setLogisticaRetiradaLocal(draft.logisticaRetiradaLocal);
          if (draft.logisticaEstadosAtendidos) setLogisticaEstadosAtendidos(draft.logisticaEstadosAtendidos);
          if (draft.logisticaFazEntregasUrgentes !== undefined) setLogisticaFazEntregasUrgentes(draft.logisticaFazEntregasUrgentes);
          if (draft.logisticaPossuiRastreamento !== undefined) setLogisticaPossuiRastreamento(draft.logisticaPossuiRastreamento);
          if (draft.logisticaAreaCobertura) setLogisticaAreaCobertura(draft.logisticaAreaCobertura);
          
        } catch (e) {
          console.error("Erro ao carregar rascunho:", e);
        }
      }
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      const draft = {
        step,
        nome, nomeFantasia, cnpj, inscricaoEstadual, categoria, subcategoria, site, instagram, linkedin, anoFundacao, numFuncionarios, possuiShowroom,
        contatoRepresentante, contatoCargo, telefone, contatoWhatsapp, email, contatoSegundo, contatoTelefoneSecundario, contatoCidade, contatoEstado, contatoEndereco, contatoCep,
        produtosFornecidos, marcasRepresentadas, produtosCatalogoUrl, produtosCatalogoName, produtosTabelaPrecosUrl, produtosTabelaPrecosName, produtosLinkCatalogoOnline, produtosSobEncomenda, produtosQuantidadeMinima, produtosTempoFabricacao,
        comercialCondicoesPagamento, comercialDescontoMarceneiros, comercialTabelaDiferenciada, comercialRepresentanteExclusivo, comercialPedidoMinimo, comercialFreteGratisAcima, comercialComissao, comercialObservacoes,
        logisticaCidadeEstoque, logisticaPrazoMedioEntrega, logisticaEntregaPropria, logisticaTransportadora, logisticaRetiradaLocal, logisticaEstadosAtendidos, logisticaFazEntregasUrgentes, logisticaPossuiRastreamento, logisticaAreaCobertura
      };
      localStorage.setItem("moveis_unghero_supplier_draft", JSON.stringify(draft));
    }
  }, [
    isLoaded, step, nome, nomeFantasia, cnpj, inscricaoEstadual, categoria, subcategoria, site, instagram, linkedin, anoFundacao, numFuncionarios, possuiShowroom,
    contatoRepresentante, contatoCargo, telefone, contatoWhatsapp, email, contatoSegundo, contatoTelefoneSecundario, contatoCidade, contatoEstado, contatoEndereco, contatoCep,
    produtosFornecidos, marcasRepresentadas, produtosCatalogoUrl, produtosCatalogoName, produtosTabelaPrecosUrl, produtosTabelaPrecosName, produtosLinkCatalogoOnline, produtosSobEncomenda, produtosQuantidadeMinima, produtosTempoFabricacao,
    comercialCondicoesPagamento, comercialDescontoMarceneiros, comercialTabelaDiferenciada, comercialRepresentanteExclusivo, comercialPedidoMinimo, comercialFreteGratisAcima, comercialComissao, comercialObservacoes,
    logisticaCidadeEstoque, logisticaPrazoMedioEntrega, logisticaEntregaPropria, logisticaTransportadora, logisticaRetiradaLocal, logisticaEstadosAtendidos, logisticaFazEntregasUrgentes, logisticaPossuiRastreamento, logisticaAreaCobertura
  ]);

  // --- Máscaras ---
  async function fetchCompanyByCnpj(cnpjValue: string) {
    const clean = cnpjValue.replace(/\D/g, "");
    if (clean.length !== 14) return;
    setCnpjLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
      const json = await res.json();
      if (json && !json.message) {
        if (json.razao_social) setNome(json.razao_social);
        if (json.nome_fantasia) setNomeFantasia(json.nome_fantasia);
        if (json.email) setEmail(json.email);
        
        // Tratar telefone comercial
        if (json.ddd_telefone_1) {
          const rawTel = `${json.ddd_telefone_1}`;
          const cleanTel = rawTel.replace(/\D/g, "");
          if (cleanTel.length === 10 || cleanTel.length === 11) {
            setTelefone(`(${cleanTel.slice(0, 2)}) ${cleanTel.slice(2, 7)}-${cleanTel.slice(7)}`);
          } else {
            setTelefone(rawTel);
          }
        }
        
        // Tratar CEP
        if (json.cep) {
          const rawCep = `${json.cep}`;
          const cleanCep = rawCep.replace(/\D/g, "");
          if (cleanCep.length === 8) {
            setContatoCep(`${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}`);
          } else {
            setContatoCep(rawCep);
          }
        }
        
        if (json.municipio) setContatoCidade(json.municipio);
        if (json.uf) setContatoEstado(json.uf);
        
        // Montar endereço completo
        let end = json.logradouro || "";
        if (json.numero) end += `, ${json.numero}`;
        if (json.complemento) end += ` - ${json.complemento}`;
        if (json.bairro) end += ` - ${json.bairro}`;
        if (end) setContatoEndereco(end);
      }
    } catch (err) {
      console.error("Erro ao buscar CNPJ:", err);
    } finally {
      setCnpjLoading(false);
    }
  }

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 14) value = value.slice(0, 14);

    const cleanCnpj = value;

    if (value.length > 12) {
      value = `${value.slice(0, 2)}.${value.slice(2, 5)}.${value.slice(5, 8)}/${value.slice(8, 12)}-${value.slice(12)}`;
    } else if (value.length > 8) {
      value = `${value.slice(0, 2)}.${value.slice(2, 5)}.${value.slice(5, 8)}/${value.slice(8)}`;
    } else if (value.length > 5) {
      value = `${value.slice(0, 2)}.${value.slice(2, 5)}.${value.slice(5)}`;
    } else if (value.length > 2) {
      value = `${value.slice(0, 2)}.${value.slice(2)}`;
    }
    setCnpj(value);

    if (cleanCnpj.length === 14) {
      fetchCompanyByCnpj(cleanCnpj);
    }
  };

  const handlePhoneChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    
    if (value.length > 6) {
      value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length > 0) {
      value = `(${value}`;
    }
    setter(value);
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 8) value = value.slice(0, 8);
    if (value.length > 5) {
      value = `${value.slice(0, 5)}-${value.slice(5)}`;
    }
    setContatoCep(value);
  };

  // --- Handlers de Upload ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fileType: "catalogo" | "tabela") => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    if (fileType === "catalogo") setUploadingCatalogo(true);
    else setUploadingTabela(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/fornecedores/upload", {
        method: "POST",
        body: formData,
      });

      const res = await response.json();
      if (!res.success) {
        setError(res.error || "Erro ao enviar arquivo.");
        return;
      }

      if (fileType === "catalogo") {
        setProdutosCatalogoUrl(res.url);
        setProdutosCatalogoName(res.name);
      } else {
        setProdutosTabelaPrecosUrl(res.url);
        setProdutosTabelaPrecosName(res.name);
      }
    } catch (err) {
      console.error(err);
      setError("Não foi possível enviar o arquivo para o servidor.");
    } finally {
      if (fileType === "catalogo") setUploadingCatalogo(false);
      else setUploadingTabela(false);
    }
  };

  // --- Validação & Navegação de Etapas ---
  const validateStep = () => {
    setError(null);
    if (step === 1) {
      if (!nome.trim()) return "Razão Social é obrigatória.";
      const cleanCnpj = cnpj.replace(/\D/g, "");
      if (cleanCnpj.length !== 14) return "CNPJ incompleto ou inválido.";
      if (!categoria.trim()) return "Categoria principal é obrigatória.";
    }
    if (step === 2) {
      if (!contatoRepresentante.trim()) return "Nome do representante é obrigatório.";
      if (!email.trim()) return "E-mail comercial é obrigatório.";
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) return "Insira um e-mail válido.";
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep();
    if (err) {
      setError(err);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setStep(step + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrev = () => {
    setError(null);
    setStep(step - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // --- Envio Final ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }

    setLoading(true);
    setError(null);

    const payload: SupplierSignupData = {
      company_id: companyId,
      nome,
      nomeFantasia: nomeFantasia || undefined,
      cnpj,
      inscricaoEstadual: inscricaoEstadual || undefined,
      categoria,
      subcategoria: subcategoria || undefined,
      site: site || undefined,
      instagram: instagram || undefined,
      linkedin: linkedin || undefined,
      anoFundacao: anoFundacao ? parseInt(anoFundacao) : undefined,
      numFuncionarios: numFuncionarios || undefined,
      possuiShowroom: possuiShowroom === null ? undefined : possuiShowroom,
      
      contatoRepresentante,
      contatoCargo: contatoCargo || undefined,
      telefone: telefone || undefined,
      contatoWhatsapp: contatoWhatsapp || undefined,
      email,
      contatoSegundo: contatoSegundo || undefined,
      contatoTelefoneSecundario: contatoTelefoneSecundario || undefined,
      contatoCidade: contatoCidade || undefined,
      contatoEstado: contatoEstado || undefined,
      contatoEndereco: contatoEndereco || undefined,
      contatoCep: contatoCep || undefined,

      produtosFornecidos: produtosFornecidos || undefined,
      marcasRepresentadas: marcasRepresentadas || undefined,
      produtosCatalogoUrl: produtosCatalogoUrl || undefined,
      produtosTabelaPrecosUrl: produtosTabelaPrecosUrl || undefined,
      produtosLinkCatalogoOnline: produtosLinkCatalogoOnline || undefined,
      produtosSobEncomenda: produtosSobEncomenda === null ? undefined : produtosSobEncomenda,
      produtosQuantidadeMinima: produtosQuantidadeMinima || undefined,
      produtosTempoFabricacao: produtosTempoFabricacao || undefined,

      comercialCondicoesPagamento,
      comercialDescontoMarceneiros: comercialDescontoMarceneiros === null ? undefined : comercialDescontoMarceneiros,
      comercialTabelaDiferenciada: comercialTabelaDiferenciada === null ? undefined : comercialTabelaDiferenciada,
      comercialRepresentanteExclusivo: comercialRepresentanteExclusivo === null ? undefined : comercialRepresentanteExclusivo,
      comercialPedidoMinimo: comercialPedidoMinimo || undefined,
      comercialFreteGratisAcima: comercialFreteGratisAcima || undefined,
      comercialComissao: comercialComissao || undefined,
      comercialObservacoes: comercialObservacoes || undefined,

      logisticaCidadeEstoque: logisticaCidadeEstoque || undefined,
      logisticaPrazoMedioEntrega: logisticaPrazoMedioEntrega || undefined,
      logisticaEntregaPropria: logisticaEntregaPropria === null ? undefined : logisticaEntregaPropria,
      logisticaTransportadora: logisticaTransportadora === null ? undefined : logisticaTransportadora,
      logisticaRetiradaLocal: logisticaRetiradaLocal === null ? undefined : logisticaRetiradaLocal,
      logisticaEstadosAtendidos,
      logisticaFazEntregasUrgentes: logisticaFazEntregasUrgentes === null ? undefined : logisticaFazEntregasUrgentes,
      logisticaPossuiRastreamento: logisticaPossuiRastreamento === null ? undefined : logisticaPossuiRastreamento,
      logisticaAreaCobertura: logisticaAreaCobertura || undefined,
    };

    try {
      const res = await submitPublicSupplierSignupAction(payload);
      if (res.success) {
        setSuccess(true);
        if (typeof window !== "undefined") {
          localStorage.removeItem("moveis_unghero_supplier_draft");
        }
      } else {
        setError(res.error || "Ocorreu um erro ao enviar o cadastro.");
      }
    } catch (ex) {
      console.error(ex);
      setError("Houve uma falha técnica de rede. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // --- Toggle Pagamentos & Estados ---
  const togglePagamento = (cond: string) => {
    setComercialCondicoesPagamento(prev => 
      prev.includes(cond) ? prev.filter(c => c !== cond) : [...prev, cond]
    );
  };

  const toggleEstado = (est: string) => {
    setLogisticaEstadosAtendidos(prev => 
      prev.includes(est) ? prev.filter(e => e !== est) : [...prev, est]
    );
  };

  // Se for sucesso, renderizar confirmação premium
  if (success) {
    return (
      <div className="w-full bg-slate-900/60 border border-emerald-500/20 backdrop-blur-xl p-8 rounded-2xl text-center space-y-6 shadow-2xl animate-fade-in">
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-12 w-12" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-100">Cadastro Enviado com Sucesso!</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Agradecemos seu interesse em ser fornecedor da Móveis Unghero. 
            Nossa equipe comercial e de logística analisará seus dados e retornará em breve.
          </p>
        </div>
        <div className="pt-4 border-t border-slate-800/60">
          <p className="text-xs text-slate-500 font-semibold">
            Você já pode fechar esta página. Obrigado!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-900/40 border border-slate-800/40 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
      
      {/* Barra de Progresso Superior */}
      <div className="relative h-1.5 w-full bg-slate-950">
        <div 
          className="absolute top-0 left-0 h-full bg-linear-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out" 
          style={{ width: `${(step / 5) * 100}%` }}
        />
      </div>

      {/* Identificação das Etapas */}
      <div className="grid grid-cols-5 border-b border-slate-900/60 text-[10px] sm:text-xs font-bold text-slate-400 bg-slate-950/20">
        <button 
          type="button" 
          disabled={loading} 
          onClick={() => step > 1 && setStep(1)}
          className={`py-3.5 text-center transition-colors hover:text-slate-200 cursor-pointer ${step === 1 ? "text-blue-400 border-b-2 border-blue-400 bg-slate-900/30" : ""}`}
        >
          <Building2 className="h-4 w-4 mx-auto mb-1 opacity-70" />
          <span className="hidden sm:inline">1. Gerais</span>
          <span className="sm:hidden">Gerais</span>
        </button>
        <button 
          type="button" 
          disabled={loading} 
          onClick={() => step > 2 && setStep(2)}
          className={`py-3.5 text-center transition-colors hover:text-slate-200 cursor-pointer ${step === 2 ? "text-blue-400 border-b-2 border-blue-400 bg-slate-900/30" : ""}`}
        >
          <PhoneCall className="h-4 w-4 mx-auto mb-1 opacity-70" />
          <span className="hidden sm:inline">2. Contato</span>
          <span className="sm:hidden">Contato</span>
        </button>
        <button 
          type="button" 
          disabled={loading} 
          onClick={() => step > 3 && setStep(3)}
          className={`py-3.5 text-center transition-colors hover:text-slate-200 cursor-pointer ${step === 3 ? "text-blue-400 border-b-2 border-blue-400 bg-slate-900/30" : ""}`}
        >
          <PackageOpen className="h-4 w-4 mx-auto mb-1 opacity-70" />
          <span className="hidden sm:inline">3. Produtos</span>
          <span className="sm:hidden">Produtos</span>
        </button>
        <button 
          type="button" 
          disabled={loading} 
          onClick={() => step > 4 && setStep(4)}
          className={`py-3.5 text-center transition-colors hover:text-slate-200 cursor-pointer ${step === 4 ? "text-blue-400 border-b-2 border-blue-400 bg-slate-900/30" : ""}`}
        >
          <BadgePercent className="h-4 w-4 mx-auto mb-1 opacity-70" />
          <span className="hidden sm:inline">4. Comercial</span>
          <span className="sm:hidden">Comercial</span>
        </button>
        <button 
          type="button" 
          disabled={loading} 
          onClick={() => step > 5 && setStep(5)}
          className={`py-3.5 text-center transition-colors hover:text-slate-200 cursor-pointer ${step === 5 ? "text-blue-400 border-b-2 border-blue-400 bg-slate-900/30" : ""}`}
        >
          <Truck className="h-4 w-4 mx-auto mb-1 opacity-70" />
          <span className="hidden sm:inline">5. Logística</span>
          <span className="sm:hidden">Logística</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
        
        {/* Notificação de Erros */}
        {error && (
          <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 p-4 rounded-xl text-sm animate-shake">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* ── ETAPA 1: INFORMAÇÕES GERAIS ── */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-400" />
                Informações Gerais
              </h3>
              <p className="text-xs text-slate-400">Identificação formal e dados institucionais da sua empresa.</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 block">Razão Social *</label>
                  <input 
                    required 
                    type="text" 
                    value={nome} 
                    onChange={e => setNome(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg text-sm p-2.5 text-slate-100 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 block">Nome Fantasia</label>
                  <input 
                    type="text" 
                    value={nomeFantasia} 
                    onChange={e => setNomeFantasia(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg text-sm p-2.5 text-slate-100 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 relative">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-400 block">CNPJ *</label>
                    {cnpjLoading && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-blue-400 animate-pulse">
                        <Loader2 className="h-3 w-3 animate-spin" /> Buscando...
                      </span>
                    )}
                  </div>
                  <input 
                    required 
                    type="text" 
                    value={cnpj} 
                    onChange={handleCnpjChange}
                    placeholder="00.000.000/0000-00" 
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg text-sm p-2.5 text-slate-100 placeholder-slate-650 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 block">Inscrição Estadual</label>
                  <input 
                    type="text" 
                    value={inscricaoEstadual} 
                    onChange={e => setInscricaoEstadual(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg text-sm p-2.5 text-slate-100 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 block">Categoria Principal *</label>
                  <select 
                    required 
                    value={categoria} 
                    onChange={e => setCategoria(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg text-sm p-2.5 text-slate-100 focus:border-blue-500 outline-none cursor-pointer"
                  >
                    <option value="" className="bg-slate-900">Selecione uma categoria...</option>
                    <option value="MDF" className="bg-slate-900">Chapas de MDF / Compensados</option>
                    <option value="FERRAGENS" className="bg-slate-900">Ferragens & Fixadores</option>
                    <option value="ILUMINACAO" className="bg-slate-900">Iluminação e LED</option>
                    <option value="TINTAS_QUIMICOS" className="bg-slate-900">Tintas, Colas & Químicos</option>
                    <option value="MAQUINAS" className="bg-slate-900">Máquinas & Ferramentas</option>
                    <option value="OUTROS" className="bg-slate-900">Outros Insumos</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 block">Subcategoria</label>
                  <input 
                    type="text" 
                    value={subcategoria} 
                    onChange={e => setSubcategoria(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg text-sm p-2.5 text-slate-100 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 block">Site Corporativo</label>
                  <input 
                    type="text" 
                    value={site} 
                    onChange={e => setSite(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg text-sm p-2.5 text-slate-100 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 block">Instagram</label>
                  <input 
                    type="text" 
                    value={instagram} 
                    onChange={e => setInstagram(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg text-sm p-2.5 text-slate-100 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 block">LinkedIn</label>
                  <input 
                    type="text" 
                    value={linkedin} 
                    onChange={e => setLinkedin(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg text-sm p-2.5 text-slate-100 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 block">Ano de Fundação</label>
                  <input 
                    type="number" 
                    value={anoFundacao} 
                    onChange={e => setAnoFundacao(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg text-sm p-2.5 text-slate-100 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 block">Nº de Funcionários</label>
                  <input 
                    type="text" 
                    value={numFuncionarios} 
                    onChange={e => setNumFuncionarios(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg text-sm p-2.5 text-slate-100 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-400 block">Possui Showroom?</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-300 font-medium cursor-pointer">
                      <input 
                        type="radio" 
                        name="showroom" 
                        checked={possuiShowroom === true} 
                        onChange={() => setPossuiShowroom(true)} 
                        className="h-4 w-4 accent-blue-500"
                      />
                      Sim
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-300 font-medium cursor-pointer">
                      <input 
                        type="radio" 
                        name="showroom" 
                        checked={possuiShowroom === false} 
                        onChange={() => setPossuiShowroom(false)} 
                        className="h-4 w-4 accent-blue-500"
                      />
                      Não
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ETAPA 2: CONTATO ── */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <PhoneCall className="h-5 w-5 text-blue-400" />
                Contato & Endereço
              </h3>
              <p className="text-xs text-slate-400">Responsáveis e localização do distribuidor ou fábrica.</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 block">Nome do Representante *</label>
                  <input 
                    required 
                    type="text" 
                    value={contatoRepresentante} 
                    onChange={e => setContatoRepresentante(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg text-sm p-2.5 text-slate-100 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 block">Cargo do Representante</label>
                  <input 
                    type="text" 
                    value={contatoCargo} 
                    onChange={e => setContatoCargo(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg text-sm p-2.5 text-slate-100 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 block">E-mail Comercial *</label>
                  <input 
                    required 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg text-sm p-2.5 text-slate-100 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 block">WhatsApp de Contato</label>
                  <input 
                    type="tel" 
                    value={contatoWhatsapp} 
                    onChange={handlePhoneChange(setContatoWhatsapp)}
                    placeholder="(00) 00000-0000" 
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg text-sm p-2.5 text-slate-100 placeholder-slate-650 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 block">Telefone Fixo Comercial</label>
                  <input 
                    type="tel" 
                    value={telefone} 
                    onChange={handlePhoneChange(setTelefone)}
                    placeholder="(00) 0000-0000" 
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg text-sm p-2.5 text-slate-100 placeholder-slate-650 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-slate-800/50 pt-4 space-y-4">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide">Segundo Contato (Suporte/Financeiro)</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 block">Nome do Segundo Contato</label>
                    <input 
                      type="text" 
                      value={contatoSegundo} 
                      onChange={e => setContatoSegundo(e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-lg text-sm p-2.5 text-slate-100 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 block">Telefone Secundário</label>
                    <input 
                      type="tel" 
                      value={contatoTelefoneSecundario} 
                      onChange={handlePhoneChange(setContatoTelefoneSecundario)}
                      placeholder="(00) 00000-0000" 
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-lg text-sm p-2.5 text-slate-100 placeholder-slate-650 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800/50 pt-4 space-y-4">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide">Endereço da Sede</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 block">CEP</label>
                    <input 
                      type="text" 
                      value={contatoCep} 
                      onChange={handleCepChange}
                      placeholder="00000-000" 
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-lg text-sm p-2.5 text-slate-100 placeholder-slate-650 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 block">Cidade</label>
                    <input 
                      type="text" 
                      value={contatoCidade} 
                      onChange={e => setContatoCidade(e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-lg text-sm p-2.5 text-slate-100 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 block">Estado (UF)</label>
                    <select 
                      value={contatoEstado} 
                      onChange={e => setContatoEstado(e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-lg text-sm p-2.5 text-slate-100 focus:border-blue-500 outline-none cursor-pointer"
                    >
                      <option value="" className="bg-slate-900">Selecione...</option>
                      {ESTADOS_BRASIL.map(uf => (
                        <option key={uf.value} value={uf.value} className="bg-slate-900">{uf.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 block">Endereço Completo (Rua, Número, Bairro)</label>
                  <input 
                    type="text" 
                    value={contatoEndereco} 
                    onChange={e => setContatoEndereco(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg text-sm p-2.5 text-slate-100 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ETAPA 3: PRODUTOS ── */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <PackageOpen className="h-5 w-5 text-blue-400" />
                Produtos & Amostras
              </h3>
              <p className="text-xs text-slate-400">Descreva os materiais fornecidos, catálogos e prazos de fabricação.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 block">Quais produtos fornece? *</label>
                <textarea 
                  required
                  rows={3}
                  value={produtosFornecidos} 
                  onChange={e => setProdutosFornecidos(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg text-sm p-2.5 text-slate-100 focus:border-blue-500 outline-none resize-y"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 block">Marcas representadas e parceiros comerciais</label>
                <textarea 
                  rows={2}
                  value={marcasRepresentadas} 
                  onChange={e => setMarcasRepresentadas(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg text-sm p-2.5 text-slate-100 focus:border-blue-500 outline-none resize-y"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Upload de Catálogo PDF */}
                <div className="p-4 bg-slate-950/40 border border-slate-800/80 rounded-xl space-y-3">
                  <span className="text-xs font-bold text-slate-300 block">Possui Catálogo de Produtos?</span>
                  
                  {produtosCatalogoUrl ? (
                    <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800 p-2.5 rounded-lg text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="h-4 w-4 text-red-400 shrink-0" />
                        <span className="text-slate-300 font-bold truncate">{produtosCatalogoName || "catalogo.pdf"}</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => { setProdutosCatalogoUrl(""); setProdutosCatalogoName(""); }}
                        className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-blue-500/50 bg-slate-950/20 py-5 rounded-lg cursor-pointer transition-all">
                      {uploadingCatalogo ? (
                        <div className="flex flex-col items-center gap-1">
                          <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                          <span className="text-[10px] text-slate-400 font-semibold">Enviando...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 text-center px-4">
                          <Upload className="h-5 w-5 text-slate-400" />
                          <span className="text-xs font-bold text-slate-300">Anexar Catálogo (PDF)</span>
                          <span className="text-[9px] text-slate-500 font-medium">PDF de até 10 MB</span>
                        </div>
                      )}
                      <input 
                        type="file" 
                        accept="application/pdf"
                        onChange={e => handleFileUpload(e, "catalogo")} 
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Upload de Tabela de Preços */}
                <div className="p-4 bg-slate-950/40 border border-slate-800/80 rounded-xl space-y-3">
                  <span className="text-xs font-bold text-slate-300 block">Tabela de Preços</span>
                  
                  {produtosTabelaPrecosUrl ? (
                    <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800 p-2.5 rounded-lg text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span className="text-slate-300 font-bold truncate">{produtosTabelaPrecosName || "tabela.pdf"}</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => { setProdutosTabelaPrecosUrl(""); setProdutosTabelaPrecosName(""); }}
                        className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-blue-500/50 bg-slate-950/20 py-5 rounded-lg cursor-pointer transition-all">
                      {uploadingTabela ? (
                        <div className="flex flex-col items-center gap-1">
                          <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                          <span className="text-[10px] text-slate-400 font-semibold">Enviando...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 text-center px-4">
                          <Upload className="h-5 w-5 text-slate-400" />
                          <span className="text-xs font-bold text-slate-300">Anexar Tabela de Preços</span>
                          <span className="text-[9px] text-slate-500 font-medium">PDF ou Excel de até 10 MB</span>
                        </div>
                      )}
                      <input 
                        type="file" 
                        accept="application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        onChange={e => handleFileUpload(e, "tabela")} 
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 block">Link para catálogo online / Drive institucional</label>
                <input 
                  type="text" 
                  value={produtosLinkCatalogoOnline} 
                  onChange={e => setProdutosLinkCatalogoOnline(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg text-sm p-2.5 text-slate-100 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center pt-2">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-400 block">Produtos sob encomenda?</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-300 font-medium cursor-pointer">
                      <input 
                        type="radio" 
                        name="encomenda" 
                        checked={produtosSobEncomenda === true} 
                        onChange={() => setProdutosSobEncomenda(true)} 
                        className="h-4 w-4 accent-blue-500"
                      />
                      Sim
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-300 font-medium cursor-pointer">
                      <input 
                        type="radio" 
                        name="encomenda" 
                        checked={produtosSobEncomenda === false} 
                        onChange={() => setProdutosSobEncomenda(false)} 
                        className="h-4 w-4 accent-blue-500"
                      />
                      Não
                    </label>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 block">Quantidade Mínima de compra</label>
                  <input 
                    type="text" 
                    value={produtosQuantidadeMinima} 
                    onChange={e => setProdutosQuantidadeMinima(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg text-sm p-2.5 text-slate-100 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 block">Tempo médio de fabricação / expedição</label>
                  <input 
                    type="text" 
                    value={produtosTempoFabricacao} 
                    onChange={e => setProdutosTempoFabricacao(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg text-sm p-2.5 text-slate-100 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ETAPA 4: COMERCIAL ── */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <BadgePercent className="h-5 w-5 text-blue-400" />
                Negociação & Condições Comerciais
              </h3>
              <p className="text-xs text-slate-400">Preencha as condições de pagamento, comissão e tabelas preferenciais.</p>
            </div>

            <div className="space-y-4">
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 block">Condições de Pagamento Oferecidas (Selecione todas que puder)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {["Pix", "Boleto à vista", "Boleto 28 dias", "Boleto 30 dias", "Boleto 45 dias", "Cartão de Crédito", "Outros"].map(cond => {
                    const isSelected = comercialCondicoesPagamento.includes(cond);
                    return (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => togglePagamento(cond)}
                        className={`p-2.5 rounded-lg border text-xs font-bold text-center transition-all cursor-pointer ${
                          isSelected 
                            ? "bg-blue-500/10 border-blue-500 text-blue-400 font-bold shadow-xs" 
                            : "bg-slate-950/40 border-slate-800/80 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        {cond}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-800/50 pt-4">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-400 block">Desconto para marceneiros parceiros?</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-300 font-medium cursor-pointer">
                      <input 
                        type="radio" 
                        name="marceneiros" 
                        checked={comercialDescontoMarceneiros === true} 
                        onChange={() => setComercialDescontoMarceneiros(true)} 
                        className="h-4 w-4 accent-blue-500"
                      />
                      Sim
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-300 font-medium cursor-pointer">
                      <input 
                        type="radio" 
                        name="marceneiros" 
                        checked={comercialDescontoMarceneiros === false} 
                        onChange={() => setComercialDescontoMarceneiros(false)} 
                        className="h-4 w-4 accent-blue-500"
                      />
                      Não
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-400 block">Tabela de preço diferenciada para marcenaria?</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-300 font-medium cursor-pointer">
                      <input 
                        type="radio" 
                        name="tabela" 
                        checked={comercialTabelaDiferenciada === true} 
                        onChange={() => setComercialTabelaDiferenciada(true)} 
                        className="h-4 w-4 accent-blue-500"
                      />
                      Sim
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-300 font-medium cursor-pointer">
                      <input 
                        type="radio" 
                        name="tabela" 
                        checked={comercialTabelaDiferenciada === false} 
                        onChange={() => setComercialTabelaDiferenciada(false)} 
                        className="h-4 w-4 accent-blue-500"
                      />
                      Não
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-400 block">Representação exclusiva na região?</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-300 font-medium cursor-pointer">
                      <input 
                        type="radio" 
                        name="representante" 
                        checked={comercialRepresentanteExclusivo === true} 
                        onChange={() => setComercialRepresentanteExclusivo(true)} 
                        className="h-4 w-4 accent-blue-500"
                      />
                      Sim
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-300 font-medium cursor-pointer">
                      <input 
                        type="radio" 
                        name="representante" 
                        checked={comercialRepresentanteExclusivo === false} 
                        onChange={() => setComercialRepresentanteExclusivo(false)} 
                        className="h-4 w-4 accent-blue-500"
                      />
                      Não
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-800/50 pt-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 block">Valor de Pedido Mínimo</label>
                  <input 
                    type="text" 
                    value={comercialPedidoMinimo} 
                    onChange={e => setComercialPedidoMinimo(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg text-sm p-2.5 text-slate-100 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 block">Frete Grátis acima de</label>
                  <input 
                    type="text" 
                    value={comercialFreteGratisAcima} 
                    onChange={e => setComercialFreteGratisAcima(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg text-sm p-2.5 text-slate-100 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 block">Comissão oferecida a parceiros / RT (%)</label>
                  <input 
                    type="text" 
                    value={comercialComissao} 
                    onChange={e => setComercialComissao(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg text-sm p-2.5 text-slate-100 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 block">Observações Comerciais ou Condições Adicionais</label>
                <textarea 
                  rows={3}
                  value={comercialObservacoes} 
                  onChange={e => setComercialObservacoes(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg text-sm p-2.5 text-slate-100 focus:border-blue-500 outline-none resize-y"
                />
              </div>

            </div>
          </div>
        )}

        {/* ── ETAPA 5: LOGÍSTICA ── */}
        {step === 5 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-400" />
                Estrutura de Logística
              </h3>
              <p className="text-xs text-slate-400">Detalhamento sobre entregas, estoque e cobertura regional.</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 block">Cidade onde fica o Estoque</label>
                  <input 
                    type="text" 
                    value={logisticaCidadeEstoque} 
                    onChange={e => setLogisticaCidadeEstoque(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg text-sm p-2.5 text-slate-100 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 block">Prazo Médio de Entrega na Serra Gaúcha</label>
                  <input 
                    type="text" 
                    value={logisticaPrazoMedioEntrega} 
                    onChange={e => setLogisticaPrazoMedioEntrega(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg text-sm p-2.5 text-slate-100 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-800/50 pt-4">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-400 block">Possui Frota/Entrega própria?</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-300 font-medium cursor-pointer">
                      <input 
                        type="radio" 
                        name="entrega_propria" 
                        checked={logisticaEntregaPropria === true} 
                        onChange={() => setLogisticaEntregaPropria(true)} 
                        className="h-4 w-4 accent-blue-500"
                      />
                      Sim
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-300 font-medium cursor-pointer">
                      <input 
                        type="radio" 
                        name="entrega_propria" 
                        checked={logisticaEntregaPropria === false} 
                        onChange={() => setLogisticaEntregaPropria(false)} 
                        className="h-4 w-4 accent-blue-500"
                      />
                      Não
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-400 block">Trabalha com Transportadoras?</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-300 font-medium cursor-pointer">
                      <input 
                        type="radio" 
                        name="transportadora" 
                        checked={logisticaTransportadora === true} 
                        onChange={() => setLogisticaTransportadora(true)} 
                        className="h-4 w-4 accent-blue-500"
                      />
                      Sim
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-300 font-medium cursor-pointer">
                      <input 
                        type="radio" 
                        name="transportadora" 
                        checked={logisticaTransportadora === false} 
                        onChange={() => setLogisticaTransportadora(false)} 
                        className="h-4 w-4 accent-blue-500"
                      />
                      Não
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-400 block">Permite Retirada no Local (FOB)?</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-300 font-medium cursor-pointer">
                      <input 
                        type="radio" 
                        name="retirada" 
                        checked={logisticaRetiradaLocal === true} 
                        onChange={() => setLogisticaRetiradaLocal(true)} 
                        className="h-4 w-4 accent-blue-500"
                      />
                      Sim
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-300 font-medium cursor-pointer">
                      <input 
                        type="radio" 
                        name="retirada" 
                        checked={logisticaRetiradaLocal === false} 
                        onChange={() => setLogisticaRetiradaLocal(false)} 
                        className="h-4 w-4 accent-blue-500"
                      />
                      Não
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800/50 pt-4">
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    Faz Entregas Urgentes se necessário?
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-300 font-medium cursor-pointer">
                      <input 
                        type="radio" 
                        name="urgente" 
                        checked={logisticaFazEntregasUrgentes === true} 
                        onChange={() => setLogisticaFazEntregasUrgentes(true)} 
                        className="h-4 w-4 accent-blue-500"
                      />
                      Sim
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-300 font-medium cursor-pointer">
                      <input 
                        type="radio" 
                        name="urgente" 
                        checked={logisticaFazEntregasUrgentes === false} 
                        onChange={() => setLogisticaFazEntregasUrgentes(false)} 
                        className="h-4 w-4 accent-blue-500"
                      />
                      Não
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    Sua frota possui Rastreamento de Carga?
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-300 font-medium cursor-pointer">
                      <input 
                        type="radio" 
                        name="rastreamento" 
                        checked={logisticaPossuiRastreamento === true} 
                        onChange={() => setLogisticaPossuiRastreamento(true)} 
                        className="h-4 w-4 accent-blue-500"
                      />
                      Sim
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-300 font-medium cursor-pointer">
                      <input 
                        type="radio" 
                        name="rastreamento" 
                        checked={logisticaPossuiRastreamento === false} 
                        onChange={() => setLogisticaPossuiRastreamento(false)} 
                        className="h-4 w-4 accent-blue-500"
                      />
                      Não
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-800/50 pt-4">
                <label className="text-xs font-bold text-slate-400 block">Atende quais Estados atualmente? (Selecione todos que competem)</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {["RS", "SC", "PR", "SP", "RJ", "MG"].map(uf => {
                    const isSelected = logisticaEstadosAtendidos.includes(uf);
                    return (
                      <button
                        key={uf}
                        type="button"
                        onClick={() => toggleEstado(uf)}
                        className={`py-2 rounded-lg border text-xs font-bold text-center transition-all cursor-pointer ${
                          isSelected 
                            ? "bg-blue-500/10 border-blue-500 text-blue-400 shadow-xs" 
                            : "bg-slate-950/40 border-slate-800/80 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        {uf}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 block">Área de Cobertura / Cidades específicas</label>
                <input 
                  type="text" 
                  value={logisticaAreaCobertura} 
                  onChange={e => setLogisticaAreaCobertura(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg text-sm p-2.5 text-slate-100 focus:border-blue-500 outline-none"
                />
              </div>

            </div>
          </div>
        )}

        {/* ── BOTÕES DE NAVEGAÇÃO / ENVIO ── */}
        <div className="flex items-center justify-between border-t border-slate-900/60 pt-6">
          {step > 1 ? (
            <button
              type="button"
              disabled={loading}
              onClick={handlePrev}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-800 hover:bg-slate-900/50 text-slate-400 hover:text-slate-200 transition-all font-bold text-xs cursor-pointer disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-slate-100 transition-all font-bold text-xs cursor-pointer shadow-lg shadow-blue-500/10"
            >
              Próximo
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading || uploadingCatalogo || uploadingTabela}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-100 transition-all font-bold text-xs cursor-pointer disabled:opacity-50 shadow-lg shadow-emerald-500/10"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  Finalizar Cadastro
                  <Send className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>

      </form>
    </div>
  );
}
