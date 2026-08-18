import { headers } from "next/headers";
import { getSessionSafe } from "@/lib/auth";
import { guardModule } from "@/lib/moduleAccess";
import { getClientDetailsAction } from "@/app/actions/cliente";
import { redirect } from "next/navigation";
import ClienteDetailsClient from "./ClienteDetailsClient";
import { parseClientDetailsTab } from "@/lib/clientDetailsTabs";

interface RouteParams {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function ClienteDetailsPage({ params, searchParams }: RouteParams) {
  await guardModule("clientes");
  const { id } = await params;
  const { tab } = await searchParams;
  const session = await getSessionSafe(await headers()).catch(() => null);
  const companyId = session?.user?.company_id || "mock-company-id";

  const res = await getClientDetailsAction(id);
  if (!res.success || !res.client) {
    redirect("/clientes");
  }

  return (
    <ClienteDetailsClient
      initialClient={res.client}
      initialActivities={res.activities}
      initialPayments={res.payments}
      initialAttachments={res.attachments ?? []}
      initialAttachmentFolders={res.attachmentFolders ?? ["Residência", "Documentos"]}
      companyId={companyId}
      initialTab={parseClientDetailsTab(tab)}
    />
  );
}
