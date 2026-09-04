"use server";

import { revalidatePath } from "next/cache";
import { PaymentMethod, Prisma, ReceiptQuitacao } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getModuleAccess, getWriteAccess } from "@/lib/moduleAccess";
import { buildClientAddress } from "@/lib/contractTemplates";
import { formatDocumentLabel } from "@/lib/currencyExtenso";
import { labelPaymentMethod, type PaymentMethod as MethodLabel } from "@/lib/paymentMethods";
import { toISODateBR } from "@/lib/brazilDate";
import { formatReceiptCodigo } from "@/lib/receiptCodigo";
import {
  loadReceiptReferenciaContext,
  suggestReceiptReferenteForProject,
} from "@/lib/receiptReferencia";
import {
  parseReferenteTitulos,
  suggestReferenteFromInstallment,
} from "@/lib/receiptShare";
import { isOpsLimitedRole } from "@/lib/permissions";
import QRCode from "qrcode";

export type PaymentReceiptDTO = {
  id: string;
  numero: number;
  valor: number;
  parcela_numero: number | null;
  parcela_total: number | null;
  referente: string;
  metodo_pagamento: PaymentMethod;
  data_recebimento: string;
  cidade_emissao: string;
  quitacao: ReceiptQuitacao;
  cliente_nome: string;
  cliente_documento: string;
  cliente_endereco: string | null;
  emitido_por_nome: string | null;
  observacoes: string | null;
  client_id: string;
  project_id: string | null;
  installment_id: string | null;
  share_code: string | null;
  createdAt: string;
};

function toNumber(value: Prisma.Decimal | number | string) {
  if (typeof value === "number") return value;
  return Number(value);
}

function mapReceipt(row: {
  id: string;
  numero: number;
  valor: Prisma.Decimal | number;
  parcela_numero: number | null;
  parcela_total: number | null;
  referente: string;
  metodo_pagamento: PaymentMethod;
  data_recebimento: Date;
  cidade_emissao: string;
  quitacao: ReceiptQuitacao;
  cliente_nome: string;
  cliente_documento: string;
  cliente_endereco: string | null;
  emitido_por_nome: string | null;
  observacoes: string | null;
  client_id: string;
  project_id: string | null;
  installment_id: string | null;
  share_code: string | null;
  createdAt: Date;
}): PaymentReceiptDTO {
  return {
    id: row.id,
    numero: row.numero,
    valor: toNumber(row.valor),
    parcela_numero: row.parcela_numero,
    parcela_total: row.parcela_total,
    referente: row.referente,
    metodo_pagamento: row.metodo_pagamento,
    data_recebimento: row.data_recebimento.toISOString(),
    cidade_emissao: row.cidade_emissao,
    quitacao: row.quitacao,
    cliente_nome: row.cliente_nome,
    cliente_documento: row.cliente_documento,
    cliente_endereco: row.cliente_endereco,
    emitido_por_nome: row.emitido_por_nome,
    observacoes: row.observacoes,
    client_id: row.client_id,
    project_id: row.project_id,
    installment_id: row.installment_id,
    share_code: row.share_code,
    createdAt: row.createdAt.toISOString(),
  };
}

const METHODS = new Set<string>([
  "PIX",
  "BOLETO",
  "CARTAO",
  "DINHEIRO",
  "TRANSFERENCIA",
  "CHEQUE",
  "OUTRO",
]);

function parseMethod(value: string | undefined | null): PaymentMethod {
  if (value && METHODS.has(value)) return value as PaymentMethod;
  return "PIX";
}

function parseQuitacao(value: string | undefined | null): ReceiptQuitacao {
  return value === "TOTAL" ? "TOTAL" : "PARCIAL";
}

function parseDateInput(value: string | undefined | null): Date {
  const raw = (value || toISODateBR()).trim();
  // yyyy-mm-dd → meio-dia BR para evitar shift de fuso
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return new Date(`${raw}T12:00:00-03:00`);
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return new Date();
  return d;
}

