"use client";

import {
  Download,
  Eye,
  Mail,
  MessageCircle,
  BookOpen,
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

  const actions = [
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
    {
      key: "view",
      label: "Visualizar",
      hint: "Abrir o link público do catálogo",
      icon: Eye,
      onClick: onView,
      className: "btn-metallic font-bold justify-start gap-3 h-auto py-3 px-3.5",
    },
  ] as const;

  return (
    <Dialog
      isOpen={Boolean(catalog)}
      onClose={onClose}
      className="max-w-3xl w-full"
      bodyClassName="max-h-[min(92svh,880px)] overflow-y-auto"
    >
      <div className="space-y-4 pr-1">
        <div>
          <h3 className="text-lg font-black tracking-tight text-slate-800 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary shrink-0" />
            {catalog.titulo}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {[catalog.supplierNome, catalog.marca].filter(Boolean).join(" · ") ||
              "Escolha como compartilhar ou abrir este catálogo."}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-stretch">
          <div className="rounded-[var(--radius-md)] overflow-hidden border border-slate-200 bg-slate-50 aspect-[3/4] sm:min-h-[280px] relative">
            <CatalogCoverThumb
              catalog={catalog}
              companyId={companyId}
              onCapaSaved={onCapaSaved}
              className="absolute inset-0 !rounded-none"
            />
          </div>

          <div className="flex flex-col gap-2.5 justify-center">
            {actions.map((action) => {
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
        </div>
      </div>
    </Dialog>
  );
}
