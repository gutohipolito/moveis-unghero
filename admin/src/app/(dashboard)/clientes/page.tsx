import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getClients } from "@/app/actions/cliente";
import { getUserPreferences } from "@/app/actions/preferences";
import ClientesClient from "./ClientesClient";

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100];
const DEFAULT_PAGE_SIZE = 20;

export default async function ClientesPage() {
  const session = await auth.api.getSession({
    headers: await headers()
  }).catch(() => null);

  const companyId = session?.user?.company_id || "mock-company-id";
  const [response, preferences] = await Promise.all([
    getClients(companyId),
    getUserPreferences(),
  ]);
  const clients = response.success ? response.clients : [];

  const storedPageSize = Number(preferences?.clientesPageSize);
  const initialPageSize = PAGE_SIZE_OPTIONS.includes(storedPageSize)
    ? storedPageSize
    : DEFAULT_PAGE_SIZE;

  return (
    <ClientesClient 
      initialClients={clients as any} 
      companyId={companyId} 
      initialPageSize={initialPageSize}
    />
  );
}
