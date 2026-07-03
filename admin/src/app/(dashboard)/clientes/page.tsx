import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getClients } from "@/app/actions/cliente";
import ClientesClient from "./ClientesClient";

export default async function ClientesPage() {
  const session = await auth.api.getSession({
    headers: await headers()
  }).catch(() => null);

  const companyId = session?.user?.company_id || "mock-company-id";
  const response = await getClients(companyId);
  const clients = response.success ? response.clients : [];

  return (
    <ClientesClient 
      initialClients={clients as any} 
      companyId={companyId} 
    />
  );
}
