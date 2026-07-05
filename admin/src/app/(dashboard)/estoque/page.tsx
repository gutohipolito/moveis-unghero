import { headers } from "next/headers";
import { getSessionSafe } from "@/lib/auth";
import { getInventoryAndSuppliers } from "@/app/actions/estoque";
import { getCatalogItemsBySlug } from "@/app/actions/cadastros";
import EstoqueClient from "./EstoqueClient";

export default async function EstoquePage() {
  const session = await getSessionSafe(await headers()).catch(() => null);
  const companyId = session?.user?.company_id || "mock-company-id";

  const [{ suppliers, inventory }, categoriasRes] = await Promise.all([
    getInventoryAndSuppliers(companyId),
    getCatalogItemsBySlug(companyId, "categorias_estoque"),
  ]);

  const categoryOptions = categoriasRes.items.map((item) => ({
    value: item.slug || item.label,
    label: item.label,
  }));

  return (
    <EstoqueClient 
      initialSuppliers={suppliers} 
      initialInventory={inventory} 
      companyId={companyId}
      categoryOptions={categoryOptions}
    />
  );
}
