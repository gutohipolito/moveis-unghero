import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { guardModule } from "@/lib/moduleAccess";
import { getClientsPage } from "@/app/actions/cliente";
import { getUserPreferences } from "@/app/actions/preferences";
import ClientesClient from "./ClientesClient";

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100];
const DEFAULT_PAGE_SIZE = 20;

export default async function ClientesPage() {
  await guardModule("clientes");
  const session = await auth.api.getSession({
    headers: await headers()
  }).catch(() => null);

  const companyId = session?.user?.company_id || "mock-company-id";
  const preferences = await getUserPreferences();
  const storedPageSize = Number(preferences?.clientesPageSize);
  const initialPageSize = PAGE_SIZE_OPTIONS.includes(storedPageSize)
    ? storedPageSize
    : DEFAULT_PAGE_SIZE;

  const response = await getClientsPage({
    companyId,
    page: 1,
    pageSize: initialPageSize,
  });
  const clients = response.success ? response.clients : [];
  const total = response.success ? response.total : 0;
  const facets = response.success ? response.facets : {
    tipoCounts: { todos: 0, PF: 0, PJ: 0 },
    newClientsCount: 0,
    cidades: [] as string[],
    bairros: [] as string[],
  };

  return (
    <ClientesClient
      initialClients={clients as any}
      initialTotal={total}
      initialFacets={facets}
      companyId={companyId}
      initialPageSize={initialPageSize}
    />
  );
}
