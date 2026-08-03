"use client";

import {
  Download,
  Eye,
  Mail,
  MessageCircle,
  Building2,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
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
  "flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3.5 py-2.5 text-left cursor-pointer transition-[filter,box-shadow,background] duration-[var(--motion-fast)] ease-[var(--ease-out)]";

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
      className="max-w-4xl w-full"
      bodyClassName="max-h-[min(92svh,880px)] overflow-y-auto"
    >
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-5 sm:gap-6 items-stretch pr-1">
        <div className="rounded-[var(--radius-md)] overflow-hidden border border-slate-200 bg-slate-50 aspect-[3/4] sm:min-h-[280px] sm:max-h-[420px] relative">
          <CatalogCoverThumb
            catalog={catalog}
            companyId={companyId}
            onCapaSaved={onCapaSaved}
            className="absolute inset-0 !rounded-none"
          />
        </div>

        <div className="flex flex-col min-h-0 justify-center gap-4">
          <div className="flex flex-col items-center text-center gap-1 px-1">
            {partnerLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={partnerLogo}
                alt={partnerName || "Parceiro"}
                className="h-9 sm:h-10 w-auto max-w-[120px] object-contain"
              />
            ) : partnerName ? (
              <Building2 className="h-7 w-7 text-slate-300" />
            ) : null}
            {partnerName ? (
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {partnerName}
              </p>
            ) : null}
            <h3 className="text-sm sm:text-base font-black tracking-tight text-slate-800 leading-snug">
              {catalog.titulo}
            </h3>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Escolha como compartilhar ou abrir este catálogo.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {shareActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.key}
                  type="button"
                  onClick={action.onClick}
                  className={`${actionBtnClass} ${action.tone}`}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-[calc(var(--radius-sm)-2px)] bg-black/10 shrink-0">
                    <Icon className="h-4 w-4" strokeWidth={2.2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold leading-tight">{action.label}</span>
                    <span className="block text-[11px] font-medium opacity-80 mt-0.5 leading-snug">
                      {action.hint}
                    </span>
                  </span>
                </button>
              );
            })}

            <div className="mt-1 pt-2.5 border-t border-slate-200/80">
              <button
                type="button"
                onClick={onView}
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
