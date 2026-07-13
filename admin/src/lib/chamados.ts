export type SupplyTicketStatus = "ABERTO" | "EM_ANDAMENTO" | "RESOLVIDO" | "CANCELADO";
export type SupplyTicketPriority = "BAIXA" | "MEDIA" | "ALTA";

export interface SupplyTicketDTO {
  id: string;
  titulo: string;
  descricao: string;
  status: SupplyTicketStatus;
  prioridade: SupplyTicketPriority;
  projectId: string | null;
  projectLabel: string | null;
  requesterId: string;
  requesterName: string;
  resolverName: string | null;
  resolucao: string | null;
  imagens: string[];
  createdAt: string;
  resolvedAt: string | null;
}

export const SUPPLY_STATUS_LABELS: Record<SupplyTicketStatus, string> = {
  ABERTO: "Aberto",
  EM_ANDAMENTO: "Em andamento",
  RESOLVIDO: "Resolvido",
  CANCELADO: "Cancelado",
};

export const SUPPLY_PRIORITY_LABELS: Record<SupplyTicketPriority, string> = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
};

export const SUPPLY_STATUS_ORDER: SupplyTicketStatus[] = [
  "ABERTO",
  "EM_ANDAMENTO",
  "RESOLVIDO",
  "CANCELADO",
];
