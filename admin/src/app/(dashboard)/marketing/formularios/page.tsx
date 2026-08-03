import { redirect } from "next/navigation";
import { headers } from "next/headers";
import PageHeader from "@/components/PageHeader";
import { TooltipBody } from "@/components/ui/InfoTooltip";
import MarketingFormsPanel from "@/components/marketing/MarketingFormsPanel";
import MarketingSectionTabs from "@/components/marketing/MarketingSectionTabs";
import { guardModule } from "@/lib/moduleAccess";
import { auth } from "@/lib/auth";
import { canViewFullMarketing } from "@/lib/permissions";
import { getClientsForWhatsAppMessaging } from "@/app/actions/cliente";
import { listEmailMailboxesForUser } from "@/app/actions/emailMailboxes";
import type { GoogleReviewClientOption } from "@/lib/google-review";

export default async function MarketingFormulariosPage() {
  await guardModule("marketing");
  const session = await auth.api
    .getSession({
      headers: await headers(),
    })
    .catch(() => null);
  const cargo = (session?.user as { cargo?: string } | undefined)?.cargo;
  if (!canViewFullMarketing(cargo)) {
    redirect("/marketing/mensagens");
  }

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
        description="Avaliações, mensagens prontas, formulários e tráfego do site."
        help={
          <TooltipBody
            title="Captação de leads"
            items={[
              "Compartilhe links curtos dos formulários de orçamento, parceiros e fornecedores.",
              "Copie mensagens prontas ou envie pelo WhatsApp e e-mail.",
              "As respostas caem automaticamente no funil comercial ou no estoque.",
            ]}
          />
        }
      />
      <MarketingSectionTabs />
      <MarketingFormsPanel clients={clients} mailboxes={mailboxes} />
    </div>
  );
}
