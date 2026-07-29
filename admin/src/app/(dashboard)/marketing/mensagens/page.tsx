import { headers } from "next/headers";
import { guardModule } from "@/lib/moduleAccess";
import { getClients } from "@/app/actions/cliente";
import PageHeader from "@/components/PageHeader";
import { TooltipBody } from "@/components/ui/InfoTooltip";
import MarketingSectionTabs from "@/components/marketing/MarketingSectionTabs";
import MarketingMessagesPanel from "@/components/marketing/MarketingMessagesPanel";
import { auth } from "@/lib/auth";
import type { GoogleReviewClientOption } from "@/lib/google-review";

export default async function MarketingMensagensPage() {
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
        title="Marketing"
        description="Avaliações, mensagens prontas, formulários e tráfego do site."
        help={
          <TooltipBody
            title="Mensagens prontas"
            items={[
              "Abra um modelo, copie ou envie direto no WhatsApp.",
              "Opcional: selecione o cliente para personalizar o cumprimento.",
              "Ao mover um card para Conf. Técnica no CRM, o mesmo texto de agendamento é oferecido automaticamente.",
            ]}
          />
        }
      />
      <MarketingSectionTabs />
      <MarketingMessagesPanel clients={clients} />
    </div>
  );
}
