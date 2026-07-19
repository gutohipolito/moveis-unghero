"use server";

import { prisma, isDatabaseOffline } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ensureActorUserId } from "@/lib/currentUser";
import { capitalizeText } from "@/lib/utils";
import { findExistingClient, resolveClientContactFields } from "@/lib/clientMatch";
import {
  assertCompanyAccess,
  getAuthContext,
  requireClientInCompany,
  requireProjectInCompany,
} from "@/lib/auth-guard";
import { inferEnvironmentTypeFromName } from "@/lib/environmentFromQuote";
import { ADMIN_EMAIL } from "@/lib/constants";
import { parseISODateOnlyBrazil } from "@/lib/brazilDate";

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
  partnerId?: string | null;
  items: {
    descricao: string;
    quantidade: number;
    tipo_custo: ItemType;
    valor_unitario: number;
    valor_total: number;
    showcase_product_id?: string | null;
    subitens?: string[];
  }[];
}

// Cria um novo orçamento com controle de versão
export async function createQuote(projectId: string, data: CreateQuoteInput) {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  try {
    await requireProjectInCompany(projectId, auth.companyId);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Acesso negado",
    };
  }

  // Valida o parceiro (arquiteto) informado, garantindo que pertence à empresa.
  let partnerId: string | null = null;
  if (data.partnerId) {
    const partner = await prisma.professionalPartner.findFirst({
      where: { id: data.partnerId, company_id: auth.companyId },
      select: { id: true },
    });
    partnerId = partner?.id ?? null;
  }

  // Valida produtos do mostruário vinculados às linhas.
  const showcaseIds = Array.from(
    new Set(
      data.items
        .map((item) => item.showcase_product_id)
        .filter((id): id is string => Boolean(id))
    )
  );
  const validShowcaseIds = new Set<string>();
  if (showcaseIds.length > 0) {
    const products = await prisma.showcaseProduct.findMany({
      where: { id: { in: showcaseIds }, company_id: auth.companyId },
      select: { id: true },
    });
    products.forEach((p) => validShowcaseIds.add(p.id));
  }

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
          validade: parseISODateOnlyBrazil(data.validade),
          observacoes: data.observacoes || "",
          partner_id: partnerId,
        }
      });

      // 3. Cria os QuoteItems
      if (data.items.length > 0) {
        await tx.quoteItem.createMany({
          data: data.items.map((item) => ({
            quote_id: quote.id,
            descricao: item.descricao,
            quantidade: item.quantidade,
            tipo_custo: item.tipo_custo,
            valor_unitario: item.valor_unitario,
            valor_total: item.valor_total,
            showcase_product_id:
              item.showcase_product_id && validShowcaseIds.has(item.showcase_product_id)
                ? item.showcase_product_id
                : null,
            subitens:
              item.subitens && item.subitens.length > 0 ? item.subitens : undefined,
          })),
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

      // 5. Vincula o parceiro ao projeto quando ainda não houver um
      if (partnerId) {
        await tx.project.updateMany({
          where: { id: projectId, partner_id: null },
          data: { partner_id: partnerId },
        });
      }

      return { 
        quote: {
          id: quote.id,
          project_id: quote.project_id,
          versao: quote.versao,
          subtotal: Number(quote.subtotal),
          desconto: Number(quote.desconto),
          valor_final: Number(quote.valor_final),
          validade: quote.validade.toISOString(),
          createdAt: quote.createdAt.toISOString(),
          observacoes: quote.observacoes
        },
        version: nextVersion 
      };
    });

    revalidatePath(`/projects/${projectId}`);
    return { success: true, data: result };
  } catch (error) {
    console.error("Erro na Server Action createQuote:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido ao salvar orçamento no banco remoto",
    };
  }
}

