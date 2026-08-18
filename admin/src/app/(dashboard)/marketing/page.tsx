import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { guardModule } from "@/lib/moduleAccess";
import { getClientsForWhatsAppMessaging } from "@/app/actions/cliente";
import { listEmailMailboxesForUser } from "@/app/actions/emailMailboxes";
import PageHeader from "@/components/PageHeader";
import { TooltipBody } from "@/components/ui/InfoTooltip";
import MarketingReviewClients from "./MarketingReviewClients";
import { auth } from "@/lib/auth";
import { canViewFullMarketing } from "@/lib/permissions";
import type { GoogleReviewClientOption } from "@/lib/google-review";

export default async function MarketingPage() {
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
        email: client.email || "",
      }))
    : [];

  const mailboxes = mailboxesResponse.success ? mailboxesResponse.data : [];

  return (
    <>
      <PageHeader
        title="Marketing"
        description="Avaliações, mensagens prontas, formulários e tráfego do site."
        help={
          <TooltipBody
            title="Peça avaliações"
            items={[
              "Selecione o cliente e gere um link curto ou QR Code para o Google.",
              "Envie pelo WhatsApp ou por e-mail (layout especial) após a entrega.",
              "Mais avaliações melhoram a reputação e o alcance nas buscas.",
            ]}
          />
        }
      />

      <MarketingReviewClients
        initialClients={clients}
        companyId={companyId}
        mailboxes={mailboxes}
      />
    </>
  );
}
