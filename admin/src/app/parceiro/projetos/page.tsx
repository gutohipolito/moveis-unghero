import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { parsePartnerSessionToken } from "@/lib/partnerSession";
import { loadPartnerPortalData } from "@/lib/partnerPortal";
import { parsePartnerProjectFilter } from "@/lib/partnerProjectLabels";
import { isPartnerAdminPreview } from "@/app/actions/parceiroPortal";
import ParceiroProjetosClient from "./ParceiroProjetosClient";
import { PUBLIC_PAGE_COPY, publicPageMetadata } from "@/lib/publicPageMetadata";

export const metadata = publicPageMetadata({
  title: `Projetos | ${PUBLIC_PAGE_COPY.portalParceiro.title}`,
  description: "Projetos vinculados ao parceiro na Móveis Unghero.",
});

export default async function ParceiroProjetosPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string; cliente?: string }>;
}) {
  const cookieStore = await cookies();
  const partnerId = parsePartnerSessionToken(cookieStore.get("parceiro-session")?.value);

  if (!partnerId) {
    redirect("/parceiro/login");
  }

  let partner = null;
  try {
    partner = await loadPartnerPortalData(partnerId);
  } catch (error) {
    console.error("Falha ao carregar portal do parceiro (projetos):", error);
  }

  if (!partner) {
    cookieStore.delete("parceiro-session");
    redirect("/parceiro/login");
  }

  const isAdminPreview = await isPartnerAdminPreview();
  const params = await searchParams;
  const initialClientId = params.cliente?.trim() || null;
  // Com cliente selecionado, mostra todos os status daquele cliente por padrão.
  const initialFilter = initialClientId
    ? parsePartnerProjectFilter(params.filtro || "todos")
    : parsePartnerProjectFilter(params.filtro);

  return (
    <ParceiroProjetosClient
      partner={partner}
      isAdminPreview={isAdminPreview}
      initialFilter={initialFilter}
      initialClientId={initialClientId}
    />
  );
}
