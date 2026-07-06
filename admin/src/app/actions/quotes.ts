"use server";

import { prisma, isDatabaseOffline } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ensureActorUserId } from "@/lib/currentUser";

export type ItemType = 
  | "MOVEIS_MDF"
  | "FERRAGENS_ESPECIAIS"
  | "MAO_DE_OBRA"
  | "OUTROS";

export interface CreateQuoteInput {
  subtotal: number;
  desconto: number;
  valor_final: number;
  validade: string;
  observacoes?: string;
  template_tipo?: string;
  items: {
    descricao: string;
    quantidade: number;
    tipo_custo: ItemType;
    valor_unitario: number;
    valor_total: number;
  }[];
}

// Cria um novo orçamento com controle de versão
export async function createQuote(projectId: string, data: CreateQuoteInput) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Busca orçamentos existentes do projeto para determinar a próxima versão
      const existingQuotes = await tx.quote.findMany({
        where: { project_id: projectId }
      });
      const nextVersion = existingQuotes.length > 0 
        ? Math.max(...existingQuotes.map(q => q.versao)) + 1 
        : 1;

      // 2. Cria a Quote
      const quote = await tx.quote.create({
        data: {
          project_id: projectId,
          versao: nextVersion,
          subtotal: data.subtotal,
          desconto: data.desconto,
          valor_final: data.valor_final,
          validade: new Date(data.validade),
          observacoes: data.observacoes || "",
        }
      });

      // 3. Cria os QuoteItems
      if (data.items.length > 0) {
        await tx.quoteItem.createMany({
          data: data.items.map(item => ({
            quote_id: quote.id,
            descricao: item.descricao,
            quantidade: item.quantidade,
            tipo_custo: item.tipo_custo,
            valor_unitario: item.valor_unitario,
            valor_total: item.valor_total
          }))
        });
      }

      // 4. Cria evento na Timeline
      await tx.timeline.create({
        data: {
          project_id: projectId,
          acao: `Orçamento comercial v${nextVersion} criado no valor de ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(data.valor_final)}`,
          interno_sotamente: false,
          user_id: await ensureActorUserId()
        }
      });

      return { 
        quote: {
          id: quote.id,
          project_id: quote.project_id,
          versao: quote.versao,
          subtotal: Number(quote.subtotal),
          desconto: Number(quote.desconto),
          valor_final: Number(quote.valor_final),
          validade: quote.validade.toISOString(),
          observacoes: quote.observacoes
        },
        version: nextVersion 
      };
    });

    revalidatePath(`/projects/${projectId}`);
    return { success: true, data: result };
  } catch (error) {
    console.error("Erro na Server Action createQuote:", error);
    const isProduction = process.env.NODE_ENV === "production";
    if (isDatabaseOffline() && !isProduction) {
      const simulatedVersion = Math.floor(Math.random() * 3) + 1;
      const mockQuote = {
        id: `simulated-quote-${Math.random().toString(36).substr(2, 9)}`,
        project_id: projectId,
        versao: simulatedVersion,
        subtotal: data.subtotal,
        desconto: data.desconto,
        valor_final: data.valor_final,
        validade: new Date(data.validade).toISOString(),
        observacoes: data.observacoes || ""
      };
      return { 
        success: true, 
        simulated: true, 
        data: { quote: mockQuote, version: simulatedVersion } 
      };
    }
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Erro desconhecido ao salvar orçamento no banco remoto" 
    };
  }
}

// Atualiza o status do orçamento e, se aprovado, atualiza o status do projeto principal
export async function approveQuote(projectId: string, quoteId: string, version: number) {
  try {
    // 1. Atualiza o status geral do projeto para APROVADO
    await prisma.project.update({
      where: { id: projectId },
      data: { status_geral: "APROVADO" }
    });

    // 2. Registra o evento de aprovação de proposta na timeline
    await prisma.timeline.create({
      data: {
        project_id: projectId,
        acao: `Proposta comercial v${version} foi APROVADA pelo cliente. Projeto movido para a etapa de Preparação Técnica.`,
        interno_sotamente: false,
        user_id: await ensureActorUserId()
      }
    });

    revalidatePath(`/projects/${projectId}`);
    return { success: true };
  } catch (error) {
    console.error("Erro na Server Action approveQuote:", error);
    const isProduction = process.env.NODE_ENV === "production";
    if (isDatabaseOffline() && !isProduction) {
      return { success: true, simulated: true };
    }
    return { success: false, error: error instanceof Error ? error.message : "Erro ao aprovar orçamento no banco remoto" };
  }
}

