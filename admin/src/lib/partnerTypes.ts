import { PartnerType } from "@prisma/client";
import {
  Compass,
  Hammer,
  PenTool,
  Sparkles,
  UserRound,
} from "lucide-react";

export const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  PROJETISTA: "Projetista",
  ARQUITETO: "Arquiteto",
  DECORADOR: "Decorador",
  ENGENHEIRO: "Engenheiro",
  OUTROS: "Outros",
};

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
  PROJETISTA: {
    label: "Projetista",
    bg: "bg-cyan-500/10",
    text: "text-cyan-700",
    border: "border-cyan-500/20",
    avatar: "bg-cyan-500/15 text-cyan-700 border-cyan-500/25",
    accent: "bg-gradient-to-r from-cyan-500 to-cyan-600",
    icon: PenTool,
  },
  ARQUITETO: {
    label: "Arquiteto",
    bg: "bg-indigo-500/10",
    text: "text-indigo-700",
    border: "border-indigo-500/20",
    avatar: "bg-indigo-500/15 text-indigo-700 border-indigo-500/25",
    accent: "bg-gradient-to-r from-indigo-500 to-indigo-600",
    icon: Compass,
  },
  DECORADOR: {
    label: "Decorador",
    bg: "bg-pink-500/10",
    text: "text-pink-700",
    border: "border-pink-500/20",
    avatar: "bg-pink-500/15 text-pink-700 border-pink-500/25",
    accent: "bg-gradient-to-r from-pink-500 to-rose-500",
    icon: Sparkles,
  },
  ENGENHEIRO: {
    label: "Engenheiro",
    bg: "bg-slate-500/10",
    text: "text-slate-700",
    border: "border-slate-500/20",
    avatar: "bg-slate-500/15 text-slate-700 border-slate-500/25",
    accent: "bg-gradient-to-r from-slate-500 to-slate-600",
    icon: Hammer,
  },
  OUTROS: {
    label: "Outros",
    bg: "bg-amber-500/10",
    text: "text-amber-700",
    border: "border-amber-500/20",
    avatar: "bg-amber-500/15 text-amber-700 border-amber-500/25",
    accent: "bg-gradient-to-r from-amber-500 to-orange-500",
    icon: UserRound,
  },
};

export const PARTNER_TYPES = Object.keys(PARTNER_TYPE_LABELS) as PartnerType[];
