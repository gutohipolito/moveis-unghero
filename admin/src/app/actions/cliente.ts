"use server";

import { prisma, isDatabaseOffline, setDatabaseOffline } from "@/lib/prisma";
import {
  parseLegacyDocumentFromObs,
  resolveClientDocument,
  type TipoPessoa,
} from "@/lib/clientDocument";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

type Origin = 
  | "SITE"
  | "INSTAGRAM"
  | "INDICACAO"
  | "GOOGLE"
  | "WHATSAPP"
  | "FACEBOOK";

// Mocks iniciais de Clientes
const MOCK_CLIENTS = [
  {
    id: "cli-1",
    nome: "Renato Silveira",
    email: "renato@email.com",
    telefone: "(54) 99876-5432",
    cidade: "Caxias do Sul",
    origem: "INSTAGRAM" as Origin,
    status: "LEAD",
    tipo_pessoa: "PF" as TipoPessoa,
    cpf: "123.456.789-00",
    cnpj: "",
    observacoes: "Interessado em projeto de cozinha sob medida e painel de TV para sala.",
    projects: [
      { id: "proj-1", status_geral: "LEAD", valor_previsto: 45000.0 }
    ]
  },
  {
    id: "cli-2",
    nome: "Mariana Rezende",
    email: "mariana@email.com",
    telefone: "(54) 99123-4567",
    cidade: "Farroupilha",
    origem: "INDICACAO" as Origin,
    status: "APROVADO",
    tipo_pessoa: "PF" as TipoPessoa,
    cpf: "987.654.321-00",
    cnpj: "",
    observacoes: "Cliente super exigente. Projeto de dormitório infantil e lavabo já aprovados.",
    projects: [
      { id: "proj-2", status_geral: "ORCAMENTO", valor_previsto: 78000.0 }
    ]
  },
  {
    id: "cli-3",
    nome: "Carlos Eduardo Costa",
    email: "carlos@email.com",
    telefone: "(54) 98888-2233",
    cidade: "Bento Gonçalves",
    origem: "SITE" as Origin,
    status: "NEGOCIACAO",
    tipo_pessoa: "PJ" as TipoPessoa,
    cpf: "",
    cnpj: "12.345.678/0001-99",
    observacoes: "Negociando orçamento da área gourmet integrada. Proposta comercial enviada.",
    projects: [
      { id: "proj-3", status_geral: "NEGOCIACAO", valor_previsto: 120000.0 }
    ]
  },
  {
    id: "cli-4",
    nome: "Cláudia & Fernando",
    email: "claudia@email.com",
    telefone: "(54) 99900-1122",
    cidade: "Caxias do Sul",
    origem: "GOOGLE" as Origin,
    status: "CONFERENCIA_TECNICA",
    tipo_pessoa: "PF" as TipoPessoa,
    cpf: "456.789.012-34",
    cnpj: "",
    observacoes: "Fechando medição fina do apartamento residencial completo.",
    projects: [
      { id: "proj-4", status_geral: "CONFERENCIA_TECNICA", valor_previsto: 62000.0 }
    ]
  },
  {
    id: "cli-5",
    nome: "Roberto Mendes",
    email: "roberto@email.com",
    telefone: "(54) 99234-8899",
    cidade: "Flores da Cunha",
    origem: "WHATSAPP" as Origin,
    status: "APROVADO",
    tipo_pessoa: "PF" as TipoPessoa,
    cpf: "789.012-345-67",
    cnpj: "",
    observacoes: "Assinou contrato digital para projeto de móveis corporativos.",
    projects: [
      { id: "proj-5", status_geral: "APROVADO", valor_previsto: 35000.0 }
    ]
  },
  {
    id: "cli-6",
    nome: "Juliana Castro",
    email: "juliana@email.com",
    telefone: "(54) 99555-4433",
    cidade: "Farroupilha",
    origem: "INSTAGRAM" as Origin,
    status: "PRODUCAO",
    tipo_pessoa: "PF" as TipoPessoa,
    cpf: "890.123.456-78",
    cnpj: "",
    observacoes: "Marcenaria da cozinha americana está na fábrica para corte e montagem.",
    projects: [
      { id: "proj-6", status_geral: "PRODUCAO", valor_previsto: 89000.0 }
    ]
  },
  {
    id: "cli-7",
    nome: "Lúcia Albuquerque",
    email: "lucia@email.com",
    telefone: "(54) 98111-9988",
    cidade: "Caxias do Sul",
    origem: "INDICACAO" as Origin,
    status: "INSTALACAO",
    tipo_pessoa: "PF" as TipoPessoa,
    cpf: "901.234.567-89",
    cnpj: "",
    observacoes: "Móveis entregues. Equipe de montagem efetuando os ajustes finos no local.",
    projects: [
      { id: "proj-7", status_geral: "INSTALACAO", valor_previsto: 55000.0 }
    ]
  }
];

