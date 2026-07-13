import { headers } from "next/headers";
import { getSessionSafe } from "@/lib/auth";
import { guardModule } from "@/lib/moduleAccess";
import { getColaboradores } from "@/app/actions/colaboradores";
import ColaboradoresClient from "@/components/ColaboradoresClient";
import PageHeader from "@/components/PageHeader";
import { TooltipBody } from "@/components/ui/InfoTooltip";

export default async function ColaboradoresPage() {
  await guardModule("colaboradores");
  // Obtém a sessão de administrador real ou bypass
  const session = await getSessionSafe(await headers()).catch(() => null);
  const companyId = session?.user?.company_id || "mock-company-id";

  // Busca a lista física no Neon
  const res = await getColaboradores(companyId);

  // Mapeia para o formato serializável exigido no cliente
  const colaboradores = res.success && res.colaboradores ? res.colaboradores.map((c: any) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    cargo: c.cargo,
    createdAt: c.createdAt
  })) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Colaboradores"
        description="Equipe interna com acesso ao painel — comercial, fábrica, financeiro e administradores. Para parceiros externos (arquitetos/projetistas), use Projetistas e Arquitetos."
        help={
          <TooltipBody
            title="Equipe interna"
            items={[
              "Cadastre quem tem acesso ao painel e defina o cargo de cada um.",
              "O cargo determina os módulos visíveis (veja em Permissões de Acesso).",
              "Para arquitetos e projetistas externos, use Projetistas e Arquitetos.",
            ]}
          />
        }
      />

      <ColaboradoresClient
        initialColaboradores={colaboradores} 
        companyId={companyId} 
      />
    </div>
  );
}
