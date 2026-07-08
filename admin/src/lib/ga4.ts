import { BetaAnalyticsDataClient } from "@google-analytics/data";
import {
  formatGa4CredentialError,
  resolveGa4Credentials,
} from "@/lib/ga4-credentials";
import {
  GA4_MEASUREMENT_ID,
  type Ga4ChannelRow,
  type Ga4DailyPoint,
  type Ga4PageRow,
  type Ga4Summary,
  type MarketingDashboardData,
  type MarketingPeriod,
  periodToGa4Range,
} from "@/lib/marketing";

export function isGa4Configured() {
  return resolveGa4Credentials() !== null;
}

function getClient() {
  const creds = resolveGa4Credentials();
  if (!creds) {
    throw new Error("Credenciais GA4 incompletas.");
  }

  return {
    client: new BetaAnalyticsDataClient({
      credentials: {
        client_email: creds.clientEmail,
        private_key: creds.privateKey,
      },
    }),
    creds,
  };
}

function parseNumber(value: string | null | undefined) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function parseSummaryRow(
  row:
    | {
        metricValues?: Array<{ value?: string | null } | null> | null;
      }
    | null
    | undefined
): Ga4Summary {
  const values = row?.metricValues ?? [];
  return {
    sessions: parseNumber(values[0]?.value),
    activeUsers: parseNumber(values[1]?.value),
    newUsers: parseNumber(values[2]?.value),
    engagementRate: parseNumber(values[3]?.value) * 100,
    avgSessionDurationSeconds: parseNumber(values[4]?.value),
  };
}

export async function fetchGa4Dashboard(period: MarketingPeriod): Promise<MarketingDashboardData> {
  const resolved = resolveGa4Credentials();
  if (!resolved) {
    return {
      configured: false,
      period,
      measurementId: GA4_MEASUREMENT_ID,
    };
  }

  const { client, creds } = getClient();
  const property = `properties/${creds.propertyId}`;
  const dateRange = periodToGa4Range(period);

  try {
    if (period === "live") {
      const [summaryRes, minutesRes, channelsRes, pagesRes] = await Promise.all([
        client.runRealtimeReport({
          property,
          metrics: [{ name: "activeUsers" }],
        }),
        client.runRealtimeReport({
          property,
          dimensions: [{ name: "minutesAgo" }],
          metrics: [{ name: "activeUsers" }],
        }),
        client.runRealtimeReport({
          property,
          dimensions: [{ name: "sessionMedium" }],
          metrics: [{ name: "activeUsers" }],
        }),
        client.runRealtimeReport({
          property,
          dimensions: [{ name: "pagePath" }],
          metrics: [{ name: "activeUsers" }],
          limit: 8,
        }),
      ]);

      const activeUsers30m = parseNumber(summaryRes[0]?.rows?.[0]?.metricValues?.[0]?.value);
      const summary = {
        sessions: activeUsers30m,
        activeUsers: activeUsers30m,
        newUsers: activeUsers30m,
        engagementRate: 1.0, // 100%
        avgSessionDurationSeconds: 0,
      };

      const minutesMap: Record<string, number> = {};
      for (let i = 0; i < 30; i++) {
        minutesMap[i.toString()] = 0;
      }
      minutesRes[0]?.rows?.forEach((row) => {
        const min = row.dimensionValues?.[0]?.value ?? "0";
        const val = parseNumber(row.metricValues?.[0]?.value);
        minutesMap[min] = val;
      });

      const daily: Ga4DailyPoint[] = [];
      for (let i = 29; i >= 0; i--) {
        const minStr = i.toString();
        daily.push({
          date: `${minStr}m`,
          sessions: minutesMap[minStr] ?? 0,
          activeUsers: minutesMap[minStr] ?? 0,
        });
      }

      const channels: Ga4ChannelRow[] =
        channelsRes[0]?.rows?.map((row) => {
          const med = row.dimensionValues?.[0]?.value ?? "Direct";
          const val = parseNumber(row.metricValues?.[0]?.value);
          let chName = med;
          if (med === "(none)") chName = "Direct";
          else if (med === "organic") chName = "Organic Search";
          else if (med === "cpc") chName = "Paid Search";
          else if (med === "referral") chName = "Referral";
          return {
            channel: chName,
            sessions: val,
            activeUsers: val,
          };
        }) ?? [];

      const pages: Ga4PageRow[] =
        pagesRes[0]?.rows?.map((row) => ({
          path: row.dimensionValues?.[0]?.value ?? "/",
          views: parseNumber(row.metricValues?.[0]?.value),
          activeUsers: parseNumber(row.metricValues?.[0]?.value),
        })) ?? [];

      return {
        configured: true,
        period,
        measurementId: GA4_MEASUREMENT_ID,
        summary,
        daily,
        channels,
        pages,
        cachedAt: new Date().toISOString(),
      };
    }

    const [summaryRes, dailyRes, channelsRes, pagesRes] = await Promise.all([
      client.runReport({
        property,
        dateRanges: [dateRange],
        metrics: [
          { name: "sessions" },
          { name: "activeUsers" },
          { name: "newUsers" },
          { name: "engagementRate" },
          { name: "averageSessionDuration" },
        ],
      }),
      client.runReport({
        property,
        dateRanges: [dateRange],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "sessions" }, { name: "activeUsers" }],
        orderBys: [{ dimension: { dimensionName: "date" } }],
      }),
      client.runReport({
        property,
        dateRanges: [dateRange],
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "sessions" }, { name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 8,
      }),
      client.runReport({
        property,
        dateRanges: [dateRange],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 8,
      }),
    ]);

    const summary = parseSummaryRow(summaryRes[0]?.rows?.[0]);

    const daily: Ga4DailyPoint[] =
      dailyRes[0]?.rows?.map((row) => ({
        date: row.dimensionValues?.[0]?.value ?? "",
        sessions: parseNumber(row.metricValues?.[0]?.value),
        activeUsers: parseNumber(row.metricValues?.[1]?.value),
      })) ?? [];

    const channels: Ga4ChannelRow[] =
      channelsRes[0]?.rows?.map((row) => ({
        channel: row.dimensionValues?.[0]?.value ?? "Desconhecido",
        sessions: parseNumber(row.metricValues?.[0]?.value),
        activeUsers: parseNumber(row.metricValues?.[1]?.value),
      })) ?? [];

    const pages: Ga4PageRow[] =
      pagesRes[0]?.rows?.map((row) => ({
        path: row.dimensionValues?.[0]?.value ?? "/",
        views: parseNumber(row.metricValues?.[0]?.value),
        activeUsers: parseNumber(row.metricValues?.[1]?.value),
      })) ?? [];

    return {
      configured: true,
      period,
      measurementId: GA4_MEASUREMENT_ID,
      summary,
      daily,
      channels,
      pages,
      cachedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Erro ao consultar GA4 Data API:", error);
    return {
      configured: true,
      period,
      measurementId: GA4_MEASUREMENT_ID,
      error: formatGa4CredentialError(error, creds),
    };
  }
}
