import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { assertCompanyAccess, getAuthContext } from "@/lib/auth-guard";
import {
  PRODUCT_CATALOG_MAX_BYTES,
  PRODUCT_CATALOG_MIME_TYPES,
} from "@/lib/productCatalogs";

function mapCatalog(record: {
  id: string;
  titulo: string;
  descricao: string | null;
  marca: string | null;
  arquivo_url: string;
  arquivo_nome: string;
  mime_type: string;
  size_bytes: number | null;
  capa_url: string | null;
  ordem: number;
  ativo: boolean;
  createdAt: Date;
  uploaded_by: { name: string } | null;
}) {
  return {
    id: record.id,
    titulo: record.titulo,
    descricao: record.descricao,
    marca: record.marca,
    arquivo_url: record.arquivo_url,
    arquivo_nome: record.arquivo_nome,
    mime_type: record.mime_type,
    size_bytes: record.size_bytes,
    capa_url: record.capa_url,
    ordem: record.ordem,
    ativo: record.ativo,
    createdAt: record.createdAt.toISOString(),
    uploaded_by: record.uploaded_by?.name ?? null,
  };
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
  }

  try {
    assertCompanyAccess(auth, auth.companyId);
  } catch {
    return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        success: false,
        error: "Armazenamento não configurado. Adicione BLOB_READ_WRITE_TOKEN na Vercel.",
      },
      { status: 503 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const tituloRaw = formData.get("titulo");
  const descricaoRaw = formData.get("descricao");
  const marcaRaw = formData.get("marca");
  const capa = formData.get("capa");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ success: false, error: "Arquivo do catálogo inválido." }, { status: 400 });
  }

  if (file.size > PRODUCT_CATALOG_MAX_BYTES) {
    return NextResponse.json(
      { success: false, error: "O arquivo excede o limite de 20 MB." },
      { status: 400 }
    );
  }

  const mimeType = file.type || "application/octet-stream";
  if (!PRODUCT_CATALOG_MIME_TYPES.has(mimeType)) {
    return NextResponse.json(
      { success: false, error: "Formato não suportado. Use PDF, JPG, PNG ou WEBP." },
      { status: 400 }
    );
  }

  const titulo =
    typeof tituloRaw === "string" && tituloRaw.trim()
      ? tituloRaw.trim()
      : file.name.replace(/\.[^.]+$/, "").slice(0, 120) || "Catálogo";

  const descricao =
    typeof descricaoRaw === "string" && descricaoRaw.trim() ? descricaoRaw.trim() : null;
  const marca = typeof marcaRaw === "string" && marcaRaw.trim() ? marcaRaw.trim() : null;

  try {
    const safeName = file.name.replace(/[^\w.\-() ]+/g, "_").slice(0, 120);
    const ext = safeName.includes(".") ? safeName.split(".").pop() : mimeType.split("/")[1];
    const pathname = `produtos/catalogos/${auth.companyId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const blob = await put(pathname, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: mimeType,
    });

    let capaUrl: string | null = null;
    if (capa instanceof File && capa.size > 0) {
      const capaMime = capa.type || "application/octet-stream";
      if (
        capa.size <= PRODUCT_CATALOG_MAX_BYTES &&
        ["image/jpeg", "image/png", "image/webp"].includes(capaMime)
      ) {
        const capaSafe = capa.name.replace(/[^\w.\-() ]+/g, "_").slice(0, 80);
        const capaExt = capaSafe.includes(".") ? capaSafe.split(".").pop() : capaMime.split("/")[1];
        const capaPath = `produtos/catalogos/${auth.companyId}/capas/${Date.now()}-${crypto.randomUUID()}.${capaExt}`;
        const capaBlob = await put(capaPath, capa, {
          access: "public",
          token: process.env.BLOB_READ_WRITE_TOKEN,
          contentType: capaMime,
        });
        capaUrl = capaBlob.url;
      }
    } else if (mimeType.startsWith("image/")) {
      capaUrl = blob.url;
    }

    const created = await prisma.productCatalog.create({
      data: {
        company_id: auth.companyId,
        titulo,
        descricao,
        marca,
        arquivo_url: blob.url,
        arquivo_nome: safeName || `catalogo.${ext}`,
        mime_type: mimeType,
        size_bytes: file.size,
        capa_url: capaUrl,
        uploaded_by_id: auth.userId,
      },
      include: { uploaded_by: { select: { name: true } } },
    });

    return NextResponse.json({ success: true, catalog: mapCatalog(created) });
  } catch (error) {
    console.error("Erro ao criar catálogo:", error);
    return NextResponse.json(
      { success: false, error: "Não foi possível salvar o catálogo." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ success: false, error: "ID obrigatório." }, { status: 400 });
  }

  try {
    assertCompanyAccess(auth, auth.companyId);
  } catch {
    return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
  }

  const existing = await prisma.productCatalog.findFirst({
    where: { id, company_id: auth.companyId },
  });
  if (!existing) {
    return NextResponse.json({ success: false, error: "Catálogo não encontrado." }, { status: 404 });
  }

  try {
    await prisma.productCatalog.delete({ where: { id } });

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const urls = [existing.arquivo_url, existing.capa_url].filter(
        (url): url is string =>
          Boolean(url) && Boolean(url?.includes("blob.vercel-storage.com"))
      );
      await Promise.all(
        urls.map((url) =>
          del(url, { token: process.env.BLOB_READ_WRITE_TOKEN }).catch(() => undefined)
        )
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir catálogo:", error);
    return NextResponse.json(
      { success: false, error: "Não foi possível excluir o catálogo." },
      { status: 500 }
    );
  }
}
