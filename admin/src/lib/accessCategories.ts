/** Categorias do cofre de acessos. */

export const ACCESS_CATEGORIES = [
  { key: "SITE", label: "Site / Painel", short: "Site" },
  { key: "EMAIL", label: "E-mail", short: "E-mail" },
  { key: "HOSPEDAGEM", label: "Hospedagem", short: "Host" },
  { key: "REDE_SOCIAL", label: "Rede social", short: "Social" },
  { key: "BANCO", label: "Banco / PIX", short: "Banco" },
  { key: "SOFTWARE", label: "Software / SaaS", short: "App" },
  { key: "OUTRO", label: "Outro", short: "Outro" },
] as const;

export type AccessCategory = (typeof ACCESS_CATEGORIES)[number]["key"];

export function isAccessCategory(value: string): value is AccessCategory {
  return ACCESS_CATEGORIES.some((c) => c.key === value);
}

export function accessCategoryLabel(key: string): string {
  return ACCESS_CATEGORIES.find((c) => c.key === key)?.label || key;
}

/** Paleta visual por categoria — madeira / ouro Unghero, sem roxo genérico. */
export const ACCESS_CATEGORY_STYLES: Record<
  AccessCategory,
  {
    ribbon: string;
    card: string;
    badge: string;
    icon: string;
    glow: string;
  }
> = {
  SITE: {
    ribbon: "from-amber-700 via-amber-600 to-yellow-600",
    card: "from-[#faf7f2] to-[#f3eee6] border-amber-200/70",
    badge: "bg-amber-500/12 text-amber-900 border-amber-500/20",
    icon: "bg-amber-500/15 text-amber-800 border-amber-500/25",
    glow: "hover:shadow-amber-900/8",
  },
  EMAIL: {
    ribbon: "from-slate-800 via-slate-700 to-stone-600",
    card: "from-[#f7f6f4] to-[#efeeeb] border-stone-200/80",
    badge: "bg-stone-500/10 text-stone-800 border-stone-400/25",
    icon: "bg-stone-500/12 text-stone-800 border-stone-400/30",
    glow: "hover:shadow-stone-900/8",
  },
  HOSPEDAGEM: {
    ribbon: "from-teal-800 via-teal-700 to-emerald-600",
    card: "from-[#f3f8f6] to-[#e8f1ee] border-teal-200/70",
    badge: "bg-teal-500/12 text-teal-900 border-teal-500/20",
    icon: "bg-teal-500/15 text-teal-800 border-teal-500/25",
    glow: "hover:shadow-teal-900/8",
  },
  REDE_SOCIAL: {
    ribbon: "from-rose-800 via-rose-700 to-orange-600",
    card: "from-[#faf5f3] to-[#f4ebe7] border-rose-200/70",
    badge: "bg-rose-500/12 text-rose-900 border-rose-500/20",
    icon: "bg-rose-500/15 text-rose-800 border-rose-500/25",
    glow: "hover:shadow-rose-900/8",
  },
  BANCO: {
    ribbon: "from-emerald-900 via-emerald-800 to-lime-700",
    card: "from-[#f4f8f4] to-[#e9f0e9] border-emerald-200/70",
    badge: "bg-emerald-500/12 text-emerald-900 border-emerald-500/20",
    icon: "bg-emerald-500/15 text-emerald-800 border-emerald-500/25",
    glow: "hover:shadow-emerald-900/8",
  },
  SOFTWARE: {
    ribbon: "from-sky-900 via-sky-800 to-cyan-700",
    card: "from-[#f3f7fa] to-[#e8eef3] border-sky-200/70",
    badge: "bg-sky-500/12 text-sky-900 border-sky-500/20",
    icon: "bg-sky-500/15 text-sky-800 border-sky-500/25",
    glow: "hover:shadow-sky-900/8",
  },
  OUTRO: {
    ribbon: "from-neutral-800 via-neutral-700 to-stone-600",
    card: "from-[#f8f7f5] to-[#efece8] border-neutral-200/80",
    badge: "bg-neutral-500/10 text-neutral-800 border-neutral-400/25",
    icon: "bg-neutral-500/12 text-neutral-800 border-neutral-400/30",
    glow: "hover:shadow-neutral-900/8",
  },
};

export function normalizeAccessUrl(url: string | null | undefined): string | null {
  const raw = (url || "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

export function accessHostname(url: string | null | undefined): string | null {
  const normalized = normalizeAccessUrl(url);
  if (!normalized) return null;
  try {
    return new URL(normalized).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function faviconUrlFor(url: string | null | undefined): string | null {
  const host = accessHostname(url);
  if (!host) return null;
  return `/api/access-favicon?domain=${encodeURIComponent(host)}`;
}

/** URL direta (Google) — fallback se o proxy falhar. */
export function faviconUpstreamUrlFor(url: string | null | undefined): string | null {
  const host = accessHostname(url);
  if (!host) return null;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
}
