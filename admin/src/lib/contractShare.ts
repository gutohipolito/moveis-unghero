import { prisma } from "@/lib/prisma";

export const CONTRACT_SHORT_PATH = "/c";

const SHARE_CODE_ALPHABET = "abcdefghijkmnopqrstuvwxyz23456789";

export function getContractShortBaseUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_CONTRACT_SHORT_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  const quoteBase = process.env.NEXT_PUBLIC_QUOTE_PDF_SHORT_URL?.replace(/\/$/, "");
  if (quoteBase) return quoteBase;

  return "https://moveisunghero.com.br";
}

export function buildContractShortUrl(code: string) {
  return `${getContractShortBaseUrl()}${CONTRACT_SHORT_PATH}/${code}`;
}

export function generateContractShareCode(length = 12) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => SHARE_CODE_ALPHABET[byte % SHARE_CODE_ALPHABET.length]).join(
    ""
  );
}

export async function generateUniqueContractShareCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateContractShareCode();
    const existing = await prisma.contract.findFirst({
      where: { share_code: code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  throw new Error("Não foi possível gerar um código único para o link do contrato.");
}

export async function ensureContractShareCode(contractId: string) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: { share_code: true },
  });

  if (!contract) return null;
  if (contract.share_code) return contract.share_code;

  const code = await generateUniqueContractShareCode();
  await prisma.contract.update({
    where: { id: contractId },
    data: {
      share_code: code,
      shared_at: new Date(),
    },
  });

  return code;
}

export function resolveContractPublicUrl(shareCode?: string | null) {
  if (!shareCode) return null;
  return buildContractShortUrl(shareCode);
}
