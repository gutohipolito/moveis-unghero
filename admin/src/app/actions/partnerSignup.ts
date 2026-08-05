"use server";

import { PartnerType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { capitalizeText } from "@/lib/utils";
import { normalizeCidade } from "@/lib/address";
import { resolvePublicCompanyId } from "@/lib/publicCompany";
import { checkRateLimit, getRequestIp } from "@/lib/rateLimit";
import { sendSignupConfirmationEmail } from "@/lib/signupConfirmationEmail";
import { headers } from "next/headers";

export interface PartnerSignupData {
  nome: string;
  tipo: PartnerType;
  telefone?: string;
  email?: string;
  cidade?: string;
  escritorio?: string;
  portfolio_url?: string;
  registro_profissional?: string;
  origem?: string;
  observacoes?: string;
  company_id?: string;
  /** Opt-in de comunicações comerciais (parceiros). */
  marketing_aceite?: boolean;
  lgpd_aceite?: boolean;
}

function cleanPhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export async function submitPublicPartnerSignupAction(data: PartnerSignupData) {
  try {
    const ip = getRequestIp(await headers());
    const rate = checkRateLimit(`public-partner-signup:${ip}`, {
      limit: 8,
      windowMs: 60 * 60 * 1000,
    });
    if (!rate.ok) {
      return {
        success: false,
        error: `Muitas tentativas. Aguarde ${rate.retryAfterSec}s e tente novamente.`,
      };
    }

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

    if (!data.lgpd_aceite) {
      return {
        success: false,
        error: "É necessário aceitar o tratamento de dados (LGPD) para concluir o cadastro.",
      };
    }

    const companyId = resolvePublicCompanyId();

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

    const parceiro = await prisma.professionalPartner.create({
      data: {
        company_id: companyId,
        nome: capitalizeText(nome),
        tipo: data.tipo,
        email,
        telefone,
        cidade: data.cidade?.trim()
          ? normalizeCidade(data.cidade.trim()).cidade || null
          : null,
        escritorio: data.escritorio?.trim() ? capitalizeText(data.escritorio.trim()) : null,
        registro_profissional: data.registro_profissional?.trim() || null,
        portfolioUrl: data.portfolio_url?.trim() || null,
        origem: data.origem?.trim() || null,
        observacoes: data.observacoes?.trim() || null,
        marketing_aceite: Boolean(data.marketing_aceite),
        ativo: true,
      },
    });

    revalidatePath("/parceiros");
    revalidatePath("/marketing/formularios");

    void sendSignupConfirmationEmail({
      companyId,
      kind: "parceiro",
      nome: parceiro.nome,
      email: parceiro.email,
    });

    return { success: true, id: parceiro.id };
  } catch (error) {
    console.error("Erro no cadastro público de parceiro:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível enviar o cadastro.",
    };
  }
}
