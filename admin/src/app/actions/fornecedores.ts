"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { capitalizeText } from "@/lib/utils";
import { Prisma } from "@prisma/client";

export async function getSupplierByIdAction(id: string, companyId: string) {
  try {
    const supplier = await prisma.supplier.findFirst({
      where: {
        id,
        company_id: companyId,
      },
    });

    if (!supplier) {
      return { success: false, error: "Fornecedor não encontrado." };
    }

    return { success: true, supplier };
  } catch (error) {
    console.error("Erro ao buscar fornecedor:", error);
    return { success: false, error: "Não foi possível carregar o fornecedor." };
  }
}

export async function updateSupplierCrmAction(
  id: string,
  companyId: string,
  data: {
    crmStatus?: string;
    crmNota?: number | null;
    crmQualidade?: number | null;
    crmPrazo?: number | null;
    crmAtendimento?: number | null;
    crmPreco?: number | null;
    crmPosVenda?: number | null;
    crmUltimaCompra?: string | null;
    crmValorTotalComprado?: number | null;
    crmUltimoOrcamento?: string | null;
    crmUltimoContato?: string | null;
    crmResponsavelInterno?: string | null;
    crmObservacoes?: string | null;
    crmTags?: string[];
    crmUploads?: any; // JSON array
    crmHistorico?: any; // JSON array
  }
) {
  try {
    const existing = await prisma.supplier.findFirst({
      where: { id, company_id: companyId },
    });

    if (!existing) {
      return { success: false, error: "Fornecedor não encontrado." };
    }

    const updateData: any = {};

    if (data.crmStatus !== undefined) updateData.crmStatus = data.crmStatus;
    if (data.crmNota !== undefined) updateData.crmNota = data.crmNota;
    if (data.crmQualidade !== undefined) updateData.crmQualidade = data.crmQualidade;
    if (data.crmPrazo !== undefined) updateData.crmPrazo = data.crmPrazo;
    if (data.crmAtendimento !== undefined) updateData.crmAtendimento = data.crmAtendimento;
    if (data.crmPreco !== undefined) updateData.crmPreco = data.crmPreco;
    if (data.crmPosVenda !== undefined) updateData.crmPosVenda = data.crmPosVenda;
    
    if (data.crmUltimaCompra !== undefined) {
      updateData.crmUltimaCompra = data.crmUltimaCompra ? new Date(data.crmUltimaCompra) : null;
    }
    if (data.crmUltimoOrcamento !== undefined) {
      updateData.crmUltimoOrcamento = data.crmUltimoOrcamento ? new Date(data.crmUltimoOrcamento) : null;
    }
    if (data.crmUltimoContato !== undefined) {
      updateData.crmUltimoContato = data.crmUltimoContato ? new Date(data.crmUltimoContato) : null;
    }
    
    if (data.crmValorTotalComprado !== undefined) {
      updateData.crmValorTotalComprado = data.crmValorTotalComprado !== null 
        ? new Prisma.Decimal(data.crmValorTotalComprado) 
        : null;
    }
    
    if (data.crmResponsavelInterno !== undefined) updateData.crmResponsavelInterno = data.crmResponsavelInterno;
    if (data.crmObservacoes !== undefined) updateData.crmObservacoes = data.crmObservacoes;
    if (data.crmTags !== undefined) updateData.crmTags = data.crmTags;
    if (data.crmUploads !== undefined) updateData.crmUploads = data.crmUploads;
    if (data.crmHistorico !== undefined) updateData.crmHistorico = data.crmHistorico;

    // Se mudou o status, registrar no histórico
    if (data.crmStatus && data.crmStatus !== existing.crmStatus) {
      const historicoAtual = Array.isArray(existing.crmHistorico) 
        ? [...existing.crmHistorico] 
        : [];
      
      historicoAtual.push({
        data: new Date().toISOString(),
        acao: `Status alterado de "${existing.crmStatus}" para "${data.crmStatus}".`,
      });
      updateData.crmHistorico = historicoAtual;
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data: updateData,
    });

    revalidatePath(`/estoque/fornecedores/${id}`);
    revalidatePath("/estoque");

    return { success: true, supplier: updated };
  } catch (error) {
    console.error("Erro ao atualizar CRM do fornecedor:", error);
    return { success: false, error: "Não foi possível salvar as alterações de CRM." };
  }
}

