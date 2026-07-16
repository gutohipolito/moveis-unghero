import { buildWhatsAppUrl, getFirstName } from "@/lib/google-review";

export function buildContractWhatsAppMessage(options: {
  clientName: string;
  contractUrl: string;
}) {
  const firstName = getFirstName(options.clientName);

  return [
    `Olá ${firstName}, tudo bem?`,
    "",
    "Segue o *contrato de prestação de serviço* da Móveis Unghero para sua conferência e assinatura:",
    "",
    options.contractUrl,
    "",
    "Qualquer dúvida, estamos à disposição!",
    "Equipe Móveis Unghero",
  ].join("\n");
}

export function openContractWhatsApp(phone: string, message: string) {
  const url = buildWhatsAppUrl(phone, message);
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}
