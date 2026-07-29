"use client";

import { useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { FileText, Loader2 } from "lucide-react";
import { updateProductCatalog, type ProductCatalogDTO } from "@/app/actions/productCatalogs";
import { generateCapaFromPdfUrl } from "@/lib/pdfCover";

interface CatalogCoverThumbProps {
  catalog: ProductCatalogDTO;
  companyId: string;
  onCapaSaved?: (catalogId: string, capaUrl: string) => void;
  className?: string;
}

/** Mostra capa; se PDF sem capa (já no Blob), renderiza a 1ª página e persiste. */
export default function CatalogCoverThumb({
  catalog,
  companyId,
  onCapaSaved,
  className = "",
}: CatalogCoverThumbProps) {
  const isPdf = catalog.mime_type === "application/pdf";
  const staticThumb = catalog.capa_url || (!isPdf ? catalog.arquivo_url : null);
  const canRenderClient =
    isPdf &&
    !staticThumb &&
    Boolean(catalog.arquivo_url?.includes("blob.vercel-storage.com"));

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const objectUrlRef = useRef<string | null>(null);
  const savingRef = useRef(false);
  const lastUrlRef = useRef(catalog.arquivo_url);

  useEffect(() => {
    if (lastUrlRef.current !== catalog.arquivo_url) {
      lastUrlRef.current = catalog.arquivo_url;
      setFailed(false);
      setPreviewUrl(null);
    }
  }, [catalog.arquivo_url]);

  useEffect(() => {
    if (staticThumb || !canRenderClient || failed) return;

    let cancelled = false;
    setLoading(true);

    void (async () => {
      const blob = await generateCapaFromPdfUrl(catalog.arquivo_url);
      if (cancelled) return;

      if (!blob) {
        setFailed(true);
        setLoading(false);
        return;
      }

      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const objectUrl = URL.createObjectURL(blob);
      objectUrlRef.current = objectUrl;
      setPreviewUrl(objectUrl);
      setLoading(false);

      if (savingRef.current) return;
      savingRef.current = true;
      try {
        const file = new File([blob], `capa-${catalog.id}.png`, { type: "image/png" });
        const capaBlob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/produtos/catalogos/upload",
        });
        const res = await updateProductCatalog(companyId, catalog.id, {
          capa_url: capaBlob.url,
        });
        if (res.success && capaBlob.url) {
          onCapaSaved?.(catalog.id, capaBlob.url);
        }
      } catch (err) {
        console.error("Falha ao persistir capa do catálogo:", err);
      } finally {
        savingRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    staticThumb,
    canRenderClient,
    failed,
    catalog.arquivo_url,
    catalog.id,
    companyId,
    onCapaSaved,
  ]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  const src = staticThumb || previewUrl;

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className={`absolute inset-0 w-full h-full object-cover ${className}`}
      />
    );
  }

  return (
    <span className="absolute inset-0 bg-slate-900 flex items-center justify-center">
      {loading ? (
        <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
      ) : (
        <FileText className="h-10 w-10 text-rose-400" />
      )}
    </span>
  );
}
