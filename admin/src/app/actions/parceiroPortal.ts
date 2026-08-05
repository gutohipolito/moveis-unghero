"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma, isDatabaseOffline, setDatabaseOffline } from "@/lib/prisma";
import { resolvePublicCompanyId } from "@/lib/publicCompany";
import { checkRateLimit, getRequestIp } from "@/lib/rateLimit";
import {
  createPartnerSessionToken,
  parsePartnerSessionToken,
} from "@/lib/partnerSession";
import { getAuthContext } from "@/lib/auth-guard";
import { capitalizeText } from "@/lib/utils";
import { normalizeCidade } from "@/lib/address";
import {
  MAX_PORTFOLIO_URLS,
  normalizePortfolioUrl,
  parsePortfolioUrls,
  serializePortfolioUrls,
} from "@/lib/portfolioUrls";

const ADMIN_PREVIEW_COOKIE = "parceiro-admin-preview";

function cleanPhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export async function loginParceiro(data: { email: string; telefone: string }) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const emailLimpo = data.email.trim().toLowerCase();
  const phoneDigits = cleanPhone(data.telefone);
  const isProduction = process.env.NODE_ENV === "production";

  const ip = getRequestIp(headerStore);
  const rate = checkRateLimit(`parceiro-login:${ip}:${emailLimpo}`, {
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!rate.ok) {
    return {
      success: false,
      error: `Muitas tentativas. Aguarde ${rate.retryAfterSec}s e tente novamente.`,
    };
  }

  if (!emailLimpo || !emailLimpo.includes("@")) {
    return { success: false, error: "Informe um e-mail válido." };
  }
  if (phoneDigits.length < 8) {
    return { success: false, error: "Informe um telefone válido com DDD." };
  }

  if (isDatabaseOffline()) {
    return { success: false, error: "Serviço temporariamente indisponível. Tente novamente." };
  }

  try {
    const companyId = resolvePublicCompanyId();
    const partners = await prisma.professionalPartner.findMany({
      where: {
        company_id: companyId,
        ativo: true,
        email: { equals: emailLimpo, mode: "insensitive" },
      },
      select: {
        id: true,
        email: true,
        telefone: true,
      },
      take: 10,
    });

    const phoneTail = phoneDigits.slice(-8);
    const partner = partners.find((p) => {
      if (!p.telefone) return false;
      const stored = cleanPhone(p.telefone);
      return stored.endsWith(phoneTail) || phoneDigits.endsWith(stored.slice(-8));
    });

    if (!partner) {
      const emailMatchedWithoutPhone =
        partners.length > 0 && partners.every((p) => !p.telefone);
      if (emailMatchedWithoutPhone) {
        return {
          success: false,
          error:
            "Cadastro incompleto para o portal. Peça à Móveis Unghero para confirmar e-mail e telefone.",
        };
      }
      return {
        success: false,
        error: "Parceiro não encontrado ou dados inválidos.",
      };
    }

    cookieStore.delete(ADMIN_PREVIEW_COOKIE);
    cookieStore.set("parceiro-session", createPartnerSessionToken(partner.id), {
      path: "/",
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
    });
    return { success: true };
  } catch (error) {
    console.warn("Banco offline no login de parceiro.", error);
    setDatabaseOffline(true);
    return { success: false, error: "Serviço temporariamente indisponível. Tente novamente." };
  }
}

/** Diretoria entra no portal como um parceiro, sem e-mail/telefone. */
export async function adminEnterPartnerPortal(partnerId: string) {
  const auth = await getAuthContext();
  if (!auth || auth.cargo !== "ADMIN") {
    return { success: false, error: "Apenas a Diretoria pode abrir o portal assim." };
  }

  const id = partnerId?.trim();
  if (!id) {
    return { success: false, error: "Selecione um parceiro." };
  }

  try {
    const partner = await prisma.professionalPartner.findFirst({
      where: {
        id,
        company_id: auth.companyId,
        ativo: true,
      },
      select: { id: true },
    });

    if (!partner) {
      return { success: false, error: "Parceiro não encontrado ou inativo." };
    }

    const isProduction = process.env.NODE_ENV === "production";
    const cookieStore = await cookies();
    cookieStore.set("parceiro-session", createPartnerSessionToken(partner.id), {
      path: "/",
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 60 * 60 * 4,
    });
    cookieStore.set(ADMIN_PREVIEW_COOKIE, "1", {
      path: "/",
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 60 * 60 * 4,
    });

    return { success: true };
  } catch (error) {
    console.warn("Falha ao abrir portal do parceiro como admin.", error);
    return { success: false, error: "Não foi possível abrir o portal." };
  }
}

