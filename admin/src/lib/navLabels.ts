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
