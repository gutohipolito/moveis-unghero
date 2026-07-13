import { prisma } from "@/lib/prisma";
import { getSessionCompanyId } from "@/lib/session";
import { guardModule } from "@/lib/moduleAccess";
import { listExpenses } from "@/app/actions/expenses";
import PrivacyToggle from "@/components/PrivacyToggle";
import PageHeader from "@/components/PageHeader";
import FinanceSectionTabs from "@/components/finance/FinanceSectionTabs";
import ContasPagarClient from "./ContasPagarClient";
import type { ExpenseDTO } from "@/lib/expenses";

export default async function ContasPagarPage() {
  await guardModule("financeiro");
  const companyId = await getSessionCompanyId();

  let expenses: ExpenseDTO[] = [];
  let suppliers: { id: string; nome: string }[] = [];
  let projects: { id: string; label: string }[] = [];

  try {
    const [expRes, sup, proj] = await Promise.all([
      listExpenses(),
      prisma.supplier.findMany({
        where: { company_id: companyId, ativo: true },
        select: { id: true, nome: true },
        orderBy: { nome: "asc" },
      }),
      prisma.project.findMany({
        where: { client: { company_id: companyId } },
        select: { id: true, client: { select: { nome: true } } },
        orderBy: { createdAt: "desc" },
        take: 300,
      }),
    ]);
    if (expRes.success) expenses = expRes.expenses;
    suppliers = sup;
    projects = proj.map((p) => ({ id: p.id, label: p.client.nome }));
  } catch (error) {
    console.warn("Falha ao carregar contas a pagar.", error);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro"
        description="Contas a pagar, despesas fixas e variáveis com vencimentos."
      >
        <PrivacyToggle />
      </PageHeader>

      <FinanceSectionTabs />

      <ContasPagarClient
        initialExpenses={expenses}
        suppliers={suppliers}
        projects={projects}
      />
    </div>
  );
}
