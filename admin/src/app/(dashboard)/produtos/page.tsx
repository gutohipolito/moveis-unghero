import { guardModule } from "@/lib/moduleAccess";
import { headers } from "next/headers";
import { getSessionSafe } from "@/lib/auth";
import { listShowcaseProducts } from "@/app/actions/produtos";
import { getInventoryAndSuppliers } from "@/app/actions/estoque";
import ProdutosClient from "./ProdutosClient";

export default async function ProdutosPage() {
  await guardModule("produtos");
  const session = await getSessionSafe(await headers()).catch(() => null);
  const companyId = session?.user?.company_id || "mock-company-id";

  const [productsRes, inventoryRes] = await Promise.all([
    listShowcaseProducts(companyId),
    getInventoryAndSuppliers(companyId),
  ]);

  return (
    <ProdutosClient
      companyId={companyId}
      initialProducts={productsRes.products}
      inventoryOptions={(inventoryRes.inventory || []).map((item) => ({
        id: item.id,
        nome: item.nome,
        categoria: item.categoria,
        precoCusto: item.precoCusto,
      }))}
      suppliers={(inventoryRes.suppliers || []).map((s) => ({
        id: s.id,
        nome: s.nome,
        nomeFantasia: s.nomeFantasia ?? null,
        logoUrl: s.logoUrl ?? null,
      }))}
    />
  );
}
