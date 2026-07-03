import { headers } from "next/headers";
import { getSessionSafe } from "@/lib/auth";
import { getColaboradores } from "@/app/actions/colaboradores";
import ColaboradoresClient from "@/components/ColaboradoresClient";

export default async function ColaboradoresPage() {
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gradient-gold">
          Colaboradores & Equipe
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Gerencie a equipe de fábrica, comerciais e administradores da sua marcenaria.
        </p>
      </div>

      <ColaboradoresClient 
        initialColaboradores={colaboradores} 
        companyId={companyId} 
      />
    </div>
  );
}
