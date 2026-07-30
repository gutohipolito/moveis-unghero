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
          tokenPayload: JSON.stringify({
            userId: auth.userId,
            companyId: auth.companyId,
          }),
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro no upload" },
      { status: 400 }
    );
  }
}