export async function logoutParceiro() {
  const cookieStore = await cookies();
  const wasAdminPreview = cookieStore.get(ADMIN_PREVIEW_COOKIE)?.value === "1";
  cookieStore.delete("parceiro-session");
  cookieStore.delete(ADMIN_PREVIEW_COOKIE);
  redirect(wasAdminPreview ? "/parceiros" : "/parceiro/login");
}

export async function isPartnerAdminPreview(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_PREVIEW_COOKIE)?.value === "1";
}

export type PartnerProfileUpdateInput = {
  nome: string;
  email: string;
  telefone: string;
  cidade: string;
  cep: string;
  endereco: string;
  escritorio: string;
  registro_profissional: string;
  portfolioUrl: string;
};

/** Parceiro atualiza o próprio cadastro — reflete no admin. */
export async function updateParceiroProfileAction(data: PartnerProfileUpdateInput) {
  const cookieStore = await cookies();
  const partnerId = parsePartnerSessionToken(cookieStore.get("parceiro-session")?.value);
  if (!partnerId) {
    return { success: false as const, error: "Sessão expirada. Faça login novamente." };
  }

  const nome = data.nome?.trim() || "";
  if (nome.length < 2) {
    return { success: false as const, error: "Informe seu nome completo." };
  }

  const email = data.email?.trim().toLowerCase() || "";
  if (email && !email.includes("@")) {
    return { success: false as const, error: "Informe um e-mail válido." };
  }

  const rawUrls = parsePortfolioUrls(data.portfolioUrl).slice(0, MAX_PORTFOLIO_URLS);
  const normalizedUrls: string[] = [];
  for (const raw of rawUrls) {
    const normalized = normalizePortfolioUrl(raw);
    if (!normalized) {
      return { success: false as const, error: "Informe uma URL de portfólio válida." };
    }
    normalizedUrls.push(normalized);
  }
  const portfolioUrl = serializePortfolioUrls(normalizedUrls);

  if (isDatabaseOffline()) {
    return { success: false as const, error: "Serviço temporariamente indisponível." };
  }

  try {
    const existing = await prisma.professionalPartner.findFirst({
      where: { id: partnerId, ativo: true },
      select: { id: true },
    });
    if (!existing) {
      return { success: false as const, error: "Parceiro não encontrado." };
    }

    const updated = await prisma.professionalPartner.update({
      where: { id: partnerId },
      data: {
        nome: capitalizeText(nome),
        email: email || null,
        telefone: data.telefone?.trim() || null,
        cidade: data.cidade?.trim()
          ? normalizeCidade(data.cidade).cidade || null
          : null,
        cep: data.cep?.replace(/\D/g, "").slice(0, 8) || null,
        endereco: data.endereco?.trim() ? capitalizeText(data.endereco) : null,
        escritorio: data.escritorio?.trim() ? capitalizeText(data.escritorio) : null,
        registro_profissional: data.registro_profissional?.trim() || null,
        portfolioUrl: portfolioUrl || null,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        cidade: true,
        cep: true,
        endereco: true,
        escritorio: true,
        registro_profissional: true,
        portfolioUrl: true,
      },
    });

    revalidatePath("/parceiro/painel");
    revalidatePath("/parceiros");

    return { success: true as const, profile: updated };
  } catch (error) {
    console.error("Falha ao atualizar perfil do parceiro:", error);
    return { success: false as const, error: "Não foi possível salvar as alterações." };
  }
}
