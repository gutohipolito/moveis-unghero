import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { assertCompanyAccess, getAuthContext } from "@/lib/auth-guard";
import { getWriteAccess } from "@/lib/moduleAccess";

export const maxDuration = 300;

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * Rehospeda PDF externo (ex.: Zen com Content-Disposition: attachment)
 * no Vercel Blob com application/pdf, para o iframe abrir corretamente.
 */
export async function POST(request: NextRequest) {
  const auth = await getWriteAccess("produtos");
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
      { success: false, error: "BLOB_READ_WRITE_TOKEN não configurado." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : null;
  if (!id) {
    return NextResponse.json({ success: false, error: "ID obrigatório." }, { status: 400 });
  }

  const existing = await prisma.productCatalog.findFirst({
    where: { id, company_id: auth.companyId },
  });
  if (!existing) {
    return NextResponse.json({ success: false, error: "Catálogo não encontrado." }, { status: 404 });
  }

  if (existing.arquivo_url.includes("blob.vercel-storage.com")) {
    return NextResponse.json({
      success: true,
      alreadyHosted: true,
      arquivo_url: existing.arquivo_url,
    });
  }

  if (existing.mime_type !== "application/pdf" && !/\.pdf(\?|$)/i.test(existing.arquivo_url)) {
    return NextResponse.json(
      { success: false, error: "Somente PDFs externos podem ser rehospedados." },
      { status: 400 }
    );
  }

  const res = await fetch(existing.arquivo_url, {
    headers: { "User-Agent": UA, Accept: "application/pdf,*/*" },
    redirect: "follow",
  });
  if (!res.ok) {
    return NextResponse.json(
      { success: false, error: `Falha ao baixar o PDF (HTTP ${res.status}).` },
      { status: 502 }
    );
  }

  const buf = Buffer.from(await res.arrayBuffer());
  const safeName = (existing.arquivo_nome || "catalogo.pdf")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-");

  const blob = await put(`catalogos/rehost/${auth.companyId}/${safeName}`, buf, {
    access: "public",
    contentType: "application/pdf",
    token: process.env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: true,
  });

  const updated = await prisma.productCatalog.update({
    where: { id },
    data: {
      arquivo_url: blob.url,
      mime_type: "application/pdf",
      size_bytes: buf.length,
      arquivo_nome: safeName.endsWith(".pdf") ? safeName : `${safeName}.pdf`,
    },
    include: {
      uploaded_by: { select: { name: true } },
      supplier: { select: { nome: true, nomeFantasia: true, crmUploads: true } },
    },
  });

  return NextResponse.json({
    success: true,
    arquivo_url: blob.url,
    catalog: {
      id: updated.id,
      titulo: updated.titulo,
      descricao: updated.descricao,
      marca: updated.marca,
      arquivo_url: updated.arquivo_url,
      arquivo_nome: updated.arquivo_nome,
      mime_type: updated.mime_type,
      size_bytes: updated.size_bytes,
      capa_url: updated.capa_url,
      ordem: updated.ordem,
      ativo: updated.ativo,
      createdAt: updated.createdAt.toISOString(),
      uploaded_by: updated.uploaded_by?.name ?? null,
      supplier_id: updated.supplier_id,
      supplierNome: updated.supplier?.nomeFantasia || updated.supplier?.nome || null,
      supplierLogoUrl: null,
    },
  });
}
