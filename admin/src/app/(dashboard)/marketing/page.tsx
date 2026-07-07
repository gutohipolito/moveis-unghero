import { headers } from "next/headers";
import { getClients } from "@/app/actions/cliente";
import { getMarketingDashboard } from "@/app/actions/marketing";
import PageHeader from "@/components/PageHeader";
import GoogleReviewLinkCard from "@/components/marketing/GoogleReviewLinkCard";
import { auth } from "@/lib/auth";
import type { GoogleReviewClientOption } from "@/lib/google-review";
import MarketingClient from "./MarketingClient";

export default async function MarketingPage() {
  const session = await auth.api
    .getSession({
      headers: await headers(),
    })
    .catch(() => null);

  const companyId = session?.user?.company_id || "mock-company-id";
  const [data, clientsResponse] = await Promise.all([
    getMarketingDashboard("30"),
    getClients(companyId),
  ]);

  const clients: GoogleReviewClientOption[] = clientsResponse.success
    ? clientsResponse.clients.map((client) => ({
        id: client.id,
        nome: client.nome,
        telefone: client.telefone,
      }))
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketing"
        description="Ferramentas de divulgação e tráfego do site institucional."
      />

      <GoogleReviewLinkCard clients={clients} />
      <MarketingClient initialData={data} />
    </div>
  );
}
