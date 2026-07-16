import { notFound, redirect } from "next/navigation";
import { getCachedSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import ContractPrintDocument from "@/components/ContractPrintDocument";
import ContractPrintToolbar from "@/components/ContractPrintToolbar";

interface PrintPageProps {
  params: Promise<{ id: string }>;
}

export default async function ContractPrintPage({ params }: PrintPageProps) {
  const session = await getCachedSession();
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;
  const companyId = session.user.company_id || "mock-company-id";

  const contract = await prisma.contract.findFirst({
    where: { id, company_id: companyId },
  });

  if (!contract) notFound();

  return (
    <ContractPrintDocument
      contract={{
        titulo: contract.titulo,
        cliente_nome: contract.cliente_nome,
        cliente_documento: contract.cliente_documento,
        cliente_endereco: contract.cliente_endereco,
        servicos: contract.servicos,
        valor: Number(contract.valor),
        entrada_pct: contract.entrada_pct,
        clausula_local: contract.clausula_local,
        clausula_pagamento: contract.clausula_pagamento,
        clausula_prazo: contract.clausula_prazo,
        clausula_extra: contract.clausula_extra,
        data_entrega: contract.data_entrega,
        data_contrato: contract.data_contrato,
        cidade_emissao: contract.cidade_emissao,
      }}
      topBar={<ContractPrintToolbar />}
    />
  );
}
