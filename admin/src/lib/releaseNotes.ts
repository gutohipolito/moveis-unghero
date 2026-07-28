/**
 * Histórico e inventário do painel — conteúdo estático para /notas-da-versao.
 * Atualize aqui ao fechar um marco relevante (sem datas).
 */

export type ReleaseFeatureGroup = {
  title: string;
  items: string[];
};

export type ReleaseNote = {
  title: string;
  summary?: string;
  items: string[];
};

/** O que o sistema cobre hoje, por área. */
export const SYSTEM_CAPABILITIES: ReleaseFeatureGroup[] = [
  {
    title: "Comercial",
    items: [
      "Funil comercial (CRM) com etapas de negociação, aprovação, conferência técnica e produção",
      "Cadastro de clientes (PF/PJ) com cidade/bairro padronizados e privacidade de dados sensíveis",
      "Orçamentos com templates (incluindo Proposta Comparativa), PDF A4, condições de pagamento e modo privado",
      "Links públicos de proposta com senha pelos 4 dígitos do celular e rastreio de aberturas",
      "Aprovação parcial por item, múltiplos orçamentos aprovados e vínculo com arquitetos/parceiros",
      "Catálogo de produtos e mostruário visual, com catálogos em PDF/imagem",
      "Contratos em papel timbrado com templates editáveis",
      "Parceiros (projetistas e arquitetos) com projetos, fotos e consulta de CNPJ",
    ],
  },
  {
    title: "Produção",
    items: [
      "Chão de fábrica com fila por projeto/ambientes após aprovação",
      "Agenda com visitas, medições, entregas e instalações",
      "Chamados de insumos com anexos e aviso à Diretoria",
      "Portal do colaborador (disponível na operação da fábrica)",
    ],
  },
  {
    title: "Logística",
    items: [
      "Estoque e fornecedores, com cadastro rápido por CNPJ",
      "Logística e entrega: expedição, montagem e qualidade",
    ],
  },
  {
    title: "Financeiro",
    items: [
      "Contas a receber por projeto, parcelas e saldo",
      "Recibos PDF (avulso ou por parcela) com número RCB, QR de validação e link público protegido",
      "Contas a pagar, DRE em regime de caixa e rentabilidade por obra",
    ],
  },
  {
    title: "Marketing e captação",
    items: [
      "Pedidos de avaliação e formulários públicos (cliente, fornecedor)",
      "Cadastro público de cliente em moveisunghero.com.br",
      "Analytics de acessos do site",
    ],
  },
  {
    title: "Administração e segurança",
    items: [
      "Cargos e permissões por módulo (incluindo Somente leitura / VIEWER)",
      "Equipe interna com fotos, funções e cadastro sem login",
      "Cofre de acessos (logins de sistemas) na Administração",
      "Privacidade unificada (olhos do header) com revelação temporária de 30s",
      "Notificações in-app estilo macOS, rate limit no login e endurecimento de AppSec",
      "Área de Melhorias com sugestões dos operadores",
      "Backup diário dos dados via snapshot no Neon",
    ],
  },
  {
    title: "Visão geral",
    items: [
      "Relatórios e inteligência comercial (BI)",
      "Site institucional e painel admin no mesmo monorepo",
    ],
  },
];

/**
 * Marcos da evolução — do mais recente para o mais antigo.
 * Cada bloco é um “pacote” de entrega, não um commit isolado.
 */
