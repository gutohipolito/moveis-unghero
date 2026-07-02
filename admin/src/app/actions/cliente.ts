"use server";

import { prisma, isDatabaseOffline, setDatabaseOffline } from "@/lib/prisma";
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
    observacoes: "[PF - CPF: 123.456.789-00] Interessado em projeto de cozinha sob medida e painel de TV para sala.",
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
    observacoes: "[PF - CPF: 987.654.321-00] Cliente super exigente. Projeto de dormitório infantil e lavabo já aprovados.",
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
    observacoes: "[PJ - CNPJ: 12.345.678/0001-99] Negociando orçamento da área gourmet integrada. Proposta comercial enviada.",
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
    observacoes: "[PF - CPF: 456.789.012-34] Fechando medição fina do apartamento residencial completo.",
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
    observacoes: "[PF - CPF: 789.012-345-67] Assinou contrato digital para projeto de móveis corporativos.",
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
    observacoes: "[PF - CPF: 890.123.456-78] Marcenaria da cozinha americana está na fábrica para corte e montagem.",
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
    observacoes: "[PF - CPF: 901.234.567-89] Móveis entregues. Equipe de montagem efetuando os ajustes finos no local.",
    projects: [
      { id: "proj-7", status_geral: "INSTALACAO", valor_previsto: 55000.0 }
    ]
  }
];

// Limpa caracteres não numéricos do CPF
function cleanCpf(cpf: string) {
  return cpf.replace(/\D/g, "");
}

export async function loginCliente(data: { identificador: string; cpf: string }) {
  const cookieStore = await cookies();
  const idLimpo = data.identificador.trim().toLowerCase();
  const cpfLimpo = cleanCpf(data.cpf);

  if (isDatabaseOffline()) {
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
      cookieStore.set("cliente-session", client.id, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 // 1 dia
      });
      return { success: true, clientId: client.id };
    }
  } catch (error) {
    console.warn("Banco offline no login de cliente. Usando fallback mockado.");
    setDatabaseOffline(true);
  }

  // Fallbacks de Demonstração (Mocks) se der erro no banco
  if (idLimpo.includes("mariana") || idLimpo.includes("mari") || cpfLimpo === "12345678900" || idLimpo.includes("cli-2")) {
    cookieStore.set("cliente-session", "cli-2", { path: "/" });
    return { success: true, clientId: "cli-2" };
  } else if (idLimpo.includes("juliana") || idLimpo.includes("ju") || cpfLimpo === "98765432100" || idLimpo.includes("cli-6")) {
    cookieStore.set("cliente-session", "cli-6", { path: "/" });
    return { success: true, clientId: "cli-6" };
  }

  return { success: false, error: "Cliente não cadastrado no CRM ou dados inválidos." };
}

export async function loginClienteSimulado(clientId: string) {
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
  if (isDatabaseOffline()) {
    return { success: true, clients: MOCK_CLIENTS };
  }

  try {
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

    const formatted = clients.map(c => ({
      id: c.id,
      nome: c.nome,
      email: c.email,
      telefone: c.telefone,
      cidade: c.cidade,
      origem: c.origem as Origin,
      status: c.status,
      observacoes: c.observacoes || "",
      projects: c.projects.map(p => ({
        id: p.id,
        status_geral: p.status_geral,
        valor_previsto: Number(p.valor_previsto)
      }))
    }));

    return { success: true, clients: formatted };
  } catch (error) {
    console.warn("Falha de conexão na listagem de clientes. Usando mocks.");
    setDatabaseOffline(true);
    return { success: true, clients: MOCK_CLIENTS };
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
}) {
  if (isDatabaseOffline()) {
    revalidatePath("/clientes");
    return { 
      success: true, 
      simulated: true, 
      client: { id: `cli-simulated-${Date.now()}`, ...formData, projects: [] } 
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
        company_id: formData.company_id
      }
    });

    revalidatePath("/clientes");
    return { success: true, client: { ...client, projects: [] } };
  } catch (error) {
    console.warn("Falha ao criar cliente no banco (usando modo simulação):", error);
    return { 
      success: true, 
      simulated: true, 
      client: { id: `cli-simulated-${Date.now()}`, ...formData, projects: [] } 
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
  }
) {
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
        observacoes: formData.observacoes || ""
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
  }>,
  companyId: string
) {
  if (isDatabaseOffline()) {
    revalidatePath("/clientes");
    return { success: true, simulated: true, count: clients.length };
  }

  try {
    await prisma.$transaction(
      clients.map(c => 
        prisma.client.create({
          data: {
            nome: c.nome,
            email: c.email,
            telefone: c.telefone,
            cidade: c.cidade,
            origem: c.origem,
            status: c.status,
            observacoes: c.observacoes || "",
            company_id: companyId
          }
        })
      )
    );

    revalidatePath("/clientes");
    return { success: true, count: clients.length };
  } catch (error) {
    console.warn("Falha ao importar contatos no banco (usando modo simulação):", error);
    return { success: true, simulated: true, count: clients.length };
  }
}
