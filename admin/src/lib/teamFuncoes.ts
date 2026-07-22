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

export const TEAM_FUNCAO_META: Record<
  TeamFuncaoId,
  { label: string; shortLabel: string; bg: string; text: string; border: string; accent: string }
> = {
  MARCENEIRO: {
    label: "Marceneiro",
    shortLabel: "Marcenaria",
    bg: "bg-amber-500/10",
    text: "text-amber-800",
    border: "border-amber-500/25",
    accent: "from-amber-500 to-orange-500",
  },
  AJUDANTE: {
    label: "Ajudante",
    shortLabel: "Ajudante",
    bg: "bg-slate-500/10",
    text: "text-slate-700",
    border: "border-slate-400/30",
    accent: "from-slate-500 to-slate-600",
  },
  MONTADOR: {
    label: "Montador",
    shortLabel: "Montagem",
    bg: "bg-sky-500/10",
    text: "text-sky-800",
    border: "border-sky-500/25",
    accent: "from-sky-500 to-cyan-500",
  },
  PROJETISTA: {
    label: "Projetista",
    shortLabel: "Projetos",
    bg: "bg-violet-500/10",
    text: "text-violet-800",
    border: "border-violet-500/25",
    accent: "from-violet-500 to-purple-500",
  },
  COMERCIAL: {
    label: "Comercial",
    shortLabel: "Vendas",
    bg: "bg-blue-500/10",
    text: "text-blue-800",
    border: "border-blue-500/25",
    accent: "from-blue-500 to-indigo-500",
  },
  ADMINISTRATIVO: {
    label: "Administrativo",
    shortLabel: "Admin",
    bg: "bg-emerald-500/10",
    text: "text-emerald-800",
    border: "border-emerald-500/25",
    accent: "from-emerald-500 to-teal-500",
  },
};

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
