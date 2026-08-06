"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { capitalizeText } from "@/lib/utils";
import { resolvePublicCompanyId } from "@/lib/publicCompany";
import { checkRateLimit, getRequestIp } from "@/lib/rateLimit";
import { headers } from "next/headers";
import { requireWriteAccess } from "@/lib/moduleAccess";
import { sendSignupConfirmationEmail } from "@/lib/signupConfirmationEmail";
import {
  FORM_FIELD_LIMITS,
  cleanCepDigits,
  cleanCnpjDigits,
  isValidCnpj,
  truncateField,
  validateOptionalCep,
} from "@/lib/brDocuments";
import { normalizeEmailInput, validateRequiredEmail } from "@/lib/email";
import { isValidBrPhoneDigits } from "@/lib/phone";

export interface SupplierSignupData {
  company_id?: string;
  viaPainel?: boolean;
  
  // Informações Gerais
  nome: string; // Razão Social
  nomeFantasia?: string;
  cnpj: string;
  inscricaoEstadual?: string;
  categoria: string;
  subcategoria?: string;
  site?: string;
  instagram?: string;
  linkedin?: string;
  anoFundacao?: number;
  numFuncionarios?: string;
  possuiShowroom?: boolean;

  // Contato
  contatoRepresentante: string;
  contatoCargo?: string;
  telefone?: string;
  contatoWhatsapp?: string;
  email: string;
  contatoSegundo?: string;
  contatoTelefoneSecundario?: string;
  contatoCidade?: string;
  contatoEstado?: string;
  contatoEndereco?: string;
  contatoCep?: string;

  // Produtos
  produtosFornecidos?: string;
  marcasRepresentadas?: string;
  produtosCatalogoUrl?: string;
  produtosTabelaPrecosUrl?: string;
  produtosLinkCatalogoOnline?: string;
  produtosSobEncomenda?: boolean;
  produtosQuantidadeMinima?: string;
  produtosTempoFabricacao?: string;

  // Comercial
  comercialCondicoesPagamento?: string[];
  comercialDescontoMarceneiros?: boolean;
  comercialTabelaDiferenciada?: boolean;
  comercialRepresentanteExclusivo?: boolean;
  comercialPedidoMinimo?: string;
  comercialFreteGratisAcima?: string;
  comercialComissao?: string;
  comercialObservacoes?: string;

  // Logística
  logisticaCidadeEstoque?: string;
  logisticaPrazoMedioEntrega?: string;
  logisticaEntregaPropria?: boolean;
  logisticaTransportadora?: boolean;
  logisticaRetiradaLocal?: boolean;
  logisticaEstadosAtendidos?: string[];
  logisticaFazEntregasUrgentes?: boolean;
  logisticaPossuiRastreamento?: boolean;
  logisticaAreaCobertura?: string;
}

