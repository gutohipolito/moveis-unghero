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
import { isValidBrPhoneDigits } from "@/lib/phone";
import { FORM_FIELD_LIMITS, truncateField } from "@/lib/brDocuments";
import { normalizeEmailInput, validateOptionalEmail } from "@/lib/email";

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

    const nome = truncateField(data.nome || "", FORM_FIELD_LIMITS.nome);
    if (!nome || nome.length < 3) {
      return { success: false, error: "Informe seu nome completo." };
    }
    const nameParts = nome.split(/\s+/).filter((part) => part.length > 0);
    if (nameParts.length < 2) {
      return { success: false, error: "Informe seu nome e sobrenome (nome completo)." };
    }

    if (!data.tipo) {
      return { success: false, error: "Selecione seu tipo de atuação." };
    }

    const telefone = data.telefone?.trim() || null;
    const emailRaw = data.email?.trim() || "";
    const emailError = validateOptionalEmail(emailRaw);
    if (emailError) {
      return { success: false, error: emailError };
    }
    const email = emailRaw ? normalizeEmailInput(emailRaw) : null;
    const phoneDigits = telefone ? cleanPhone(telefone) : "";

    if (!telefone && !email) {
      return { success: false, error: "Informe telefone ou e-mail para contato." };
    }
    if (telefone && !isValidBrPhoneDigits(telefone)) {
      return {
        success: false,
        error: "Informe um telefone válido com DDD (fixo ou celular).",
      };
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
        escritorio: data.escritorio?.trim()
          ? capitalizeText(truncateField(data.escritorio, FORM_FIELD_LIMITS.escritorio))
          : null,
        registro_profissional: data.registro_profissional?.trim()
          ? truncateField(data.registro_profissional, FORM_FIELD_LIMITS.registroProfissional)
          : null,
        portfolioUrl: data.portfolio_url?.trim()
          ? truncateField(data.portfolio_url, FORM_FIELD_LIMITS.portfolioUrl)
          : null,
        origem: data.origem?.trim()
          ? truncateField(data.origem, FORM_FIELD_LIMITS.origem)
          : null,
        observacoes: data.observacoes?.trim()
          ? truncateField(data.observacoes, FORM_FIELD_LIMITS.observacoes)
          : null,
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
