import { headers } from "next/headers";
import { guardModule } from "@/lib/moduleAccess";
import { getClientsForWhatsAppMessaging } from "@/app/actions/cliente";
import { listEmailMailboxesForUser } from "@/app/actions/emailMailboxes";
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
  const [clientsResponse, mailboxesResponse] = await Promise.all([
    getClientsForWhatsAppMessaging(companyId),
    listEmailMailboxesForUser().catch(() => ({
      success: false as const,
      data: [] as Awaited<ReturnType<typeof listEmailMailboxesForUser>>["data"],
    })),
  ]);

  const clients: GoogleReviewClientOption[] = clientsResponse.success
    ? clientsResponse.clients.map((client) => ({
        id: client.id,
        nome: client.nome,
        telefone: client.telefone,
        email: client.email,
      }))
    : [];

  const mailboxes = mailboxesResponse.success ? mailboxesResponse.data : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketing"
        description="Mensagens prontas para WhatsApp e e-mail — medição, conferência técnica e pós-entrega."
        help={
          <TooltipBody
            title="Mensagens prontas"
            items={[
              "Abra um modelo, copie ou envie no WhatsApp ou por e-mail.",
              "Selecione o cliente para personalizar e preencher telefone/e-mail.",
              "Avaliação Google: e-mail com assunto chamativo e layout HTML.",
            ]}
          />
        }
      />
      <MarketingSectionTabs />
      <MarketingMessagesPanel clients={clients} mailboxes={mailboxes} />
    </div>
  );
}
