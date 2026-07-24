"use server";

import { revalidatePath } from "next/cache";
import { PaymentMethod, Prisma, ReceiptQuitacao } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-guard";
import { getModuleAccess, getWriteAccess } from "@/lib/moduleAccess";
import { buildClientAddress } from "@/lib/contractTemplates";
import { formatDocumentLabel } from "@/lib/currencyExtenso";
import { labelPaymentMethod, type PaymentMethod as MethodLabel } from "@/lib/paymentMethods";
import { toISODateBR } from "@/lib/brazilDate";

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

export async function createPaymentReceipt(
  input: CreatePaymentReceiptInput
): Promise<{ success: true; receipt: PaymentReceiptDTO } | { success: false; error: string }> {
  const auth = await getWriteAccess("financeiro");
  if (!auth) return { success: false, error: "Não autenticado." };

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
    const cliente_documento = formatDocumentLabel(docRaw, client.tipo_pessoa);
    if (!cliente_documento) {
      return {
        success: false,
        error:
          client.tipo_pessoa === "PJ"
            ? "Cadastre o CNPJ do cliente antes de emitir o recibo."
            : "Cadastre o CPF do cliente antes de emitir o recibo.",
      };
    }

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

/** Lista os recibos já emitidos para o cliente no histórico financeiro. */
export async function listClientPaymentReceipts(
  clientId: string
): Promise<
  | { success: true; receipts: PaymentReceiptDTO[] }
  | { success: false; receipts: []; error: string }
> {
  const auth = await getWriteAccess("financeiro");
  if (!auth) {
    return { success: false, receipts: [], error: "Não autenticado." };
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