export type CreatePaymentReceiptInput = {
  clientId: string;
  valor: number;
  parcela_numero?: number | null;
  parcela_total?: number | null;
  referente: string;
  metodo_pagamento?: string;
  data_recebimento?: string;
  quitacao?: "TOTAL" | "PARCIAL";
  projectId?: string | null;
  installmentId?: string | null;
  observacoes?: string | null;
  cidade_emissao?: string;
};

/** Comercial e Financeiro com escrita; cargos ops limitados ficam bloqueados. */
async function getReceiptWriteAuth() {
  const auth =
    (await getWriteAccess("financeiro")) || (await getWriteAccess("crm"));
  if (!auth) return null;
  if (isOpsLimitedRole(auth.cargo)) return null;
  return auth;
}

export async function createPaymentReceipt(
  input: CreatePaymentReceiptInput
): Promise<{ success: true; receipt: PaymentReceiptDTO } | { success: false; error: string }> {
  const auth = await getReceiptWriteAuth();
  if (!auth) return { success: false, error: "Sem permissão para emitir recibo." };

  const valor = Number(input.valor);
  if (!Number.isFinite(valor) || valor <= 0) {
    return { success: false, error: "Informe um valor válido maior que zero." };
  }

  const referente = (input.referente || "").trim();
  if (!referente) {
    return { success: false, error: "Informe o motivo do recebimento (referente a)." };
  }

  let parcelaNumero = input.parcela_numero ?? null;
  let parcelaTotal = input.parcela_total ?? null;
  if (
    (parcelaNumero !== null || parcelaTotal !== null) &&
    (!Number.isInteger(parcelaNumero) ||
      !Number.isInteger(parcelaTotal) ||
      Number(parcelaNumero) < 1 ||
      Number(parcelaTotal) < 1 ||
      Number(parcelaNumero) > Number(parcelaTotal))
  ) {
    return {
      success: false,
      error: "Informe uma parcela válida (atual menor ou igual ao total).",
    };
  }

  try {
    const client = await prisma.client.findFirst({
      where: { id: input.clientId, company_id: auth.companyId },
      select: {
        id: true,
        nome: true,
        tipo_pessoa: true,
        cpf: true,
        cnpj: true,
        endereco: true,
        numero: true,
        bairro: true,
        cidade: true,
        uf: true,
        cep: true,
      },
    });
    if (!client) return { success: false, error: "Cliente não encontrado." };

    const docRaw =
      client.tipo_pessoa === "PJ" ? client.cnpj || "" : client.cpf || client.cnpj || "";
    const cliente_documento = formatDocumentLabel(docRaw, client.tipo_pessoa) || "";

    let projectId = input.projectId || null;
    let installmentId = input.installmentId || null;
    let metodo = parseMethod(input.metodo_pagamento);

    if (installmentId) {
      const installment = await prisma.installment.findFirst({
        where: {
          id: installmentId,
          project: { client_id: client.id, client: { company_id: auth.companyId } },
        },
        select: {
          id: true,
          project_id: true,
          metodo_pagamento: true,
          status: true,
          valor: true,
          tipo: true,
          numero_parcela: true,
          total_parcelas: true,
        },
      });
      if (!installment) return { success: false, error: "Parcela não encontrada." };
      projectId = installment.project_id;
      if (!input.metodo_pagamento) metodo = installment.metodo_pagamento;
      if (installment.numero_parcela && installment.total_parcelas) {
        parcelaNumero = installment.numero_parcela;
        parcelaTotal = installment.total_parcelas;
      }
    } else if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, client_id: client.id, client: { company_id: auth.companyId } },
        select: { id: true },
      });
      if (!project) return { success: false, error: "Projeto não encontrado." };
    }

    const cliente_endereco =
      buildClientAddress({
        endereco: client.endereco,
        numero: client.numero,
        bairro: client.bairro,
        cidade: client.cidade,
        uf: client.uf,
        cep: client.cep,
      }) || client.cidade || null;

    const emitidoPor = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { name: true },
    });

    const receipt = await prisma.$transaction(async (tx) => {
      const last = await tx.paymentReceipt.findFirst({
        where: { company_id: auth.companyId },
        orderBy: { numero: "desc" },
        select: { numero: true },
      });
      const numero = (last?.numero ?? 0) + 1;

      return tx.paymentReceipt.create({
        data: {
          company_id: auth.companyId,
          client_id: client.id,
          project_id: projectId,
          installment_id: installmentId,
          numero,
          valor,
          parcela_numero: parcelaNumero,
          parcela_total: parcelaTotal,
          referente,
          metodo_pagamento: metodo,
          data_recebimento: parseDateInput(input.data_recebimento),
          cidade_emissao: (input.cidade_emissao || "Farroupilha").trim() || "Farroupilha",
          quitacao: parseQuitacao(input.quitacao),
          cliente_nome: client.nome,
          cliente_documento,
          cliente_endereco,
          emitido_por_id: auth.userId,
          emitido_por_nome: emitidoPor?.name || null,
          observacoes: input.observacoes?.trim() || null,
        },
      });
    });

    revalidatePath(`/clientes/${client.id}`);
    if (projectId) revalidatePath(`/projects/${projectId}`);

    return { success: true, receipt: mapReceipt(receipt) };
  } catch (error) {
    console.error("Erro ao emitir recibo:", error);
    return { success: false, error: "Não foi possível emitir o recibo." };
  }
}

