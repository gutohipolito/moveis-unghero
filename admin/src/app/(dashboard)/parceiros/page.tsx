import { headers } from "next/headers";
import { getSessionSafe } from "@/lib/auth";
import { getParceiros } from "@/app/actions/parceiros";
import ParceirosClient from "./ParceirosClient";

export default async function ParceirosPage() {
  const session = await getSessionSafe(await headers()).catch(() => null);
  const companyId = session?.user?.company_id || "mock-company-id";

  const res = await getParceiros(companyId);
  const parceiros = res.parceiros.map((p) => ({
    ...p,
    createdAt: new Date(p.createdAt),
  }));

  return (
    <ParceirosClient initialParceiros={parceiros} companyId={companyId} />
  );
}
