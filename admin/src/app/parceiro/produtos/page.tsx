import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { parsePartnerSessionToken } from "@/lib/partnerSession";
import {
  loadPartnerPortalData,
  loadPartnerPortalProducts,
} from "@/lib/partnerPortal";
import { isPartnerAdminPreview } from "@/app/actions/parceiroPortal";
import ParceiroProdutosClient from "./ParceiroProdutosClient";
import { PUBLIC_PAGE_COPY, publicPageMetadata } from "@/lib/publicPageMetadata";

export const metadata = publicPageMetadata({
  title: `Produtos | ${PUBLIC_PAGE_COPY.portalParceiro.title}`,
  description: "Catálogo de produtos da Móveis Unghero para parceiros.",
});

export default async function ParceiroProdutosPage() {
  const cookieStore = await cookies();
  const partnerId = parsePartnerSessionToken(cookieStore.get("parceiro-session")?.value);

  if (!partnerId) {
    redirect("/parceiro/login");
  }

  let partner = null;
  try {
    partner = await loadPartnerPortalData(partnerId);
  } catch (error) {
    console.error("Falha ao carregar portal do parceiro (produtos):", error);
  }

  if (!partner) {
    cookieStore.delete("parceiro-session");
    redirect("/parceiro/login");
  }

  const products = await loadPartnerPortalProducts(partner.company_id);
  const isAdminPreview = await isPartnerAdminPreview();

  return (
    <ParceiroProdutosClient
      partner={partner}
      products={products}
      isAdminPreview={isAdminPreview}
    />
  );
}
