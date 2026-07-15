/** Rótulos de origem do lead — exibição em português (valor no banco permanece em inglês). */
export const ORIGIN_LABELS: Record<string, string> = {
  SITE: "Site",
  INSTAGRAM: "Instagram",
  INDICACAO: "Indicação",
  GOOGLE: "Google",
  WHATSAPP: "WhatsApp",
  FACEBOOK: "Facebook",
  FORMULARIO: "Formulário",
};

export const STATUS_LABELS: Record<string, string> = {
  LEAD: "Lead",
  EM_CONTATO: "Em contato",
  NEGOCIACAO: "Negociação",
  APROVADO: "Aprovado",
  INATIVO: "Inativo",
};

export function labelOrigin(origin: string): string {
  return ORIGIN_LABELS[origin] ?? origin;
}

export function labelStatus(status: string): string {
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  LEAD: "Lead",
  ORCAMENTO: "Orçamento",
  NEGOCIACAO: "Negociação",
  CONFERENCIA_TECNICA: "Conferência técnica",
  APROVADO: "Aprovado",
  PRODUCAO: "Produção",
  INSTALACAO: "Instalação",
  FINALIZADO: "Finalizado",
  PERDIDO: "Perdido",
};

export function labelProjectStatus(status: string): string {
  return PROJECT_STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

/** Cores de chip por status do projeto (listagens). */
export const PROJECT_STATUS_CHIP_STYLES: Record<string, string> = {
  LEAD: "bg-amber-500/10 text-amber-800 border-amber-500/25",
  ORCAMENTO: "bg-sky-500/10 text-sky-800 border-sky-500/25",
  NEGOCIACAO: "bg-indigo-500/10 text-indigo-800 border-indigo-500/25",
  CONFERENCIA_TECNICA: "bg-violet-500/10 text-violet-800 border-violet-500/25",
  APROVADO: "bg-emerald-500/10 text-emerald-800 border-emerald-500/25",
  PRODUCAO: "bg-purple-500/10 text-purple-800 border-purple-500/25",
  INSTALACAO: "bg-cyan-500/10 text-cyan-800 border-cyan-500/25",
  FINALIZADO: "bg-slate-500/10 text-slate-700 border-slate-500/25",
  PERDIDO: "bg-rose-500/10 text-rose-800 border-rose-500/25",
};

export function projectStatusChipClass(status: string): string {
  return (
    PROJECT_STATUS_CHIP_STYLES[status] ??
    "bg-muted text-muted-foreground border-border"
  );
}

export function shortProjectCode(projectId: string): string {
  return projectId.slice(0, 8).toUpperCase();
}
