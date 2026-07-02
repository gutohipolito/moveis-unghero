import { headers } from "next/headers";
import { getSessionSafe } from "@/lib/auth";
import { getInventoryAndSuppliers } from "@/app/actions/estoque";
import EstoqueClient from "./EstoqueClient";

export default async function EstoquePage() {
  const session = await getSessionSafe(await headers()).catch(() => null);
  const companyId = session?.user?.company_id || "mock-company-id";

  const { suppliers, inventory } = await getInventoryAndSuppliers(companyId);

  return (
    <EstoqueClient 
      initialSuppliers={suppliers} 
      initialInventory={inventory} 
      companyId={companyId} 
    />
  );
}
