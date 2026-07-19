import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";

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
          tokenPayload: JSON.stringify({
            userId: auth.userId,
            companyId: auth.companyId,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }: { blob: any; tokenPayload?: string | null }) => {
        // Opcional: callback pós-upload no servidor
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