// Remove um orçamento
export async function deleteQuote(projectId: string, quoteId: string, version: number) {
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Remove itens
      await tx.quoteItem.deleteMany({
        where: { quote_id: quoteId }
      });
      // 2. Remove quote
      await tx.quote.delete({
        where: { id: quoteId }
      });
      // 3. Registra na timeline
      await tx.timeline.create({
        data: {
          project_id: projectId,
          acao: `Orçamento comercial v${version} foi excluído do sistema`,
          interno_sotamente: true,
          user_id: await ensureActorUserId()
        }
      });
    });

    revalidatePath(`/projects/${projectId}`);
    return { success: true };
  } catch (error) {
    console.error("Erro na Server Action deleteQuote:", error);
    const isProduction = process.env.NODE_ENV === "production";
    if (isDatabaseOffline() && !isProduction) {
      return { success: true, simulated: true };
    }
    return { success: false, error: error instanceof Error ? error.message : "Erro ao excluir orçamento no banco remoto" };
  }
}

// Busca todos os orçamentos do sistema
export async function getQuotes() {
  try {
    const quotes = await prisma.quote.findMany({
      include: {
        project: {
          include: {
            client: true
          }
        },
        items: true
      },
      orderBy: {
        validade: "desc"
      }
    });
    // Convertemos campos Decimal para number e datas para ISOString para evitar problemas de serialização nas Server Actions
    const serializedQuotes = quotes.map(q => ({
      ...q,
      subtotal: Number(q.subtotal),
      desconto: Number(q.desconto),
      valor_final: Number(q.valor_final),
      validade: q.validade instanceof Date ? q.validade.toISOString() : q.validade,
      project: q.project ? {
        ...q.project,
        valor_previsto: Number(q.project.valor_previsto)
      } : null,
      items: q.items.map(item => ({
        ...item,
        valor_unitario: Number(item.valor_unitario),
        valor_total: Number(item.valor_total)
      }))
    }));
    return { success: true, data: serializedQuotes };
  } catch (error) {
    console.warn("Erro ao buscar orçamentos:", error);
    
    const isProduction = process.env.NODE_ENV === "production";
    if (isProduction) {
      return { success: false, error: "Erro de conexão ao banco de dados", data: [] };
    }
    
    // Retorna dados simulados estruturados idênticos ao schema
    const mockQuotes = [
      {
        id: "q-mock-1",
        project_id: "p-mock-1",
        versao: 1,
        subtotal: 15400.00,
        desconto: 1400.00,
        valor_final: 14000.00,
        validade: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        observacoes: "Pagamento facilitado em 3x no cartão.",
        project: {
          id: "p-mock-1",
          status_geral: "ORCAMENTO",
          client: {
            id: "c-mock-1",
            nome: "José Carlos Silva",
            cidade: "Bento Gonçalves"
          }
        },
        items: [
          { id: "qi-mock-1", quote_id: "q-mock-1", descricao: "Móveis planejados para Cozinha MDF Grafite", quantidade: 1, tipo_custo: "MOVEIS_MDF" as const, valor_unitario: 12400.00, valor_total: 12400.00 },
          { id: "qi-mock-2", quote_id: "q-mock-1", descricao: "Ferragens especiais com amortecedor Blum", quantidade: 1, tipo_custo: "FERRAGENS_ESPECIAIS" as const, valor_unitario: 3000.00, valor_total: 3000.00 }
        ]
      },
      {
        id: "q-mock-2",
        project_id: "p-mock-2",
        versao: 2,
        subtotal: 28000.00,
        desconto: 2000.00,
        valor_final: 26000.00,
        validade: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        observacoes: "Cliente solicitou inclusão do painel de TV da sala.",
        project: {
          id: "p-mock-2",
          status_geral: "APROVADO",
          client: {
            id: "c-mock-2",
            nome: "Mariana Souza Santos",
            cidade: "Caxias do Sul"
          }
        },
        items: [
          { id: "qi-mock-3", quote_id: "q-mock-2", descricao: "Móveis planejados para Cozinha e Painel de TV", quantidade: 1, tipo_custo: "MOVEIS_MDF" as const, valor_unitario: 25000.00, valor_total: 25000.00 },
          { id: "qi-mock-4", quote_id: "q-mock-2", descricao: "Mão de obra de instalação especializada", quantidade: 1, tipo_custo: "MAO_DE_OBRA" as const, valor_unitario: 3000.00, valor_total: 3000.00 }
        ]
      },
      {
        id: "q-mock-3",
        project_id: "p-mock-3",
        versao: 1,
        subtotal: 9200.00,
        desconto: 500.00,
        valor_final: 8700.00,
        validade: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
        observacoes: "Sem observações adicionais.",
        project: {
          id: "p-mock-3",
          status_geral: "LEAD",
          client: {
            id: "c-mock-3",
            nome: "Arthur Ferreira Lima",
            cidade: "Farroupilha"
          }
        },
        items: [
          { id: "qi-mock-5", quote_id: "q-mock-3", descricao: "Banheiro planejado em MDF Branco TX e nichos", quantidade: 1, tipo_custo: "MOVEIS_MDF" as const, valor_unitario: 8700.00, valor_total: 8700.00 }
        ]
      }
    ];
    return { success: true, data: mockQuotes, simulated: true };
  }
}

