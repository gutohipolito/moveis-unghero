"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma, isDatabaseOffline, setDatabaseOffline } from "@/lib/prisma";
import { resolvePublicCompanyId } from "@/lib/publicCompany";
import { checkRateLimit, checkRateLimitAsync, getRequestIp } from "@/lib/rateLimit";
import {
  createPartnerSessionToken,
  createPartnerPendingLoginToken,
  parsePartnerPendingLoginToken,
  parsePartnerSessionToken,
} from "@/lib/partnerSession";
import {
  generatePartnerLoginOtp,
  verifyPartnerLoginOtp,
} from "@/lib/partnerLoginOtp";
import { sendPartnerLoginOtpEmail } from "@/lib/partnerLoginEmail";
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
const PARTNER_LOGIN_PENDING_COOKIE = "parceiro-login-pending";
const SESSION_MAX_AGE_SEC = 60 * 60 * 24;
/** Preview da Diretoria: curto de propósito (45 min). */
const ADMIN_SESSION_MAX_AGE_SEC = 45 * 60;

function cleanPhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function phonesMatch(stored: string | null | undefined, inputDigits: string) {
  if (!stored) return false;
  const storedDigits = cleanPhone(stored);
  if (storedDigits.length < 8 || inputDigits.length < 8) return false;
  const tail = inputDigits.slice(-8);
  return storedDigits.endsWith(tail) || inputDigits.endsWith(storedDigits.slice(-8));
}

type PartnerLoginMatch = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  ativo: boolean;
};

async function findPartnerLoginCandidate(
  companyId: string,
  emailLimpo: string,
  phoneDigits: string
): Promise<
  | { kind: "ok"; partner: PartnerLoginMatch }
  | { kind: "pending" }
  | { kind: "incomplete" }
  | { kind: "none" }
> {
  const byEmail = await prisma.professionalPartner.findMany({
    where: {
      company_id: companyId,
      email: { equals: emailLimpo, mode: "insensitive" },
    },
    select: {
      id: true,
      nome: true,
      email: true,
      telefone: true,
      ativo: true,
    },
    take: 10,
  });

  const matched = byEmail.filter((p) => phonesMatch(p.telefone, phoneDigits));
  if (matched.length === 0) {
    if (byEmail.length > 0 && byEmail.every((p) => !p.telefone)) {
      return { kind: "incomplete" };
    }
    return { kind: "none" };
  }

  const active = matched.find((p) => p.ativo);
  if (active) return { kind: "ok", partner: active };
  return { kind: "pending" };
}

/** Etapa 1: valida e-mail + telefone e envia código por e-mail. */
export async function loginParceiro(data: { email: string; telefone: string }) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const emailLimpo = data.email.trim().toLowerCase();
  const phoneDigits = cleanPhone(data.telefone);
  const isProduction = process.env.NODE_ENV === "production";

  const ip = getRequestIp(headerStore);
  const rate = await checkRateLimitAsync(`parceiro-login:${ip}:${emailLimpo}`, {
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!rate.ok) {
    return {
      success: false as const,
      error: `Muitas tentativas. Aguarde ${rate.retryAfterSec}s e tente novamente.`,
    };
  }

  if (!emailLimpo || !emailLimpo.includes("@")) {
    return { success: false as const, error: "Informe um e-mail válido." };
  }
  if (phoneDigits.length < 8) {
    return { success: false as const, error: "Informe um telefone válido com DDD." };
  }

  if (isDatabaseOffline()) {
    return {
      success: false as const,
      error: "Serviço temporariamente indisponível. Tente novamente.",
    };
  }

  try {
    const companyId = resolvePublicCompanyId();
    const found = await findPartnerLoginCandidate(companyId, emailLimpo, phoneDigits);

    if (found.kind === "pending") {
      return {
        success: false as const,
        error:
          "Seu cadastro ainda está em análise. A Móveis Unghero libera o portal após a aprovação.",
      };
    }
    if (found.kind === "incomplete") {
      return {
        success: false as const,
        error:
          "Cadastro incompleto para o portal. Peça à Móveis Unghero para confirmar e-mail e telefone.",
      };
    }
    if (found.kind === "none") {
      return {
        success: false as const,
        error: "Parceiro não encontrado ou dados inválidos.",
      };
    }

    const partner = found.partner;
    if (!partner.email) {
      return {
        success: false as const,
        error:
          "Cadastro incompleto para o portal. Peça à Móveis Unghero para confirmar o e-mail.",
      };
    }

    const code = generatePartnerLoginOtp(partner.id);
    const mailed = await sendPartnerLoginOtpEmail({
      companyId,
      nome: partner.nome,
      email: partner.email,
      code,
    });

    if (!mailed.sent) {
      if (process.env.NODE_ENV !== "production") {
        console.info(`[parceiro-login-otp] ${partner.id} → ${code}`);
      }
      return {
        success: false as const,
        error:
          mailed.error ||
          "Não foi possível enviar o código por e-mail. Tente novamente ou fale com a Móveis Unghero.",
      };
    }

    if (process.env.NODE_ENV !== "production") {
      console.info(`[parceiro-login-otp] enviado para ${partner.email}`);
    }

    cookieStore.delete("parceiro-session");
    cookieStore.delete(ADMIN_PREVIEW_COOKIE);
    cookieStore.set(
      PARTNER_LOGIN_PENDING_COOKIE,
      createPartnerPendingLoginToken(partner.id, 10 * 60),
      {
      path: "/",
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 10 * 60,
    });

    return {
      success: true as const,
      needsOtp: true as const,
      emailHint: partner.email.replace(/(.{2}).+(@.+)/, "$1***$2"),
    };
  } catch (error) {
    console.warn("Banco offline no login de parceiro.", error);
    setDatabaseOffline(true);
    return {
      success: false as const,
      error: "Serviço temporariamente indisponível. Tente novamente.",
    };
  }
}

