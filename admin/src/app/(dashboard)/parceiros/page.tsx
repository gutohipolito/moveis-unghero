import { headers } from "next/headers";
import { getSessionSafe } from "@/lib/auth";
import { getParceiros } from "@/app/actions/parceiros";
import PageHeader from "@/components/PageHeader";
import ParceirosClient from "./ParceirosClient";

export default async function ParceirosPage() {
  const session = await getSessionSafe(await headers()).catch(() => null);
  const companyId = session?.user?.company_id || "mock-company-id";

  const res = await getParceiros(companyId);
  const parceiros = res.parceiros.map((p) => ({
    ...p,
    createdAt: new Date(p.createdAt),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projetistas e Arquitetos"
        description="Cadastre parceiros profissionais — arquitetos, projetistas, decoradores e engenheiros — que indicam clientes ou co-projetam com a marcenaria."
      />

      <ParceirosClient initialParceiros={parceiros} companyId={companyId} />
    </div>
  );
}
