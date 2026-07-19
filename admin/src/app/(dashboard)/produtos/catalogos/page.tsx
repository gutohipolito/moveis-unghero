import { guardModule } from "@/lib/moduleAccess";
import { headers } from "next/headers";
import { getSessionSafe } from "@/lib/auth";
import { listProductCatalogs } from "@/app/actions/productCatalogs";
import CatalogosClient from "../CatalogosClient";

export default async function ProdutosCatalogosPage() {
  await guardModule("produtos");
  const session = await getSessionSafe(await headers()).catch(() => null);
  const companyId = session?.user?.company_id || "mock-company-id";

  const catalogsRes = await listProductCatalogs(companyId);

  return (
    <CatalogosClient
      companyId={companyId}
      initialCatalogs={catalogsRes.catalogs}
    />
  );
}
