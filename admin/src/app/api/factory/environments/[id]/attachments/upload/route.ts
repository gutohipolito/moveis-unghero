import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getAuthContext, requireEnvironmentInCompany } from "@/lib/auth-guard";
import {
  ENVIRONMENT_ATTACHMENT_MAX_BYTES,
  canManageEnvironmentAttachments,
  isAllowedEnvironmentAttachment,
} from "@/lib/factoryEnvironment";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: environmentId } = await context.params;
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const auth = await getAuthContext();
        if (!auth) {
          throw new Error("Sua sessão expirou. Entre de novo no painel e tente enviar o arquivo.");
        }
        if (!canManageEnvironmentAttachments(auth.cargo)) {
          throw new Error("Este cargo não pode enviar arquivos nesta pasta. Peça para o projetista ou a diretoria.");
        }
        await requireEnvironmentInCompany(environmentId, auth.companyId);

        let originalName = "";
        try {
          const payload = clientPayload ? (JSON.parse(clientPayload) as { originalName?: string }) : {};
          originalName = payload.originalName || "";
        } catch {
          originalName = "";
        }
        if (!isAllowedEnvironmentAttachment({ name: originalName || _pathname, type: "" })) {
          throw new Error(
            `"${originalName || "Este arquivo"}" não é um formato aceito. Envie imagem, PDF, DWG, SketchUp (.skp) ou ZIP.`
          );
        }

        return {
          maximumSizeInBytes: ENVIRONMENT_ATTACHMENT_MAX_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            userId: auth.userId,
            companyId: auth.companyId,
            environmentId,
          }),
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível iniciar o envio do arquivo.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
