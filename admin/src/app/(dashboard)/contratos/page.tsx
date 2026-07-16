import { guardModule } from "@/lib/moduleAccess";
import { headers } from "next/headers";
import { getSessionSafe } from "@/lib/auth";
import { getContracts, getContractTemplates } from "@/app/actions/contracts";
import ContratosClient from "./ContratosClient";

export default async function ContratosPage() {
  await guardModule("contratos");
  const session = await getSessionSafe(await headers()).catch(() => null);
  const companyId = session?.user?.company_id || "mock-company-id";

  const [contractsRes, templatesRes] = await Promise.all([
    getContracts(companyId),
    getContractTemplates(companyId),
  ]);

  return (
    <ContratosClient
      companyId={companyId}
      initialContracts={contractsRes.contracts}
      initialTemplates={templatesRes.templates}
    />
  );
}
