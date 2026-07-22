/** Funções operacionais da equipe (independentes do cargo de acesso ao painel). */
export const TEAM_FUNCAO_IDS = [
  "MARCENEIRO",
  "AJUDANTE",
  "MONTADOR",
  "PROJETISTA",
  "COMERCIAL",
  "ADMINISTRATIVO",
] as const;

export type TeamFuncaoId = (typeof TEAM_FUNCAO_IDS)[number];

export const COLABORADORES_VIEW_PREF_KEY = "colaboradoresViewMode";
export type ColaboradoresViewMode = "grid" | "list";

export const TEAM_FUNCAO_META: Record<
  TeamFuncaoId,
  {
    label: string;
    shortLabel: string;
    bg: string;
    text: string;
    border: string;
    /** Tarja / avatar — mesma família de cor por função */
    banner: string;
    avatar: string;
    accentHex: string;
  }
> = {
  MARCENEIRO: {
    label: "Marceneiro",
    shortLabel: "Marcenaria",
    bg: "bg-amber-500/10",
    text: "text-amber-800",
    border: "border-amber-500/25",
    banner: "bg-amber-600",
    avatar: "bg-amber-100 text-amber-800 border-amber-200",
    accentHex: "#d97706",
  },
  AJUDANTE: {
    label: "Ajudante",
    shortLabel: "Ajudante",
    bg: "bg-slate-500/10",
    text: "text-slate-700",
    border: "border-slate-400/30",
    banner: "bg-slate-600",
    avatar: "bg-slate-100 text-slate-700 border-slate-200",
    accentHex: "#475569",
  },
  MONTADOR: {
    label: "Montador",
    shortLabel: "Montagem",
    bg: "bg-sky-500/10",
    text: "text-sky-800",
    border: "border-sky-500/25",
    banner: "bg-sky-600",
    avatar: "bg-sky-100 text-sky-800 border-sky-200",
    accentHex: "#0284c7",
  },
  PROJETISTA: {
    label: "Projetista",
    shortLabel: "Projetos",
    bg: "bg-violet-500/10",
    text: "text-violet-800",
    border: "border-violet-500/25",
    banner: "bg-violet-600",
    avatar: "bg-violet-100 text-violet-800 border-violet-200",
    accentHex: "#7c3aed",
  },
  COMERCIAL: {
    label: "Comercial",
    shortLabel: "Vendas",
    bg: "bg-blue-500/10",
    text: "text-blue-800",
    border: "border-blue-500/25",
    banner: "bg-blue-600",
    avatar: "bg-blue-100 text-blue-800 border-blue-200",
    accentHex: "#2563eb",
  },
  ADMINISTRATIVO: {
    label: "Administrativo",
    shortLabel: "Admin",
    bg: "bg-emerald-500/10",
    text: "text-emerald-800",
    border: "border-emerald-500/25",
    banner: "bg-emerald-600",
    avatar: "bg-emerald-100 text-emerald-800 border-emerald-200",
    accentHex: "#059669",
  },
};

/** Pattern diagonal reutilizável na tarja dos cards. */
export const FUNCAO_BANNER_PATTERN_STYLE = {
  backgroundImage: [
    "repeating-linear-gradient(-45deg, transparent, transparent 7px, rgba(255,255,255,0.14) 7px, rgba(255,255,255,0.14) 14px)",
    "radial-gradient(circle at 85% 20%, rgba(255,255,255,0.2), transparent 42%)",
  ].join(", "),
} as const;

export function isTeamFuncaoId(value: string): value is TeamFuncaoId {
  return (TEAM_FUNCAO_IDS as readonly string[]).includes(value);
}

export function normalizeFuncoes(values: string[] | null | undefined): TeamFuncaoId[] {
  if (!values?.length) return [];
  const unique = new Set<TeamFuncaoId>();
  for (const value of values) {
    const key = value.trim().toUpperCase();
    if (isTeamFuncaoId(key)) unique.add(key);
  }
  return Array.from(unique);
}

export function primaryFuncaoId(funcoes: string[] | null | undefined): TeamFuncaoId | null {
  const normalized = normalizeFuncoes(funcoes);
  return normalized[0] ?? null;
}

/** Cargo de painel sugerido a partir das funções operacionais. */
export function suggestCargoFromFuncoes(funcoes: TeamFuncaoId[]): "PRODUCAO" | "PROJETISTA" | "COMERCIAL" {
  if (funcoes.includes("PROJETISTA") && !funcoes.some((f) => f === "MARCENEIRO" || f === "MONTADOR" || f === "AJUDANTE")) {
    return "PROJETISTA";
  }
  if (funcoes.includes("COMERCIAL") && funcoes.length === 1) return "COMERCIAL";
  return "PRODUCAO";
}

export function slugifyTeamName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 48);
}

/** E-mail interno sem inbox — só para unicidade no banco até liberar acesso. */
export function buildInternalTeamEmail(name: string) {
  const slug = slugifyTeamName(name) || `membro.${Date.now()}`;
  return `equipe.${slug}@interno.moveisunghero.local`;
}

export function isInternalTeamEmail(email: string) {
  return email.toLowerCase().endsWith("@interno.moveisunghero.local");
}