export type UpdatePaymentReceiptInput = {
  receiptId: string;
  valor: number;
  parcela_numero?: number | null;
  parcela_total?: number | null;
  referente: string;
  metodo_pagamento?: string;
  data_recebimento?: string;
  quitacao?: "TOTAL" | "PARCIAL";
  projectId?: string | null;
  observacoes?: string | null;
  cidade_emissao?: string;
};

export async function updatePaymentReceipt(
  input: UpdatePaymentReceiptInput
): Promise<{ success: true; receipt: PaymentReceiptDTO } | { success: false; error: string }> {
  const auth = await getReceiptWriteAuth();
  if (!auth) return { success: false, error: "Sem permissão para editar recibo." };

  const valor = Number(input.valor);
  if (!Number.isFinite(valor) || valor <= 0) {
    return { success: false, error: "Informe um valor válido maior que zero." };
  }

  const referente = (input.referente || "").trim();
  if (!referente) {
    return { success: false, error: "Informe o motivo do recebimento (referente a)." };
  }

  let parcelaNumero = input.parcela_numero ?? null;
  let parcelaTotal = input.parcela_total ?? null;
  if (
    (parcelaNumero !== null || parcelaTotal !== null) &&
    (!Number.isInteger(parcelaNumero) ||
      !Number.isInteger(parcelaTotal) ||
      Number(parcelaNumero) < 1 ||
      Number(parcelaTotal) < 1 ||
      Number(parcelaNumero) > Number(parcelaTotal))
  ) {
    return {
      success: false,
      error: "Informe uma parcela válida (atual menor ou igual ao total).",
    };
  }

  try {
    const existing = await prisma.paymentReceipt.findFirst({
      where: { id: input.receiptId, company_id: auth.companyId },
      select: {
        id: true,
        client_id: true,
        project_id: true,
        installment_id: true,
      },
    });
    if (!existing) return { success: false, error: "Recibo não encontrado." };

    let projectId = existing.project_id;
    if (!existing.installment_id && input.projectId !== undefined) {
      const nextProjectId = input.projectId || null;
      if (nextProjectId) {
        const project = await prisma.project.findFirst({
          where: {
            id: nextProjectId,
            client_id: existing.client_id,
            client: { company_id: auth.companyId },
          },
          select: { id: true },
        });
        if (!project) return { success: false, error: "Projeto não encontrado." };
      }
      projectId = nextProjectId;
    }

    const receipt = await prisma.paymentReceipt.update({
      where: { id: existing.id },
      data: {
        valor,
        parcela_numero: parcelaNumero,
        parcela_total: parcelaTotal,
        referente,
        metodo_pagamento: parseMethod(input.metodo_pagamento),
        data_recebimento: parseDateInput(input.data_recebimento),
        cidade_emissao:
          (input.cidade_emissao || "Farroupilha").trim() || "Farroupilha",
        quitacao: parseQuitacao(input.quitacao),
        project_id: projectId,
        observacoes: input.observacoes?.trim() || null,
      },
    });

    revalidatePath(`/clientes/${existing.client_id}`);
    if (projectId) revalidatePath(`/projects/${projectId}`);
    if (existing.project_id && existing.project_id !== projectId) {
      revalidatePath(`/projects/${existing.project_id}`);
    }
    revalidatePath(`/recibos/${receipt.id}/print`);

    return { success: true, receipt: mapReceipt(receipt) };
  } catch (error) {
    console.error("Erro ao atualizar recibo:", error);
    return { success: false, error: "Não foi possível atualizar o recibo." };
  }
}

