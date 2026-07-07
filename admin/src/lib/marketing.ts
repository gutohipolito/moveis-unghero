export type MarketingPeriod = "7" | "30" | "90";

export interface Ga4Summary {
  sessions: number;
  activeUsers: number;
  newUsers: number;
  engagementRate: number;
  avgSessionDurationSeconds: number;
}

export interface Ga4DailyPoint {
  date: string;
  sessions: number;
  activeUsers: number;
}

export interface Ga4ChannelRow {
  channel: string;
  sessions: number;
  activeUsers: number;
}

export interface Ga4PageRow {
  path: string;
  views: number;
  activeUsers: number;
}

export interface MarketingDashboardData {
  configured: boolean;
  period: MarketingPeriod;
  propertyId?: string;
  measurementId?: string;
  summary?: Ga4Summary;
  daily?: Ga4DailyPoint[];
  channels?: Ga4ChannelRow[];
  pages?: Ga4PageRow[];
  error?: string;
  cachedAt?: string;
}

export const GA4_MEASUREMENT_ID = "G-2M5NMQ84HK";

export function periodToGa4Range(period: MarketingPeriod) {
  const days = period === "7" ? 7 : period === "30" ? 30 : 90;
  return {
    startDate: `${days}daysAgo`,
    endDate: "today",
  };
}

export function formatGa4Date(yyyymmdd: string) {
  if (yyyymmdd.length !== 8) return yyyymmdd;
  const year = yyyymmdd.slice(0, 4);
  const month = yyyymmdd.slice(4, 6);
  const day = yyyymmdd.slice(6, 8);
  const date = new Date(`${year}-${month}-${day}T12:00:00`);
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0s";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

export function channelLabel(channel: string) {
  const map: Record<string, string> = {
    "Organic Search": "Busca orgânica",
    Direct: "Direto",
    "Paid Search": "Busca paga",
    "Organic Social": "Redes sociais",
    Referral: "Referência",
    Email: "E-mail",
    "Paid Social": "Social pago",
    Unassigned: "Não atribuído",
  };
  return map[channel] ?? channel;
}
