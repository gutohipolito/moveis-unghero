import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ClienteDashboardClient from "./ClienteDashboardClient";
import { loadClientPortalData } from "@/lib/clientPortal";

export default async function ClienteDashboardPage() {
  const cookieStore = await cookies();
  const clientId = cookieStore.get("cliente-session")?.value;

  if (!clientId) {
    redirect("/cliente/login");
  }

  let client = null;
  try {
    client = await loadClientPortalData(clientId);
  } catch (error) {
    console.error("Falha ao carregar portal do cliente:", error);
  }

  if (!client) {
    cookieStore.delete("cliente-session");
    redirect("/cliente/login");
  }

  return <ClienteDashboardClient client={client} isMock={false} />;
}