export async function deletePaymentReceipt(
  receiptId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const auth = await getReceiptWriteAuth();
  if (!auth) return { success: false, error: "Sem permissão para excluir recibo." };

  try {
    const existing = await prisma.paymentReceipt.findFirst({
      where: { id: receiptId, company_id: auth.companyId },
      select: { id: true, client_id: true, project_id: true },
    });
    if (!existing) return { success: false, error: "Recibo não encontrado." };

    await prisma.paymentReceipt.delete({ where: { id: existing.id } });

    revalidatePath(`/clientes/${existing.client_id}`);
    if (existing.project_id) revalidatePath(`/projects/${existing.project_id}`);

    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir recibo:", error);
    return { success: false, error: "Não foi possível excluir o recibo." };
  }
}

/** Sugestão multilinha de “referente a” com ambientes + orçamento do projeto. */
export async function suggestPaymentReceiptReferente(input: {
  projectId: string;
  tipo?: string | null;
  numero_parcela?: number | null;
  total_parcelas?: number | null;
  descricao?: string | null;
}): Promise<{ success: true; referente: string } | { success: false; error: string }> {
  const auth =
    (await getWriteAccess("financeiro")) || (await getWriteAccess("crm"));
  if (!auth) return { success: false, error: "Sem permissão." };
  if (isOpsLimitedRole(auth.cargo)) {
    return { success: false, error: "Financeiro não disponível para este cargo." };
  }

  const project = await prisma.project.findFirst({
    where: {
      id: input.projectId,
      client: { company_id: auth.companyId },
    },
    select: { id: true },
  });
  if (!project) return { success: false, error: "Projeto não encontrado." };

  const referente = await suggestReceiptReferenteForProject(project.id, {
    tipo: input.tipo,
    numero_parcela: input.numero_parcela,
    total_parcelas: input.total_parcelas,
    descricao: input.descricao,
  });

  if (!referente) {
    return {
      success: true,
      referente: suggestReferenteFromInstallment({
        tipo: input.tipo || "PARCELA",
        numero_parcela: input.numero_parcela,
        total_parcelas: input.total_parcelas,
        descricao: input.descricao,
      }),
    };
  }

  return { success: true, referente };
}