export async function addSupplierCrmHistoryLogAction(
  id: string,
  companyId: string,
  text: string
) {
  try {
    const existing = await prisma.supplier.findFirst({
      where: { id, company_id: companyId },
    });

    if (!existing) {
      return { success: false, error: "Fornecedor não encontrado." };
    }

    const historicoAtual = Array.isArray(existing.crmHistorico) 
      ? [...existing.crmHistorico] 
      : [];
    
    historicoAtual.push({
      data: new Date().toISOString(),
      acao: text.trim(),
    });

    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        crmHistorico: historicoAtual,
        crmUltimoContato: new Date(),
      },
    });

    revalidatePath(`/estoque/fornecedores/${id}`);
    return { success: true, supplier: updated };
  } catch (error) {
    console.error("Erro ao adicionar histórico:", error);
    return { success: false, error: "Não foi possível adicionar o histórico." };
  }
}

export async function updateSupplierGeneralAction(
  id: string,
  companyId: string,
  data: {
    // Info Geral
    nome?: string;
    nomeFantasia?: string | null;
    cnpj?: string;
    inscricaoEstadual?: string | null;
    categoria?: string;
    subcategoria?: string | null;
    site?: string | null;
    instagram?: string | null;
    linkedin?: string | null;
    anoFundacao?: number | null;
    numFuncionarios?: string | null;
    possuiShowroom?: boolean | null;

    // Contato
    contatoRepresentante?: string | null;
    contatoCargo?: string | null;
    telefone?: string;
    contatoWhatsapp?: string | null;
    email?: string;
    contatoSegundo?: string | null;
    contatoTelefoneSecundario?: string | null;
    contatoCidade?: string | null;
    contatoEstado?: string | null;
    contatoEndereco?: string | null;
    contatoCep?: string | null;

    // Produtos
    produtosFornecidos?: string | null;
    marcasRepresentadas?: string | null;
    produtosCatalogoUrl?: string | null;
    produtosTabelaPrecosUrl?: string | null;
    produtosLinkCatalogoOnline?: string | null;
    produtosSobEncomenda?: boolean | null;
    produtosQuantidadeMinima?: string | null;
    produtosTempoFabricacao?: string | null;

    // Comercial
    comercialCondicoesPagamento?: string[];
    comercialDescontoMarceneiros?: boolean | null;
    comercialTabelaDiferenciada?: boolean | null;
    comercialRepresentanteExclusivo?: boolean | null;
    comercialPedidoMinimo?: string | null;
    comercialFreteGratisAcima?: string | null;
    comercialComissao?: string | null;
    comercialObservacoes?: string | null;

    // Logística
    logisticaCidadeEstoque?: string | null;
    logisticaPrazoMedioEntrega?: string | null;
    logisticaEntregaPropria?: boolean | null;
    logisticaTransportadora?: boolean | null;
    logisticaRetiradaLocal?: boolean | null;
    logisticaEstadosAtendidos?: string[];
    logisticaFazEntregasUrgentes?: boolean | null;
    logisticaPossuiRastreamento?: boolean | null;
    logisticaAreaCobertura?: string | null;
    
    // Status Ativo
    ativo?: boolean;
  }
) {
  try {
    const existing = await prisma.supplier.findFirst({
      where: { id, company_id: companyId },
    });

    if (!existing) {
      return { success: false, error: "Fornecedor não encontrado." };
    }

    const updateData: any = {};

    // Mapeamento dinâmico
    Object.keys(data).forEach((key) => {
      const val = (data as any)[key];
      if (val !== undefined) {
        if (key === "nome" && val) {
          updateData.nome = capitalizeText(val.trim());
        } else if (key === "contatoRepresentante" && val) {
          updateData.contatoRepresentante = capitalizeText(val.trim());
        } else if (key === "email" && val) {
          updateData.email = val.trim().toLowerCase();
        } else if (key === "cnpj" && val) {
          updateData.cnpj = val.replace(/\D/g, "");
        } else {
          updateData[key] = val;
        }
      }
    });

    const updated = await prisma.supplier.update({
      where: { id },
      data: updateData,
    });

    revalidatePath(`/estoque/fornecedores/${id}`);
    revalidatePath("/estoque");

    return { success: true, supplier: updated };
  } catch (error) {
    console.error("Erro ao atualizar fornecedor:", error);
    return { success: false, error: "Não foi possível salvar os dados do fornecedor." };
  }
}
