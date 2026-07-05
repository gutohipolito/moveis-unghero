import { headers } from "next/headers";
import { getSessionSafe } from "@/lib/auth";
import { getCatalogGroups } from "@/app/actions/cadastros";
import PageHeader from "@/components/PageHeader";
import CadastrosClient from "./CadastrosClient";

interface CadastrosPageProps {
  searchParams: Promise<{ grupo?: string }>;
}

export default async function CadastrosPage({ searchParams }: CadastrosPageProps) {
  const session = await getSessionSafe(await headers()).catch(() => null);
  const companyId = session?.user?.company_id || "mock-company-id";
  const params = await searchParams;

  const res = await getCatalogGroups(companyId);
  const groups = res.groups ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cadastros"
        description="Central de listas e categorias usadas em Logística, Estoque, Projetos e outras telas. Aqui você cadastra veículos, categorias de insumos e consulta onde cada lista é aplicada."
      />

      <CadastrosClient
        initialGroups={groups}
        companyId={companyId}
        initialGroupSlug={params.grupo}
      />
    </div>
  );
}
