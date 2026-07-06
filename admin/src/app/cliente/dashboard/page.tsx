import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ClienteDashboardClient from "./ClienteDashboardClient";
import {
  getDevMockClientPortal,
  loadClientPortalData,
} from "@/lib/clientPortal";
import { allowDevMocks, shouldUseOfflineMocks } from "@/lib/devMocks";

export default async function ClienteDashboardPage() {
  const cookieStore = await cookies();
  const clientId = cookieStore.get("cliente-session")?.value;

  if (!clientId) {
    redirect("/cliente/login");
  }

  let client = null;
  let isMock = false;

  if (shouldUseOfflineMocks()) {
    client = getDevMockClientPortal(clientId);
    isMock = !!client;
  } else {
    try {
      client = await loadClientPortalData(clientId);
    } catch (error) {
      console.error("Falha ao carregar portal do cliente:", error);
      if (allowDevMocks()) {
        client = getDevMockClientPortal(clientId);
        isMock = !!client;
      }
    }
  }

  if (!client) {
    cookieStore.delete("cliente-session");
    redirect("/cliente/login");
  }

  return <ClienteDashboardClient client={client} isMock={isMock} />;
}
