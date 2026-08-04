"use client";

import { useState } from "react";
import {
  BookOpen,
  Building2,
  Check,
  Copy,
  Download,
  Eye,
  MessageCircle,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import type { PartnerPortalCatalog } from "@/lib/partnerPortal";
import { buildPartnerPortalCatalogWhatsAppMessage } from "@/lib/catalogShareMessage";

type Props = {
  catalog: PartnerPortalCatalog | null;
  onClose: () => void;
};

const actionBtnClass =
  "flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3.5 py-2.5 text-left cursor-pointer transition-[filter,box-shadow,background] duration-[var(--motion-fast)] ease-[var(--ease-out)]";

export default function ParceiroCatalogActionsModal({ catalog, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  if (!catalog) return null;

  const brandName = catalog.supplierNome || catalog.marca;
  const brandLogo = catalog.supplierLogoUrl;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(catalog.publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const openWhatsApp = () => {
    const text = buildPartnerPortalCatalogWhatsAppMessage({
      catalogTitle: catalog.titulo,
      catalogUrl: catalog.publicUrl,
      brandName: brandName,
    });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  const openView = () => {
    window.open(catalog.publicUrl, "_blank", "noopener,noreferrer");
  };

  const downloadWatermarked = () => {
    window.open(catalog.downloadPath, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog
      isOpen={Boolean(catalog)}
      onClose={onClose}
      className="max-w-4xl w-full"
      bodyClassName="max-h-[min(92svh,880px)] overflow-y-auto"
    >
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-5 sm:gap-6 items-stretch pr-1">
        <div className="rounded-[var(--radius-md)] overflow-hidden border border-slate-200 bg-slate-50 aspect-[3/4] sm:min-h-[280px] sm:max-h-[420px] relative flex items-center justify-center">
          {catalog.capa_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={catalog.capa_url}
              alt={catalog.titulo}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <BookOpen className="h-14 w-14 text-slate-300" />
          )}
        </div>

        <div className="flex flex-col min-h-0 justify-center gap-4">
          <div className="flex flex-col items-center text-center gap-1 px-1">
            {brandLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brandLogo}
                alt={brandName || "Fornecedor"}
                className="h-9 sm:h-10 w-auto max-w-[120px] object-contain"
              />
            ) : brandName ? (
              <Building2 className="h-7 w-7 text-slate-300" />
            ) : null}
            {brandName ? (
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {brandName}
              </p>
            ) : null}
            <h3 className="text-sm sm:text-base font-black tracking-tight text-slate-800 leading-snug">
              {catalog.titulo}
            </h3>
            <p className="text-[11px] text-muted-foreground leading-snug break-all px-1">
              {catalog.publicUrl}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={openWhatsApp}
              className={`${actionBtnClass} btn-whatsapp-relief`}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-[calc(var(--radius-sm)-2px)] bg-black/10 shrink-0">
                <MessageCircle className="h-4 w-4" strokeWidth={2.2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold leading-tight">WhatsApp</span>
                <span className="block text-[11px] font-medium opacity-80 mt-0.5 leading-snug">
                  Mensagem pronta com o link público
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => void copyLink()}
              className={`${actionBtnClass} btn-mail-relief`}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-[calc(var(--radius-sm)-2px)] bg-black/10 shrink-0">
                {copied ? (
                  <Check className="h-4 w-4" strokeWidth={2.2} />
                ) : (
                  <Copy className="h-4 w-4" strokeWidth={2.2} />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold leading-tight">
                  {copied ? "Link copiado" : "Copiar link"}
                </span>
                <span className="block text-[11px] font-medium opacity-80 mt-0.5 leading-snug">
                  Link em moveisunghero.com.br
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={downloadWatermarked}
              className={`${actionBtnClass} btn-download-relief`}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-[calc(var(--radius-sm)-2px)] bg-black/10 shrink-0">
                <Download className="h-4 w-4" strokeWidth={2.2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold leading-tight">Download</span>
                <span className="block text-[11px] font-medium opacity-80 mt-0.5 leading-snug">
                  Baixar o arquivo do catálogo
                </span>
              </span>
            </button>

            <div className="mt-1 pt-2.5 border-t border-slate-200/80">
              <button
                type="button"
                onClick={openView}
                className={`${actionBtnClass} btn-metallic`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-[calc(var(--radius-sm)-2px)] bg-black/10 shrink-0">
                  <Eye className="h-4 w-4" strokeWidth={2.2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold leading-tight">Visualizar</span>
                  <span className="block text-[11px] font-medium opacity-80 mt-0.5 leading-snug">
                    Abrir o link público do catálogo
                  </span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
