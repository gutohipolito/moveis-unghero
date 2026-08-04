import { prisma } from "@/lib/prisma";

export const PARTNER_INVITE_SHORT_PATH = "/a";

const SHARE_CODE_ALPHABET = "abcdefghijkmnopqrstuvwxyz23456789";

export function getPartnerInviteBaseUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_PARTNER_INVITE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  const quoteBase = process.env.NEXT_PUBLIC_QUOTE_PDF_SHORT_URL?.replace(/\/$/, "");
  if (quoteBase) return quoteBase;

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }

  return "https://admin.moveisunghero.com.br";
}

export function buildPartnerInviteUrl(code: string) {
  return `${getPartnerInviteBaseUrl()}${PARTNER_INVITE_SHORT_PATH}/${code}`;
}

export function generatePartnerInviteCode(length = 10) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => SHARE_CODE_ALPHABET[byte % SHARE_CODE_ALPHABET.length]).join(
    ""
  );
}

export async function generateUniquePartnerInviteCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generatePartnerInviteCode();
    const existing = await prisma.professionalPartner.findFirst({
      where: { invite_code: code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  throw new Error("Não foi possível gerar um código único de indicação.");
}

export async function ensurePartnerInviteCode(partnerId: string) {
  const partner = await prisma.professionalPartner.findUnique({
    where: { id: partnerId },
    select: { invite_code: true, ativo: true },
  });
  if (!partner || !partner.ativo) return null;
  if (partner.invite_code) return partner.invite_code;

  const code = await generateUniquePartnerInviteCode();
  await prisma.professionalPartner.update({
    where: { id: partnerId },
    data: { invite_code: code },
  });
  return code;
}

export async function resolvePartnerByInviteCode(code: string) {
  const normalized = code.trim().toLowerCase();
  if (!/^[a-z0-9]{6,16}$/.test(normalized)) return null;

  return prisma.professionalPartner.findFirst({
    where: {
      invite_code: normalized,
      ativo: true,
    },
    select: {
      id: true,
      nome: true,
      tipo: true,
      fotoUrl: true,
      escritorio: true,
      company_id: true,
      invite_code: true,
    },
  });
}

/** Backfill invite_code for active partners missing one. */
export async function backfillPartnerInviteCodes(companyId?: string) {
  const partners = await prisma.professionalPartner.findMany({
    where: {
      ativo: true,
      invite_code: null,
      ...(companyId ? { company_id: companyId } : {}),
    },
    select: { id: true },
  });

  for (const partner of partners) {
    await ensurePartnerInviteCode(partner.id);
  }

  return partners.length;
}
