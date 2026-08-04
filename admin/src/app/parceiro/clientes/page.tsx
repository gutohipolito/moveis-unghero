import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { parsePartnerSessionToken } from "@/lib/partnerSession";
import {
  loadPartnerPortalClients,
  loadPartnerPortalData,
} from "@/lib/partnerPortal";
import { isPartnerAdminPreview } from "@/app/actions/parceiroPortal";
import ParceiroClientesClient from "./ParceiroClientesClient";
import { PUBLIC_PAGE_COPY, publicPageMetadata } from "@/lib/publicPageMetadata";

export const metadata = publicPageMetadata({
  title: `Clientes | ${PUBLIC_PAGE_COPY.portalParceiro.title}`,
  description: "Clientes vinculados ao parceiro na Móveis Unghero.",
});

export default async function ParceiroClientesPage() {
  const cookieStore = await cookies();
  const partnerId = parsePartnerSessionToken(cookieStore.get("parceiro-session")?.value);

  if (!partnerId) {
    redirect("/parceiro/login");
  }

  let partner = null;
  try {
    partner = await loadPartnerPortalData(partnerId);
  } catch (error) {
    console.error("Falha ao carregar portal do parceiro (clientes):", error);
  }

  if (!partner) {
    cookieStore.delete("parceiro-session");
    redirect("/parceiro/login");
  }

  const clients = await loadPartnerPortalClients(partner.id);
  const isAdminPreview = await isPartnerAdminPreview();

  return (
    <ParceiroClientesClient
      partner={partner}
      clients={clients}
      isAdminPreview={isAdminPreview}
    />
  );
}
