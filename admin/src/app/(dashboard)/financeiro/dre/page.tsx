import { guardModule } from "@/lib/moduleAccess";
import { getDreData, type DreData } from "@/app/actions/dre";
import PrivacyToggle from "@/components/PrivacyToggle";
import PageHeader from "@/components/PageHeader";
import { TooltipBody } from "@/components/ui/InfoTooltip";
import FinanceSectionTabs from "@/components/finance/FinanceSectionTabs";
import DreClient from "./DreClient";

export default async function DrePage() {
  await guardModule("financeiro");

  let data: DreData = { months: [], categoriesByMonth: {} };
  try {
    const res = await getDreData(12);
    if (res.success) data = res.data;
  } catch (error) {
    console.warn("Falha ao carregar DRE.", error);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro"
        description="DRE (Demonstração do Resultado) por mês — regime de caixa."
        help={
          <TooltipBody
            title="DRE — regime de caixa"
            items={[
              "Cruza o que foi efetivamente recebido com o que foi efetivamente pago no mês.",
              "Receita − custos variáveis = margem de contribuição; menos custos fixos = resultado.",
              "Por ser caixa, considera a data de pagamento, não a de emissão.",
              "Inclui detalhamento por categoria e visão dos últimos 12 meses.",
            ]}
          />
        }
      >
        <PrivacyToggle />
      </PageHeader>

      <FinanceSectionTabs />

      <DreClient data={data} />
    </div>
  );
}