// Limpa caracteres não numéricos do CPF
function cleanCpf(cpf: string) {
  return cpf.replace(/\D/g, "");
}

function formatClientRecord(c: {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cidade: string;
  origem: string;
  status: string;
  observacoes: string | null;
  tipo_pessoa?: TipoPessoa | null;
  cpf?: string | null;
  cnpj?: string | null;
  cep?: string | null;
  endereco?: string | null;
  numero?: string | null;
  bairro?: string | null;
  uf?: string | null;
  tipo_imovel?: string | null;
  obs_imovel?: string | null;
  obs_entrega?: string | null;
  projects?: { id: string; status_geral: string; valor_previsto: number | { toNumber?: () => number } }[];
}) {
  const doc = resolveClientDocument(c);
  return {
    id: c.id,
    nome: c.nome,
    email: c.email,
    telefone: c.telefone,
    cidade: c.cidade,
    origem: c.origem as Origin,
    status: c.status,
    tipo_pessoa: doc.tipo_pessoa,
    cpf: doc.cpf || "",
    cnpj: doc.cnpj || "",
    observacoes: doc.observacoes,
    cep: c.cep || "",
    endereco: c.endereco || "",
    numero: c.numero || "",
    bairro: c.bairro || "",
    uf: c.uf || "",
    tipo_imovel: c.tipo_imovel || "",
    obs_imovel: c.obs_imovel || "",
    obs_entrega: c.obs_entrega || "",
    projects: (c.projects ?? []).map((p) => ({
      id: p.id,
      status_geral: p.status_geral,
      valor_previsto:
        typeof p.valor_previsto === "number"
          ? p.valor_previsto
          : Number(p.valor_previsto),
    })),
  };
}

let legacyDocumentsMigrated = false;

async function migrateLegacyClientDocumentsIfNeeded() {
  if (legacyDocumentsMigrated || isDatabaseOffline()) return;

  try {
    const legacyClients = await prisma.client.findMany({
      where: {
        OR: [
          { observacoes: { startsWith: "[PF - CPF:" } },
          { observacoes: { startsWith: "[PJ - CNPJ:" } },
        ],
      },
      select: { id: true, observacoes: true, cnpj: true },
    });

    if (legacyClients.length === 0) {
      legacyDocumentsMigrated = true;
      return;
    }

    await prisma.$transaction(
      legacyClients.map((client) => {
        const migrated = parseLegacyDocumentFromObs(client.observacoes);
        return prisma.client.update({
          where: { id: client.id },
          data: {
            tipo_pessoa: migrated.tipo_pessoa,
            cpf: migrated.cpf,
            cnpj: migrated.cnpj || client.cnpj,
            observacoes: migrated.observacoes || null,
          },
        });
      })
    );

    legacyDocumentsMigrated = true;
  } catch (error) {
    console.warn("Falha ao migrar documentos legados de clientes:", error);
  }
}

