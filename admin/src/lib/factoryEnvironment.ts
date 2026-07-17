import type { EnvironmentAttachmentCategory } from "@prisma/client";

export type FactoryBoardEnvironment = {
  id: string;
  nome: string;
  tipo: string;
  status: string;
  projectId: string;
  clientId: string;
  clientName: string;
  responsavelId: string | null;
  responsavelNome: string | null;
  ajudanteId: string | null;
  ajudanteNome: string | null;
  materiais: string | null;
  ferragens: string | null;
  acabamentos: string | null;
  medidasObservacoes: string | null;
  observacoesFabrica: string | null;
  materialsSummary: string | null;
  hardwareSummary: string | null;
  attachmentCount: number;
  coverUrl: string | null;
  techSheetFilled: number;
  techSheetTotal: number;
  techSheetComplete: boolean;
};

export type EnvironmentAttachmentDTO = {
  id: string;
  nome: string;
  mime_type: string;
  url: string;
  size_bytes: number | null;
  categoria: EnvironmentAttachmentCategory;
  createdAt: string;
  uploaded_by: string | null;
};

export type EnvironmentTechSheet = {
  materiais: string;
  ferragens: string;
  acabamentos: string;
  medidas_observacoes: string;
  observacoes_fabrica: string;
  capa_attachment_id: string | null;
};

export const ENVIRONMENT_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export const ENVIRONMENT_ATTACHMENT_ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf";

export const ENVIRONMENT_ATTACHMENT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

export const ENVIRONMENT_ATTACHMENT_CATEGORIES: {
  value: EnvironmentAttachmentCategory;
  label: string;
}[] = [
  { value: "PROJETO_ARQUITETO", label: "Projeto arquiteto" },
  { value: "PROJETO_FABRICA", label: "Projeto fábrica" },
  { value: "RENDER", label: "Render" },
  { value: "REFERENCIA", label: "Referência" },
  { value: "MEDICAO", label: "Medição" },
  { value: "FOTO", label: "Foto" },
];

export const TECH_SHEET_TOTAL_FIELDS = 5;

export type ClientColorToken = {
  swatch: string;
  border: string;
  soft: string;
  text: string;
  ring: string;
};

const CLIENT_COLOR_PALETTE: ClientColorToken[] = [
  {
    swatch: "bg-rose-500",
    border: "border-rose-500/50",
    soft: "bg-rose-500/10",
    text: "text-rose-700 dark:text-rose-300",
    ring: "ring-rose-500/30",
  },
  {
    swatch: "bg-orange-500",
    border: "border-orange-500/50",
    soft: "bg-orange-500/10",
    text: "text-orange-700 dark:text-orange-300",
    ring: "ring-orange-500/30",
  },
  {
    swatch: "bg-amber-500",
    border: "border-amber-500/50",
    soft: "bg-amber-500/10",
    text: "text-amber-800 dark:text-amber-300",
    ring: "ring-amber-500/30",
  },
  {
    swatch: "bg-lime-600",
    border: "border-lime-600/50",
    soft: "bg-lime-600/10",
    text: "text-lime-800 dark:text-lime-300",
    ring: "ring-lime-600/30",
  },
  {
    swatch: "bg-emerald-600",
    border: "border-emerald-600/50",
    soft: "bg-emerald-600/10",
    text: "text-emerald-800 dark:text-emerald-300",
    ring: "ring-emerald-600/30",
  },
  {
    swatch: "bg-teal-600",
    border: "border-teal-600/50",
    soft: "bg-teal-600/10",
    text: "text-teal-800 dark:text-teal-300",
    ring: "ring-teal-600/30",
  },
  {
    swatch: "bg-cyan-600",
    border: "border-cyan-600/50",
    soft: "bg-cyan-600/10",
    text: "text-cyan-800 dark:text-cyan-300",
    ring: "ring-cyan-600/30",
  },
  {
    swatch: "bg-sky-600",
    border: "border-sky-600/50",
    soft: "bg-sky-600/10",
    text: "text-sky-800 dark:text-sky-300",
    ring: "ring-sky-600/30",
  },
  {
    swatch: "bg-blue-600",
    border: "border-blue-600/50",
    soft: "bg-blue-600/10",
    text: "text-blue-800 dark:text-blue-300",
    ring: "ring-blue-600/30",
  },
  {
    swatch: "bg-indigo-600",
    border: "border-indigo-600/50",
    soft: "bg-indigo-600/10",
    text: "text-indigo-800 dark:text-indigo-300",
    ring: "ring-indigo-600/30",
  },
  {
    swatch: "bg-violet-600",
    border: "border-violet-600/50",
    soft: "bg-violet-600/10",
    text: "text-violet-800 dark:text-violet-300",
    ring: "ring-violet-600/30",
  },
  {
    swatch: "bg-fuchsia-600",
    border: "border-fuchsia-600/50",
    soft: "bg-fuchsia-600/10",
    text: "text-fuchsia-800 dark:text-fuchsia-300",
    ring: "ring-fuchsia-600/30",
  },
];

function hashId(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Cor estável e consistente por cliente em todas as colunas. */
export function getClientColor(clientId: string): ClientColorToken {
  if (!clientId) return CLIENT_COLOR_PALETTE[0];
  return CLIENT_COLOR_PALETTE[hashId(clientId) % CLIENT_COLOR_PALETTE.length];
}

export function isImageMime(mime: string) {
  return mime.startsWith("image/");
}

export function formatAttachmentSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function summarizeText(value: string | null | undefined, max = 72): string | null {
  if (!value) return null;
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) return null;
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 1)}…`;
}

export function countTechSheetFields(fields: {
  materiais?: string | null;
  ferragens?: string | null;
  acabamentos?: string | null;
  medidas_observacoes?: string | null;
  observacoes_fabrica?: string | null;
}) {
  const values = [
    fields.materiais,
    fields.ferragens,
    fields.acabamentos,
    fields.medidas_observacoes,
    fields.observacoes_fabrica,
  ];
  const filled = values.filter((value) => !!(value && value.trim())).length;
  return {
    filled,
    total: TECH_SHEET_TOTAL_FIELDS,
    complete: filled === TECH_SHEET_TOTAL_FIELDS,
  };
}

export function attachmentCategoryLabel(categoria: EnvironmentAttachmentCategory) {
  return ENVIRONMENT_ATTACHMENT_CATEGORIES.find((item) => item.value === categoria)?.label ?? categoria;
}
