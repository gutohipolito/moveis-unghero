/** Fuso oficial da operação (Farroupilha / Serra Gaúcha). */
export const BRAZIL_TIMEZONE = "America/Sao_Paulo";

/** Formata data no calendário brasileiro (evita dia errado em servidores UTC). */
export function formatDateBR(date: Date | string | number = new Date()) {
  return new Date(date).toLocaleDateString("pt-BR", {
    timeZone: BRAZIL_TIMEZONE,
  });
}

/**
 * Retorna YYYY-MM-DD no fuso de São Paulo.
 * Não usar `toISOString().slice(0, 10)` — à noite no Brasil isso já vira o dia seguinte em UTC.
 */
export function toISODateBR(date: Date | string | number = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BRAZIL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}

/** Soma dias civis a uma data YYYY-MM-DD (sem depender do fuso do servidor). */
export function addCalendarDaysISO(isoDate: string, days: number) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  const y = utc.getUTCFullYear();
  const m = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const d = String(utc.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Interpreta YYYY-MM-DD como meio-dia em São Paulo.
 * Assim a data civil não “pula” ao formatar em UTC ou no Brasil.
 */
export function parseISODateOnlyBrazil(isoDate: string) {
  const normalized = isoDate.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return new Date(isoDate);
  }
  return new Date(`${normalized}T12:00:00-03:00`);
}