export type ReceiptPrintPayload = {
  id: string;
  numero: number;
  numeroLabel: string;
  valor: number;
  parcela_numero: number | null;
  parcela_total: number | null;
  referente: string;
  metodoLabel: string;
  /** Código do método (PIX, BOLETO…) para bandeira no impresso. */
  metodo?: string | null;
  data_recebimento: Date | string;
  cidade_emissao: string;
  quitacao: "TOTAL" | "PARCIAL";
  cliente_nome: string;
  cliente_documento: string;
  cliente_endereco: string | null;
  emitido_por_nome: string | null;
  observacoes: string | null;
  referencia: {
    titulos: string[];
    residencia: string | null;
    orcamentoCodigo: string | null;
    natureza: string | null;
  };
  /** Resumo financeiro do projeto (quando houver vínculo). */
  financeiro?: {
    valorTotalProjeto: number;
    valorParcela: number;
    saldoPendente: number;
  } | null;
  /** Link público + QR para validação de autenticidade. */
  validacao?: {
    url: string;
    qrDataUrl: string;
    codigo: string;
  } | null;
};

export async function buildReceiptPrintPayload(
  receipt: {
    id: string;
    numero: number;
    valor: number | { toString(): string };
    parcela_numero: number | null;
    parcela_total: number | null;
    referente: string;
    metodo_pagamento: PaymentMethod;
    data_recebimento: Date;
    cidade_emissao: string;
    quitacao: ReceiptQuitacao;
    cliente_nome: string;
    cliente_documento: string;
    cliente_endereco: string | null;
    emitido_por_nome: string | null;
    observacoes: string | null;
    project_id: string | null;
  },
  opts?: {
    validateUrl?: string | null;
  }
): Promise<ReceiptPrintPayload> {
  const valor = toNumber(receipt.valor as Prisma.Decimal | number);
  const numeroLabel = formatReceiptCodigo(receipt.numero, receipt.data_recebimento);

  let titulos: string[] = [];
  let residencia: string | null = receipt.cliente_nome || null;
  let orcamentoCodigo: string | null = null;
  let natureza: string | null = null;
  let financeiro: ReceiptPrintPayload["financeiro"] = null;

  if (receipt.project_id) {
    const ctx = await loadReceiptReferenciaContext(receipt.project_id, {
      numero_parcela: receipt.parcela_numero,
      total_parcelas: receipt.parcela_total,
    });
    if (ctx) {
      titulos = ctx.titulos;
      residencia = ctx.residencia || residencia;
      orcamentoCodigo = ctx.orcamentoCodigo;
      natureza = ctx.natureza;
    }

    const project = await prisma.project.findFirst({
      where: { id: receipt.project_id },
      select: {
        valor_previsto: true,
        installments: { select: { valor: true } },
        paymentReceipts: { select: { id: true, valor: true } },
      },
    });

    if (project) {
      const previsto = toNumber(project.valor_previsto);
      const somaParcelas = project.installments.reduce(
        (acc, row) => acc + toNumber(row.valor),
        0
      );
      const valorTotalProjeto = previsto > 0 ? previsto : somaParcelas;
      const isParcelado =
        Number.isInteger(receipt.parcela_numero) &&
        Number.isInteger(receipt.parcela_total) &&
        Number(receipt.parcela_numero) >= 1 &&
        Number(receipt.parcela_total) >= 1;

      // Só exibe total / parcela / saldo quando o recibo for de pagamento parcelado.
      if (isParcelado && valorTotalProjeto > 0) {
        const recebidoOutros = project.paymentReceipts
          .filter((row) => row.id !== receipt.id)
          .reduce((acc, row) => acc + toNumber(row.valor), 0);
        const totalRecebido = recebidoOutros + valor;
        const saldoPendente = Math.max(
          0,
          Math.round((valorTotalProjeto - totalRecebido) * 100) / 100
        );

        financeiro = {
          valorTotalProjeto,
          valorParcela: valor,
          saldoPendente,
        };
      }
    }
  }

  if (titulos.length === 0) {
    titulos = parseReferenteTitulos(receipt.referente);
  }

  if (!natureza && receipt.parcela_numero && receipt.parcela_total) {
    natureza = `Parcela ${String(receipt.parcela_numero).padStart(2, "0")}/${String(
      receipt.parcela_total
    ).padStart(2, "0")}`;
  }

  if (!orcamentoCodigo) {
    const match = receipt.referente.match(/or[cç]amento:\s*([^\n]+)/i);
    if (match?.[1]) orcamentoCodigo = match[1].trim();
  }

  let validacao: ReceiptPrintPayload["validacao"] = null;
  const validateUrl = opts?.validateUrl?.trim() || null;
  if (validateUrl) {
    try {
      const qrDataUrl = await QRCode.toDataURL(validateUrl, {
        width: 168,
        margin: 1,
        errorCorrectionLevel: "M",
        color: { dark: "#171717", light: "#ffffff" },
      });
      validacao = {
        url: validateUrl,
        qrDataUrl,
        codigo: numeroLabel,
      };
    } catch (error) {
      console.warn("Falha ao gerar QR do recibo:", error);
    }
  }

  return {
    id: receipt.id,
    numero: receipt.numero,
    numeroLabel,
    valor,
    parcela_numero: receipt.parcela_numero,
    parcela_total: receipt.parcela_total,
    referente: receipt.referente,
    metodoLabel: labelPaymentMethod(receipt.metodo_pagamento as MethodLabel),
    metodo: receipt.metodo_pagamento,
    data_recebimento: receipt.data_recebimento,
    cidade_emissao: receipt.cidade_emissao,
    quitacao: receipt.quitacao,
    cliente_nome: receipt.cliente_nome,
    cliente_documento: receipt.cliente_documento,
    cliente_endereco: receipt.cliente_endereco,
    emitido_por_nome: receipt.emitido_por_nome,
    observacoes: receipt.observacoes,
    referencia: {
      titulos,
      residencia,
      orcamentoCodigo,
      natureza,
    },
    financeiro,
    validacao,
  };
}

