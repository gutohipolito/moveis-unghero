import { buildConfTecnicaWhatsAppMessage } from "@/lib/confTecnicaWhatsApp";
import { buildMedicaoACaminhoWhatsAppMessage } from "@/lib/medicaoWhatsApp";
import { buildGoogleReviewWhatsAppMessage } from "@/lib/google-review";

export type MarketingMessageCategory =
  | "Funil comercial"
  | "Pós-entrega"
  | "Captação";

export type MarketingMessage = {
  id: string;
  title: string;
  description: string;
  category: MarketingMessageCategory;
  /** Dica operacional exibida no detalhe. */
  tip?: string;
  build: (options?: { clientName?: string }) => string;
};

/** Biblioteca de mensagens WhatsApp prontas para o time comercial/marketing. */
export const MARKETING_MESSAGES: MarketingMessage[] = [
  {
    id: "medicao-a-caminho",
    title: "A caminho da medição técnica",
    description:
      "Avisar o cliente de que a equipe já saiu e está a caminho da medição no local.",
    category: "Funil comercial",
    tip: "Envie poucos minutos antes de chegar. Confirme endereço e se alguém acompanhará a medição.",
    build: (options) => buildMedicaoACaminhoWhatsAppMessage(options),
  },
  {
    id: "conf-tecnica-agendar",
    title: "Lembrete — conferência técnica",
    description:
      "Confirma horário marcado e quem vai na visita técnica (rótulos em negrito, um dado por linha).",
    category: "Funil comercial",
    tip: "No CRM, ao entrar em Conf. Técnica, o formulário pede horário e responsáveis antes de abrir o WhatsApp.",
    build: (options) => buildConfTecnicaWhatsAppMessage(options),
  },
  {
    id: "google-avaliacao",
    title: "Pedir avaliação no Google",
    description:
      "Após a entrega: mensagem com o link curto para o cliente avaliar a Móveis Unghero no Google.",
    category: "Pós-entrega",
    tip: "Envie quando o cliente estiver satisfeito com a instalação — o momento certo aumenta a taxa de resposta.",
    build: (options) =>
      buildGoogleReviewWhatsAppMessage({ clientName: options?.clientName }),
  },
];

export function getMarketingMessageById(id: string) {
  return MARKETING_MESSAGES.find((m) => m.id === id) ?? null;
}
