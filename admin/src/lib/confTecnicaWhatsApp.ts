import { buildWhatsAppUrl, getFirstName } from "@/lib/google-review";

export function buildConfTecnicaWhatsAppMessage(options: { clientName: string }) {
  const firstName = getFirstName(options.clientName);

  return [
    `Olá ${firstName}, tudo bem?`,
    "",
    "Seu projeto na Móveis Unghero avançou para a *conferência técnica* — etapa em que nossa equipe visita o local para validar medidas, acessos e detalhes antes da produção.",
    "",
    "Pode me indicar *datas e horários* que funcionam bem para você? Se preferir, diga se prefere *manhã* ou *tarde*.",
    "",
    "No dia, pedimos que alguém que conheça o projeto esteja presente no local.",
    "",
    "Qualquer dúvida, estou à disposição!",
    "Equipe Móveis Unghero",
  ].join("\n");
}

export function openConfTecnicaWhatsApp(phone: string, message: string) {
  const url = buildWhatsAppUrl(phone, message);
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}
