import type { EnvironmentAttachmentCategory } from "@prisma/client";
import { canManageOperationalMedia } from "@/lib/permissions";

export type ProductionPriority = "NORMAL" | "PRIORITARIO";

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
  /** Quando entrou na fila de produção. */
  filaEntradaEm: string | null;
  /** Prazo acordado com o cliente para este cômodo. */
  dataEntregaAcordada: string | null;
  prioridadeProducao: ProductionPriority;
  materiais: string | null;
  ferragens: string | null;
  acabamentos: string | null;
  medidasObservacoes: string | null;
  observacoesFabrica: string | null;
  materialsSummary: string | null;
  hardwareSummary: string | null;
  /** Detalhes aprovados no orçamento (sem preços) — fonte para projetista/fábrica. */
  approvedSubitens: string[];
  attachmentCount: number;
  coverUrl: string | null;
  coverPdfUrl: string | null;
  hasFactoryProject: boolean;
  hasFactoryProjectImages: boolean;
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

export const ENVIRONMENT_ATTACHMENT_MAX_BYTES = 200 * 1024 * 1024; // 200 MB (upload direto no Blob)

const ENVIRONMENT_ATTACHMENT_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "heic",
  "heif",
  "gif",
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "zip",
  "rar",
  "7z",
  "dwg",
  "dxf",
  "skp",
  "3ds",
  "obj",
  "stl",
] as const;

export const ENVIRONMENT_ATTACHMENT_ACCEPT = [
  "image/*",
  "application/pdf",
  ...ENVIRONMENT_ATTACHMENT_EXTENSIONS.map((ext) => `.${ext}`),
].join(",");

export const ENVIRONMENT_ATTACHMENT_ALLOWED_HINT =
  "Envie imagem, PDF, DWG, SketchUp (.skp) ou ZIP (até 200 MB).";

export const ENVIRONMENT_ATTACHMENT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/vnd.rar",
  "application/x-7z-compressed",
  "image/vnd.dwg",
  "application/acad",
  "application/dxf",
  "image/vnd.dxf",
  "application/vnd.sketchup.skp",
  "application/octet-stream",
]);

const ENVIRONMENT_ATTACHMENT_EXT_SET = new Set<string>(ENVIRONMENT_ATTACHMENT_EXTENSIONS);

export function environmentAttachmentExtension(name: string): string {
  const base = name.trim().split(/[\\/]/).pop() || "";
  const dot = base.lastIndexOf(".");
  if (dot < 0 || dot === base.length - 1) return "";
  return base.slice(dot + 1).toLowerCase();
}

export function isAllowedEnvironmentAttachment(file: {
  name: string;
  type?: string | null;
}): boolean {
  const ext = environmentAttachmentExtension(file.name);
  if (ext && ENVIRONMENT_ATTACHMENT_EXT_SET.has(ext)) return true;
  const mime = (file.type || "").toLowerCase();
  if (!mime || mime === "application/octet-stream") return false;
  return ENVIRONMENT_ATTACHMENT_MIME_TYPES.has(mime);
}

export function guessEnvironmentAttachmentMime(name: string, type?: string | null): string {
  const mime = (type || "").trim().toLowerCase();
  if (mime && mime !== "application/octet-stream") return mime;
  const ext = environmentAttachmentExtension(name);
  const byExt: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    heic: "image/heic",
    heif: "image/heif",
    gif: "image/gif",
    pdf: "application/pdf",
    skp: "application/vnd.sketchup.skp",
    dwg: "image/vnd.dwg",
    dxf: "image/vnd.dxf",
    zip: "application/zip",
    rar: "application/vnd.rar",
    "7z": "application/x-7z-compressed",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  return byExt[ext] || "application/octet-stream";
}

export const ENVIRONMENT_ATTACHMENT_CATEGORIES: {
  value: EnvironmentAttachmentCategory;
  label: string;
}[] = [
  { value: "PROJETO_ARQUITETO", label: "Projeto arquiteto" },
  { value: "PROJETO_FABRICA", label: "Projeto fábrica" },
  { value: "RENDER", label: "Render" },
  { value: "REFERENCIA", label: "Referência" },
  { value: "MEDICAO", label: "Medição" },
  { value: "CONFERENCIA", label: "Conferência técnica" },
  { value: "FOTO", label: "Foto" },
];

/** Marceneiro (PRODUCAO) só visualiza; Projetista e demais cargos com escrita podem gerenciar. */
export function canManageEnvironmentAttachments(
  role: string | null | undefined
): boolean {
  return canManageOperationalMedia(role);
}

/**
 * Payload do quadro para VIEWER: sem URLs de mídia, sem responsáveis,
 * sem etapa real e sem detalhes técnicos (não vazam no DevTools).
 */
