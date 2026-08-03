"use client";

import {
  Download,
  Eye,
  Mail,
  MessageCircle,
  Building2,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ProductCatalogDTO } from "@/app/actions/productCatalogs";
import CatalogCoverThumb from "@/components/produtos/CatalogCoverThumb";

type Props = {
  catalog: ProductCatalogDTO | null;
  companyId: string;
  onClose: () => void;
  onCapaSaved?: (catalogId: string, capaUrl: string) => void;
  onWhatsApp: () => void;
  onEmail: () => void;
  onView: () => void;
  onDownload: () => void;
};

const actionBtnClass =
  "w-full text-left font-bold justify-start gap-3 h-auto min-h-0 md:h-auto md:min-h-0 py-3.5 px-4";

export default function CatalogActionsModal({
  catalog,
  companyId,
  onClose,
  onCapaSaved,
  onWhatsApp,
  onEmail,
  onView,
  onDownload,
}: Props) {
  if (!catalog) return null;

  const partnerName = catalog.supplierNome || catalog.marca;
  const partnerLogo = catalog.supplierLogoUrl;

  const shareActions = [
    {
      key: "whatsapp",
      label: "WhatsApp",
      hint: "Mensagem pronta para o cliente",
      icon: MessageCircle,
      onClick: onWhatsApp,
      tone: "btn-whatsapp-relief",
    },
    {
      key: "email",
      label: "E-mail",
      hint: "Abrir rascunho no sistema",
      icon: Mail,
      onClick: onEmail,
      tone: "btn-mail-relief",
    },
    {
      key: "download",
      label: "Download",
      hint: "Baixar o arquivo original",
      icon: Download,
      onClick: onDownload,
      tone: "btn-download-relief",
    },
  ] as const;

  return (
    <Dialog
      isOpen={Boolean(catalog)}
      onClose={onClose}
      className="max-w-3xl w-full"
      bodyClassName="max-h-[min(92svh,880px)] overflow-y-auto"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 items-stretch pr-1">
        <div className="rounded-[var(--radius-md)] overflow-hidden border border-slate-200 bg-slate-50 aspect-[3/4] sm:min-h-[300px] relative">
          <CatalogCoverThumb
            catalog={catalog}
            companyId={companyId}
            onCapaSaved={onCapaSaved}
            className="absolute inset-0 !rounded-none"
          />
        </div>

        <div className="flex flex-col min-h-0 sm:py-1">
          <div className="flex flex-col items-center text-center gap-1.5 px-2 pb-4">
            {partnerLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={partnerLogo}
                alt={partnerName || "Parceiro"}
                className="h-16 sm:h-20 w-auto max-w-[180px] object-contain"
              />
            ) : partnerName ? (
              <Building2 className="h-10 w-10 text-slate-300" />
            ) : null}
            {partnerName ? (
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {partnerName}
              </p>
            ) : null}
            <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-800 leading-snug">
              {catalog.titulo}
            </h3>
            <p className="text-[11px] text-muted-foreground leading-snug max-w-[16rem]">
              Escolha como compartilhar ou abrir este catálogo.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 mt-auto">
            {shareActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.key}
                  type="button"
                  onClick={action.onClick}
                  className={`${actionBtnClass} ${action.tone}`}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-black/10 shrink-0">
                    <Icon className="h-4.5 w-4.5" strokeWidth={2.2} />
                  </span>
                  <span className="min-w-0 flex-1 text-left py-0.5">
                    <span className="block text-sm font-bold leading-tight">{action.label}</span>
                    <span className="block text-[11px] font-medium opacity-80 mt-0.5 leading-snug">
                      {action.hint}
                    </span>
                  </span>
                </Button>
              );
            })}

            <div className="mt-1.5 pt-3 border-t border-slate-200/80">
              <Button
                type="button"
                onClick={onView}
                className={`${actionBtnClass} btn-metallic`}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-black/10 shrink-0">
                  <Eye className="h-4.5 w-4.5" strokeWidth={2.2} />
                </span>
                <span className="min-w-0 flex-1 text-left py-0.5">
                  <span className="block text-sm font-bold leading-tight">Visualizar</span>
                  <span className="block text-[11px] font-medium opacity-80 mt-0.5 leading-snug">
                    Abrir o link público do catálogo
                  </span>
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
