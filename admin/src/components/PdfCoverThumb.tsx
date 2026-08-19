"use client";

import { useEffect, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { generateCapaFromPdfUrl } from "@/lib/pdfCover";
import { cn } from "@/lib/utils";

const objectUrlByPdf = new Map<string, string>();

export default function PdfCoverThumb({
  url,
  alt = "Capa do PDF",
  className,
}: {
  url: string;
  alt?: string;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(() => objectUrlByPdf.get(url) ?? null);
  const [loading, setLoading] = useState(!objectUrlByPdf.has(url));

  useEffect(() => {
    const existing = objectUrlByPdf.get(url);
    if (existing) {
      setSrc(existing);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setSrc(null);
    setLoading(true);

    void generateCapaFromPdfUrl(url).then((blob) => {
      if (cancelled) return;
      if (!blob) {
        setLoading(false);
        return;
      }
      const objectUrl = URL.createObjectURL(blob);
      objectUrlByPdf.set(url, objectUrl);
      setSrc(objectUrl);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={cn("object-cover", className)} />
    );
  }

  return (
    <span
      className={cn(
        "flex items-center justify-center bg-slate-100 text-muted-foreground",
        className
      )}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <FileText className="h-5 w-5" />
      )}
    </span>
  );
}