// Atualiza o status do orçamento e, se aprovado, cria ambientes na fila da fábrica
export async function approveQuote(projectId: string, quoteId: string, version: number) {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  try {
    await requireProjectInCompany(projectId, auth.companyId);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Acesso negado",
    };
  }

  try {
    const quote = await prisma.quote.findFirst({
      where: { id: quoteId, project_id: projectId },
      select: {
        valor_final: true,
        items: { select: { descricao: true }, orderBy: { id: "asc" } },
      },
    });
    if (!quote) {
      return { success: false, error: "Orçamento não encontrado" };
    }

    const approvedAt = new Date();

    // Ambientes a criar a partir dos itens principais (sem subitens).
    const itemNames = quote.items
      .map((item) => capitalizeText((item.descricao || "").trim()))
      .filter(Boolean);

    const createdNames = await prisma.$transaction(async (tx) => {
      await tx.quote.updateMany({
        where: { project_id: projectId, id: { not: quoteId } },
        data: { aprovado_em: null },
      });

      await tx.quote.update({
        where: { id: quoteId },
        data: { aprovado_em: approvedAt },
      });

      await tx.project.update({
        where: { id: projectId },
        data: {
          status_geral: "APROVADO",
          valor_previsto: quote.valor_final,
        },
      });

      const existingEnvs = await tx.environment.findMany({
        where: { project_id: projectId },
        select: { nome: true },
      });
      const existingNames = new Set(
        existingEnvs.map((e) => e.nome.trim().toLowerCase())
      );

      const created: string[] = [];
      for (const nome of itemNames) {
        const key = nome.toLowerCase();
        if (existingNames.has(key)) continue;

        await tx.environment.create({
          data: {
            project_id: projectId,
            nome,
            tipo: inferEnvironmentTypeFromName(nome),
            status: "PRONTO_PRODUCAO",
          },
        });
        existingNames.add(key);
        created.push(nome);
      }

      return created;
    });

    const envSummary =
      createdNames.length > 0
        ? ` Ambientes criados e enviados à Fila de Produção: ${createdNames.join(", ")}.`
        : itemNames.length > 0
          ? " Ambientes do orçamento já existiam no projeto."
          : "";

    await prisma.timeline.create({
      data: {
        project_id: projectId,
        acao: `Proposta comercial v${version} foi APROVADA pelo cliente. Projeto movido para Aprovados.${envSummary}`,
        interno_sotamente: false,
        user_id: await ensureActorUserId(),
      },
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/clientes", "layout");
    revalidatePath("/factory");
    revalidatePath("/crm");
    return { success: true, createdEnvironments: createdNames };
  } catch (error) {
    console.error("Erro na Server Action approveQuote:", error);
    return { success: false, error: error instanceof Error ? error.message : "Erro ao aprovar orçamento no banco remoto" };
  }
}

// Remove um orçamento (aprovados: apenas Administrador / cargo ADMIN)
export async function deleteQuote(projectId: string, quoteId: string, version: number) {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  try {
    await requireProjectInCompany(projectId, auth.companyId);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Acesso negado",
    };
  }

  const canDeleteApproved =
    auth.cargo === "ADMIN" || auth.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  try {
    const existing = await prisma.quote.findFirst({
      where: { id: quoteId, project_id: projectId },
      select: { id: true, aprovado_em: true },
    });
    if (!existing) {
      return { success: false, error: "Orçamento não encontrado." };
    }
    if (existing.aprovado_em && !canDeleteApproved) {
      return {
        success: false,
        error: "Orçamentos aprovados só podem ser excluídos por um administrador.",
      };
    }

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
          acao: existing.aprovado_em
            ? `Orçamento comercial v${version} (aprovado) foi excluído pelo administrador`
            : `Orçamento comercial v${version} foi excluído do sistema`,
          interno_sotamente: true,
          user_id: await ensureActorUserId()
        }
      });
    });

    revalidatePath(`/projects/${projectId}`);
    return { success: true };
  } catch (error) {
    console.error("Erro na Server Action deleteQuote:", error);
    return { success: false, error: error instanceof Error ? error.message : "Erro ao excluir orçamento no banco remoto" };
  }
}

