import { prisma } from "@/lib/prisma";
import type { Client } from "@prisma/client";
import { formatPhoneDisplay } from "@/lib/phone";

/** Dígitos do telefone BR (DDD + número), sem código do país. */
export function normalizePhoneDigits(telefone: string): string {
  let digits = (telefone || "").replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) {
    digits = digits.slice(2);
  }
  return digits;
}

export function buildClientPlaceholderEmail(phoneDigits: string): string {
  return `${phoneDigits}@unghero.com.br`;
}

export function normalizeClientEmail(email?: string | null): string {
  return (email || "").trim().toLowerCase();
}

export function isPlaceholderClientEmail(email: string): boolean {
  const lower = normalizeClientEmail(email);
  return lower.endsWith("@unghero.com.br") || lower.endsWith("@avulso.com");
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
  if (cleanEmail && !isPlaceholderClientEmail(cleanEmail)) {
    orConditions.push({ email: cleanEmail });
  }
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
  const resolvedEmail =
    cleanEmail && !isPlaceholderClientEmail(cleanEmail)
      ? cleanEmail
      : phoneDigits
        ? buildClientPlaceholderEmail(phoneDigits)
        : cleanEmail;

  return {
    phoneDigits,
    telefone: displayPhone,
    email: resolvedEmail,
  };
}
