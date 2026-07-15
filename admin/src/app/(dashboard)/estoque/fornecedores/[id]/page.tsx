import React from "react";
import { headers } from "next/headers";
import { guardModule } from "@/lib/moduleAccess";
import { getSessionSafe } from "@/lib/auth";
import { getSupplierByIdAction } from "@/app/actions/fornecedores";
import SupplierCrmClient from "./SupplierCrmClient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SupplierDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function SupplierDetailPage({ params }: SupplierDetailPageProps) {
  await guardModule("estoque"); // Proteção de acesso baseada no módulo "estoque"
  
  const { id } = await params;
  const session = await getSessionSafe(await headers()).catch(() => null);
  const companyId = session?.user?.company_id || "mock-company-id";

  const res = await getSupplierByIdAction(id, companyId);

  if (!res.success || !res.supplier) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <p className="text-sm font-bold text-destructive">Erro: {res.error || "Fornecedor não encontrado."}</p>
        <Link href="/estoque">
          <Button className="btn-metallic gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Estoque
          </Button>
        </Link>
      </div>
    );
  }

  // Serialização simples dos campos de data e decimal do Prisma para o Client Component
  const serializedSupplier = {
    ...res.supplier,
    createdAt: res.supplier.createdAt.toISOString(),
    updatedAt: res.supplier.updatedAt.toISOString(),
    crmUltimaCompra: res.supplier.crmUltimaCompra?.toISOString() || null,
    crmUltimoOrcamento: res.supplier.crmUltimoOrcamento?.toISOString() || null,
    crmUltimoContato: res.supplier.crmUltimoContato?.toISOString() || null,
    crmValorTotalComprado: res.supplier.crmValorTotalComprado 
      ? Number(res.supplier.crmValorTotalComprado) 
      : null,
  };

  return (
    <SupplierCrmClient 
      supplier={serializedSupplier as any} 
      companyId={companyId} 
      currentUser={session?.user} 
    />
  );
}