export async function loginCliente(data: { identificador: string; cpf: string }) {
  const cookieStore = await cookies();
  const idLimpo = data.identificador.trim().toLowerCase();
  const cpfLimpo = cleanCpf(data.cpf);

  const isProduction = process.env.NODE_ENV === "production";

  if (isDatabaseOffline() && !isProduction) {
    // Fallback de Demonstração (Mocks)
    if (idLimpo.includes("mariana") || idLimpo.includes("mari") || cpfLimpo === "12345678900" || idLimpo.includes("cli-2")) {
      cookieStore.set("cliente-session", "cli-2", { path: "/" });
      return { success: true, clientId: "cli-2" };
    } else if (idLimpo.includes("juliana") || idLimpo.includes("ju") || cpfLimpo === "98765432100" || idLimpo.includes("cli-6")) {
      cookieStore.set("cliente-session", "cli-6", { path: "/" });
      return { success: true, clientId: "cli-6" };
    }
    return { success: false, error: "Cliente não cadastrado no CRM ou dados inválidos." };
  }

  try {
    // Busca cliente por email ou telefone
    const client = await prisma.client.findFirst({
      where: {
        OR: [
          { email: idLimpo },
          { telefone: idLimpo }
        ]
      }
    });

    if (client) {
      const doc = resolveClientDocument(client);
      const storedCpf = cleanCpf(doc.cpf || "");
      if (storedCpf && storedCpf !== cpfLimpo) {
        return { success: false, error: "Cliente não cadastrado no CRM ou dados inválidos." };
      }

      cookieStore.set("cliente-session", client.id, {
        path: "/",
        httpOnly: true,
        secure: isProduction,
        maxAge: 60 * 60 * 24 // 1 dia
      });
      return { success: true, clientId: client.id };
    }
  } catch (error) {
    console.warn("Banco offline no login de cliente.");
    if (!isProduction) {
      setDatabaseOffline(true);
    }
  }

  // Fallbacks de Demonstração (Mocks) se der erro no banco (apenas fora de produção)
  if (!isProduction) {
    if (idLimpo.includes("mariana") || idLimpo.includes("mari") || cpfLimpo === "12345678900" || idLimpo.includes("cli-2")) {
      cookieStore.set("cliente-session", "cli-2", { path: "/" });
      return { success: true, clientId: "cli-2" };
    } else if (idLimpo.includes("juliana") || idLimpo.includes("ju") || cpfLimpo === "98765432100" || idLimpo.includes("cli-6")) {
      cookieStore.set("cliente-session", "cli-6", { path: "/" });
      return { success: true, clientId: "cli-6" };
    }
  }

  return { success: false, error: "Cliente não cadastrado no CRM ou dados inválidos." };
}

export async function loginClienteSimulado(clientId: string) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Acesso de demonstração não está disponível em produção.");
  }

  const cookieStore = await cookies();
  cookieStore.set("cliente-session", clientId, {
    path: "/",
    httpOnly: true,
    maxAge: 60 * 60 * 24
  });
  
  redirect("/cliente/dashboard");
}

export async function logoutCliente() {
  const cookieStore = await cookies();
  cookieStore.delete("cliente-session");
  redirect("/cliente/login");
}

// ─── SERVER ACTIONS PARA GERENCIAMENTO DE CLIENTES / LEADS ───

// 1. Listar Clientes
export async function getClients(companyId: string) {
  const isProduction = process.env.NODE_ENV === "production";

  if (isDatabaseOffline() && !isProduction) {
    return { success: true, clients: MOCK_CLIENTS };
  }

  try {
    await migrateLegacyClientDocumentsIfNeeded();

    const clients = await prisma.client.findMany({
      where: {
        company_id: companyId
      },
      include: {
        projects: {
          select: {
            id: true,
            status_geral: true,
            valor_previsto: true
          }
        }
      },
      orderBy: {
        nome: "asc"
      }
    });

    const formatted = clients.map((c) => formatClientRecord(c));

    return { success: true, clients: formatted };
  } catch (error) {
    console.warn("Falha de conexão na listagem de clientes.");
    if (!isProduction) {
      setDatabaseOffline(true);
      return { success: true, clients: MOCK_CLIENTS };
    }
    return { success: false, error: "Erro de conexão ao banco de dados", clients: [] };
  }
}

