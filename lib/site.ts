export const SITE = {
  name: "Móveis Unghero",
  tagline: "Poucos projetos. Residências e empresas inteiras. Feito para durar.",
  headline: "Residências e empresas, do projeto à montagem.",
  support:
    "Marcenaria sob medida em Farroupilha — priorizamos projetos integrais, não cômodos isolados.",
  whatsapp: "5554999971050",
  whatsappDisplay: "(54) 9 9997-1050",
  email: "moveisunghero@gmail.com",
  address: "Rua Cenira Cambruzzi, 155 — Planalto, Farroupilha — RS",
  years: "19+",
  partnerPortal: "https://moveisunghero.com.br/parceiro",
} as const;

export const PROCESS_STEPS = [
  {
    title: "Conversa",
    text: "Entendemos o escopo: quantos ambientes entram, se há arquiteto e o momento da obra.",
  },
  {
    title: "Projeto técnico",
    text: "Medição, desenho e alinhamento de materiais — a casa ou o espaço comercial como um sistema.",
  },
  {
    title: "Fabricação",
    text: "Produção na fábrica em Farroupilha, com controle de acabamento e ferragens.",
  },
  {
    title: "Montagem",
    text: "Instalação pela equipe própria, cuidando do encaixe final e dos detalhes.",
  },
] as const;

export const PRIORITIES = [
  "Projetos integrais — residência ou empresa como um todo",
  "Parceria com arquitetos e projetistas",
  "Acabamento e prazo honestos",
] as const;

/** Mensagem WhatsApp com pergunta de escopo (filtro de demanda). */
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