/** Etapa 2: confere o código enviado por e-mail e abre a sessão. */
export async function confirmParceiroLoginOtp(data: { code: string }) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const isProduction = process.env.NODE_ENV === "production";
  const pendingId = parsePartnerPendingLoginToken(
    cookieStore.get(PARTNER_LOGIN_PENDING_COOKIE)?.value
  );

  const ip = getRequestIp(headerStore);
  const rate = await checkRateLimitAsync(`parceiro-otp:${ip}:${pendingId ?? "none"}`, {
    limit: 8,
    windowMs: 15 * 60 * 1000,
  });
  if (!rate.ok) {
    return {
      success: false as const,
      error: `Muitas tentativas. Aguarde ${rate.retryAfterSec}s e tente novamente.`,
    };
  }

  if (!pendingId) {
    return {
      success: false as const,
      error: "Sessão de login expirou. Informe e-mail e telefone novamente.",
    };
  }

  const code = data.code?.trim() || "";
  if (!verifyPartnerLoginOtp(pendingId, code)) {
    return { success: false as const, error: "Código inválido ou expirado." };
  }

  try {
    const partner = await prisma.professionalPartner.findFirst({
      where: { id: pendingId, ativo: true },
      select: { id: true },
    });
    if (!partner) {
      cookieStore.delete(PARTNER_LOGIN_PENDING_COOKIE);
      return {
        success: false as const,
        error: "Parceiro não encontrado ou inativo.",
      };
    }

    cookieStore.delete(PARTNER_LOGIN_PENDING_COOKIE);
    cookieStore.delete(ADMIN_PREVIEW_COOKIE);
    cookieStore.set(
      "parceiro-session",
      createPartnerSessionToken(partner.id, SESSION_MAX_AGE_SEC),
      {
        path: "/",
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: SESSION_MAX_AGE_SEC,
      }
    );
    return { success: true as const };
  } catch (error) {
    console.warn("Falha ao confirmar OTP do parceiro.", error);
    return {
      success: false as const,
      error: "Não foi possível concluir o login. Tente novamente.",
    };
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
    cookieStore.delete(PARTNER_LOGIN_PENDING_COOKIE);
    cookieStore.set(
      "parceiro-session",
      createPartnerSessionToken(partner.id, ADMIN_SESSION_MAX_AGE_SEC),
      {
        path: "/",
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: ADMIN_SESSION_MAX_AGE_SEC,
      }
    );
    cookieStore.set(ADMIN_PREVIEW_COOKIE, "1", {
      path: "/",
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: ADMIN_SESSION_MAX_AGE_SEC,
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
  cookieStore.delete(PARTNER_LOGIN_PENDING_COOKIE);
  redirect(wasAdminPreview ? "/parceiros" : "/parceiro/login");
}

/** Sai do preview e limpa a sessão do portal (volta ao CRM de parceiros). */
export async function exitPartnerAdminPreview() {
  const cookieStore = await cookies();
  cookieStore.delete("parceiro-session");
  cookieStore.delete(ADMIN_PREVIEW_COOKIE);
  cookieStore.delete(PARTNER_LOGIN_PENDING_COOKIE);
  redirect("/parceiros");
}

/**
 * Preview da Diretoria só vale com cookie + sessão ADMIN ativa.
 * Cookie órfão (staff deslogado) encerra a impersonação.
 */
export async function isPartnerAdminPreview(): Promise<boolean> {
  const cookieStore = await cookies();
  if (cookieStore.get(ADMIN_PREVIEW_COOKIE)?.value !== "1") {
    return false;
  }

  const auth = await getAuthContext();
  if (!auth || auth.cargo !== "ADMIN") {
    cookieStore.delete(ADMIN_PREVIEW_COOKIE);
    cookieStore.delete("parceiro-session");
    return false;
  }

  return true;
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

const NOTE_MAX = 4000;

async function requirePartnerSession() {
  const cookieStore = await cookies();
  const partnerId = parsePartnerSessionToken(cookieStore.get("parceiro-session")?.value);
  if (!partnerId) return null;
  return partnerId;
}

export async function loadPartnerProjectDetailAction(projectId: string) {
  const partnerId = await requirePartnerSession();
  if (!partnerId) {
    return { success: false as const, error: "Sessão expirada. Faça login novamente." };
  }
  if (!projectId?.trim()) {
    return { success: false as const, error: "Projeto inválido." };
  }

  try {
    const { loadPartnerProjectDetail } = await import("@/lib/partnerPortal");
    const project = await loadPartnerProjectDetail(partnerId, projectId);
    if (!project) {
      return { success: false as const, error: "Projeto não encontrado." };
    }
    return { success: true as const, project };
  } catch (error) {
    console.error("loadPartnerProjectDetailAction:", error);
    return { success: false as const, error: "Não foi possível carregar o projeto." };
  }
}

export async function addPartnerProjectNoteAction(projectId: string, body: string) {
  const partnerId = await requirePartnerSession();
  if (!partnerId) {
    return { success: false as const, error: "Sessão expirada. Faça login novamente." };
  }

  const ip = getRequestIp(await headers());
  const rate = checkRateLimit(`parceiro-note:${partnerId}:${ip}`, {
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });
  if (!rate.ok) {
    return {
      success: false as const,
      error: `Muitas tentativas. Aguarde ${rate.retryAfterSec}s.`,
    };
  }

  const text = body?.trim() || "";
  if (text.length < 2) {
    return { success: false as const, error: "Escreva uma nota com pelo menos 2 caracteres." };
  }
  if (text.length > NOTE_MAX) {
    return { success: false as const, error: `Nota muito longa (máx. ${NOTE_MAX} caracteres).` };
  }

  const { assertPartnerOwnsProject } = await import("@/lib/partnerPortal");
  const ownership = await assertPartnerOwnsProject(partnerId, projectId);
  if (!ownership.ok) {
    return { success: false as const, error: "Projeto não encontrado." };
  }

  try {
    const note = await prisma.partnerProjectNote.create({
      data: {
        project_id: projectId,
        partner_id: partnerId,
        body: text,
      },
      select: {
        id: true,
        body: true,
        partner_id: true,
        createdAt: true,
        partner: { select: { nome: true } },
      },
    });

    revalidatePath(`/parceiro/projetos/${projectId}`);
    revalidatePath(`/projects/${projectId}`);

    return {
      success: true as const,
      note: {
        id: note.id,
        body: note.body,
        partnerId: note.partner_id,
        partnerNome: note.partner.nome,
        createdAt: note.createdAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("addPartnerProjectNote:", error);
    return { success: false as const, error: "Não foi possível salvar a nota." };
  }
}

export async function deletePartnerProjectNoteAction(noteId: string) {
  const partnerId = await requirePartnerSession();
  if (!partnerId) {
    return { success: false as const, error: "Sessão expirada. Faça login novamente." };
  }

  const note = await prisma.partnerProjectNote.findFirst({
    where: { id: noteId, partner_id: partnerId },
    select: { id: true, project_id: true },
  });
  if (!note) {
    return { success: false as const, error: "Nota não encontrada." };
  }

  await prisma.partnerProjectNote.delete({ where: { id: note.id } });
  revalidatePath(`/parceiro/projetos/${note.project_id}`);
  revalidatePath(`/projects/${note.project_id}`);
  return { success: true as const };
}

export async function deletePartnerProjectFileAction(fileId: string) {
  const partnerId = await requirePartnerSession();
  if (!partnerId) {
    return { success: false as const, error: "Sessão expirada. Faça login novamente." };
  }

  const file = await prisma.partnerProjectFile.findFirst({
    where: { id: fileId, partner_id: partnerId },
    select: { id: true, project_id: true, url: true },
  });
  if (!file) {
    return { success: false as const, error: "Arquivo não encontrado." };
  }

  if (process.env.BLOB_READ_WRITE_TOKEN && file.url.includes("blob.vercel-storage.com")) {
    try {
      const { del } = await import("@vercel/blob");
      await del(file.url, { token: process.env.BLOB_READ_WRITE_TOKEN });
    } catch (error) {
      console.warn("Falha ao remover blob do arquivo do parceiro:", error);
    }
  }

  await prisma.partnerProjectFile.delete({ where: { id: file.id } });
  revalidatePath(`/parceiro/projetos/${file.project_id}`);
  revalidatePath(`/projects/${file.project_id}`);
  return { success: true as const };
}