// 2. Cadastrar Cliente
export async function createClientAction(formData: {
  nome: string;
  email: string;
  telefone: string;
  cidade: string;
  origem: Origin;
  status: string;
  observacoes?: string;
  company_id: string;
  tipo_pessoa?: TipoPessoa;
  cpf?: string;
  cnpj?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  uf?: string;
  tipo_imovel?: string;
  obs_imovel?: string;
  obs_entrega?: string;
}) {
  const tipoPessoa = formData.tipo_pessoa || "PF";
  const cpf = tipoPessoa === "PF" ? formData.cpf || null : null;
  const cnpj = tipoPessoa === "PJ" ? formData.cnpj || null : null;

  if (isDatabaseOffline()) {
    revalidatePath("/clientes");
    return { 
      success: true, 
      simulated: true, 
      client: {
        id: `cli-simulated-${Date.now()}`,
        ...formData,
        tipo_pessoa: tipoPessoa,
        cpf: cpf || "",
        cnpj: cnpj || "",
        projects: [],
      } 
    };
  }

  try {
    const client = await prisma.client.create({
      data: {
        nome: formData.nome,
        email: formData.email,
        telefone: formData.telefone,
        cidade: formData.cidade,
        origem: formData.origem,
        status: formData.status,
        observacoes: formData.observacoes || "",
        company_id: formData.company_id,
        tipo_pessoa: tipoPessoa,
        cpf,
        cnpj,
        cep: formData.cep || null,
        endereco: formData.endereco || null,
        numero: formData.numero || null,
        bairro: formData.bairro || null,
        uf: formData.uf || null,
        tipo_imovel: formData.tipo_imovel || null,
        obs_imovel: formData.obs_imovel || null,
        obs_entrega: formData.obs_entrega || null,
      }
    });

    revalidatePath("/clientes");
    return { success: true, client: formatClientRecord({ ...client, projects: [] }) };
  } catch (error) {
    console.warn("Falha ao criar cliente no banco (usando modo simulação):", error);
    return { 
      success: true, 
      simulated: true, 
      client: {
        id: `cli-simulated-${Date.now()}`,
        ...formData,
        tipo_pessoa: tipoPessoa,
        cpf: cpf || "",
        cnpj: cnpj || "",
        projects: [],
      } 
    };
  }
}

// 3. Editar Cliente
export async function updateClientAction(
  clientId: string,
  formData: {
    nome: string;
    email: string;
    telefone: string;
    cidade: string;
    origem: Origin;
    status: string;
    observacoes?: string;
    tipo_pessoa?: TipoPessoa;
    cpf?: string;
    cnpj?: string;
    cep?: string;
    endereco?: string;
    numero?: string;
    bairro?: string;
    uf?: string;
    tipo_imovel?: string;
    obs_imovel?: string;
    obs_entrega?: string;
  }
) {
  const tipoPessoa = formData.tipo_pessoa || "PF";
  const cpf = tipoPessoa === "PF" ? formData.cpf || null : null;
  const cnpj = tipoPessoa === "PJ" ? formData.cnpj || null : null;

  if (isDatabaseOffline()) {
    revalidatePath("/clientes");
    return { success: true, simulated: true };
  }

  try {
    await prisma.client.update({
      where: { id: clientId },
      data: {
        nome: formData.nome,
        email: formData.email,
        telefone: formData.telefone,
        cidade: formData.cidade,
        origem: formData.origem,
        status: formData.status,
        observacoes: formData.observacoes || "",
        tipo_pessoa: tipoPessoa,
        cpf,
        cnpj,
        cep: formData.cep !== undefined ? formData.cep : undefined,
        endereco: formData.endereco !== undefined ? formData.endereco : undefined,
        numero: formData.numero !== undefined ? formData.numero : undefined,
        bairro: formData.bairro !== undefined ? formData.bairro : undefined,
        uf: formData.uf !== undefined ? formData.uf : undefined,
        tipo_imovel: formData.tipo_imovel !== undefined ? formData.tipo_imovel : undefined,
        obs_imovel: formData.obs_imovel !== undefined ? formData.obs_imovel : undefined,
        obs_entrega: formData.obs_entrega !== undefined ? formData.obs_entrega : undefined,
      }
    });

    revalidatePath("/clientes");
    return { success: true };
  } catch (error) {
    console.warn("Falha ao editar cliente no banco (usando modo simulação):", error);
    return { success: true, simulated: true };
  }
}

