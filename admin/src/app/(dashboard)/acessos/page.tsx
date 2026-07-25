import { guardModule } from "@/lib/moduleAccess";
import { getSessionCompanyId } from "@/lib/session";
import { getAccessCredentials } from "@/app/actions/acessos";
import AcessosClient from "./AcessosClient";

export default async function AcessosPage() {
  await guardModule("acessos");
  const companyId = await getSessionCompanyId();
  const res = await getAccessCredentials(companyId);

  return <AcessosClient initialItems={res.items} companyId={companyId} />;
}
