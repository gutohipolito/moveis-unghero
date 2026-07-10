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
  origem_lead?: string;
  obs_imovel?: string;
  obs_entrega?: string;
  observacoes?: string;
  company_id?: string;
}

function cleanDigits(value?: string) {
  return (value || "").replace(/\D/g, "");
}

function addOneBusinessDay(date: Date): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + 1);
  while (result.getDay() === 0 || result.getDay() === 6) {
    result.setDate(result.getDate() + 1);
  }
  return result;
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

    let companyId = data.company_id;
    if (!companyId) {
      const firstCompany = await prisma.company.findFirst();
      if (!firstCompany) {
        return { success: false, error: "Nenhuma empresa cadastrada no sistema." };
      }
      companyId = firstCompany.id;
    }

    const commercialUser = await prisma.user.findFirst({
      where: { company_id: companyId },
    });
    if (!commercialUser) {
      return { success: false, error: "Nenhum usuário disponível para receber o cadastro." };
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

    const clientData = {
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
      observacoes: data.observacoes?.trim() || "",
      origem: "FORMULARIO" as Origin,
      status: "LEAD",
    };

    if (!client) {
      client = await prisma.client.create({
        data: {
          ...clientData,
          company_id: companyId,
        },
      });
    } else {
      client = await prisma.client.update({
        where: { id: client.id },
        data: {
          ...clientData,
          observacoes: [client.observacoes, clientData.observacoes]
            .filter(Boolean)
            .join("\n\n"),
        },
      });
    }

    const origemNote = data.origem_lead?.trim()
      ? `Como nos conheceu: ${data.origem_lead.trim()}`
      : null;
    const projectObs = [origemNote, data.observacoes?.trim()].filter(Boolean).join("\n") || null;

    const project = await prisma.project.create({
      data: {
        client_id: client.id,
        valor_previsto: 0,
        status_geral: "LEAD",
        ultimo_contato_em: new Date(),
        observacoes: projectObs,
      },
    });

    await prisma.timeline.create({
      data: {
        project_id: project.id,
        acao: isExistingClient
          ? "Cadastro completo atualizado pelo cliente (formulário público)."
          : "Cadastro completo preenchido pelo cliente (formulário público).",
        interno_sotamente: false,
        user_id: commercialUser.id,
      },
    });

    const companyUsers = await prisma.user.findMany({
      where: { company_id: companyId },
    });

    const dueAt = addOneBusinessDay(new Date());

    if (companyUsers.length > 0) {
      await prisma.operatorReminder.createMany({
        data: companyUsers.map((u) => ({
          user_id: u.id,
          company_id: companyId,
          title: isExistingClient
            ? `Cadastro atualizado: ${nome}`
            : `Novo cadastro completo: ${nome}`,
          due_at: dueAt,
        })),
      });
    }

    revalidatePath("/crm");
    revalidatePath("/clientes");
    revalidatePath("/marketing/formularios");

    return {
      success: true,
      clientId: client.id,
      projectId: project.id,
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