// 4. Excluir Cliente
export async function deleteClientAction(clientId: string) {
  if (isDatabaseOffline()) {
    revalidatePath("/clientes");
    return { success: true, simulated: true };
  }

  try {
    const projects = await prisma.project.findMany({ where: { client_id: clientId } });
    const projectIds = projects.map(p => p.id);

    await prisma.$transaction(async (tx) => {
      // Deleta faturas, tarefas, cronogramas, etc
      await tx.installment.deleteMany({ where: { project_id: { in: projectIds } } });
      await tx.task.deleteMany({ where: { project_id: { in: projectIds } } });
      await tx.file.deleteMany({ where: { project_id: { in: projectIds } } });
      await tx.quote.deleteMany({ where: { project_id: { in: projectIds } } });
      await tx.timeline.deleteMany({ where: { project_id: { in: projectIds } } });
      await tx.environment.deleteMany({ where: { project_id: { in: projectIds } } });
      
      // Deleta projetos
      await tx.project.deleteMany({ where: { client_id: clientId } });
      // Deleta o cliente
      await tx.client.delete({ where: { id: clientId } });
    });

    revalidatePath("/clientes");
    return { success: true };
  } catch (error) {
    console.warn("Falha ao excluir cliente no banco (usando modo simulação):", error);
    return { success: true, simulated: true };
  }
}

// 5. Importar Clientes em Lote
export async function importClientsAction(
  clients: Array<{
    nome: string;
    email: string;
    telefone: string;
    cidade: string;
    origem: Origin;
    status: string;
    observacoes?: string;
    tipo_pessoa?: TipoPessoa;
    cpf?: string;
    cnpj?: string;
  }>,
  companyId: string
) {
  if (isDatabaseOffline()) {
    revalidatePath("/clientes");
    return { success: true, simulated: true, count: clients.length };
  }

  try {
    await prisma.$transaction(
      clients.map((c) => {
        const legacy = parseLegacyDocumentFromObs(c.observacoes);
        const tipoPessoa = c.tipo_pessoa || legacy.tipo_pessoa;
        const cpf = c.cpf || legacy.cpf;
        const cnpj = c.cnpj || legacy.cnpj;
        const observacoes = legacy.observacoes || c.observacoes || "";

        return prisma.client.create({
          data: {
            nome: c.nome,
            email: c.email,
            telefone: c.telefone,
            cidade: c.cidade,
            origem: c.origem,
            status: c.status,
            observacoes,
            company_id: companyId,
            tipo_pessoa: tipoPessoa,
            cpf: tipoPessoa === "PF" ? cpf : null,
            cnpj: tipoPessoa === "PJ" ? cnpj : null,
          },
        });
      })
    );

    revalidatePath("/clientes");
    return { success: true, count: clients.length };
  } catch (error) {
    console.warn("Falha ao importar contatos no banco (usando modo simulação):", error);
    return { success: true, simulated: true, count: clients.length };
  }
}

export interface Activity {
  id: string;
  data: string;
  titulo: string;
  descricao: string;
  autor: string;
}

export interface Payment {
  id: string;
  descricao: string;
  valor: number;
  vencimento: string;
  status: "PAGO" | "PENDENTE" | "ATRASADO";
  pagoEm?: string;
  metodo?: string;
}

