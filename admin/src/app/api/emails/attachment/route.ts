import { NextRequest, NextResponse } from "next/server";
import { loadAccessibleMailboxSecrets } from "@/app/actions/emailMailboxes";
import { fetchInboxAttachment } from "@/lib/emailImap";

export const maxDuration = 60;

function contentDisposition(filename: string) {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_") || "anexo";
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const mailboxId = searchParams.get("mailboxId") || "";
  const uid = Number(searchParams.get("uid"));
  const index = Number(searchParams.get("index"));

  if (!mailboxId || !Number.isFinite(uid) || !Number.isFinite(index) || index < 0) {
    return NextResponse.json({ success: false, error: "Parâmetros inválidos." }, { status: 400 });
  }

  const loaded = await loadAccessibleMailboxSecrets(mailboxId);
  if (!loaded) {
    return NextResponse.json({ success: false, error: "Caixa indisponível." }, { status: 403 });
  }

  try {
    const att = await fetchInboxAttachment(
      {
        host: loaded.mailbox.imap_host,
        port: loaded.mailbox.imap_port,
        user: loaded.mailbox.address,
        pass: loaded.password,
      },
      uid,
      index
    );
    if (!att) {
      return NextResponse.json({ success: false, error: "Anexo não encontrado." }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(att.content), {
      status: 200,
      headers: {
        "Content-Type": att.contentType,
        "Content-Disposition": contentDisposition(att.filename),
        "Content-Length": String(att.content.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/emails/attachment:", error);
    return NextResponse.json(
      { success: false, error: "Não foi possível baixar o anexo." },
      { status: 500 }
    );
  }
}
