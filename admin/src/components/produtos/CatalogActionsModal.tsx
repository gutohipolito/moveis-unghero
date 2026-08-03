"use client";

import {
  Download,
  Eye,
  Mail,
  MessageCircle,
  BookOpen,
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
      className:
        "border-emerald-200/90 bg-gradient-to-br from-emerald-50 to-emerald-100/80 text-emerald-900 hover:from-emerald-100 hover:to-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]",
      iconClass: "text-emerald-600",
    },
    {
      key: "email",
      label: "E-mail",
      hint: "Abrir rascunho no sistema",
      icon: Mail,
      onClick: onEmail,
      className:
        "border-sky-200/90 bg-gradient-to-br from-sky-50 to-sky-100/70 text-sky-950 hover:from-sky-100 hover:to-sky-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]",
      iconClass: "text-sky-600",
    },
    {
      key: "download",
      label: "Download",
      hint: "Baixar o arquivo original",
      icon: Download,
      onClick: onDownload,
      className:
        "border-amber-200/90 bg-gradient-to-br from-amber-50 to-amber-100/70 text-amber-950 hover:from-amber-100 hover:to-amber-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]",
      iconClass: "text-amber-700",
    },
    {
      key: "view",
      label: "Visualizar",
      hint: "Abrir PDF / arquivo",
      icon: Eye,
      onClick: onView,
      className:
        "border-primary/30 bg-gradient-to-br from-[hsl(43_100%_96%)] to-[hsl(42_80%_90%)] text-slate-900 hover:brightness-[1.02] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]",
      iconClass: "text-primary",
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
                <button
                  key={action.key}
                  type="button"
                  onClick={action.onClick}
                  className={`flex items-center gap-3 w-full rounded-[var(--radius-sm)] border px-3.5 py-3 text-left transition-all cursor-pointer ${action.className}`}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] bg-white/70 border border-black/5 shrink-0">
                    <Icon className={`h-5 w-5 ${action.iconClass}`} strokeWidth={2.1} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold leading-tight">{action.label}</span>
                    <span className="block text-[11px] font-medium opacity-70 mt-0.5">
                      {action.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
