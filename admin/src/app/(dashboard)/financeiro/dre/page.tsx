import { guardModule } from "@/lib/moduleAccess";
import { getDreData, type DreData } from "@/app/actions/dre";
import PrivacyToggle from "@/components/PrivacyToggle";
import PageHeader from "@/components/PageHeader";
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
      >
        <PrivacyToggle />
      </PageHeader>

      <FinanceSectionTabs />

      <DreClient data={data} />
    </div>
  );
}
