import { headers } from "next/headers";
import { getSessionSafe } from "@/lib/auth";
import { guardModule } from "@/lib/moduleAccess";
import { getClientDetailsAction } from "@/app/actions/cliente";
import { redirect } from "next/navigation";
import ClienteDetailsClient from "./ClienteDetailsClient";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export default async function ClienteDetailsPage({ params }: RouteParams) {
  await guardModule("clientes");
  const { id } = await params;
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
      companyId={companyId}
    />
  );
}
