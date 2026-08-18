import { guardModule } from "@/lib/moduleAccess";
import { headers } from "next/headers";
import { getSessionSafe } from "@/lib/auth";
import { getCatalogGroups } from "@/app/actions/cadastros";
import PageHeader from "@/components/PageHeader";
import { TooltipBody } from "@/components/ui/InfoTooltip";
import CadastrosClient from "./CadastrosClient";

interface CadastrosPageProps {
  searchParams: Promise<{ grupo?: string }>;
}

export default async function CadastrosPage({ searchParams }: CadastrosPageProps) {
  await guardModule("cadastros");
  const session = await getSessionSafe(await headers()).catch(() => null);
  const companyId = session?.user?.company_id || "mock-company-id";
  const params = await searchParams;

  const res = await getCatalogGroups(companyId);
  const groups = res.groups ?? [];

  return (
    <>
      <PageHeader
        title="Configurações"
        description="Empresa, equipe, permissões e listas configuráveis do sistema."
        help={
          <TooltipBody
            title="Listas do sistema"
            items={[
              "Configure as listas reutilizadas em outras telas (veículos, categorias, etc.).",
              "Mantenha os valores padronizados para evitar duplicidade.",
              "Para arquitetos e projetistas externos, use Projetistas e Arquitetos.",
            ]}
          />
        }
      />

      <CadastrosClient
        initialGroups={groups}
        companyId={companyId}
        initialGroupSlug={params.grupo}
      />
    </>
  );
}