// Busca todos os projetos ativos para seleção no construtor de orçamentos
export async function getProjectsForQuotes() {
  try {
    const projects = await prisma.project.findMany({
      include: {
        client: true
      },
      orderBy: {
        status_geral: "asc"
      }
    });
    const serializedProjects = projects.map(p => ({
      id: p.id,
      valor_previsto: Number(p.valor_previsto),
      status_geral: p.status_geral,
      client: {
        id: p.client.id,
        nome: p.client.nome,
        cidade: p.client.cidade
      }
    }));
    return { success: true, data: serializedProjects };
  } catch (error) {
    console.warn("Erro ao buscar projetos para orçamentos:", error);
    const isProduction = process.env.NODE_ENV === "production";
    if (isProduction) {
      return { success: false, error: "Erro de conexão ao banco de dados", data: [] };
    }
    const mockProjects = [
      { id: "p-mock-1", status_geral: "ORCAMENTO", client: { id: "c-mock-1", nome: "José Carlos Silva", cidade: "Bento Gonçalves" } },
      { id: "p-mock-2", status_geral: "NEGOCIACAO", client: { id: "c-mock-2", nome: "Mariana Souza Santos", cidade: "Caxias do Sul" } },
      { id: "p-mock-3", status_geral: "LEAD", client: { id: "c-mock-3", nome: "Arthur Ferreira Lima", cidade: "Farroupilha" } }
    ];
    return { success: true, data: mockProjects, simulated: true };
  }
}

// Cria um projeto temporário para um cliente existente
export async function createProjectForClient(clientId: string, companyId: string) {
  const isProduction = process.env.NODE_ENV === "production";
  if (isDatabaseOffline() && !isProduction) {
    const mockProjectId = `p-mock-client-${Math.random().toString(36).substring(2, 9)}`;
    return { success: true, projectId: mockProjectId, simulated: true };
  }

  try {
    const project = await prisma.project.create({
      data: {
        client_id: clientId,
        valor_previsto: 0,
        status_geral: "ORCAMENTO"
      }
    });

    await prisma.timeline.create({
      data: {
        project_id: project.id,
        acao: `Projeto temporário criado para orçamento comercial de cliente existente`,
        interno_sotamente: true,
        user_id: await ensureActorUserId()
      }
    });

    revalidatePath("/quotes");
    return { success: true, projectId: project.id };
  } catch (error) {
    console.error("Erro na Server Action createProjectForClient:", error);
    if (isDatabaseOffline() && !isProduction) {
      const mockProjectId = `p-mock-client-${Math.random().toString(36).substring(2, 9)}`;
      return { success: true, projectId: mockProjectId, simulated: true };
    }
    return { success: false, error: error instanceof Error ? error.message : "Erro ao inicializar orçamento no banco remoto" };
  }
}

// Cria um cliente e um projeto associado de forma rápida (avulso)
export async function createQuickClientAndProject(data: {
  nome: string;
  email: string;
  telefone: string;
  cidade: string;
  companyId: string;
}) {
  const isProduction = process.env.NODE_ENV === "production";
  if (isDatabaseOffline() && !isProduction) {
    const mockProjectId = `p-mock-quick-${Math.random().toString(36).substring(2, 9)}`;
    return { success: true, projectId: mockProjectId, simulated: true };
  }

  if (data.companyId === "mock-company-id") {
    try {
      await prisma.company.upsert({
        where: { id: "mock-company-id" },
        update: {},
        create: {
          id: "mock-company-id",
          nome: "Móveis Unghero",
          cnpj: "13.415.510/0001-71",
          telefone: "(54) 9 9997-1050",
          email: "moveisunghero@gmail.com"
        }
      });
    } catch (e) {
      console.warn("Erro ao garantir empresa mock no banco real:", e);
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Cria o cliente
      const client = await tx.client.create({
        data: {
          nome: data.nome,
          email: data.email || `${data.nome.toLowerCase().replace(/\s+/g, '')}@avulso.com`,
          telefone: data.telefone || "(54) 99999-9999",
          cidade: data.cidade,
          origem: "WHATSAPP",
          status: "LEAD",
          company_id: data.companyId
        }
      });

      // 2. Cria o projeto associado
      const project = await tx.project.create({
        data: {
          client_id: client.id,
          valor_previsto: 0,
          status_geral: "ORCAMENTO"
        }
      });

      // 3. Cria o registro na timeline
      await tx.timeline.create({
        data: {
          project_id: project.id,
          acao: `Lead avulso e projeto criados automaticamente para orçamento comercial`,
          interno_sotamente: true,
          user_id: await ensureActorUserId()
        }
      });

      return { projectId: project.id };
    });

    revalidatePath("/quotes");
    return { success: true, projectId: result.projectId };
  } catch (error) {
    console.error("Erro na Server Action createQuickClientAndProject:", error);
    if (isDatabaseOffline() && !isProduction) {
      const mockProjectId = `p-mock-quick-${Math.random().toString(36).substring(2, 9)}`;
      return { success: true, projectId: mockProjectId, simulated: true };
    }
    return { success: false, error: error instanceof Error ? error.message : "Erro ao criar cadastro avulso no banco remoto" };
  }
}


