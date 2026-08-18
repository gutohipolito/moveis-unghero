import { prisma } from "@/lib/prisma";
import { getSessionCompanyId } from "@/lib/session";
import { guardModule } from "@/lib/moduleAccess";
import { getAuthContext } from "@/lib/auth-guard";
import FinanceiroClient from "./FinanceiroClient";
import PageHeader from "@/components/PageHeader";
import { TooltipBody } from "@/components/ui/InfoTooltip";
import { maybeRedactForViewer } from "@/lib/viewerRedact";

export default async function FinanceiroPage() {
  await guardModule("financeiro");
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

  const auth = await getAuthContext();
  const safeInstallments = maybeRedactForViewer(formattedInsts, auth?.cargo);

  return (
    <>
      <PageHeader
        title="Financeiro"
        description="Faturamento, entradas, saldo devedor e parcelas de todos os projetos."
        help={
          <TooltipBody
            title="Contas a Receber"
            items={[
              "Mostra as parcelas geradas a partir dos orçamentos aprovados.",
              "Acompanhe o que já foi recebido, o que está em aberto e o que está vencido.",
              "Marque parcelas como pagas para alimentar o DRE e o caixa.",
              "Use as abas para navegar entre Receber, Pagar, DRE e Rentabilidade.",
            ]}
          />
        } />

      <FinanceiroClient initialInstallments={safeInstallments} companyId={userCompanyId} />
    </>
  );
}
