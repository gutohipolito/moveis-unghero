import { guardModule } from "@/lib/moduleAccess";
import { getMarketingDashboard } from "@/app/actions/marketing";
import PageHeader from "@/components/PageHeader";
import { TooltipBody } from "@/components/ui/InfoTooltip";
import MarketingClient from "../MarketingClient";

export default async function MarketingAnalyticsPage() {
  await guardModule("marketing");
  const data = await getMarketingDashboard("live");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics do Site"
        description="Análise em tempo real e histórico de acessos do site institucional moveisunghero.com.br."
        help={
          <TooltipBody
            title="Acessos do site"
            items={[
              "Mostra visitantes em tempo real e o histórico de acessos do site.",
              "Acompanhe páginas mais visitadas e origem do tráfego.",
              "Use para medir o efeito de campanhas e publicações.",
            ]}
          />
        }
      />

      <MarketingClient initialData={data} />
    </div>
  );
}