export function redactFactoryBoardForViewer(input: {
  environments: FactoryBoardEnvironment[];
  slaByProject: Record<string, unknown>;
}): {
  environments: FactoryBoardEnvironment[];
  slaByProject: Record<string, never>;
} {
  return {
    environments: input.environments.map((env) => ({
      ...env,
      status: "OCULTO",
      clientName: redactFirstNameOnly(env.clientName),
      responsavelId: null,
      responsavelNome: null,
      ajudanteId: null,
      ajudanteNome: null,
      materiais: null,
      ferragens: null,
      acabamentos: null,
      medidasObservacoes: null,
      observacoesFabrica: null,
      materialsSummary: null,
      hardwareSummary: null,
      approvedSubitens: [],
      attachmentCount: 0,
      coverUrl: null,
      coverPdfUrl: null,
      hasFactoryProject: false,
      hasFactoryProjectImages: false,
      techSheetFilled: 0,
      techSheetTotal: env.techSheetTotal,
      techSheetComplete: false,
    })),
    slaByProject: {},
  };
}

function redactFirstNameOnly(name: string): string {
  const trimmed = (name || "").trim();
  if (!trimmed) return "Cliente";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0]!;
  return `${parts[0]} ••••`;
}

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
    swatch: "bg-slate-600",
    border: "border-slate-500/50",
    soft: "bg-slate-600/15",
    text: "text-slate-900",
    ring: "ring-slate-500/30",
  },
  {
    swatch: "bg-stone-600",
    border: "border-stone-500/50",
    soft: "bg-stone-600/15",
    text: "text-stone-900",
    ring: "ring-stone-500/30",
  },
  {
    swatch: "bg-zinc-600",
    border: "border-zinc-500/50",
    soft: "bg-zinc-600/15",
    text: "text-zinc-900",
    ring: "ring-zinc-500/30",
  },
  {
    swatch: "bg-emerald-600",
    border: "border-emerald-600/50",
    soft: "bg-emerald-600/15",
    text: "text-emerald-950",
    ring: "ring-emerald-600/30",
  },
  {
    swatch: "bg-teal-600",
    border: "border-teal-600/50",
    soft: "bg-teal-600/15",
    text: "text-teal-950",
    ring: "ring-teal-600/30",
  },
  {
    swatch: "bg-cyan-600",
    border: "border-cyan-600/50",
    soft: "bg-cyan-600/15",
    text: "text-cyan-950",
    ring: "ring-cyan-600/30",
  },
  {
    swatch: "bg-sky-600",
    border: "border-sky-600/50",
    soft: "bg-sky-600/15",
    text: "text-sky-950",
    ring: "ring-sky-600/30",
  },
  {
    swatch: "bg-blue-600",
    border: "border-blue-600/50",
    soft: "bg-blue-600/15",
    text: "text-blue-950",
    ring: "ring-blue-600/30",
  },
  {
    swatch: "bg-indigo-600",
    border: "border-indigo-600/50",
    soft: "bg-indigo-600/15",
    text: "text-indigo-950",
    ring: "ring-indigo-600/30",
  },
  {
    swatch: "bg-violet-600",
    border: "border-violet-600/50",
    soft: "bg-violet-600/15",
    text: "text-violet-950",
    ring: "ring-violet-600/30",
  },
  {
    swatch: "bg-fuchsia-600",
    border: "border-fuchsia-600/50",
    soft: "bg-fuchsia-600/15",
    text: "text-fuchsia-950",
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

export function isPdfMime(mime: string, nameOrUrl?: string | null) {
  const normalized = (mime || "").toLowerCase();
  if (normalized === "application/pdf" || normalized === "application/x-pdf") return true;
  return Boolean(nameOrUrl && /\.pdf(\?|#|$)/i.test(nameOrUrl));
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

/** Ordem de destaque nos cards de cômodo (produção primeiro). */
export const ENVIRONMENT_CATEGORY_DISPLAY_ORDER: EnvironmentAttachmentCategory[] = [
  "PROJETO_FABRICA",
  "PROJETO_ARQUITETO",
  "MEDICAO",
  "CONFERENCIA",
  "RENDER",
  "FOTO",
  "REFERENCIA",
];

export type EnvironmentAttachmentSummary = {
  attachmentCount: number;
  coverUrl: string | null;
  coverPdfUrl: string | null;
  categories: EnvironmentAttachmentCategory[];
  hasArchProject: boolean;
  hasFactoryProject: boolean;
  hasFactoryProjectImages: boolean;
};

export const EMPTY_ENVIRONMENT_ATTACHMENT_SUMMARY: EnvironmentAttachmentSummary = {
  attachmentCount: 0,
  coverUrl: null,
  coverPdfUrl: null,
  categories: [],
  hasArchProject: false,
  hasFactoryProject: false,
  hasFactoryProjectImages: false,
};

export function summarizeEnvironmentAttachments(input: {
  capa_attachment_id: string | null;
  attachments: Array<{
    id: string;
    url: string;
    mime_type: string;
    categoria: EnvironmentAttachmentCategory;
    nome?: string;
  }>;
  attachmentCount?: number;
}): EnvironmentAttachmentSummary {
  const imageCover =
    input.attachments.find(
      (item) => item.id === input.capa_attachment_id && isImageMime(item.mime_type)
    ) ??
    input.attachments.find((item) => isImageMime(item.mime_type)) ??
    null;

  const pdfCover =
    !imageCover
      ? input.attachments.find(
          (item) => item.id === input.capa_attachment_id && isPdfMime(item.mime_type, item.nome ?? item.url)
        ) ??
        input.attachments.find((item) => isPdfMime(item.mime_type, item.nome ?? item.url)) ??
        null
      : null;

  const categories = ENVIRONMENT_CATEGORY_DISPLAY_ORDER.filter((category) =>
    input.attachments.some((item) => item.categoria === category)
  );

  const factoryFiles = input.attachments.filter((item) => item.categoria === "PROJETO_FABRICA");

  return {
    attachmentCount: input.attachmentCount ?? input.attachments.length,
    coverUrl: imageCover?.url ?? null,
    coverPdfUrl: pdfCover?.url ?? null,
    categories,
    hasArchProject: categories.includes("PROJETO_ARQUITETO"),
    hasFactoryProject: categories.includes("PROJETO_FABRICA"),
    hasFactoryProjectImages: factoryFiles.some((item) => isImageMime(item.mime_type)),
  };
}

export function formatFactoryBoardDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

/** Severidade visual do prazo acordado (não confundir com SLA interno). */
export function getPromisedDeliverySeverity(
  iso: string | null | undefined
): "overdue" | "due" | "ok" | null {
  if (!iso) return null;
  const deadline = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);
  if (deadline.getTime() < today.getTime()) return "overdue";
  const diffDays = Math.round((deadline.getTime() - today.getTime()) / 86_400_000);
  if (diffDays <= 2) return "due";
  return "ok";
}

/** Ordenação do kanban: prioritário → entrega mais próxima → mais antigo na fila. */
export function compareFactoryBoardEnvironments(
  a: FactoryBoardEnvironment,
  b: FactoryBoardEnvironment
): number {
  const prioA = a.prioridadeProducao === "PRIORITARIO" ? 0 : 1;
  const prioB = b.prioridadeProducao === "PRIORITARIO" ? 0 : 1;
  if (prioA !== prioB) return prioA - prioB;

  const entregaA = a.dataEntregaAcordada
    ? new Date(a.dataEntregaAcordada).getTime()
    : Number.MAX_SAFE_INTEGER;
  const entregaB = b.dataEntregaAcordada
    ? new Date(b.dataEntregaAcordada).getTime()
    : Number.MAX_SAFE_INTEGER;
  if (entregaA !== entregaB) return entregaA - entregaB;

  const filaA = a.filaEntradaEm ? new Date(a.filaEntradaEm).getTime() : Number.MAX_SAFE_INTEGER;
  const filaB = b.filaEntradaEm ? new Date(b.filaEntradaEm).getTime() : Number.MAX_SAFE_INTEGER;
  if (filaA !== filaB) return filaA - filaB;

  return a.nome.localeCompare(b.nome, "pt-BR");
}

export function sortFactoryBoardEnvironments(
  items: FactoryBoardEnvironment[]
): FactoryBoardEnvironment[] {
  return [...items].sort(compareFactoryBoardEnvironments);
}

export function sortEnvironmentsForOperator<
  T extends EnvironmentAttachmentSummary & { nome: string }
>(environments: T[]): T[] {
  return [...environments].sort((a, b) => {
    const score = (env: T) =>
      (env.hasFactoryProject ? 4 : 0) +
      (env.hasArchProject ? 2 : 0) +
      (env.attachmentCount > 0 ? 1 : 0);
    const diff = score(b) - score(a);
    if (diff !== 0) return diff;
    if (b.attachmentCount !== a.attachmentCount) {
      return b.attachmentCount - a.attachmentCount;
    }
    return a.nome.localeCompare(b.nome, "pt-BR");
  });
}

export const ENVIRONMENT_CATEGORY_CHIP: Record<
  EnvironmentAttachmentCategory,
  string
> = {
  PROJETO_ARQUITETO: "bg-violet-500/10 text-violet-800 border-violet-200",
  PROJETO_FABRICA: "bg-emerald-500/10 text-emerald-800 border-emerald-200",
  RENDER: "bg-sky-500/10 text-sky-800 border-sky-200",
  REFERENCIA: "bg-slate-500/10 text-slate-700 border-slate-200",
  MEDICAO: "bg-amber-500/10 text-amber-900 border-amber-200",
  CONFERENCIA: "bg-indigo-500/10 text-indigo-800 border-indigo-200",
  FOTO: "bg-teal-500/10 text-teal-800 border-teal-200",
};

export const ENVIRONMENT_TIPO_LABELS: Record<string, string> = {
  COZINHA: "Cozinha",
  CLOSET: "Closet",
  DORMITORIO: "Dormitório",
  BANHEIRO: "Banheiro",
  OUTROS: "Outros",
};