export async function submitPublicSupplierSignupAction(data: SupplierSignupData) {
  try {
    let companyId: string;

    if (data.viaPainel) {
      const auth = await requireWriteAccess("estoque");
      companyId = auth.companyId;
    } else {
      const ip = getRequestIp(await headers());
      const rate = checkRateLimit(`public-supplier-signup:${ip}`, {
        limit: 6,
        windowMs: 60 * 60 * 1000,
      });
      if (!rate.ok) {
        return {
          success: false,
          error: `Muitas tentativas. Aguarde ${rate.retryAfterSec}s e tente novamente.`,
        };
      }
      companyId = resolvePublicCompanyId();
    }

    const nome = truncateField(data.nome || "", FORM_FIELD_LIMITS.nome);
    if (!nome) {
      return { success: false, error: "A Razão Social é obrigatória." };
    }

    const cnpj = cleanCnpjDigits(data.cnpj || "");
    if (!cnpj || cnpj.length !== 14 || !isValidCnpj(cnpj)) {
      return { success: false, error: "Informe um CNPJ válido." };
    }

    const emailError = validateRequiredEmail(data.email || "");
    if (emailError) {
      return { success: false, error: emailError };
    }
    const email = normalizeEmailInput(data.email || "");

    const contatoRepresentante = truncateField(
      data.contatoRepresentante || "",
      FORM_FIELD_LIMITS.nome
    );
    if (!contatoRepresentante) {
      return { success: false, error: "O nome do representante é obrigatório." };
    }

    const categoria = data.categoria?.trim();
    if (!categoria) {
      return { success: false, error: "A categoria principal é obrigatória." };
    }

    for (const [label, phone] of [
      ["WhatsApp", data.contatoWhatsapp],
      ["telefone comercial", data.telefone],
      ["telefone secundário", data.contatoTelefoneSecundario],
    ] as const) {
      if (phone?.trim() && !isValidBrPhoneDigits(phone)) {
        return { success: false, error: `Informe um ${label} válido com DDD.` };
      }
    }

    const cepError = validateOptionalCep(data.contatoCep || "");
    if (cepError) {
      return { success: false, error: cepError };
    }
    const cepDigits = cleanCepDigits(data.contatoCep || "");
    const contatoCep = cepDigits ? `${cepDigits.slice(0, 5)}-${cepDigits.slice(5)}` : null;

    // Verificar CNPJ duplicado
    const existing = await prisma.supplier.findFirst({
      where: {
        company_id: companyId,
        OR: [{ cnpj }, { cnpj: data.cnpj.trim() }],
      },
    });

    if (existing) {
      return {
        success: false,
        error: "Já existe um cadastro de fornecedor com este CNPJ. Nossa equipe comercial entrará em contato se houver interesse.",
      };
    }

    const fornecedor = await prisma.supplier.create({
      data: {
        company_id: companyId,
        nome: capitalizeText(nome),
        cnpj,
        email,
        telefone: data.telefone?.trim() || "",
        principal_material: categoria,
        ativo: true,

        // Informações Gerais
        nomeFantasia: data.nomeFantasia?.trim() ? capitalizeText(data.nomeFantasia.trim()) : null,
        inscricaoEstadual: data.inscricaoEstadual?.trim() || null,
        categoria,
        subcategoria: data.subcategoria?.trim() || null,
        site: data.site?.trim() || null,
        instagram: data.instagram?.trim() || null,
        linkedin: data.linkedin?.trim() || null,
        anoFundacao: data.anoFundacao || null,
        numFuncionarios: data.numFuncionarios || null,
        possuiShowroom: data.possuiShowroom ?? null,

        // Contato
        contatoRepresentante: capitalizeText(contatoRepresentante),
        contatoCargo: data.contatoCargo?.trim() || null,
        contatoWhatsapp: data.contatoWhatsapp?.trim() || null,
        contatoSegundo: data.contatoSegundo?.trim() ? capitalizeText(data.contatoSegundo.trim()) : null,
        contatoTelefoneSecundario: data.contatoTelefoneSecundario?.trim() || null,
        contatoCidade: data.contatoCidade?.trim() ? capitalizeText(data.contatoCidade.trim()) : null,
        contatoEstado: data.contatoEstado?.trim() || null,
        contatoEndereco: data.contatoEndereco?.trim()
          ? truncateField(data.contatoEndereco, FORM_FIELD_LIMITS.endereco)
          : null,
        contatoCep,

        // Produtos
        produtosFornecidos: data.produtosFornecidos?.trim() || null,
        marcasRepresentadas: data.marcasRepresentadas?.trim() || null,
        produtosCatalogoUrl: data.produtosCatalogoUrl || null,
        produtosTabelaPrecosUrl: data.produtosTabelaPrecosUrl || null,
        produtosLinkCatalogoOnline: data.produtosLinkCatalogoOnline?.trim() || null,
        produtosSobEncomenda: data.produtosSobEncomenda ?? null,
        produtosQuantidadeMinima: data.produtosQuantidadeMinima?.trim() || null,
        produtosTempoFabricacao: data.produtosTempoFabricacao?.trim() || null,

        // Comercial
        comercialCondicoesPagamento: data.comercialCondicoesPagamento || [],
        comercialDescontoMarceneiros: data.comercialDescontoMarceneiros ?? null,
        comercialTabelaDiferenciada: data.comercialTabelaDiferenciada ?? null,
        comercialRepresentanteExclusivo: data.comercialRepresentanteExclusivo ?? null,
        comercialPedidoMinimo: data.comercialPedidoMinimo?.trim() || null,
        comercialFreteGratisAcima: data.comercialFreteGratisAcima?.trim() || null,
        comercialComissao: data.comercialComissao?.trim() || null,
        comercialObservacoes: data.comercialObservacoes?.trim() || null,

        // Logística
        logisticaCidadeEstoque: data.logisticaCidadeEstoque?.trim() ? capitalizeText(data.logisticaCidadeEstoque.trim()) : null,
        logisticaPrazoMedioEntrega: data.logisticaPrazoMedioEntrega?.trim() || null,
        logisticaEntregaPropria: data.logisticaEntregaPropria ?? null,
        logisticaTransportadora: data.logisticaTransportadora ?? null,
        logisticaRetiradaLocal: data.logisticaRetiradaLocal ?? null,
        logisticaEstadosAtendidos: data.logisticaEstadosAtendidos || [],
        logisticaFazEntregasUrgentes: data.logisticaFazEntregasUrgentes ?? null,
        logisticaPossuiRastreamento: data.logisticaPossuiRastreamento ?? null,
        logisticaAreaCobertura: data.logisticaAreaCobertura?.trim() || null,

        // CRM inicial
        crmStatus: "NOVO",
        crmTags: [],
        crmHistorico: [
          {
            data: new Date().toISOString(),
            acao: data.viaPainel
              ? "Cadastro realizado pelo painel interno."
              : "Cadastro enviado via formulário público de fornecedores.",
          }
        ]
      },
    });

    revalidatePath("/estoque");
    revalidatePath(`/estoque/fornecedores/${fornecedor.id}`);

    if (!data.viaPainel) {
      void sendSignupConfirmationEmail({
        companyId,
        kind: "fornecedor",
        nome: fornecedor.nomeFantasia || fornecedor.nome,
        email: fornecedor.email,
      });
    }

    return { success: true, id: fornecedor.id };
  } catch (error) {
    console.error("Erro ao cadastrar fornecedor:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível registrar o fornecedor.",
    };
  }
}
