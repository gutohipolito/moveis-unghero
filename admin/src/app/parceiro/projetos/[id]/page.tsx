import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { parsePartnerSessionToken } from "@/lib/partnerSession";
import {
  loadPartnerPortalData,
  loadPartnerProjectDetail,
} from "@/lib/partnerPortal";
import { isPartnerAdminPreview } from "@/app/actions/parceiroPortal";
import ParceiroProjetoDetailClient from "./ParceiroProjetoDetailClient";
import { PUBLIC_PAGE_COPY, publicPageMetadata } from "@/lib/publicPageMetadata";

export const metadata = publicPageMetadata({
  title: `Projeto | ${PUBLIC_PAGE_COPY.portalParceiro.title}`,
  description: "Detalhes do projeto no portal do parceiro.",
});

export default async function ParceiroProjetoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const partnerId = parsePartnerSessionToken(cookieStore.get("parceiro-session")?.value);

  if (!partnerId) {
    redirect("/parceiro/login");
  }

  let partner = null;
  let project = null;
  try {
    [partner, project] = await Promise.all([
      loadPartnerPortalData(partnerId),
      loadPartnerProjectDetail(partnerId, id),
    ]);
  } catch (error) {
    console.error("Falha ao carregar detalhe do projeto (parceiro):", error);
  }

  if (!partner) {
    cookieStore.delete("parceiro-session");
    redirect("/parceiro/login");
  }

  if (!project) {
    notFound();
  }

  const isAdminPreview = await isPartnerAdminPreview();

  return (
    <ParceiroProjetoDetailClient
      partner={partner}
      project={project}
      isAdminPreview={isAdminPreview}
    />
  );
}
