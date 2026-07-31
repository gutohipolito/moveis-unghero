import { buildWhatsAppUrl, getFirstName } from "@/lib/google-review";

/** Aviso ao cliente de que a equipe está a caminho da medição técnica. */
export function buildMedicaoACaminhoWhatsAppMessage(options?: {
  clientName?: string;
}) {
  const greeting = options?.clientName?.trim()
    ? `Olá ${getFirstName(options.clientName)}, tudo bem?`
    : "Olá, tudo bem?";

  return [
    greeting,
    "",
    "Passando para avisar que a equipe da Móveis Unghero *já está a caminho* da *medição técnica* do seu projeto.",
    "",
    "Em breve chegamos ao local. Se possível, peça para alguém que conheça o ambiente estar presente para acompanhar as medidas.",
    "",
    "Qualquer imprevisto no acesso, estacionamento ou horário, me avise por aqui.",
    "",
    "Até já!",
    "Equipe Móveis Unghero",
  ].join("\n");
}

export function openMedicaoACaminhoWhatsApp(phone: string, message: string) {
  const url = buildWhatsAppUrl(phone, message);
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}
