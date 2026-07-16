import { guardModule } from "@/lib/moduleAccess";
import { headers } from "next/headers";
import { getSessionSafe } from "@/lib/auth";
import NovoFornecedorClient from "./NovoFornecedorClient";

export default async function NovoFornecedorPage() {
  await guardModule("estoque");
  const session = await getSessionSafe(await headers()).catch(() => null);
  const companyId = session?.user?.company_id || "mock-company-id";

  return <NovoFornecedorClient companyId={companyId} />;
}
