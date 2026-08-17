"use client";

import type { EnvironmentAttachmentCategory } from "@prisma/client";
import {
  attachmentCategoryLabel,
  ENVIRONMENT_CATEGORY_CHIP,
  ENVIRONMENT_TIPO_LABELS,
} from "@/lib/factoryEnvironment";
import type { EnvironmentProjectCardData } from "@/components/environments/EnvironmentProjectCard";
import {
  CheckCircle2,
  ChevronRight,
  FileStack,
  FolderOpen,
  Images,
  Ruler,
  Sparkles,
} from "lucide-react";

type EnvironmentProjectListRowProps = {
  environment: EnvironmentProjectCardData;
  statusLabel: string;
  statusClassName: string;
  onOpen: () => void;
};

function CategoryIcon({ category }: { category: EnvironmentAttachmentCategory }) {
  if (category === "PROJETO_FABRICA" || category === "PROJETO_ARQUITETO") {
    return <Ruler className="h-3 w-3 shrink-0" />;
  }
  if (category === "RENDER" || category === "FOTO" || category === "REFERENCIA") {
    return <Images className="h-3 w-3 shrink-0" />;
  }
  return <FileStack className="h-3 w-3 shrink-0" />;
}

export default function EnvironmentProjectListRow({
  environment,
  statusLabel,
  statusClassName,
  onOpen,
}: EnvironmentProjectListRowProps) {
  const tipoLabel = ENVIRONMENT_TIPO_LABELS[environment.tipo] ?? environment.tipo;
  const hasFiles = environment.attachmentCount > 0;
  const readyHighlight = environment.hasFactoryProject || environment.hasArchProject;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex w-full items-stretch gap-3 sm:gap-4 p-3 sm:p-4 text-left transition-colors hover:bg-slate-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30 ${
        readyHighlight ? "bg-emerald-50/30" : ""
      }`}
    >
      <div className="relative h-20 w-28 sm:h-24 sm:w-36 shrink-0 overflow-hidden rounded-lg bg-slate-100 border border-border/60">
        {environment.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={environment.coverUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-2 text-muted-foreground">
            <FolderOpen className="h-6 w-6 opacity-40" />
          </div>
        )}
        {hasFiles ? (
          <span className="absolute bottom-1 right-1 inline-flex items-center gap-0.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white">
            <FileStack className="h-2.5 w-2.5" />
            {environment.attachmentCount}
          </span>
        ) : null}
      </div>

      <div className="min-w-0 flex-1 flex flex-col gap-2 py-0.5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {tipoLabel}
              </span>
              {environment.hasFactoryProject ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  Plano de corte
                </span>
              ) : environment.hasArchProject ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-violet-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                  <Sparkles className="h-2.5 w-2.5" />
                  Projeto arquiteto
                </span>
              ) : null}
            </div>
            <h4 className="font-semibold text-sm sm:text-base text-foreground break-words leading-snug">
              {environment.nome}
            </h4>
          </div>
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClassName}`}
          >
            {statusLabel}
          </span>
        </div>

        {environment.categories.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {environment.categories.map((category) => (
              <span
                key={category}
                className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-semibold ${ENVIRONMENT_CATEGORY_CHIP[category]}`}
              >
                <CategoryIcon category={category} />
                {attachmentCategoryLabel(category)}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-[10px] font-medium text-muted-foreground">
            Aguardando arquivos
          </span>
        )}
      </div>

      <div className="hidden sm:flex items-center shrink-0 text-primary">
        <ChevronRight className="h-5 w-5 opacity-50 group-hover:opacity-100" />
      </div>
    </button>
  );
}
