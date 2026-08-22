import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { isValidCatalogShareCode } from "@/lib/catalogShare";
import { publicPageMetadata } from "@/lib/publicPageMetadata";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ code: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code: rawCode } = await params;
  const code = rawCode.trim().toLowerCase();
  if (!isValidCatalogShareCode(code)) {
    return publicPageMetadata({
      title: "Catálogo | Móveis Unghero",
      description: "Catálogo de produtos da Móveis Unghero.",
    });
  }
  const catalog = await prisma.productCatalog.findFirst({
    where: { share_code: code, ativo: true },
    select: { titulo: true },
  });
  return publicPageMetadata({
    title: catalog?.titulo
      ? `${catalog.titulo} | Catálogo Móveis Unghero`
      : "Catálogo | Móveis Unghero",
    description: "Confira o catálogo de produtos da Móveis Unghero.",
  });
}

/**
 * Visualizador público do catálogo — abre o PDF/arquivo completo
 * (não a capa). HostGator redireciona para cá.
 */
export default async function CatalogPublicPage({ params }: PageProps) {
  const { code: rawCode } = await params;
  const code = rawCode.trim().toLowerCase();

  if (!isValidCatalogShareCode(code)) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-slate-950 text-slate-200 p-6">
        <p className="text-sm font-medium">Catálogo não encontrado.</p>
      </main>
    );
  }

  const catalog = await prisma.productCatalog.findFirst({
    where: { share_code: code, ativo: true },
    select: { arquivo_url: true, mime_type: true, titulo: true },
  });

  if (!catalog?.arquivo_url) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-slate-950 text-slate-200 p-6">
        <p className="text-sm font-medium">Catálogo não encontrado.</p>
      </main>
    );
  }

  const isPdf =
    catalog.mime_type === "application/pdf" ||
    /\.pdf(\?|$)/i.test(catalog.arquivo_url);
  const isImage =
    Boolean(catalog.mime_type?.startsWith("image/")) ||
    /\.(jpe?g|png|webp|gif)(\?|$)/i.test(catalog.arquivo_url);

  return (
    <main className="min-h-dvh bg-slate-950 text-slate-100 flex flex-col">
      <header className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 bg-slate-950/90 backdrop-blur-sm">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400/90">
            Catálogo
          </p>
          <h1 className="text-sm font-bold truncate">{catalog.titulo}</h1>
        </div>
        <a
          href={catalog.arquivo_url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center justify-center h-9 px-3 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400"
        >
          Abrir arquivo
        </a>
      </header>

      <div className="flex-1 min-h-0 relative bg-slate-900">
        {isPdf ? (
          <iframe
            title={catalog.titulo}
            src={`${catalog.arquivo_url}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
            className="absolute inset-0 w-full h-full border-0 bg-slate-900"
          />
        ) : isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={catalog.arquivo_url}
            alt={catalog.titulo}
            className="absolute inset-0 m-auto max-w-full max-h-full object-contain p-4"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-slate-300">
              Este arquivo precisa ser aberto no navegador ou app externo.
            </p>
            <a
              href={catalog.arquivo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 px-4 items-center rounded-lg bg-amber-500 text-slate-950 text-sm font-bold"
            >
              Baixar / abrir
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
