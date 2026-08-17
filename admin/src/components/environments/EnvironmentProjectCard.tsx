"use client";

import type { EnvironmentAttachmentCategory } from "@prisma/client";
import {
  attachmentCategoryLabel,
  ENVIRONMENT_CATEGORY_CHIP,
  ENVIRONMENT_TIPO_LABELS,
  type EnvironmentAttachmentSummary,
} from "@/lib/factoryEnvironment";
import { CheckCircle2, FileStack, FolderOpen, Images, Ruler, Sparkles } from "lucide-react";

export type EnvironmentProjectCardData = {
  id: string;
  nome: string;
  tipo: string;
  status: string;
} & EnvironmentAttachmentSummary;

type EnvironmentProjectCardProps = {
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

export default function EnvironmentProjectCard({
  environment,
  statusLabel,
  statusClassName,
  onOpen,
}: EnvironmentProjectCardProps) {
  const tipoLabel = ENVIRONMENT_TIPO_LABELS[environment.tipo] ?? environment.tipo;
  const hasFiles = environment.attachmentCount > 0;
  const readyHighlight = environment.hasFactoryProject || environment.hasArchProject;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group flex h-full flex-col overflow-hidden rounded-xl border bg-white text-left shadow-sm transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
        readyHighlight
          ? "border-emerald-300/80 ring-1 ring-emerald-500/15 hover:border-emerald-400/80"
          : hasFiles
            ? "border-primary/25 hover:border-primary/45"
            : "border-border border-dashed hover:border-primary/30"
      }`}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
        {environment.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={environment.coverUrl}
            alt={`Capa de ${environment.nome}`}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-muted-foreground">
            <FolderOpen className="h-8 w-8 opacity-40" />
            <p className="text-[11px] font-medium leading-snug">
              {hasFiles ? "Arquivos sem miniatura" : "Nenhum arquivo enviado"}
            </p>
          </div>
        )}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2.5">
          <span className="rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-xs">
            {tipoLabel}
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold backdrop-blur-xs ${statusClassName}`}
          >
            {statusLabel}
          </span>
        </div>

        {environment.hasFactoryProject ? (
          <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-md bg-emerald-600/95 px-2 py-1 text-[10px] font-bold text-white shadow-sm">
            <CheckCircle2 className="h-3 w-3" />
            Plano de corte
          </span>
        ) : environment.hasArchProject ? (
          <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-md bg-violet-600/95 px-2 py-1 text-[10px] font-bold text-white shadow-sm">
            <Sparkles className="h-3 w-3" />
            Projeto arquiteto
          </span>
        ) : null}

        {hasFiles ? (
          <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-md bg-black/55 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-xs">
            <FileStack className="h-3 w-3" />
            {environment.attachmentCount}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <h4 className="font-semibold text-base text-foreground break-words leading-snug">
            {environment.nome}
          </h4>
          <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
            {hasFiles
              ? "Toque para ver fotos, projetos, medições e renders deste cômodo."
              : "Abra para enviar medição, projeto do arquiteto ou arquivos da fábrica."}
          </p>
        </div>

        {environment.categories.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {environment.categories.map((category) => (
              <span
                key={category}
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${ENVIRONMENT_CATEGORY_CHIP[category]}`}
              >
                <CategoryIcon category={category} />
                {attachmentCategoryLabel(category)}
              </span>
            ))}
          </div>
        ) : (
          <span className="inline-flex w-fit items-center gap-1 rounded-md border border-dashed border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium text-muted-foreground">
            Aguardando arquivos
          </span>
        )}

        <span className="mt-auto inline-flex items-center gap-1.5 text-xs font-bold text-primary group-hover:underline">
          <Images className="h-3.5 w-3.5 shrink-0" />
          Abrir arquivos
        </span>
      </div>
    </button>
  );
}
