import { guardModule } from "@/lib/moduleAccess";
import { headers } from "next/headers";
import { getSessionSafe } from "@/lib/auth";
import { listProductCatalogs } from "@/app/actions/productCatalogs";
import { getInventoryAndSuppliers } from "@/app/actions/estoque";
import { getClientsForCatalogShare } from "@/app/actions/cliente";
import { listEmailMailboxesForUser } from "@/app/actions/emailMailboxes";
import CatalogosClient from "../CatalogosClient";

export default async function ProdutosCatalogosPage() {
  await guardModule("produtos");
  const session = await getSessionSafe(await headers()).catch(() => null);
  const companyId = session?.user?.company_id || "mock-company-id";

  const [catalogsRes, inventoryRes, clientsRes, mailboxesRes] = await Promise.all([
    listProductCatalogs(companyId),
    getInventoryAndSuppliers(companyId),
    getClientsForCatalogShare(companyId),
    listEmailMailboxesForUser().catch(() => ({
      success: false as const,
      error: "unavailable",
      data: [],
    })),
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
      shareClients={clientsRes.success ? clientsRes.clients : []}
      mailboxes={mailboxesRes.success ? mailboxesRes.data : []}
    />
  );
}
