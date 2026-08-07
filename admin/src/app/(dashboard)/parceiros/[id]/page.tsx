import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionSafe } from "@/lib/auth";
import { guardModule } from "@/lib/moduleAccess";
import { getParceiroById } from "@/app/actions/parceiros";
import ParceiroDetailsClient from "./ParceiroDetailsClient";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export default async function ParceiroDetailsPage({ params }: RouteParams) {
  await guardModule("parceiros");
  const { id } = await params;
  const session = await getSessionSafe(await headers()).catch(() => null);
  const companyId = session?.user?.company_id || "mock-company-id";

  const res = await getParceiroById(id);
  if (!res.success || !res.parceiro) {
    redirect("/parceiros");
  }

  return (
    <ParceiroDetailsClient
      initialParceiro={{
        ...res.parceiro,
        createdAt: new Date(res.parceiro.createdAt),
      }}
      companyId={companyId}
    />
  );
}