/** Lista os recibos já emitidos para o cliente no histórico financeiro. */
export async function listClientPaymentReceipts(
  clientId: string
): Promise<
  | { success: true; receipts: PaymentReceiptDTO[] }
  | { success: false; receipts: []; error: string }
> {
  const auth = await getReceiptWriteAuth();
  if (!auth) {
    return { success: false, receipts: [], error: "Sem permissão para listar recibos." };
  }

  try {
    const client = await prisma.client.findFirst({
      where: { id: clientId, company_id: auth.companyId },
      select: { id: true },
    });
    if (!client) {
      return { success: false, receipts: [], error: "Cliente não encontrado." };
    }

    const receipts = await prisma.paymentReceipt.findMany({
      where: { client_id: clientId, company_id: auth.companyId },
      orderBy: [{ data_recebimento: "desc" }, { numero: "desc" }],
    });

    return { success: true, receipts: receipts.map(mapReceipt) };
  } catch (error) {
    console.error("Erro ao listar recibos:", error);
    return {
      success: false,
      receipts: [],
      error: "Não foi possível carregar o histórico de recibos.",
    };
  }
}

export async function getPaymentReceiptForPrint(receiptId: string) {
  const auth = await getModuleAccess("financeiro");
  if (!auth) return null;

  const receipt = await prisma.paymentReceipt.findFirst({
    where: { id: receiptId, company_id: auth.companyId },
    include: {
      client: { select: { telefone: true, nome: true } },
    },
  });
  if (!receipt) return null;

  return {
    receipt: mapReceipt(receipt),
    clientPhone: receipt.client.telefone || "",
    metodoLabel: labelPaymentMethod(receipt.metodo_pagamento as MethodLabel),
  };
}

export async function getPaymentReceiptByShareCode(code: string) {
  const normalized = code.trim().toLowerCase();
  if (!/^[a-z0-9]{6,12}$/.test(normalized)) return null;

  const receipt = await prisma.paymentReceipt.findFirst({
    where: { share_code: normalized },
  });
  if (!receipt) return null;
  return mapReceipt(receipt);
}
