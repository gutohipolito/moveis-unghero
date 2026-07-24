"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { capitalizeText } from "@/lib/utils";
import { Prisma } from "@prisma/client";
import { requireModuleAccess } from "@/lib/moduleAccess";

const GENERAL_ALLOWLIST = new Set([
  "nome",
  "nomeFantasia",
  "cnpj",
  "inscricaoEstadual",
  "categoria",
  "subcategoria",
  "site",
  "instagram",
  "linkedin",
  "anoFundacao",
  "numFuncionarios",
  "possuiShowroom",
  "contatoRepresentante",
  "contatoCargo",
  "telefone",
  "contatoWhatsapp",
  "email",
  "contatoSegundo",
  "contatoTelefoneSecundario",
  "contatoCidade",
  "contatoEstado",
  "contatoEndereco",
  "contatoCep",
  "produtosFornecidos",
  "marcasRepresentadas",
  "produtosCatalogoUrl",
  "produtosTabelaPrecosUrl",
  "produtosLinkCatalogoOnline",
  "produtosSobEncomenda",
  "produtosQuantidadeMinima",
  "produtosTempoFabricacao",
  "comercialCondicoesPagamento",
  "comercialDescontoMarceneiros",
  "comercialTabelaDiferenciada",
  "comercialRepresentanteExclusivo",
  "comercialPedidoMinimo",
  "comercialFreteGratisAcima",
  "comercialComissao",
  "comercialObservacoes",
  "logisticaCidadeEstoque",
  "logisticaPrazoMedioEntrega",
  "logisticaEntregaPropria",
  "logisticaTransportadora",
  "logisticaRetiradaLocal",
  "logisticaEstadosAtendidos",
  "logisticaFazEntregasUrgentes",
  "logisticaPossuiRastreamento",
  "logisticaAreaCobertura",
  "ativo",
]);

export async function getSupplierByIdAction(id: string, _companyId?: string) {
  try {
    const auth = await requireModuleAccess("estoque");
    const supplier = await prisma.supplier.findFirst({
      where: {
        id,
        company_id: auth.companyId,
      },
    });

    if (!supplier) {
      return { success: false, error: "Fornecedor não encontrado." };
    }

    return { success: true, supplier };
  } catch (error) {
    console.error("Erro ao buscar fornecedor:", error);
    return {
      success: false,
      error: error instanceof Error && error.message === "Acesso negado"
        ? "Acesso negado"
        : error instanceof Error && error.message === "Não autenticado"
          ? "Não autenticado"
          : "Não foi possível carregar o fornecedor.",
    };
  }
}

export async function updateSupplierCrmAction(
  id: string,
  _companyId: string | undefined,
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
    crmUploads?: unknown;
    crmHistorico?: unknown;
  }
) {
  try {
    const auth = await requireModuleAccess("estoque");
    const existing = await prisma.supplier.findFirst({
      where: { id, company_id: auth.companyId },
    });

    if (!existing) {
      return { success: false, error: "Fornecedor não encontrado." };
    }

    const updateData: Prisma.SupplierUpdateInput = {};

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
      updateData.crmUltimoOrcamento = data.crmUltimoOrcamento
        ? new Date(data.crmUltimoOrcamento)
        : null;
    }
    if (data.crmUltimoContato !== undefined) {
      updateData.crmUltimoContato = data.crmUltimoContato ? new Date(data.crmUltimoContato) : null;
    }

    if (data.crmValorTotalComprado !== undefined) {
      updateData.crmValorTotalComprado =
        data.crmValorTotalComprado !== null
          ? new Prisma.Decimal(data.crmValorTotalComprado)
          : null;
    }

    if (data.crmResponsavelInterno !== undefined) {
      updateData.crmResponsavelInterno = data.crmResponsavelInterno;
    }
    if (data.crmObservacoes !== undefined) updateData.crmObservacoes = data.crmObservacoes;
    if (data.crmTags !== undefined) updateData.crmTags = data.crmTags;
    if (data.crmUploads !== undefined) {
      updateData.crmUploads = data.crmUploads as Prisma.InputJsonValue;
    }
    if (data.crmHistorico !== undefined) {
      updateData.crmHistorico = data.crmHistorico as Prisma.InputJsonValue;
    }

    if (data.crmStatus && data.crmStatus !== existing.crmStatus) {
      const historicoAtual = Array.isArray(existing.crmHistorico)
        ? [...(existing.crmHistorico as unknown[])]
        : [];

      historicoAtual.push({
        data: new Date().toISOString(),
        acao: `Status alterado de "${existing.crmStatus}" para "${data.crmStatus}".`,
      });
      updateData.crmHistorico = historicoAtual as Prisma.InputJsonValue;
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
    return {
      success: false,
      error:
        error instanceof Error && (error.message === "Acesso negado" || error.message === "Não autenticado")
          ? error.message
          : "Não foi possível salvar as alterações de CRM.",
    };
  }
}

export async function addSupplierCrmHistoryLogAction(
  id: string,
  _companyId: string | undefined,
  text: string
) {
  try {
    const auth = await requireModuleAccess("estoque");
    const existing = await prisma.supplier.findFirst({
      where: { id, company_id: auth.companyId },
    });

    if (!existing) {
      return { success: false, error: "Fornecedor não encontrado." };
    }

    const historicoAtual = Array.isArray(existing.crmHistorico)
      ? [...(existing.crmHistorico as unknown[])]
      : [];

    historicoAtual.push({
      data: new Date().toISOString(),
      acao: text.trim(),
    });

    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        crmHistorico: historicoAtual as Prisma.InputJsonValue,
        crmUltimoContato: new Date(),
      },
    });

    revalidatePath(`/estoque/fornecedores/${id}`);
    return { success: true, supplier: updated };
  } catch (error) {
    console.error("Erro ao adicionar histórico:", error);
    return {
      success: false,
      error:
        error instanceof Error && (error.message === "Acesso negado" || error.message === "Não autenticado")
          ? error.message
          : "Não foi possível adicionar o histórico.",
    };
  }
}

export async function updateSupplierGeneralAction(
  id: string,
  _companyId: string | undefined,
  data: Record<string, unknown>
) {
  try {
    const auth = await requireModuleAccess("estoque");
    const existing = await prisma.supplier.findFirst({
      where: { id, company_id: auth.companyId },
    });

    if (!existing) {
      return { success: false, error: "Fornecedor não encontrado." };
    }

    const updateData: Record<string, unknown> = {};

    for (const key of Object.keys(data)) {
      if (!GENERAL_ALLOWLIST.has(key)) continue;
      const val = data[key];
      if (val === undefined) continue;

      if (key === "nome" && typeof val === "string" && val) {
        updateData.nome = capitalizeText(val.trim());
      } else if (key === "contatoRepresentante" && typeof val === "string" && val) {
        updateData.contatoRepresentante = capitalizeText(val.trim());
      } else if (key === "email" && typeof val === "string" && val) {
        updateData.email = val.trim().toLowerCase();
      } else if (key === "cnpj" && typeof val === "string" && val) {
        updateData.cnpj = val.replace(/\D/g, "");
      } else {
        updateData[key] = val;
      }
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data: updateData,
    });

    revalidatePath(`/estoque/fornecedores/${id}`);
    revalidatePath("/estoque");

    return { success: true, supplier: updated };
  } catch (error) {
    console.error("Erro ao atualizar fornecedor:", error);
    return {
      success: false,
      error:
        error instanceof Error && (error.message === "Acesso negado" || error.message === "Não autenticado")
          ? error.message
          : "Não foi possível salvar os dados do fornecedor.",
    };
  }
}
