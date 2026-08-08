export type PartnerUiTheme = "dark" | "light";

export type PartnerUiAccentId =
  | "silver"
  | "gold"
  | "blue"
  | "emerald"
  | "rose";

export type PartnerUiPrefs = {
  theme: PartnerUiTheme;
  accent: PartnerUiAccentId;
};

export const DEFAULT_PARTNER_UI_PREFS: PartnerUiPrefs = {
  theme: "dark",
  accent: "silver",
};

/** HSL components without `hsl()` wrapper — for CSS vars. */
export const PARTNER_ACCENT_PRESETS: Array<{
  id: PartnerUiAccentId;
  label: string;
  /** e.g. "210 12% 68%" */
  hsl: string;
}> = [
  { id: "silver", label: "Prata", hsl: "210 12% 68%" },
  { id: "gold", label: "Ouro", hsl: "42 80% 48%" },
  { id: "blue", label: "Azul", hsl: "210 70% 52%" },
  { id: "emerald", label: "Esmeralda", hsl: "152 45% 40%" },
  { id: "rose", label: "Rosa", hsl: "350 65% 52%" },
];

function storageKey(partnerId: string) {
  return `parceiro-ui-prefs:${partnerId}`;
}

export function getPartnerAccentHsl(accent: PartnerUiAccentId): string {
  return (
    PARTNER_ACCENT_PRESETS.find((p) => p.id === accent)?.hsl ??
    PARTNER_ACCENT_PRESETS[0].hsl
  );
}

export function loadPartnerUiPrefs(partnerId: string): PartnerUiPrefs {
  if (typeof window === "undefined") return DEFAULT_PARTNER_UI_PREFS;
  try {
    const raw = localStorage.getItem(storageKey(partnerId));
    if (!raw) return DEFAULT_PARTNER_UI_PREFS;
    const parsed = JSON.parse(raw) as Partial<PartnerUiPrefs>;
    const theme: PartnerUiTheme =
      parsed.theme === "light" || parsed.theme === "dark"
        ? parsed.theme
        : DEFAULT_PARTNER_UI_PREFS.theme;
    const accent = PARTNER_ACCENT_PRESETS.some((p) => p.id === parsed.accent)
      ? (parsed.accent as PartnerUiAccentId)
      : DEFAULT_PARTNER_UI_PREFS.accent;
    return { theme, accent };
  } catch {
    return DEFAULT_PARTNER_UI_PREFS;
  }
}

export function savePartnerUiPrefs(
  partnerId: string,
  prefs: PartnerUiPrefs
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(partnerId), JSON.stringify(prefs));
  } catch {
    // ignore quota / private mode
  }
}

export function applyPartnerUiPrefsToElement(
  el: HTMLElement | null,
  prefs: PartnerUiPrefs
): void {
  const accent = getPartnerAccentHsl(prefs.accent);
  const targets = [el, typeof document !== "undefined" ? document.documentElement : null].filter(
    Boolean
  ) as HTMLElement[];

  for (const target of targets) {
    if (target === el) {
      target.dataset.parceiroTheme = prefs.theme;
    }
    target.style.setProperty("--parceiro-accent", accent);
    target.style.setProperty("--parceiro-brand-glow", accent);
  }
}
