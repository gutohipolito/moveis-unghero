export const SITE = {
  name: "Móveis Unghero",
  tagline: "Poucos projetos. Residências e empresas inteiras.",
  headline: "A casa inteira.\nNão o cômodo isolado.",
  support: "Marcenaria sob medida em Farroupilha — Serra Gaúcha.",
  manifesto:
    "Trabalhamos poucos projetos por vez. Residências completas e espaços comerciais com uma só linguagem — do primeiro ao último ambiente.",
  filterLine:
    "Não priorizamos cômodos pingados. Se a marcenaria não percorre o espaço como um sistema, talvez não sejamos o encaixe.",
  whatsapp: "5554999971050",
  whatsappDisplay: "(54) 9 9997-1050",
  email: "moveisunghero@gmail.com",
  address: "Rua Cenira Cambruzzi, 155 — Farroupilha, RS",
  years: "Desde 2006",
  partnerPortal: "https://moveisunghero.com.br/parceiro",
} as const;

export const PROCESS_STEPS = [
  {
    title: "Escuta",
    text: "Quantos ambientes? Há arquiteto? Em que momento está a obra?",
  },
  {
    title: "Desenho",
    text: "O espaço como sistema — medidas, materiais, continuidade.",
  },
  {
    title: "Oficina",
    text: "Fabricação em Farroupilha, sob controle nosso.",
  },
  {
    title: "Montagem",
    text: "Equipe própria no encaixe final.",
  },
] as const;

export function buildContactWhatsAppUrl(options?: { name?: string; ambientes?: string }) {
  const parts = [
    "Olá! Gostaria de conversar sobre um projeto com a Móveis Unghero.",
    "",
    `Quantos ambientes entram neste projeto?${options?.ambientes ? ` ${options.ambientes}` : ""}`,
  ];
  if (options?.name?.trim()) {
    parts.unshift(`Olá, sou ${options.name.trim()}.`);
  }
  const text = encodeURIComponent(parts.filter(Boolean).join("\n"));
  return `https://wa.me/${SITE.whatsapp}?text=${text}`;
}