const MOCK_ACTIVITIES: Record<string, Activity[]> = {
  "cli-1": [
    { id: "act-1", data: "2026-06-15T10:00:00Z", titulo: "Lead Criado", descricao: "Contato inicial gerado a partir do formulário de anúncio do Instagram.", autor: "Sistema" },
    { id: "act-2", data: "2026-06-16T14:30:00Z", titulo: "Primeiro Contato", descricao: "Conversa via WhatsApp para entender as necessidades (Cozinha sob medida e painel da sala).", autor: "Lucas (Comercial)" },
    { id: "act-3", data: "2026-06-20T09:00:00Z", titulo: "Proposta Enviada", descricao: "Apresentação da estimativa de orçamento inicial (R$ 45.000,00).", autor: "Lucas (Comercial)" }
  ],
  "cli-2": [
    { id: "act-4", data: "2026-05-10T09:00:00Z", titulo: "Lead Criado", descricao: "Origem por indicação de outro arquiteto parceiro.", autor: "Felipe (Projetista)" },
    { id: "act-5", data: "2026-05-15T15:00:00Z", titulo: "Projeto 3D Apresentado", descricao: "Apresentação detalhada da modelagem do dormitório infantil e lavabo.", autor: "Felipe (Projetista)" },
    { id: "act-6", data: "2026-06-01T11:00:00Z", titulo: "Proposta Comercial Aprovada", descricao: "Cliente assinou eletronicamente o contrato de prestação de serviços e marcenaria.", autor: "Sistema" },
    { id: "act-7", data: "2026-06-03T14:00:00Z", titulo: "Sinal Pago", descricao: "Entrada financeira recebida via Pix no valor de R$ 26.000,00.", autor: "Ana (Financeiro)" },
    { id: "act-8", data: "2026-06-10T16:00:00Z", titulo: "Conferência Técnica Executada", descricao: "Medição fina a laser realizada no local da obra para liberação dos desenhos executivos.", autor: "Felipe (Projetista)" }
  ],
  "cli-3": [
    { id: "act-9", data: "2026-06-10T08:30:00Z", titulo: "Lead Criado", descricao: "Origem direta por formulário do site institucional.", autor: "Sistema" },
    { id: "act-10", data: "2026-06-12T10:00:00Z", titulo: "Visita Técnica", descricao: "Visita ao imóvel comercial para levantamento de briefing e fotos.", autor: "Lucas (Comercial)" },
    { id: "act-11", data: "2026-06-25T17:00:00Z", titulo: "Apresentação Comercial", descricao: "Envio de proposta formal de R$ 120.000,00 para aprovação corporativa.", autor: "Lucas (Comercial)" }
  ]
};

