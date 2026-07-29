import PageHeader from "@/components/PageHeader";
import { TooltipBody } from "@/components/ui/InfoTooltip";
import MarketingFormsPanel from "@/components/marketing/MarketingFormsPanel";
import MarketingSectionTabs from "@/components/marketing/MarketingSectionTabs";
import { guardModule } from "@/lib/moduleAccess";

export default async function MarketingFormulariosPage() {
  await guardModule("marketing");
  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketing"
        description="Avaliações, mensagens prontas, formulários e tráfego do site."
        help={
          <TooltipBody
            title="Captação de leads"
            items={[
              "Compartilhe links curtos dos formulários de orçamento, parceiros e fornecedores.",
              "Copie mensagens prontas para enviar pelo WhatsApp.",
              "As respostas caem automaticamente no funil comercial ou no estoque.",
            ]}
          />
        }
      />
      <MarketingSectionTabs />
      <MarketingFormsPanel />
    </div>
  );
}
