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
    title: "Agendar conferência técnica",
    description:
      "Após o card entrar em Conf. Técnica: pede datas e horários para a visita de validação no local.",
    category: "Funil comercial",
    tip: "Confirme se alguém que conhece o projeto estará presente e se há restrição de acesso ou estacionamento.",
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