const MOCK_PAYMENTS: Record<string, Payment[]> = {
  "cli-1": [
    { id: "pay-1", descricao: "Sinal Contratual (1/2)", valor: 22500.0, vencimento: "2026-06-22", status: "PENDENTE" },
    { id: "pay-2", descricao: "Entrega Técnica (2/2)", valor: 22500.0, vencimento: "2026-07-22", status: "PENDENTE" }
  ],
  "cli-2": [
    { id: "pay-3", descricao: "Sinal de Entrada (1/3)", valor: 26000.0, vencimento: "2026-06-03", status: "PAGO", pagoEm: "2026-06-03", metodo: "PIX" },
    { id: "pay-4", descricao: "Medição Executiva (2/3)", valor: 26000.0, vencimento: "2026-07-03", status: "PAGO", pagoEm: "2026-07-01", metodo: "PIX" },
    { id: "pay-5", descricao: "Entrega Final (3/3)", valor: 26000.0, vencimento: "2026-08-03", status: "PENDENTE" }
  ],
  "cli-3": [
    { id: "pay-6", descricao: "Parcela Única à Vista", valor: 120000.0, vencimento: "2026-07-05", status: "PENDENTE" }
  ],
  "cli-4": [
    { id: "pay-7", descricao: "Entrada (50%)", valor: 31000.0, vencimento: "2026-06-20", status: "PAGO", pagoEm: "2026-06-20", metodo: "Transferência" },
    { id: "pay-8", descricao: "Parcela Final (50%)", valor: 31000.0, vencimento: "2026-07-20", status: "PENDENTE" }
  ],
  "cli-5": [
    { id: "pay-9", descricao: "Sinal (1/2)", valor: 17500.0, vencimento: "2026-06-15", status: "PAGO", pagoEm: "2026-06-14", metodo: "PIX" },
    { id: "pay-10", descricao: "Entrega (2/2)", valor: 17500.0, vencimento: "2026-07-15", status: "PENDENTE" }
  ],
  "cli-6": [
    { id: "pay-11", descricao: "Sinal (1/2)", valor: 44500.0, vencimento: "2026-05-10", status: "PAGO", pagoEm: "2026-05-10", metodo: "Pix" },
    { id: "pay-12", descricao: "Faturamento (2/2)", valor: 44500.0, vencimento: "2026-06-10", status: "ATRASADO" }
  ],
  "cli-7": [
    { id: "pay-13", descricao: "Entrada Contratual", valor: 27500.0, vencimento: "2026-04-20", status: "PAGO", pagoEm: "2026-04-20", metodo: "Boleto" },
    { id: "pay-14", descricao: "Entrega Montagem", valor: 27500.0, vencimento: "2026-06-20", status: "PAGO", pagoEm: "2026-06-18", metodo: "Pix" }
  ]
};

export async function getClientDetailsAction(clientId: string) {
  const isProduction = process.env.NODE_ENV === "production";

  if (isDatabaseOffline() && !isProduction) {
    const client = MOCK_CLIENTS.find(c => c.id === clientId) || MOCK_CLIENTS[0];
    const activities = MOCK_ACTIVITIES[clientId] || [
      { id: `act-${Date.now()}`, data: new Date().toISOString(), titulo: "Acesso de Registro", descricao: "Visualização das informações cadastrais do cliente no sistema.", autor: "Sistema" }
    ];
    const payments = MOCK_PAYMENTS[clientId] || [];
    return {
      success: true,
      client,
      activities,
      payments
    };
  }

  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        projects: {
          select: {
            id: true,
            status_geral: true,
            valor_previsto: true
          }
        }
      }
    });

    if (!client) {
      if (!isProduction) {
        const mockCli = MOCK_CLIENTS.find(c => c.id === clientId) || MOCK_CLIENTS[0];
        return {
          success: true,
          client: mockCli,
          activities: MOCK_ACTIVITIES[clientId] || [],
          payments: MOCK_PAYMENTS[clientId] || []
        };
      }
      return { success: false, error: "Cliente não encontrado" };
    }

    const formattedClient = formatClientRecord(client);

    return {
      success: true,
      client: formattedClient,
      activities: MOCK_ACTIVITIES[clientId] || [
        { id: `act-${Date.now()}`, data: new Date().toISOString(), titulo: "Registro de Cadastro", descricao: "Acesso de consulta do perfil do cliente.", autor: "Sistema" }
      ],
      payments: MOCK_PAYMENTS[clientId] || []
    };
  } catch (e) {
    if (!isProduction) {
      const mockCli = MOCK_CLIENTS.find(c => c.id === clientId) || MOCK_CLIENTS[0];
      return {
        success: true,
        client: mockCli,
        activities: MOCK_ACTIVITIES[clientId] || [],
        payments: MOCK_PAYMENTS[clientId] || []
      };
    }
    return { success: false, error: "Erro de conexão ao banco de dados" };
  }
}

export async function addActivityAction(clientId: string, titulo: string, descricao: string, autor: string) {
  const newActivity: Activity = {
    id: `act-new-${Date.now()}`,
    data: new Date().toISOString(),
    titulo,
    descricao,
    autor
  };
  return {
    success: true,
    activity: newActivity
  };
}

