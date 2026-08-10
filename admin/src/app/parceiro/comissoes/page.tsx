import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { parsePartnerSessionToken } from "@/lib/partnerSession";
import {
  loadPartnerCommissions,
  loadPartnerPortalData,
} from "@/lib/partnerPortal";
import { isPartnerAdminPreview } from "@/app/actions/parceiroPortal";
import ParceiroComissoesClient from "./ParceiroComissoesClient";
import { PUBLIC_PAGE_COPY, publicPageMetadata } from "@/lib/publicPageMetadata";

export const metadata = publicPageMetadata({
  title: `Comissões | ${PUBLIC_PAGE_COPY.portalParceiro.title}`,
  description: "Acompanhe suas comissões e comprovantes na Móveis Unghero.",
});

export default async function ParceiroComissoesPage() {
  const cookieStore = await cookies();
  const partnerId = parsePartnerSessionToken(cookieStore.get("parceiro-session")?.value);

  if (!partnerId) {
    redirect("/parceiro/login");
  }

  let partner = null;
  try {
    partner = await loadPartnerPortalData(partnerId);
  } catch (error) {
    console.error("Falha ao carregar portal do parceiro (comissões):", error);
  }

  if (!partner) {
    cookieStore.delete("parceiro-session");
    redirect("/parceiro/login");
  }

  const bundle = await loadPartnerCommissions(partner.id);
  const isAdminPreview = await isPartnerAdminPreview();

  if (!partner.hasCommissions) {
    redirect("/parceiro/painel");
  }

  return (
    <ParceiroComissoesClient
      partner={partner}
      commissions={bundle.commissions}
      pendente={bundle.pendente}
      pago={bundle.pago}
      isAdminPreview={isAdminPreview}
    />
  );
}
