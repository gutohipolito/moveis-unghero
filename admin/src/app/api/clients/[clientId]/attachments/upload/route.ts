import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { requireClientInCompany } from "@/lib/auth-guard";
import { requireWriteAccess } from "@/lib/moduleAccess";
import { canManageOperationalMedia } from "@/lib/permissions";
import {
  CLIENT_ATTACHMENT_MAX_BYTES,
  isAllowedClientAttachment,
} from "@/lib/clientAttachments";

export async function POST(
  request: Request,
  context: { params: Promise<{ clientId: string }> }
): Promise<NextResponse> {
  const { clientId } = await context.params;
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        let auth;
        try {
          auth = await requireWriteAccess("clientes");
        } catch {
          throw new Error("Sua sessão expirou. Entre de novo no painel e tente enviar o arquivo.");
        }
        if (!canManageOperationalMedia(auth.cargo)) {
          throw new Error("Este cargo pode apenas visualizar os arquivos do cliente.");
        }
        await requireClientInCompany(clientId, auth.companyId);

        let originalName = "";
        try {
          const payload = clientPayload ? (JSON.parse(clientPayload) as { originalName?: string }) : {};
          originalName = payload.originalName || "";
        } catch {
          originalName = "";
        }
        if (!isAllowedClientAttachment({ name: originalName || _pathname, type: "" })) {
          throw new Error(
            `"${originalName || "Este arquivo"}" não é um formato aceito. Envie imagem, PDF, Office, ZIP, DWG, SketchUp ou vídeo curto.`
          );
        }

        return {
          maximumSizeInBytes: CLIENT_ATTACHMENT_MAX_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            userId: auth.userId,
            companyId: auth.companyId,
            clientId,
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
