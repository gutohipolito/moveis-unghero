import { guardModule } from "@/lib/moduleAccess";
import { headers } from "next/headers";
import { getSessionSafe } from "@/lib/auth";
import { listProductCatalogs } from "@/app/actions/productCatalogs";
import { getInventoryAndSuppliers } from "@/app/actions/estoque";
import CatalogosClient from "../CatalogosClient";

export default async function ProdutosCatalogosPage() {
  await guardModule("produtos");
  const session = await getSessionSafe(await headers()).catch(() => null);
  const companyId = session?.user?.company_id || "mock-company-id";

  const [catalogsRes, inventoryRes] = await Promise.all([
    listProductCatalogs(companyId),
    getInventoryAndSuppliers(companyId),
  ]);

  return (
    <CatalogosClient
      companyId={companyId}
      initialCatalogs={catalogsRes.catalogs}
      suppliers={(inventoryRes.suppliers || []).map((s) => ({
        id: s.id,
        nome: s.nome,
        nomeFantasia: s.nomeFantasia ?? null,
        logoUrl: s.logoUrl ?? null,
      }))}
    />
  );
}