// Busca orçamentos da empresa do usuário logado
export async function getQuotes() {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: "Não autenticado", data: [] };
  }
  const companyId = auth.companyId;

  try {
    const quotes = await prisma.quote.findMany({
      where: {
        project: { client: { company_id: companyId } },
      },
      include: {
        project: {
          include: {
            client: true
          }
        },
        items: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const serializedQuotes = quotes.map(q => ({
      ...q,
      subtotal: Number(q.subtotal),
      desconto: Number(q.desconto),
      valor_final: Number(q.valor_final),
      validade: q.validade instanceof Date ? q.validade.toISOString() : q.validade,
      createdAt: q.createdAt instanceof Date ? q.createdAt.toISOString() : q.createdAt,
      aprovado_em: q.aprovado_em instanceof Date ? q.aprovado_em.toISOString() : q.aprovado_em,
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
    return { success: false, error: "Erro de conexão ao banco de dados", data: [] };
  }
}

// Busca todos os projetos ativos para seleção no construtor de orçamentos
export async function getProjectsForQuotes() {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: "Não autenticado", data: [] };
  }

  try {
    const projects = await prisma.project.findMany({
      where: {
        client: { company_id: auth.companyId },
      },
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
    return { success: false, error: "Erro de conexão ao banco de dados", data: [] };
  }
}

// Cria um projeto temporário para um cliente existente
export async function createProjectForClient(clientId: string, companyId: string) {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  try {
    assertCompanyAccess(auth, companyId);
    await requireClientInCompany(clientId, auth.companyId);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Acesso negado",
    };
  }

  if (isDatabaseOffline()) {
    return { success: false, error: "Banco de dados indisponível." };
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
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  try {
    assertCompanyAccess(auth, data.companyId);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Acesso negado",
    };
  }

  if (isDatabaseOffline()) {
    return { success: false, error: "Banco de dados indisponível." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const contact = resolveClientContactFields(
        data.telefone || "(54) 99999-9999",
        data.email
      );

      let client = await findExistingClient({
        companyId: data.companyId,
        telefone: data.telefone || "(54) 99999-9999",
        email: data.email,
      });

      const isExistingClient = Boolean(client);

      if (!client) {
        client = await tx.client.create({
          data: {
            nome: capitalizeText(data.nome),
            email: data.email || `${capitalizeText(data.nome).toLowerCase().replace(/\s+/g, "")}@avulso.com`,
            telefone: contact.telefone,
            telefone_digits: contact.phoneDigits || null,
            cidade: capitalizeText(data.cidade),
            origem: "WHATSAPP",
            status: "LEAD",
            company_id: data.companyId,
          },
        });
      }

      const project = await tx.project.create({
        data: {
          client_id: client.id,
          valor_previsto: 0,
          status_geral: "ORCAMENTO",
        },
      });

      await tx.timeline.create({
        data: {
          project_id: project.id,
          acao: isExistingClient
            ? "Nova solicitação de orçamento vinculada ao cadastro existente"
            : "Lead avulso e projeto criados automaticamente para orçamento comercial",
          interno_sotamente: true,
          user_id: await ensureActorUserId(),
        },
      });

      return { projectId: project.id, clientId: client.id };
    });

    revalidatePath("/quotes");
    return { success: true, projectId: result.projectId };
  } catch (error) {
    console.error("Erro na Server Action createQuickClientAndProject:", error);
    return { success: false, error: error instanceof Error ? error.message : "Erro ao criar cadastro avulso no banco remoto" };
  }
}

export async function getProjectBriefingAction(projectId: string) {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  try {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        client: { company_id: auth.companyId }
      },
      include: {
        client: {
          select: {
            origem: true,
            nome: true
          }
        },
        briefing: true
      }
    });

    if (!project) {
      return { success: false, error: "Projeto não encontrado" };
    }

    return {
      success: true,
      briefing: project.briefing ? {
        id: project.briefing.id,
        ambientes: project.briefing.ambientes,
        tipo_imovel: project.briefing.tipo_imovel,
        fase_projeto: project.briefing.fase_projeto,
        pronto: project.briefing.pronto,
        data_chaves: project.briefing.data_chaves,
        tem_projeto: project.briefing.tem_projeto,
        estilo: project.briefing.estilo,
        faixa_investimento: project.briefing.faixa_investimento,
        prazo_inicio: project.briefing.prazo_inicio,
        pinterest_link: project.briefing.pinterest_link,
        referencia_url: project.briefing.referencia_url,
      } : null,
      clientOrigem: project.client.origem,
      clientNome: project.client.nome
    };
  } catch (error) {
    console.error("Erro na Server Action getProjectBriefingAction:", error);
    return { success: false, error: "Erro ao buscar briefing do projeto" };
  }
}


