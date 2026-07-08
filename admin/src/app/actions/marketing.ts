"use server";

import { unstable_cache } from "next/cache";
import { fetchGa4Dashboard } from "@/lib/ga4";
import type { MarketingDashboardData, MarketingPeriod } from "@/lib/marketing";
import { getAuthContext } from "@/lib/auth-guard";

const getCachedGa4Dashboard = (period: MarketingPeriod) =>
  unstable_cache(
    async () => fetchGa4Dashboard(period),
    ["ga4-dashboard", period],
    { revalidate: 300 }
  )();

export async function getMarketingDashboard(
  period: MarketingPeriod = "30"
): Promise<MarketingDashboardData> {
  const auth = await getAuthContext();
  if (!auth) {
    return { configured: false, period };
  }
  if (period === "live") {
    return fetchGa4Dashboard("live");
  }
  return getCachedGa4Dashboard(period);
}
