import { guardModule } from "@/lib/moduleAccess";
import { getMarketingDashboard } from "@/app/actions/marketing";
import PageHeader from "@/components/PageHeader";
import MarketingClient from "../MarketingClient";

export default async function MarketingAnalyticsPage() {
  await guardModule("marketing");
  const data = await getMarketingDashboard("live");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics do Site"
        description="Análise em tempo real e histórico de acessos do site institucional moveisunghero.com.br."
      />

      <MarketingClient initialData={data} />
    </div>
  );
}
