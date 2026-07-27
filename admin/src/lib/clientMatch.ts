import { prisma } from "@/lib/prisma";
import type { Client } from "@prisma/client";
import { formatPhoneDisplay } from "@/lib/phone";
import { sanitizePublicClientEmail } from "@/lib/clientConsent";

/** Texto exibido quando o cliente não tem e-mail real. */
export const MISSING_CLIENT_EMAIL_LABEL = "(e-mail não cadastrado)";

/** Dígitos do telefone BR (DDD + número), sem código do país. */
export function normalizePhoneDigits(telefone: string): string {
  let digits = (telefone || "").replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) {
    digits = digits.slice(2);
  }
  return digits;
}

/** @deprecated legado — não gerar mais; mantido só para casar cadastros antigos. */
export function buildClientPlaceholderEmail(phoneDigits: string): string {
  return `${phoneDigits}@unghero.com.br`;
}

export function normalizeClientEmail(email?: string | null): string {
  return sanitizePublicClientEmail(email);
}

/** E-mails inventados no passado (telefone@unghero / nome@avulso). */
export function isPlaceholderClientEmail(email: string): boolean {
  const lower = normalizeClientEmail(email);
  if (!lower) return true;
  return (
    lower.endsWith("@unghero.com.br") ||
    lower.endsWith("@avulso.com") ||
    lower === MISSING_CLIENT_EMAIL_LABEL.toLowerCase()
  );
}

export function hasRealClientEmail(email?: string | null): boolean {
  const clean = normalizeClientEmail(email);
  if (!clean || !clean.includes("@")) return false;
  return !isPlaceholderClientEmail(clean);
}

/** Exibição amigável no painel (nunca mostra telefone@unghero). */
export function formatClientEmailDisplay(email?: string | null): string {
  return hasRealClientEmail(email) ? normalizeClientEmail(email) : MISSING_CLIENT_EMAIL_LABEL;
}

export type FindExistingClientParams = {
  companyId: string;
  telefone: string;
  email?: string;
  cpf?: string;
  cnpj?: string;
};

export async function findExistingClient(
  params: FindExistingClientParams
): Promise<Client | null> {
  const { companyId, telefone, email, cpf, cnpj } = params;
  const phoneDigits = normalizePhoneDigits(telefone);
  const cleanEmail = normalizeClientEmail(email);
  const cpfDigits = cpf?.replace(/\D/g, "") || "";
  const cnpjDigits = cnpj?.replace(/\D/g, "") || "";

  const orConditions: Record<string, string>[] = [];

  if (phoneDigits) {
    orConditions.push({ telefone_digits: phoneDigits });
  }
  if (cleanEmail && hasRealClientEmail(cleanEmail)) {
    orConditions.push({ email: cleanEmail });
  }
  // Cadastros antigos usavam telefone@unghero.com.br como “e-mail”
  if (phoneDigits) {
    orConditions.push({ email: buildClientPlaceholderEmail(phoneDigits) });
  }
  if (cpfDigits) {
    orConditions.push({ cpf: cpfDigits });
  }
  if (cnpjDigits) {
    orConditions.push({ cnpj: cnpjDigits });
  }

  if (orConditions.length === 0) {
    return null;
  }

  let client = await prisma.client.findFirst({
    where: {
      company_id: companyId,
      OR: orConditions,
    },
  });

  if (!client && phoneDigits) {
    const legacyCandidates = await prisma.client.findMany({
      where: {
        company_id: companyId,
        OR: [{ telefone_digits: null }, { telefone_digits: "" }],
      },
      orderBy: { createdAt: "desc" },
      take: 1000,
    });

    client =
      legacyCandidates.find((c) => normalizePhoneDigits(c.telefone) === phoneDigits) ?? null;

    if (client) {
      await prisma.client.update({
        where: { id: client.id },
        data: { telefone_digits: phoneDigits },
      });
    }
  }

  return client;
}

export function resolveClientContactFields(telefone: string, email?: string) {
  const phoneDigits = normalizePhoneDigits(telefone);
  const cleanEmail = normalizeClientEmail(email);
  const displayPhone = formatPhoneDisplay(telefone.trim()) || telefone.trim();
  // Sem e-mail real → string vazia (não inventar telefone@domínio)
  const resolvedEmail = hasRealClientEmail(cleanEmail) ? cleanEmail : "";

  return {
    phoneDigits,
    telefone: displayPhone,
    email: resolvedEmail,
  };
}
