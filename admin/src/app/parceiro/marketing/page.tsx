import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { parsePartnerSessionToken } from "@/lib/partnerSession";
import { loadPartnerPortalData } from "@/lib/partnerPortal";
import {
  buildPartnerInviteUrl,
  ensurePartnerInviteCode,
} from "@/lib/partnerInvite";
import { isPartnerAdminPreview } from "@/app/actions/parceiroPortal";
import ParceiroMarketingClient from "./ParceiroMarketingClient";
import { PUBLIC_PAGE_COPY, publicPageMetadata } from "@/lib/publicPageMetadata";

export const metadata = publicPageMetadata({
  title: `Marketing | ${PUBLIC_PAGE_COPY.portalParceiro.title}`,
  description: "Convide clientes frios para o cadastro Móveis Unghero.",
});

export default async function ParceiroMarketingPage() {
  const cookieStore = await cookies();
  const partnerId = parsePartnerSessionToken(cookieStore.get("parceiro-session")?.value);

  if (!partnerId) {
    redirect("/parceiro/login");
  }

  let partner = null;
  try {
    partner = await loadPartnerPortalData(partnerId);
  } catch (error) {
    console.error("Falha ao carregar portal do parceiro (marketing):", error);
  }

  if (!partner) {
    cookieStore.delete("parceiro-session");
    redirect("/parceiro/login");
  }

  const inviteCode = await ensurePartnerInviteCode(partner.id);
  if (!inviteCode) {
    redirect("/parceiro/painel");
  }

  const inviteUrl = buildPartnerInviteUrl(inviteCode);
  const isAdminPreview = await isPartnerAdminPreview();

  return (
    <ParceiroMarketingClient
      partner={partner}
      inviteUrl={inviteUrl}
      isAdminPreview={isAdminPreview}
    />
  );
}
