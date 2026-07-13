import { headers } from "next/headers";
import { guardModule } from "@/lib/moduleAccess";
import { getClients } from "@/app/actions/cliente";
import PageHeader from "@/components/PageHeader";
import { TooltipBody } from "@/components/ui/InfoTooltip";
import MarketingReviewClients from "./MarketingReviewClients";
import { auth } from "@/lib/auth";
import type { GoogleReviewClientOption } from "@/lib/google-review";

export default async function MarketingPage() {
  await guardModule("marketing");
  const session = await auth.api
    .getSession({
      headers: await headers(),
    })
    .catch(() => null);

  const companyId = session?.user?.company_id || "mock-company-id";
  const clientsResponse = await getClients(companyId);

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
        title="Avaliação Google"
        description="Link curto, QR Code e mensagem no WhatsApp para pedir avaliações após a entrega."
        help={
          <TooltipBody
            title="Peça avaliações"
            items={[
              "Selecione o cliente e gere um link curto ou QR Code para o Google.",
              "Envie a mensagem pronta pelo WhatsApp após a entrega.",
              "Mais avaliações melhoram a reputação e o alcance nas buscas.",
            ]}
          />
        }
      />

      <MarketingReviewClients initialClients={clients} companyId={companyId} />
    </div>
  );
}
