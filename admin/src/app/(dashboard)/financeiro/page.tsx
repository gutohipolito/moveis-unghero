import { prisma } from "@/lib/prisma";
import { getSessionCompanyId } from "@/lib/session";
import FinanceiroClient from "./FinanceiroClient";
import PrivacyToggle from "@/components/PrivacyToggle";
import PageHeader from "@/components/PageHeader";

export default async function FinanceiroPage() {
  const userCompanyId = await getSessionCompanyId();

  let installments: any[] = [];
  try {
    installments = await prisma.installment.findMany({
      where: {
        project: { client: { company_id: userCompanyId } },
      },
      include: {
        project: { include: { client: true } },
      },
      orderBy: { data_vencimento: "asc" },
    });
  } catch (error) {
    console.warn("Falha de conexão com banco de dados no financeiro geral.", error);
  }

  const formattedInsts = installments.map((ins) => ({
    id: ins.id,
    valor: Number(ins.valor),
    data_vencimento: ins.data_vencimento.toISOString(),
    data_pagamento: ins.data_pagamento ? ins.data_pagamento.toISOString() : null,
    status: ins.status,
    tipo: ins.tipo,
    metodo_pagamento: ins.metodo_pagamento,
    numero_parcela: ins.numero_parcela,
    total_parcelas: ins.total_parcelas,
    projectId: ins.project.id,
    clientName: ins.project.client.nome,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro"
        description="Faturamento, entradas, saldo devedor e parcelas de todos os projetos."
      >
        <PrivacyToggle />
      </PageHeader>

      <FinanceiroClient initialInstallments={formattedInsts} companyId={userCompanyId} />
    </div>
  );
}
