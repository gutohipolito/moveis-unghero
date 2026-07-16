import { PartnerType } from "@prisma/client";
import {
  Compass,
  Hammer,
  PenTool,
  Sofa,
  Sparkles,
  UserRound,
} from "lucide-react";

export const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  ARQUITETO: "Arquiteto",
  DESIGNER_INTERIORES: "Designer de Interiores",
  PROJETISTA: "Projetista de Móveis",
  ENGENHEIRO: "Engenheiro",
  DECORADOR: "Decorador",
  OUTROS: "Outros",
};

/** Ordem e tipos exibidos no formulário público e no cadastro interno. */
export const PARTNER_SIGNUP_TYPES: PartnerType[] = [
  "ARQUITETO",
  "DESIGNER_INTERIORES",
  "PROJETISTA",
  "ENGENHEIRO",
  "DECORADOR",
];

/** Todos os tipos (inclui legado OUTROS). */
export const PARTNER_TYPES = [
  ...PARTNER_SIGNUP_TYPES,
  "OUTROS",
] as PartnerType[];

export const PARTNER_ORIGEM_OPTIONS = [
  "Instagram",
  "Google",
  "Cliente",
  "Representante",
  "Evento",
  "Indicação",
  "Outro",
] as const;

export type PartnerOrigemOption = (typeof PARTNER_ORIGEM_OPTIONS)[number];

export const PARTNER_TYPE_STYLES: Record<
  PartnerType,
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    avatar: string;
    accent: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  ARQUITETO: {
    label: PARTNER_TYPE_LABELS.ARQUITETO,
    bg: "bg-indigo-500/10",
    text: "text-indigo-700",
    border: "border-indigo-500/20",
    avatar: "bg-indigo-500/15 text-indigo-700 border-indigo-500/25",
    accent: "bg-gradient-to-r from-indigo-500 to-indigo-600",
    icon: Compass,
  },
  DESIGNER_INTERIORES: {
    label: PARTNER_TYPE_LABELS.DESIGNER_INTERIORES,
    bg: "bg-violet-500/10",
    text: "text-violet-700",
    border: "border-violet-500/20",
    avatar: "bg-violet-500/15 text-violet-700 border-violet-500/25",
    accent: "bg-gradient-to-r from-violet-500 to-purple-600",
    icon: Sofa,
  },
  PROJETISTA: {
    label: PARTNER_TYPE_LABELS.PROJETISTA,
    bg: "bg-cyan-500/10",
    text: "text-cyan-700",
    border: "border-cyan-500/20",
    avatar: "bg-cyan-500/15 text-cyan-700 border-cyan-500/25",
    accent: "bg-gradient-to-r from-cyan-500 to-cyan-600",
    icon: PenTool,
  },
  ENGENHEIRO: {
    label: PARTNER_TYPE_LABELS.ENGENHEIRO,
    bg: "bg-slate-500/10",
    text: "text-slate-700",
    border: "border-slate-500/20",
    avatar: "bg-slate-500/15 text-slate-700 border-slate-500/25",
    accent: "bg-gradient-to-r from-slate-500 to-slate-600",
    icon: Hammer,
  },
  DECORADOR: {
    label: PARTNER_TYPE_LABELS.DECORADOR,
    bg: "bg-pink-500/10",
    text: "text-pink-700",
    border: "border-pink-500/20",
    avatar: "bg-pink-500/15 text-pink-700 border-pink-500/25",
    accent: "bg-gradient-to-r from-pink-500 to-rose-500",
    icon: Sparkles,
  },
  OUTROS: {
    label: PARTNER_TYPE_LABELS.OUTROS,
    bg: "bg-amber-500/10",
    text: "text-amber-700",
    border: "border-amber-500/20",
    avatar: "bg-amber-500/15 text-amber-700 border-amber-500/25",
    accent: "bg-gradient-to-r from-amber-500 to-orange-500",
    icon: UserRound,
  },
};

/** Exibe CAU/CREA apenas quando houver valor cadastrado. */
export function formatPartnerRegistro(
  tipo: PartnerType | string,
  registro: string | null | undefined
): string | null {
  const value = registro?.trim();
  if (!value) return null;
  if (/^(CAU|CREA|ABD)\b/i.test(value)) return value;
  if (tipo === "ARQUITETO") return `CAU ${value}`;
  if (tipo === "ENGENHEIRO") return `CREA ${value}`;
  if (tipo === "DESIGNER_INTERIORES") return `ABD ${value}`;
  return value;
}

export function partnerRegistroLabel(tipo: PartnerType | string): string {
  if (tipo === "ARQUITETO") return "Registro CAU";
  if (tipo === "ENGENHEIRO") return "Registro CREA";
  if (tipo === "DESIGNER_INTERIORES") return "Registro ABD";
  return "Registro profissional";
}