export const RELEASE_NOTES: ReleaseNote[] = [
  {
    title: "Endereços padronizados",
    summary:
      "Cidade e bairro mais consistentes nos cadastros — menos “Farroupilha Rs” e bairros sem acento.",
    items: [
      "Cidade da Serra em lista (com opção Outra) nos formulários de cliente e parceiros",
      "Sugestão de bairros de Farroupilha ao digitar; ViaCEP compartilhado no CEP",
      "Normalização no servidor (UF fora da cidade, Title Case e acentos canônicos)",
      "CNPJ como primeiro campo no cadastro de fornecedor (preenche o restante)",
      "Script de backfill para limpar registros antigos (scripts/address-backfill.ts)",
    ],
  },
  {
    title: "Recibos profissionais",
    summary:
      "Emissão e compartilhamento de recibos no padrão da marca, prontos para o cliente.",
    items: [
      "Número RCB-AAAA-######, header escuro e referência por ambientes",
      "Resumo financeiro no parcelado: total do projeto, valor da parcela em destaque e saldo (ou Projeto quitado)",
      "Texto jurídico direto, bandeiras de pagamento, QR de validação e WhatsApp no rodapé",
      "Link público com senha pelos 4 dígitos do telefone (mesmo padrão do orçamento)",
      "Assinaturas alinhadas (Cladenir + pagador) e lembrete no CRM após aprovação",
    ],
  },
  {
    title: "Orçamento público mais seguro",
    summary: "Acesso do cliente ao PDF com PIN e experiência de abertura refinada.",
    items: [
      "Senha pelos últimos 4 dígitos do celular",
      "Tela de senha redesenhada (overlay e copy claros)",
      "PDF sempre em A4, sem avisos internos no documento do cliente",
      "Rastreio de abertura do link com dispositivo e sistema operacional",
    ],
  },
  {
    title: "Privacidade e cargo Somente leitura",
    summary: "Controle fino do que cada pessoa vê no painel.",
    items: [
      "Cargo VIEWER com mutações bloqueadas e privacidade travada",
      "Redação de valores e PII no servidor para visualizadores",
      "Olho de privacidade unificado entre páginas, CRM e histórico",
      "Viewer sem acesso a financeiro, estoque e logística",
    ],
  },
  {
    title: "Funil comercial mais operacional",
    summary: "O CRM passa a acompanhar melhor a vida do card após a venda.",
    items: [
      "Etapa de conferência técnica entre Aprovados e Produção",
      "Modal de negociação remodelado (incluindo mobile)",
      "Aba Aberturas com histórico do link da proposta",
      "Avatares dos responsáveis e data de entrada nas etapas-chave",
      "SLA de follow-up configurável pelo operador",
    ],
  },
  {
    title: "Orçamentos e catálogo",
    summary: "Proposta comercial completa, do item ao PDF.",
    items: [
      "Template Proposta Comparativa e densidade progressiva no PDF",
      "Aprovação parcial por item com pendências comerciais",
      "Código legível por iniciais e data; filtro por criação e aprovados",
      "Mostruário de produtos, galeria multi-foto e catálogos de marcas",
      "Card de arquiteto verificado e condições de pagamento no PDF",
    ],
  },
  {
    title: "Financeiro e DRE",
    summary: "Do recebimento do projeto ao resultado da obra.",
    items: [
      "Contas a receber com parcelas e emissão de recibo",
      "Contas a pagar / despesas",
      "DRE mensal em regime de caixa",
      "Rentabilidade por obra (receita menos custos vinculados)",
    ],
  },
  {
    title: "Produção e fábrica",
    summary: "Do orçamento aprovado à fila de fabricação.",
    items: [
      "Ambientes criados automaticamente na fila ao aprovar proposta",
      "Chão de fábrica com pilhas por projeto e ficha técnica",
      "Chamados de insumos com imagens anexadas",
      "Agenda derivada de leads e produção",
    ],
  },
  {
    title: "Equipe, acessos e permissões",
    summary: "Quem entra no sistema e o que cada cargo pode fazer.",
    items: [
      "Matriz de permissões por cargo gerenciável pela Diretoria",
      "Cards de equipe com múltiplas funções, foto e cadastro sem acesso",
      "Cofre de logins de sistemas externos",
      "Signup público fechado; cadastro só pela Diretoria",
      "Rate limit no login e reforços de segurança",
    ],
  },
  {
    title: "Captação e marketing",
    summary: "Entrada de leads e parceiros fora do painel.",
    items: [
      "Formulário público de cadastro de cliente",
      "Cadastro nativo em moveisunghero.com.br/cadastro",
      "Formulários unificados (progresso, LGPD, fornecedores)",
      "Pedidos de avaliação e analytics do site",
    ],
  },
  {
    title: "Base do painel",
    summary: "Fundação do SaaS interno da Móveis Unghero.",
    items: [
      "CRM, clientes, orçamentos, produtos, contratos e parceiros",
      "Estoque, fornecedores, logística e entrega",
      "Relatórios (BI), configurações e branding MU",
      "Área de Melhorias com botão flutuante de sugestões",
      "Backup diário via snapshot Neon e deploy na Vercel",
    ],
  },
];
