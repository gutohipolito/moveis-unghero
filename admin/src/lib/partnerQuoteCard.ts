import type { PartnerQuoteCardMode } from "@prisma/client";

export type PartnerQuoteCardAppearance = "hidden" | "unverified" | "verified";

export type PartnerQuoteCardFields = {
  nome: string;
  tipo: string;
  escritorio?: string | null;
  registro_profissional?: string | null;
  fotoUrl?: string | null;
  quote_card_mode?: PartnerQuoteCardMode | string | null;
};

/** Payload do card no PDF: null quando HIDDEN. */
export type PartnerQuotePrintPayload = {
  nome: string;
  tipo: string;
  escritorio: string | null;
  registro_profissional: string | null;
  fotoUrl: string | null;
  quote_card_mode: "UNVERIFIED" | "VERIFIED";
} | null;

export function resolvePartnerQuoteCardAppearance(
  mode: PartnerQuoteCardMode | string | null | undefined
): PartnerQuoteCardAppearance {
  if (mode === "VERIFIED") return "verified";
  if (mode === "UNVERIFIED") return "unverified";
  return "hidden";
}

export function toPartnerQuotePrintPayload(
  partner: PartnerQuoteCardFields | null | undefined
): PartnerQuotePrintPayload {
  if (!partner) return null;
  const appearance = resolvePartnerQuoteCardAppearance(partner.quote_card_mode);
  if (appearance === "hidden") return null;
  return {
    nome: partner.nome,
    tipo: partner.tipo,
    escritorio: partner.escritorio ?? null,
    registro_profissional: partner.registro_profissional ?? null,
    fotoUrl: partner.fotoUrl ?? null,
    quote_card_mode: appearance === "unverified" ? "UNVERIFIED" : "VERIFIED",
  };
}

export const PARTNER_QUOTE_CARD_MODE_OPTIONS: {
  value: PartnerQuoteCardMode;
  label: string;
  hint: string;
}[] = [
  {
    value: "HIDDEN",
    label: "Não autorizado",
    hint: "Nome/foto não aparecem no PDF do orçamento.",
  },
  {
    value: "UNVERIFIED",
    label: "Usar como não verificado",
    hint: "Aparece no PDF sem selo e sem borda dourada.",
  },
  {
    value: "VERIFIED",
    label: "Autorizado e verificado",
    hint: "Card completo com selo (como no cadastro pelo link).",
  },
];
