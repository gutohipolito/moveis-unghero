import { buildWhatsAppUrl, getFirstName } from "@/lib/google-review";

export type ConfTecnicaWhatsAppMessageOptions = {
  clientName?: string;
  /** Ex.: "Sexta, 15/08 às 14h" */
  horario?: string;
  /** Ex.: "Ana (projetista) e Carlos" */
  quemVai?: string;
};

/**
 * Lembrete WhatsApp da visita de conferência técnica.
 * Labels em negrito (*texto*) e o valor na linha seguinte.
 */
export function buildConfTecnicaWhatsAppMessage(
  options?: ConfTecnicaWhatsAppMessageOptions
) {
  const greeting = options?.clientName?.trim()
    ? `Olá ${getFirstName(options.clientName)}, tudo bem?`
    : "Olá, tudo bem?";

  const horario = options?.horario?.trim() || "";
  const quemVai = options?.quemVai?.trim() || "";

  const lines = [
    greeting,
    "",
    "Passando para confirmar a *conferência técnica* (visita de medição/validação) do seu projeto na Móveis Unghero.",
  ];

  if (horario) {
    lines.push("", "*Horário marcado:*", horario);
  }

  if (quemVai) {
    lines.push("", "*Quem vai:*", quemVai);
  }

  lines.push(
    "",
    "No dia, pedimos que alguém que conheça o projeto esteja presente no local.",
    "",
    "Qualquer dúvida, estou à disposição!",
    "Equipe Móveis Unghero"
  );

  return lines.join("\n");
}

export function openConfTecnicaWhatsApp(phone: string, message: string) {
  const url = buildWhatsAppUrl(phone, message);
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}
