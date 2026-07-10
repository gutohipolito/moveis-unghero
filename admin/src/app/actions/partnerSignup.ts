"use server";

import { PartnerType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { capitalizeText } from "@/lib/utils";

export interface PartnerSignupData {
  nome: string;
  tipo: PartnerType;
  telefone?: string;
  email?: string;
  cidade?: string;
  escritorio?: string;
  portfolio_url?: string;
  observacoes?: string;
  company_id?: string;
}

function cleanPhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export async function submitPublicPartnerSignupAction(data: PartnerSignupData) {
  try {
    const nome = data.nome?.trim();
    if (!nome || nome.length < 3) {
      return { success: false, error: "Informe seu nome completo." };
    }

    if (!data.tipo) {
      return { success: false, error: "Selecione seu tipo de atuação." };
    }

    const telefone = data.telefone?.trim() || null;
    const email = data.email?.trim().toLowerCase() || null;
    const phoneDigits = telefone ? cleanPhone(telefone) : "";

    if (!telefone && !email) {
      return { success: false, error: "Informe telefone ou e-mail para contato." };
    }

    let companyId = data.company_id;
    if (!companyId) {
      const firstCompany = await prisma.company.findFirst();
      if (!firstCompany) {
        return { success: false, error: "Nenhuma empresa cadastrada no sistema." };
      }
      companyId = firstCompany.id;
    }

    const orConditions: { email?: { equals: string; mode: "insensitive" }; telefone?: { contains: string } }[] = [];
    if (email) {
      orConditions.push({ email: { equals: email, mode: "insensitive" } });
    }
    if (phoneDigits.length >= 8) {
      orConditions.push({ telefone: { contains: phoneDigits.slice(-8) } });
    }

    if (orConditions.length > 0) {
      const existing = await prisma.professionalPartner.findFirst({
        where: {
          company_id: companyId,
          OR: orConditions,
        },
      });

      if (existing) {
        return {
          success: false,
          error: "Já existe um cadastro com este telefone ou e-mail. Nossa equipe entrará em contato em breve.",
        };
      }
    }

    const portfolioNote = data.portfolio_url?.trim()
      ? `Portfolio/Instagram: ${data.portfolio_url.trim()}`
      : null;
    const observacoes = [portfolioNote, data.observacoes?.trim()].filter(Boolean).join("\n") || null;

    const parceiro = await prisma.professionalPartner.create({
      data: {
        company_id: companyId,
        nome: capitalizeText(nome),
        tipo: data.tipo,
        email,
        telefone,
        cidade: data.cidade?.trim() ? capitalizeText(data.cidade.trim()) : null,
        escritorio: data.escritorio?.trim() ? capitalizeText(data.escritorio.trim()) : null,
        observacoes,
        ativo: true,
      },
    });

    revalidatePath("/parceiros");
    revalidatePath("/marketing/formularios");

    return { success: true, id: parceiro.id };
  } catch (error) {
    console.error("Erro no cadastro público de parceiro:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível enviar o cadastro.",
    };
  }
}
