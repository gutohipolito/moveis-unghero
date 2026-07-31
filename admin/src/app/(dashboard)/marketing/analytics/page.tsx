import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-guard";
import { guardModule } from "@/lib/moduleAccess";
import { canViewMarketingAnalytics } from "@/lib/permissions";
import { getMarketingDashboard } from "@/app/actions/marketing";
import PageHeader from "@/components/PageHeader";
import { TooltipBody } from "@/components/ui/InfoTooltip";
import MarketingSectionTabs from "@/components/marketing/MarketingSectionTabs";
import MarketingClient from "../MarketingClient";

export default async function MarketingAnalyticsPage() {
  await guardModule("marketing");
  const auth = await getAuthContext();
  if (!canViewMarketingAnalytics(auth?.cargo)) {
    redirect("/marketing");
  }
  const data = await getMarketingDashboard("live");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketing"
        description="Avaliações, mensagens prontas, formulários e tráfego do site."
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

      <MarketingSectionTabs />
      <MarketingClient initialData={data} />
    </div>
  );
}
