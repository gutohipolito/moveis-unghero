"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma, isDatabaseOffline, setDatabaseOffline } from "@/lib/prisma";
import { resolvePublicCompanyId } from "@/lib/publicCompany";
import { checkRateLimit, getRequestIp } from "@/lib/rateLimit";
import { createPartnerSessionToken } from "@/lib/partnerSession";
import { getAuthContext } from "@/lib/auth-guard";

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
