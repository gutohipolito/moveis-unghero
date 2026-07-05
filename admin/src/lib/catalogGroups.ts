export interface CatalogGroupMeta {
  slug: string;
  nome: string;
  descricao: string;
  usadoEm: string;
  permiteSubitens: boolean;
  defaultItems: { label: string; slug?: string; ordem: number }[];
}

/** Metadados das listas configuráveis — espelham os grupos persistidos no banco. */
export const CATALOG_GROUP_META: CatalogGroupMeta[] = [
  {
    slug: "veiculos",
    nome: "Veículos e Fretes",
    descricao: "Frota própria, veículos alugados ou fretes terceirizados usados nas expedições.",
    usadoEm: "Logística e Entrega → Agendar entrega → campo Veículo / Frete",
    permiteSubitens: false,
    defaultItems: [
      { label: "Caminhão 1 - Mercedes Accelo 815", ordem: 1 },
      { label: "Iveco Daily Cargo 30S13", ordem: 2 },
      { label: "Fretado Terceirizado Express", ordem: 3 },
    ],
  },
  {
    slug: "categorias_estoque",
    nome: "Categorias de insumos",
    descricao: "Classificação dos materiais cadastrados no estoque da marcenaria.",
    usadoEm: "Estoque e Fornecedores → Cadastrar insumo → campo Categoria",
    permiteSubitens: false,
    defaultItems: [
      { slug: "CHAPAS_MDF", label: "Chapas MDF", ordem: 1 },
      { slug: "FERRAGENS", label: "Ferragens", ordem: 2 },
      { slug: "ILUMINACAO", label: "Iluminação", ordem: 3 },
      { slug: "TINTAS_QUIMICOS", label: "Tintas & Químicos", ordem: 4 },
      { slug: "OUTROS", label: "Outros", ordem: 5 },
    ],
  },
  {
    slug: "tipos_comodo",
    nome: "Tipos de cômodo",
    descricao: "Ambientes planejados vinculados aos projetos e ao chão de fábrica.",
    usadoEm: "Projeto → Cômodos / Chão de Fábrica",
    permiteSubitens: false,
    defaultItems: [
      { slug: "COZINHA", label: "Cozinha", ordem: 1 },
      { slug: "CLOSET", label: "Closet", ordem: 2 },
      { slug: "DORMITORIO", label: "Dormitório", ordem: 3 },
      { slug: "BANHEIRO", label: "Banheiro", ordem: 4 },
      { slug: "OUTROS", label: "Outros", ordem: 5 },
    ],
  },
];

/** Listas fixas no código — exibidas como referência na página de Cadastros. */
export const FIXED_CATALOG_REFERENCES = [
  {
    nome: "Origem do contato",
    usadoEm: "Contatos / Funil comercial → campo Origem",
    ondeCadastrar: "Valores fixos do sistema (Site, Instagram, Indicação…). Para novas origens, solicite ao suporte.",
    itens: ["Site", "Instagram", "Indicação", "Google", "WhatsApp", "Facebook"],
  },
  {
    nome: "Tipos de tarefa na agenda",
    usadoEm: "Projeto → Agenda / Tarefas",
    ondeCadastrar: "Valores fixos do sistema (Visita comercial, Medição técnica, Entrega…).",
    itens: ["Visita comercial", "Medição técnica", "Entrega de móveis", "Instalação", "Outros"],
  },
  {
    nome: "Projetistas e arquitetos (parceiros)",
    usadoEm: "Comercial → parceiros que indicam ou co-projetam",
    ondeCadastrar: "Menu Projetistas e Arquitetos — profissionais externos (não são colaboradores com login).",
    itens: ["Projetista", "Arquiteto", "Decorador", "Engenheiro", "Outros"],
    linkHref: "/parceiros",
    linkLabel: "Ir para Projetistas e Arquitetos",
  },
  {
    nome: "Colaboradores (equipe interna)",
    usadoEm: "Chão de Fábrica → Responsável / Ajudante",
    ondeCadastrar: "Menu Colaboradores — cadastre usuários com cargo Produção ou outro.",
    itens: [],
    linkHref: "/colaboradores",
    linkLabel: "Ir para Colaboradores",
  },
];

export function getCatalogGroupMeta(slug: string) {
  return CATALOG_GROUP_META.find((g) => g.slug === slug);
}
