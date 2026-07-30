import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { PRODUCT_CATALOG_MAX_BYTES } from "@/lib/productCatalogs";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        // Valida se o usuário está autenticado
        const auth = await getAuthContext();
        if (!auth) {
          throw new Error("Não autenticado");
        }

        return {
          allowedContentTypes: [
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/webp",
          ],
          maximumSizeInBytes: PRODUCT_CATALOG_MAX_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            userId: auth.userId,
            companyId: auth.companyId,
          }),
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("Erro ao autorizar upload de catálogo:", error);
    return NextResponse.json(
      {
        error:
          "Não foi possível iniciar o envio. Entre em contato com o Administrador do Sistema.",
      },
      { status: 400 }
    );
  }
}
