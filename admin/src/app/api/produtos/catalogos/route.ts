import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { assertCompanyAccess, getAuthContext } from "@/lib/auth-guard";
import {
  formatCatalogSize,
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
  supplier_id?: string | null;
  supplier?: {
    nome: string;
    nomeFantasia: string | null;
    crmUploads: unknown;
  } | null;
}) {
  const logo =
    Array.isArray(record.supplier?.crmUploads)
      ? (
          record.supplier.crmUploads.find(
            (e): e is { tipo?: string; url?: string } =>
              !!e &&
              typeof e === "object" &&
              (e as { tipo?: string }).tipo === "Logo" &&
              typeof (e as { url?: string }).url === "string"
          ) as { url?: string } | undefined
        )?.url ?? null
      : null;
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
    supplier_id: record.supplier_id ?? null,
    supplierNome: record.supplier?.nomeFantasia || record.supplier?.nome || null,
    supplierLogoUrl: logo,
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

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ success: false, error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const {
    titulo,
    descricao,
    marca,
    arquivoUrl,
    arquivoNome,
    mimeType,
    sizeBytes,
    capaUrl,
    supplierId,
  } = body;

  if (!arquivoUrl || typeof arquivoUrl !== "string") {
    return NextResponse.json({ success: false, error: "Arquivo do catálogo inválido ou URL ausente." }, { status: 400 });
  }

  if (sizeBytes && sizeBytes > PRODUCT_CATALOG_MAX_BYTES) {
    return NextResponse.json(
      {
        success: false,
        error: `O arquivo excede o limite de ${formatCatalogSize(PRODUCT_CATALOG_MAX_BYTES)}.`,
      },
      { status: 400 }
    );
  }

  const finalMimeType = mimeType || "application/octet-stream";
  if (!PRODUCT_CATALOG_MIME_TYPES.has(finalMimeType)) {
    return NextResponse.json(
      { success: false, error: "Formato não suportado. Use PDF, JPG, PNG ou WEBP." },
      { status: 400 }
    );
  }

  const finalTitulo =
    typeof titulo === "string" && titulo.trim()
      ? titulo.trim()
      : (arquivoNome || "Catálogo").replace(/\.[^.]+$/, "").slice(0, 120);

  const finalDescricao =
    typeof descricao === "string" && descricao.trim() ? descricao.trim() : null;
  const finalMarca = typeof marca === "string" && marca.trim() ? marca.trim() : null;
  const finalSupplierId =
    typeof supplierId === "string" && supplierId.trim() ? supplierId.trim() : null;

  if (finalSupplierId) {
    const supplier = await prisma.supplier.findFirst({
      where: { id: finalSupplierId, company_id: auth.companyId },
      select: { id: true },
    });
    if (!supplier) {
      return NextResponse.json({ success: false, error: "Fornecedor inválido." }, { status: 400 });
    }
  }

  try {
    const created = await prisma.productCatalog.create({
      data: {
        company_id: auth.companyId,
        supplier_id: finalSupplierId,
        titulo: finalTitulo,
        descricao: finalDescricao,
        marca: finalMarca,
        arquivo_url: arquivoUrl,
        arquivo_nome: arquivoNome || "catalogo",
        mime_type: finalMimeType,
        size_bytes: sizeBytes || null,
        capa_url: capaUrl || null,
        uploaded_by_id: auth.userId,
      },
      include: {
        uploaded_by: { select: { name: true } },
        supplier: { select: { nome: true, nomeFantasia: true, crmUploads: true } },
      },
    });

    return NextResponse.json({ success: true, catalog: mapCatalog(created) });
  } catch (error) {
    console.error("Erro ao criar catálogo no banco:", error);
    return NextResponse.json(
      { success: false, error: "Não foi possível salvar o catálogo no banco." },
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
