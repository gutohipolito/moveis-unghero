import { guardModule } from "@/lib/moduleAccess";
import { getProjectProfitability, type ProfitabilityData } from "@/app/actions/profitability";
import PrivacyToggle from "@/components/PrivacyToggle";
import PageHeader from "@/components/PageHeader";
import FinanceSectionTabs from "@/components/finance/FinanceSectionTabs";
import RentabilidadeClient from "./RentabilidadeClient";

export default async function RentabilidadePage() {
  await guardModule("financeiro");

  let data: ProfitabilityData = {
    rows: [],
    totalReceita: 0,
    totalCusto: 0,
    totalMargem: 0,
    totalRecebido: 0,
  };
  try {
    const res = await getProjectProfitability();
    if (res.success) data = res.data;
  } catch (error) {
    console.warn("Falha ao carregar rentabilidade.", error);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro"
        description="Rentabilidade por obra — receita do contrato menos os custos vinculados."
      >
        <PrivacyToggle />
      </PageHeader>

      <FinanceSectionTabs />

      <RentabilidadeClient data={data} />
    </div>
  );
}
