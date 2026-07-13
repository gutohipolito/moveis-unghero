import PageHeader from "@/components/PageHeader";
import { TooltipBody } from "@/components/ui/InfoTooltip";
import MarketingFormsPanel from "@/components/marketing/MarketingFormsPanel";
import { guardModule } from "@/lib/moduleAccess";

export default async function MarketingFormulariosPage() {
  await guardModule("marketing");
  return (
    <div className="space-y-6">
      <PageHeader
        title="Formulários"
        description="Links curtos e mensagens prontas para enviar formulários de orçamento, cadastro de clientes e de parceiros."
        help={
          <TooltipBody
            title="Captação de leads"
            items={[
              "Compartilhe links curtos dos formulários de orçamento e de parceiros.",
              "Copie mensagens prontas para enviar pelo WhatsApp.",
              "As respostas caem automaticamente no funil comercial.",
            ]}
          />
        }
      />
      <MarketingFormsPanel />
    </div>
  );
}
