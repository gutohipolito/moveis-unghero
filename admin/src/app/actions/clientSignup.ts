"use server";

import { Origin, TipoPessoa } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { capitalizeText } from "@/lib/utils";
import {
  findExistingClient,
  normalizeClientEmail,
  resolveClientContactFields,
} from "@/lib/clientMatch";

export interface ClientSignupData {
  nome: string;
  email: string;
  telefone: string;
  tipo_pessoa: TipoPessoa;
  cpf?: string;
  cnpj?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade: string;
  uf?: string;
  tipo_imovel?: string;
  obs_imovel?: string;
  obs_entrega?: string;
  company_id?: string;
}

export type PublicClientLookupResult = {
  found: boolean;
  client?: {
    nome: string;
    email: string;
    telefone: string;
    tipo_pessoa: TipoPessoa;
    cpf: string | null;
    cnpj: string | null;
    cep: string | null;
    endereco: string | null;
    numero: string | null;
    bairro: string | null;
    cidade: string;
    uf: string | null;
    tipo_imovel: string | null;
    obs_imovel: string | null;
    obs_entrega: string | null;
  };
};

function cleanDigits(value?: string) {
  return (value || "").replace(/\D/g, "");
}

async function resolveCompanyId(companyId?: string) {
  if (companyId) return companyId;
  const firstCompany = await prisma.company.findFirst();
  return firstCompany?.id ?? null;
}

export async function lookupPublicClientAction(params: {
  tipo_pessoa: TipoPessoa;
  cpf?: string;
  cnpj?: string;
  company_id?: string;
}): Promise<PublicClientLookupResult> {
  try {
    const companyId = await resolveCompanyId(params.company_id);
    if (!companyId) return { found: false };

    const tipoPessoa = params.tipo_pessoa || "PF";
    const cpfDigits = tipoPessoa === "PF" ? cleanDigits(params.cpf) : "";
    const cnpjDigits = tipoPessoa === "PJ" ? cleanDigits(params.cnpj) : "";

    if (tipoPessoa === "PF" && cpfDigits.length !== 11) return { found: false };
    if (tipoPessoa === "PJ" && cnpjDigits.length !== 14) return { found: false };

    const client = await prisma.client.findFirst({
      where: {
        company_id: companyId,
        ...(tipoPessoa === "PF" ? { cpf: cpfDigits } : { cnpj: cnpjDigits }),
      },
    });

    if (!client) return { found: false };

    return {
      found: true,
      client: {
        nome: client.nome,
        email: client.email,
        telefone: client.telefone,
        tipo_pessoa: client.tipo_pessoa,
        cpf: client.cpf,
        cnpj: client.cnpj,
        cep: client.cep,
        endereco: client.endereco,
        numero: client.numero,
        bairro: client.bairro,
        cidade: client.cidade,
        uf: client.uf,
        tipo_imovel: client.tipo_imovel,
        obs_imovel: client.obs_imovel,
        obs_entrega: client.obs_entrega,
      },
    };
  } catch (error) {
    console.error("Erro ao buscar cliente para cadastro público:", error);
    return { found: false };
  }
}

export async function submitPublicClientSignupAction(data: ClientSignupData) {
  try {
    const nome = data.nome?.trim();
    if (!nome || nome.length < 3) {
      return { success: false, error: "Informe seu nome completo." };
    }

    const email = data.email?.trim().toLowerCase();
    const telefone = data.telefone?.trim();
    if (!email) {
      return { success: false, error: "Informe seu e-mail." };
    }
    if (!telefone) {
      return { success: false, error: "Informe seu telefone ou WhatsApp." };
    }

    const cidade = data.cidade?.trim();
    if (!cidade) {
      return { success: false, error: "Informe sua cidade." };
    }

    const tipoPessoa = data.tipo_pessoa || "PF";
    const cpfDigits = tipoPessoa === "PF" ? cleanDigits(data.cpf) : "";
    const cnpjDigits = tipoPessoa === "PJ" ? cleanDigits(data.cnpj) : "";

    if (tipoPessoa === "PF" && cpfDigits.length !== 11) {
      return { success: false, error: "Informe um CPF válido (11 dígitos)." };
    }
    if (tipoPessoa === "PJ" && cnpjDigits.length !== 14) {
      return { success: false, error: "Informe um CNPJ válido (14 dígitos)." };
    }

    const companyId = await resolveCompanyId(data.company_id);
    if (!companyId) {
      return { success: false, error: "Nenhuma empresa cadastrada no sistema." };
    }

    const contact = resolveClientContactFields(telefone, email);
    const cleanEmail = normalizeClientEmail(email);

    let client = await findExistingClient({
      companyId,
      telefone,
      email,
      cpf: cpfDigits || undefined,
      cnpj: cnpjDigits || undefined,
    });

    const isExistingClient = Boolean(client);

    const sharedData = {
      nome: capitalizeText(nome),
      email: contact.email || cleanEmail,
      telefone: contact.telefone,
      telefone_digits: contact.phoneDigits || null,
      cidade: capitalizeText(cidade),
      tipo_pessoa: tipoPessoa,
      cpf: tipoPessoa === "PF" ? cpfDigits : null,
      cnpj: tipoPessoa === "PJ" ? cnpjDigits : null,
      cep: data.cep?.trim() || null,
      endereco: data.endereco?.trim() ? capitalizeText(data.endereco.trim()) : null,
      numero: data.numero?.trim() || null,
      bairro: data.bairro?.trim() ? capitalizeText(data.bairro.trim()) : null,
      uf: data.uf?.trim().toUpperCase() || null,
      tipo_imovel: data.tipo_imovel || null,
      obs_imovel: data.obs_imovel?.trim() || null,
      obs_entrega: data.obs_entrega?.trim() || null,
    };

    if (!client) {
      client = await prisma.client.create({
        data: {
          ...sharedData,
          observacoes: "",
          origem: "FORMULARIO" as Origin,
          status: "LEAD",
          company_id: companyId,
        },
      });
    } else {
      client = await prisma.client.update({
        where: { id: client.id },
        data: sharedData,
      });
    }

    revalidatePath("/clientes");
    revalidatePath("/marketing/formularios");

    return {
      success: true,
      clientId: client.id,
      isExistingClient,
    };
  } catch (error) {
    console.error("Erro no cadastro público de cliente:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível enviar o cadastro.",
    };
  }
}
