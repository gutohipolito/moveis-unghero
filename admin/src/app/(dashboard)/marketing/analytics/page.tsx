import { getMarketingDashboard } from "@/app/actions/marketing";
import PageHeader from "@/components/PageHeader";
import MarketingClient from "../MarketingClient";

export default async function MarketingAnalyticsPage() {
  const data = await getMarketingDashboard("30");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tráfego GA4"
        description="Sessões, canais e páginas do site institucional via Google Analytics 4."
      />

      <MarketingClient initialData={data} />
    </div>
  );
}
