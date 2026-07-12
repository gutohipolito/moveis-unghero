import PageHeader from "@/components/PageHeader";
import MarketingFormsPanel from "@/components/marketing/MarketingFormsPanel";
import { guardModule } from "@/lib/moduleAccess";

export default async function MarketingFormulariosPage() {
  await guardModule("marketing");
  return (
    <div className="space-y-6">
      <PageHeader
        title="Formulários"
        description="Links curtos e mensagens prontas para enviar formulários de orçamento e cadastro de parceiros."
      />
      <MarketingFormsPanel />
    </div>
  );
}
