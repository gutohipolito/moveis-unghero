"use client";

import {
  Download,
  Eye,
  Mail,
  MessageCircle,
  BookOpen,
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
      className: "btn-whatsapp-relief font-bold justify-start gap-3 h-auto py-3 px-3.5",
    },
    {
      key: "email",
      label: "E-mail",
      hint: "Abrir rascunho no sistema",
      icon: Mail,
      onClick: onEmail,
      className: "btn-mail-relief font-bold justify-start gap-3 h-auto py-3 px-3.5",
    },
    {
      key: "download",
      label: "Download",
      hint: "Baixar o arquivo original",
      icon: Download,
      onClick: onDownload,
      className: "btn-download-relief font-bold justify-start gap-3 h-auto py-3 px-3.5",
    },
  ] as const;

  return (
    <Dialog
      isOpen={Boolean(catalog)}
      onClose={onClose}
      className="max-w-3xl w-full"
      bodyClassName="max-h-[min(92svh,880px)] overflow-y-auto"
    >
      <div className="space-y-3 pr-1">
        <div className="flex items-start gap-3">
          {partnerLogo || partnerName ? (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-slate-200 bg-white p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
              {partnerLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={partnerLogo}
                  alt={partnerName || "Parceiro"}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <Building2 className="h-5 w-5 text-slate-400" />
              )}
            </div>
          ) : (
            <BookOpen className="h-5 w-5 text-primary shrink-0 mt-1" />
          )}
          <div className="min-w-0 flex-1">
            {partnerName ? (
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {partnerName}
              </p>
            ) : null}
            <h3 className="text-lg font-black tracking-tight text-slate-800 leading-snug">
              {catalog.titulo}
            </h3>
            {!partnerName && catalog.marca ? (
              <p className="text-xs text-muted-foreground mt-0.5">{catalog.marca}</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">
                Escolha como compartilhar ou abrir este catálogo.
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 items-stretch">
          <div className="rounded-[var(--radius-md)] overflow-hidden border border-slate-200 bg-slate-50 aspect-[3/4] sm:min-h-[280px] relative">
            <CatalogCoverThumb
              catalog={catalog}
              companyId={companyId}
              onCapaSaved={onCapaSaved}
              className="absolute inset-0 !rounded-none"
            />
          </div>

          <div className="flex flex-col justify-center min-h-0">
            <div className="flex flex-col gap-2">
              {shareActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.key}
                    type="button"
                    onClick={action.onClick}
                    className={`w-full text-left ${action.className}`}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-black/10 shrink-0">
                      <Icon className="h-4.5 w-4.5" strokeWidth={2.2} />
                    </span>
                    <span className="min-w-0 text-left">
                      <span className="block text-sm font-bold leading-tight">{action.label}</span>
                      <span className="block text-[11px] font-medium opacity-80 mt-0.5">
                        {action.hint}
                      </span>
                    </span>
                  </Button>
                );
              })}
            </div>

            <div className="mt-3.5 pt-3.5 border-t border-slate-200/80">
              <Button
                type="button"
                onClick={onView}
                className="w-full text-left btn-metallic font-bold justify-start gap-3 h-auto py-3 px-3.5"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-black/10 shrink-0">
                  <Eye className="h-4.5 w-4.5" strokeWidth={2.2} />
                </span>
                <span className="min-w-0 text-left">
                  <span className="block text-sm font-bold leading-tight">Visualizar</span>
                  <span className="block text-[11px] font-medium opacity-80 mt-0.5">
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
