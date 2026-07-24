import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ContractPrintDocument from "@/components/ContractPrintDocument";
import ContractPublicPrintBar from "@/components/ContractPublicPrintBar";
import { PUBLIC_PAGE_COPY, publicPageMetadata } from "@/lib/publicPageMetadata";

export const dynamic = "force-dynamic";

type PublicContractPageProps = {
  params: Promise<{ code: string }>;
};

async function loadByCode(code: string) {
  const normalized = code.trim().toLowerCase();
  if (!/^[a-z0-9]{6,12}$/.test(normalized)) return null;

  return prisma.contract.findFirst({
    where: { share_code: normalized },
  });
}

export async function generateMetadata({
  params,
}: PublicContractPageProps): Promise<Metadata> {
  const { code } = await params;
  const contract = await loadByCode(code);
  const copy = PUBLIC_PAGE_COPY.contract;

  return publicPageMetadata({
    title: copy.title(contract?.cliente_nome ?? "Cliente"),
    description: copy.description,
  });
}

export default async function PublicContractPage({ params }: PublicContractPageProps) {
  const { code } = await params;
  const contract = await loadByCode(code);

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
      topBar={<ContractPublicPrintBar />}
    />
  );
}
