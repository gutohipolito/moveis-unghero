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
import {
  getModuleAccess as getBaseModuleAccess,
  getWriteAccess as getBaseWriteAccess,
} from "@/lib/moduleAccess";
import { upsertEnvironmentsFromApprovedItems } from "@/lib/syncEnvironmentsFromQuotes";
import { inferEnvironmentTypeFromName } from "@/lib/environmentFromQuote";
import { ADMIN_EMAIL } from "@/lib/constants";
import { parseISODateOnlyBrazil, defaultQuoteValidadeISO } from "@/lib/brazilDate";
import {
  computeApprovalValue,
  suggestProportionalDiscount,
  summarizeQuoteItems,
} from "@/lib/quoteApproval";
import {
  isComparativeTemplate,
  normalizeQuoteTemplateId,
} from "@/lib/quoteTemplates";
import { withInheritedPartnerId, withInheritedPartnerIdTx } from "@/lib/partnerAttribution";
import { buildQuoteCodigoBase } from "@/lib/quoteCodigo";
import { maybeRedactForViewer } from "@/lib/viewerRedact";
import { randomUUID } from "crypto";
import { isOpsLimitedRole } from "@/lib/permissions";

async function getModuleAccess(moduleKey: "quotes") {
  const auth = await getBaseModuleAccess(moduleKey);
  return auth && !isOpsLimitedRole(auth.cargo) ? auth : null;
}

async function getWriteAccess(moduleKey: "quotes") {
  const auth = await getBaseWriteAccess(moduleKey);
  return auth && !isOpsLimitedRole(auth.cargo) ? auth : null;
}

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
  solicitanteId?: string | null;
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
  const auth = await getWriteAccess("quotes");
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

  let solicitanteId: string | null = null;
  let solicitanteNome: string | null = null;
  let solicitanteArea: string | null = null;
  if (data.solicitanteId) {
    const contact = await prisma.clientContact.findFirst({
      where: {
        id: data.solicitanteId,
        client: {
          company_id: auth.companyId,
          tipo_pessoa: "PJ",
          projects: { some: { id: projectId } },
        },
      },
      select: { id: true, nome: true, area: true },
    });
    if (contact) {
      solicitanteId = contact.id;
      solicitanteNome = contact.nome;
      solicitanteArea = contact.area;
    }
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

      const templateTipo = normalizeQuoteTemplateId(data.template_tipo);

      const projectClient = await tx.project.findUnique({
        where: { id: projectId },
        select: { client: { select: { nome: true } } },
      });
      const clientName = projectClient?.client.nome || "Cliente";
      const codigoBase = buildQuoteCodigoBase(clientName);
      let codigo = codigoBase;
      for (let attempt = 2; attempt <= 50; attempt++) {
        const clash = await tx.quote.findFirst({
          where: { codigo },
          select: { id: true },
        });
        if (!clash) break;
        codigo = `${codigoBase}-${attempt}`;
      }

      // 2. Cria a Quote
      const quote = await tx.quote.create({
        data: {
          project_id: projectId,
          versao: nextVersion,
          template_tipo: templateTipo,
          codigo,
          subtotal: data.subtotal,
          desconto: data.desconto,
          valor_final: data.valor_final,
          validade: parseISODateOnlyBrazil(
            data.validade?.trim() || defaultQuoteValidadeISO()
          ),
          observacoes: data.observacoes || "",
          partner_id: partnerId,
          solicitante_id: solicitanteId,
          solicitante_nome: solicitanteNome,
          solicitante_area: solicitanteArea,
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
      const timelineValue = isComparativeTemplate(templateTipo)
        ? `Proposta comparativa v${nextVersion} criada com ${data.items.length} opção(ões)`
        : `Orçamento comercial v${nextVersion} criado no valor de ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(data.valor_final)}`;
      await tx.timeline.create({
        data: {
          project_id: projectId,
          acao: timelineValue,
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
          codigo: quote.codigo,
          template_tipo: quote.template_tipo,
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

const ITEM_TYPES: ItemType[] = [
  "MOVEIS_MDF",
  "FERRAGENS_ESPECIAIS",
  "MAO_DE_OBRA",
  "OUTROS",
];

function asItemType(value: string | undefined | null): ItemType {
  if (value && ITEM_TYPES.includes(value as ItemType)) return value as ItemType;
  return "MOVEIS_MDF";
}

function normalizeQuoteSubitens(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
}

function sameSubitens(a: unknown, b: unknown): boolean {
  const left = normalizeQuoteSubitens(a);
  const right = normalizeQuoteSubitens(b);
  if (left.length !== right.length) return false;
  return left.every((item, index) => item === right[index]);
}

export type UpdateQuoteInput = {
  subtotal: number;
  desconto: number;
  valor_final: number;
  validade: string;
  observacoes?: string;
  template_tipo?: string;
  partnerId?: string | null;
  solicitanteId?: string | null;
  items: Array<{
    id?: string;
    descricao: string;
    quantidade: number;
    tipo_custo: ItemType;
    valor_unitario: number;
    valor_total: number;
    showcase_product_id?: string | null;
    subitens?: string[];
  }>;
};

/** Atualiza a mesma versão do orçamento (itens pendentes), sem criar nova proposta. */
export async function updateExistingQuote(
  projectId: string,
  quoteId: string,
  data: UpdateQuoteInput
) {
  const auth = await getWriteAccess("quotes");
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

  if (!data.items?.length) {
    return { success: false, error: "Inclua ao menos um item na proposta." };
  }

  let partnerId: string | null = null;
  if (data.partnerId) {
    const partner = await prisma.professionalPartner.findFirst({
      where: { id: data.partnerId, company_id: auth.companyId },
      select: { id: true },
    });
    partnerId = partner?.id ?? null;
  }

  let solicitanteId: string | null = null;
  let solicitanteNome: string | null = null;
  let solicitanteArea: string | null = null;
  if (data.solicitanteId) {
    const contact = await prisma.clientContact.findFirst({
      where: {
        id: data.solicitanteId,
        client: {
          company_id: auth.companyId,
          tipo_pessoa: "PJ",
          projects: { some: { id: projectId } },
        },
      },
      select: { id: true, nome: true, area: true },
    });
    if (contact) {
      solicitanteId = contact.id;
      solicitanteNome = contact.nome;
      solicitanteArea = contact.area;
    }
  }

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
    const quote = await prisma.quote.findFirst({
      where: { id: quoteId, project_id: projectId },
      select: {
        id: true,
        versao: true,
        template_tipo: true,
        desconto: true,
        items: {
          select: {
            id: true,
            status: true,
            descricao: true,
            quantidade: true,
            tipo_custo: true,
            valor_unitario: true,
            valor_total: true,
            subitens: true,
            showcase_product_id: true,
            environment: { select: { id: true } },
          },
        },
      },
    });
    if (!quote) {
      return { success: false, error: "Orçamento não encontrado" };
    }

    const frozen = quote.items.filter((i) => i.status !== "PENDENTE");
    const pending = quote.items.filter((i) => i.status === "PENDENTE");
    const pendingById = new Map(pending.map((i) => [i.id, i]));
    const frozenIds = new Set(frozen.map((i) => i.id));

    for (const item of data.items) {
      if (item.id && frozenIds.has(item.id)) continue;
      if (!item.descricao?.trim()) {
        return { success: false, error: "Todo item precisa de descrição (cômodo)." };
      }
      if (item.quantidade < 1 || item.valor_unitario < 0 || item.valor_total < 0) {
        return { success: false, error: "Valores ou quantidades inválidos." };
      }
    }

    const toProcess = data.items.filter((item) => {
      if (!item.id) return true;
      if (pendingById.has(item.id)) return true;
      if (frozenIds.has(item.id)) return false;
      return true;
    });

    if (toProcess.length === 0 && frozen.length === 0) {
      return { success: false, error: "Inclua ao menos um item na proposta." };
    }

    const actorId = await ensureActorUserId();
    const templateTipo = normalizeQuoteTemplateId(
      data.template_tipo ?? quote.template_tipo
    );

    if (frozen.length > 0 && templateTipo !== quote.template_tipo) {
      return {
        success: false,
        error: "Não é possível mudar o modelo da proposta após itens aprovados/recusados.",
      };
    }

    const changedLabels: string[] = [];
    let createdCount = 0;
    let removedCount = 0;

    await prisma.$transaction(async (tx) => {
      const keepPendingIds = new Set(
        toProcess
          .map((i) => i.id)
          .filter((id): id is string => typeof id === "string" && pendingById.has(id))
      );

      for (const current of pending) {
        if (keepPendingIds.has(current.id)) continue;
        if (current.environment?.id) {
          await tx.environment.update({
            where: { id: current.environment.id },
            data: { quote_item_id: null },
          });
        }
        await tx.quoteItem.delete({ where: { id: current.id } });
        removedCount += 1;
      }

      for (const upd of toProcess) {
        const newUnit = Math.round(upd.valor_unitario * 100) / 100;
        const newTotal = Math.round(upd.valor_total * 100) / 100;
        const newQty = Math.round(upd.quantidade);
        const newDescricao = upd.descricao.trim();
        const newSubitens = normalizeQuoteSubitens(upd.subitens);
        const newTipo = asItemType(upd.tipo_custo);
        const showcaseId =
          upd.showcase_product_id && validShowcaseIds.has(upd.showcase_product_id)
            ? upd.showcase_product_id
            : null;

        if (upd.id && pendingById.has(upd.id)) {
          const current = pendingById.get(upd.id)!;
          const priceChanged =
            Number(current.valor_unitario) !== newUnit ||
            Number(current.valor_total) !== newTotal;
          const qtyChanged = current.quantidade !== newQty;
          const descChanged = current.descricao !== newDescricao;
          const detailsChanged = !sameSubitens(current.subitens, newSubitens);
          const tipoChanged = current.tipo_custo !== newTipo;
          const showcaseChanged =
            (current.showcase_product_id || null) !== showcaseId;

          if (
            priceChanged ||
            qtyChanged ||
            descChanged ||
            detailsChanged ||
            tipoChanged ||
            showcaseChanged
          ) {
            await tx.quoteItemPriceHistory.create({
              data: {
                id: randomUUID(),
                quote_item_id: current.id,
                valor_unitario_anterior: current.valor_unitario,
                valor_total_anterior: current.valor_total,
                valor_unitario_novo: newUnit,
                valor_total_novo: newTotal,
                descricao_anterior: descChanged ? current.descricao : null,
                descricao_nova: descChanged ? newDescricao : null,
                quantidade_anterior: qtyChanged ? current.quantidade : null,
                quantidade_nova: qtyChanged ? newQty : null,
                subitens_anterior: detailsChanged
                  ? normalizeQuoteSubitens(current.subitens)
                  : undefined,
                subitens_novo: detailsChanged ? newSubitens : undefined,
                motivo: "Edição completa da proposta (mesma versão)",
                alterado_por_id: actorId,
              },
            });

            await tx.quoteItem.update({
              where: { id: current.id },
              data: {
                descricao: newDescricao,
                quantidade: newQty,
                tipo_custo: newTipo,
                valor_unitario: newUnit,
                valor_total: newTotal,
                subitens: newSubitens,
                showcase_product_id: showcaseId,
              },
            });

            if (descChanged && current.environment?.id) {
              await tx.environment.update({
                where: { id: current.environment.id },
                data: {
                  nome: newDescricao,
                  tipo: inferEnvironmentTypeFromName(newDescricao),
                },
              });
            }

            changedLabels.push(newDescricao);
          }
          continue;
        }

        await tx.quoteItem.create({
          data: {
            id: randomUUID(),
            quote_id: quoteId,
            descricao: newDescricao,
            quantidade: newQty,
            tipo_custo: newTipo,
            valor_unitario: newUnit,
            valor_total: newTotal,
            subitens: newSubitens.length > 0 ? newSubitens : undefined,
            showcase_product_id: showcaseId,
            status: "PENDENTE",
          },
        });
        createdCount += 1;
        changedLabels.push(newDescricao);
      }

      const refreshed = await tx.quoteItem.findMany({
        where: { quote_id: quoteId },
        select: { valor_total: true },
      });
      const subtotal = refreshed.reduce((sum, i) => sum + Number(i.valor_total), 0);
      const desconto = Math.min(Math.max(0, data.desconto), subtotal);
      const valorFinal = computeApprovalValue(subtotal, desconto);

      await tx.quote.update({
        where: { id: quoteId },
        data: {
          template_tipo: templateTipo,
          subtotal,
          desconto,
          valor_final: valorFinal,
          validade: parseISODateOnlyBrazil(data.validade),
          observacoes: data.observacoes || "",
          partner_id: partnerId,
          solicitante_id: solicitanteId,
          solicitante_nome: solicitanteNome,
          solicitante_area: solicitanteArea,
          valores_atualizados_em: new Date(),
        },
      });
    });

    const parts = [
      changedLabels.length
        ? `itens alterados: ${Array.from(new Set(changedLabels)).join(", ")}`
        : null,
      createdCount > 0 ? `${createdCount} item(ns) novo(s)` : null,
      removedCount > 0 ? `${removedCount} item(ns) removido(s)` : null,
    ].filter(Boolean);

    await prisma.timeline.create({
      data: {
        project_id: projectId,
        acao: `Proposta comercial v${quote.versao} editada (mesma versão)${
          parts.length ? ` — ${parts.join("; ")}` : ""
        }.`,
        interno_sotamente: true,
        user_id: actorId,
      },
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/quotes");
    revalidatePath("/crm");

    return {
      success: true,
      data: {
        quote: {
          id: quoteId,
          project_id: projectId,
          versao: quote.versao,
        },
        version: quote.versao,
      },
    };
  } catch (error) {
    console.error("Erro na Server Action updateExistingQuote:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao editar orçamento",
    };
  }
}

export async function getQuoteForEdit(quoteId: string) {
  const auth = await getWriteAccess("quotes");
  if (!auth) {
    return { success: false, error: "Não autenticado" as const };
  }

  try {
    const quote = await prisma.quote.findFirst({
      where: {
        id: quoteId,
        project: { client: { company_id: auth.companyId } },
      },
      select: {
        id: true,
        project_id: true,
        versao: true,
        template_tipo: true,
        desconto: true,
        subtotal: true,
        valor_final: true,
        validade: true,
        observacoes: true,
        partner_id: true,
        solicitante_id: true,
        solicitante_nome: true,
        solicitante_area: true,
        items: {
          orderBy: { id: "asc" },
          select: {
            id: true,
            descricao: true,
            quantidade: true,
            tipo_custo: true,
            valor_unitario: true,
            valor_total: true,
            status: true,
            subitens: true,
            showcase_product_id: true,
          },
        },
      },
    });
    if (!quote) {
      return { success: false, error: "Orçamento não encontrado" as const };
    }

    const hasPending = quote.items.some((i) => i.status === "PENDENTE");
    if (!hasPending) {
      return {
        success: false,
        error: "Esta proposta não tem itens pendentes para editar." as const,
      };
    }

    return {
      success: true as const,
      data: {
        id: quote.id,
        project_id: quote.project_id,
        versao: quote.versao,
        template_tipo: quote.template_tipo,
        desconto: Number(quote.desconto),
        subtotal: Number(quote.subtotal),
        valor_final: Number(quote.valor_final),
        validade: quote.validade.toISOString(),
        observacoes: quote.observacoes || "",
        partner_id: quote.partner_id,
        solicitante_id: quote.solicitante_id,
        solicitante_nome: quote.solicitante_nome,
        solicitante_area: quote.solicitante_area,
        items: quote.items.map((item) => ({
          id: item.id,
          descricao: item.descricao,
          quantidade: item.quantidade,
          tipo_custo: item.tipo_custo,
          valor_unitario: Number(item.valor_unitario),
          valor_total: Number(item.valor_total),
          status: item.status,
          subitens: normalizeQuoteSubitens(item.subitens),
          showcase_product_id: item.showcase_product_id,
        })),
      },
    };
  } catch (error) {
    console.error("Erro na Server Action getQuoteForEdit:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao carregar orçamento",
    };
  }
}

// Registra aprovação (total ou parcial) de itens do orçamento
export async function approveQuote(
  projectId: string,
  quoteId: string,
  version: number,
  options?: {
    itemIds?: string[];
    desconto?: number;
    observacoes?: string;
  }
) {
  const auth = await getWriteAccess("quotes");
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
    const projectBefore = await prisma.project.findUnique({
      where: { id: projectId },
      select: { status_geral: true },
    });
    const oldStatus = projectBefore?.status_geral ?? "";

    const quote = await prisma.quote.findFirst({
      where: { id: quoteId, project_id: projectId },
      select: {
        id: true,
        template_tipo: true,
        subtotal: true,
        desconto: true,
        valor_final: true,
        items: {
          select: {
            id: true,
            descricao: true,
            valor_total: true,
            status: true,
          },
          orderBy: { id: "asc" },
        },
      },
    });
    if (!quote) {
      return { success: false, error: "Orçamento não encontrado" };
    }

    const comparative = isComparativeTemplate(quote.template_tipo);

    const pendingItems = quote.items.filter((item) => item.status === "PENDENTE");
    if (pendingItems.length === 0) {
      return { success: false, error: "Não há itens pendentes para aprovar neste orçamento." };
    }

    const requestedIds = options?.itemIds?.length
      ? new Set(options.itemIds)
      : comparative
        ? new Set<string>()
        : new Set(pendingItems.map((item) => item.id));

    const selectedItems = pendingItems.filter((item) => requestedIds.has(item.id));
    if (selectedItems.length === 0) {
      return {
        success: false,
        error: comparative
          ? "Selecione exatamente uma opção para aprovar nesta proposta comparativa."
          : "Selecione ao menos um item pendente para aprovar.",
      };
    }

    if (comparative && selectedItems.length !== 1) {
      return {
        success: false,
        error: "Proposta comparativa: aprove exatamente uma opção. As demais serão recusadas automaticamente.",
      };
    }

    const rejectedOnApprove = comparative
      ? pendingItems.filter((item) => !requestedIds.has(item.id))
      : [];

    // Itens já aprovados são ignorados (idempotência): só processamos pendentes.
    const selectedSubtotal = selectedItems.reduce(
      (sum, item) => sum + Number(item.valor_total),
      0
    );
    const quoteSubtotal = Number(quote.subtotal);
    const quoteDesconto = Number(quote.desconto);
    const suggested = suggestProportionalDiscount(
      quoteDesconto,
      quoteSubtotal,
      selectedSubtotal
    );
    const desconto =
      typeof options?.desconto === "number" && Number.isFinite(options.desconto)
        ? Math.max(0, Math.round(options.desconto * 100) / 100)
        : suggested;

    if (desconto > selectedSubtotal) {
      return {
        success: false,
        error: "O desconto da aprovação não pode ser maior que o subtotal dos itens selecionados.",
      };
    }

    const valorAprovado = computeApprovalValue(selectedSubtotal, desconto);
    const approvedAt = new Date();
    const actorId = await ensureActorUserId();

    const createdNames = await prisma.$transaction(async (tx) => {
      const approval = await tx.quoteApproval.create({
        data: {
          id: randomUUID(),
          quote_id: quoteId,
          subtotal: selectedSubtotal,
          desconto,
          valor_aprovado: valorAprovado,
          aprovado_em: approvedAt,
          aprovado_por_id: actorId,
          observacoes: options?.observacoes?.trim() || null,
        },
      });

      await tx.quoteItem.updateMany({
        where: { id: { in: selectedItems.map((item) => item.id) }, status: "PENDENTE" },
        data: {
          status: "APROVADO",
          aprovado_em: approvedAt,
          aprovado_por_id: actorId,
          approval_id: approval.id,
        },
      });

      if (rejectedOnApprove.length > 0) {
        await tx.quoteItem.updateMany({
          where: {
            id: { in: rejectedOnApprove.map((item) => item.id) },
            status: "PENDENTE",
          },
          data: { status: "RECUSADO" },
        });
      }

      // Mantém Quote.aprovado_em como marcador da primeira aprovação (compatibilidade).
      const existingQuote = await tx.quote.findUnique({
        where: { id: quoteId },
        select: { aprovado_em: true },
      });
      await tx.quote.update({
        where: { id: quoteId },
        data: {
          aprovado_em: existingQuote?.aprovado_em ?? approvedAt,
        },
      });

      const approvals = await tx.quoteApproval.findMany({
        where: { quote: { project_id: projectId } },
        select: { valor_aprovado: true },
      });
      const totalAprovado = approvals.reduce(
        (sum, a) => sum + Number(a.valor_aprovado),
        0
      );

      await tx.project.update({
        where: { id: projectId },
        data: {
          status_geral: "APROVADO",
          valor_previsto: totalAprovado,
        },
      });

      const sync = await upsertEnvironmentsFromApprovedItems(
        tx,
        projectId,
        selectedItems.map((item) => ({ id: item.id, descricao: item.descricao }))
      );

      return sync.created;
    });

    const remainingPending = comparative
      ? 0
      : pendingItems.length - selectedItems.length;
    const partialLabel = comparative
      ? rejectedOnApprove.length > 0
        ? ` Proposta comparativa: opção escolhida aprovada; ${rejectedOnApprove.length} alternativa(s) recusada(s).`
        : " Proposta comparativa: opção escolhida aprovada."
      : remainingPending > 0
        ? ` Aprovação parcial: ${selectedItems.length} item(ns); ${remainingPending} ainda pendente(s).`
        : " Todos os itens pendentes deste orçamento foram aprovados.";

    const envSummary =
      createdNames.length > 0
        ? ` Ambientes criados e enviados à Fila de Produção: ${createdNames.join(", ")}.`
        : "";

    const itemNames = selectedItems
      .map((item) => capitalizeText((item.descricao || "").trim()))
      .filter(Boolean);

    await prisma.timeline.create({
      data: {
        project_id: projectId,
        acao: `Proposta comercial v${version}: aprovado(s) ${itemNames.join(", ") || `${selectedItems.length} item(ns)`} (R$ ${valorAprovado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}). Projeto em Aprovados.${partialLabel}${envSummary}`,
        interno_sotamente: false,
        user_id: await ensureActorUserId(),
      },
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/clientes", "layout");
    revalidatePath("/factory");
    revalidatePath("/crm");
    revalidatePath("/quotes");
    if (oldStatus !== "APROVADO") {
      const { schedulePartnerProjectStatusAlert } = await import(
        "@/lib/partnerAlertEmail"
      );
      schedulePartnerProjectStatusAlert({
        projectId,
        oldStatus,
        newStatus: "APROVADO",
      });
    }
    return {
      success: true,
      createdEnvironments: createdNames,
      approvedItemIds: selectedItems.map((i) => i.id),
      valorAprovado,
      desconto,
      remainingPending,
    };
  } catch (error) {
    console.error("Erro na Server Action approveQuote:", error);
    return { success: false, error: error instanceof Error ? error.message : "Erro ao aprovar orçamento no banco remoto" };
  }
}

export async function rejectQuoteItems(
  projectId: string,
  quoteId: string,
  version: number,
  itemIds: string[]
) {
  const auth = await getWriteAccess("quotes");
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

  if (!itemIds?.length) {
    return { success: false, error: "Selecione ao menos um item para recusar." };
  }

  try {
    const items = await prisma.quoteItem.findMany({
      where: {
        id: { in: itemIds },
        quote_id: quoteId,
        quote: { project_id: projectId },
        status: "PENDENTE",
      },
      select: { id: true, descricao: true },
    });
    if (items.length === 0) {
      return { success: false, error: "Nenhum item pendente encontrado para recusar." };
    }

    await prisma.quoteItem.updateMany({
      where: { id: { in: items.map((i) => i.id) } },
      data: { status: "RECUSADO" },
    });

    await prisma.timeline.create({
      data: {
        project_id: projectId,
        acao: `Proposta comercial v${version}: item(ns) recusado(s): ${items.map((i) => i.descricao).join(", ")}.`,
        interno_sotamente: true,
        user_id: await ensureActorUserId(),
      },
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/crm");
    revalidatePath("/quotes");
    return { success: true, rejectedItemIds: items.map((i) => i.id) };
  } catch (error) {
    console.error("Erro na Server Action rejectQuoteItems:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao recusar itens",
    };
  }
}

export async function revisePendingQuoteItems(input: {
  projectId: string;
  quoteId: string;
  version: number;
  validade?: string;
  motivo?: string;
  items: Array<{
    id: string;
    valor_unitario: number;
    valor_total: number;
    quantidade?: number;
    descricao?: string;
    subitens?: string[];
  }>;
}) {
  const auth = await getWriteAccess("quotes");
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  try {
    await requireProjectInCompany(input.projectId, auth.companyId);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Acesso negado",
    };
  }

  if (!input.items?.length && !input.validade) {
    return { success: false, error: "Informe itens para editar ou uma nova validade." };
  }

  try {
    const quote = await prisma.quote.findFirst({
      where: { id: input.quoteId, project_id: input.projectId },
      select: {
        id: true,
        desconto: true,
        items: {
          select: {
            id: true,
            status: true,
            valor_unitario: true,
            valor_total: true,
            quantidade: true,
            descricao: true,
            subitens: true,
            environment: { select: { id: true } },
          },
        },
      },
    });
    if (!quote) {
      return { success: false, error: "Orçamento não encontrado" };
    }

    const actorId = await ensureActorUserId();
    const updates = input.items || [];
    const pendingById = new Map(
      quote.items.filter((i) => i.status === "PENDENTE").map((i) => [i.id, i])
    );

    for (const upd of updates) {
      if (!pendingById.has(upd.id)) {
        return {
          success: false,
          error: "Somente itens pendentes podem ser editados antes da aprovação.",
        };
      }
      if (upd.valor_unitario < 0 || upd.valor_total < 0) {
        return { success: false, error: "Valores não podem ser negativos." };
      }
      if (typeof upd.quantidade === "number" && (!Number.isFinite(upd.quantidade) || upd.quantidade < 1)) {
        return { success: false, error: "Quantidade deve ser pelo menos 1." };
      }
      if (typeof upd.descricao === "string" && !upd.descricao.trim()) {
        return { success: false, error: "Descrição do item não pode ficar vazia." };
      }
    }

    const changedLabels: string[] = [];

    await prisma.$transaction(async (tx) => {
      for (const upd of updates) {
        const current = pendingById.get(upd.id)!;
        const newUnit = Math.round(upd.valor_unitario * 100) / 100;
        const newTotal = Math.round(upd.valor_total * 100) / 100;
        const newQty =
          typeof upd.quantidade === "number" && upd.quantidade > 0
            ? Math.round(upd.quantidade)
            : current.quantidade;
        const newDescricao =
          typeof upd.descricao === "string" ? upd.descricao.trim() : current.descricao;
        const hasSubitensUpdate = Array.isArray(upd.subitens);
        const newSubitens = hasSubitensUpdate
          ? normalizeQuoteSubitens(upd.subitens)
          : normalizeQuoteSubitens(current.subitens);

        const priceChanged =
          Number(current.valor_unitario) !== newUnit ||
          Number(current.valor_total) !== newTotal;
        const qtyChanged = current.quantidade !== newQty;
        const descChanged = current.descricao !== newDescricao;
        const detailsChanged =
          hasSubitensUpdate && !sameSubitens(current.subitens, newSubitens);

        if (!priceChanged && !qtyChanged && !descChanged && !detailsChanged) {
          continue;
        }

        await tx.quoteItemPriceHistory.create({
          data: {
            id: randomUUID(),
            quote_item_id: upd.id,
            valor_unitario_anterior: current.valor_unitario,
            valor_total_anterior: current.valor_total,
            valor_unitario_novo: newUnit,
            valor_total_novo: newTotal,
            descricao_anterior: descChanged ? current.descricao : null,
            descricao_nova: descChanged ? newDescricao : null,
            quantidade_anterior: qtyChanged ? current.quantidade : null,
            quantidade_nova: qtyChanged ? newQty : null,
            subitens_anterior: detailsChanged
              ? normalizeQuoteSubitens(current.subitens)
              : undefined,
            subitens_novo: detailsChanged ? newSubitens : undefined,
            motivo: input.motivo?.trim() || null,
            alterado_por_id: actorId,
          },
        });

        await tx.quoteItem.update({
          where: { id: upd.id },
          data: {
            valor_unitario: newUnit,
            valor_total: newTotal,
            quantidade: newQty,
            descricao: newDescricao,
            ...(hasSubitensUpdate ? { subitens: newSubitens } : {}),
          },
        });

        if (descChanged && current.environment?.id) {
          await tx.environment.update({
            where: { id: current.environment.id },
            data: {
              nome: newDescricao,
              tipo: inferEnvironmentTypeFromName(newDescricao),
            },
          });
        }

        changedLabels.push(newDescricao || current.descricao);
      }

      const refreshed = await tx.quoteItem.findMany({
        where: { quote_id: input.quoteId },
        select: { valor_total: true, status: true },
      });
      const subtotal = refreshed.reduce((sum, i) => sum + Number(i.valor_total), 0);
      const desconto = Math.min(Number(quote.desconto), subtotal);
      const valorFinal = computeApprovalValue(subtotal, desconto);

      await tx.quote.update({
        where: { id: input.quoteId },
        data: {
          subtotal,
          desconto,
          valor_final: valorFinal,
          valores_atualizados_em: new Date(),
          ...(input.validade
            ? { validade: parseISODateOnlyBrazil(input.validade) }
            : {}),
        },
      });
    });

    await prisma.timeline.create({
      data: {
        project_id: input.projectId,
        acao: changedLabels.length
          ? `Proposta comercial v${input.version}: itens pendentes editados (mesma versão) — ${changedLabels.join(", ")}${
              input.validade ? `; validade renovada para ${input.validade}` : ""
            }.`
          : `Proposta comercial v${input.version}: validade renovada para ${input.validade}.`,
        interno_sotamente: true,
        user_id: actorId,
      },
    });

    revalidatePath(`/projects/${input.projectId}`);
    revalidatePath("/quotes");
    revalidatePath("/crm");
    return { success: true };
  } catch (error) {
    console.error("Erro na Server Action revisePendingQuoteItems:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao editar itens pendentes",
    };
  }
}

/** Lista orçamentos com itens pendentes para a aba Pendências comerciais. */
export async function getCommercialPendingQuotes() {
  const auth = await getModuleAccess("quotes");
  if (!auth) {
    return { success: false, error: "Não autenticado", data: [] as CommercialPendingQuote[] };
  }

  try {
    const quotes = await prisma.quote.findMany({
      where: {
        project: { client: { company_id: auth.companyId } },
        template_tipo: { not: "COMPARATIVO" },
        items: { some: { status: "PENDENTE" } },
        OR: [
          { items: { some: { status: "APROVADO" } } },
          {
            project: {
              status_geral: {
                in: ["APROVADO", "CONFERENCIA_TECNICA", "PRODUCAO", "INSTALACAO"],
              },
            },
          },
        ],
      },
      include: {
        project: {
          include: {
            client: { select: { id: true, nome: true, cidade: true, telefone: true } },
          },
        },
        items: {
          select: {
            id: true,
            descricao: true,
            valor_total: true,
            status: true,
            quantidade: true,
            valor_unitario: true,
          },
        },
      },
      orderBy: { validade: "asc" },
    });

    const data: CommercialPendingQuote[] = quotes.map((q) => {
      const summary = summarizeQuoteItems(
        q.items.map((i) => ({
          id: i.id,
          valor_total: Number(i.valor_total),
          status: i.status,
        }))
      );
      return {
        id: q.id,
        project_id: q.project_id,
        versao: q.versao,
        template_tipo: q.template_tipo,
        validade: q.validade.toISOString(),
        createdAt: q.createdAt.toISOString(),
        aprovado_em: q.aprovado_em ? q.aprovado_em.toISOString() : null,
        valor_final: Number(q.valor_final),
        desconto: Number(q.desconto),
        subtotal: Number(q.subtotal),
        project: {
          id: q.project.id,
          status_geral: q.project.status_geral,
          valor_previsto: Number(q.project.valor_previsto),
          client: q.project.client,
        },
        items: q.items.map((i) => ({
          id: i.id,
          descricao: i.descricao,
          quantidade: i.quantidade,
          valor_unitario: Number(i.valor_unitario),
          valor_total: Number(i.valor_total),
          status: i.status,
        })),
        pendingTotal: summary.pendingTotal,
        approvedTotal: summary.approvedTotal,
        pendingCount: summary.pendingCount,
        approvedCount: summary.approvedCount,
      };
    });

    return { success: true, data: maybeRedactForViewer(data, auth.cargo) };
  } catch (error) {
    console.error("Erro na Server Action getCommercialPendingQuotes:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao listar pendências",
      data: [] as CommercialPendingQuote[],
    };
  }
}

export type CommercialPendingQuote = {
  id: string;
  project_id: string;
  versao: number;
  template_tipo?: string;
  validade: string;
  createdAt: string;
  aprovado_em: string | null;
  valor_final: number;
  desconto: number;
  subtotal: number;
  project: {
    id: string;
    status_geral: string;
    valor_previsto: number;
    client: { id: string; nome: string; cidade: string; telefone: string };
  };
  items: Array<{
    id: string;
    descricao: string;
    quantidade: number;
    valor_unitario: number;
    valor_total: number;
    status: string;
  }>;
  pendingTotal: number;
  approvedTotal: number;
  pendingCount: number;
  approvedCount: number;
};

// Remove um orçamento (aprovados: apenas Administrador / cargo ADMIN)
export async function deleteQuote(projectId: string, quoteId: string, version: number) {
  const auth = await getWriteAccess("quotes");
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
      // 2. Remove quote (approvals em cascata)
      await tx.quote.delete({
        where: { id: quoteId }
      });

      // 3. Recalcula valor previsto com base nos eventos de aprovação restantes
      const approvals = await tx.quoteApproval.findMany({
        where: { quote: { project_id: projectId } },
        select: { valor_aprovado: true },
      });
      const totalAprovado = approvals.reduce(
        (sum, a) => sum + Number(a.valor_aprovado),
        0
      );
      await tx.project.update({
        where: { id: projectId },
        data: { valor_previsto: totalAprovado },
      });

      // 4. Registra na timeline
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
  const auth = await getModuleAccess("quotes");
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
        valor_total: Number(item.valor_total),
        status: item.status,
        aprovado_em: item.aprovado_em instanceof Date ? item.aprovado_em.toISOString() : item.aprovado_em,
        subitens: Array.isArray(item.subitens)
          ? item.subitens.filter((entry): entry is string => typeof entry === "string")
          : [],
      }))
    }));

    return {
      success: true,
      data: maybeRedactForViewer(serializedQuotes, auth.cargo),
    };
  } catch (error) {
    console.warn("Erro ao buscar orçamentos:", error);
    return { success: false, error: "Erro de conexão ao banco de dados", data: [] };
  }
}

// Busca todos os projetos ativos para seleção no construtor de orçamentos
export async function getProjectsForQuotes() {
  const auth = await getModuleAccess("quotes");
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
    return {
      success: true,
      data: maybeRedactForViewer(serializedProjects, auth.cargo),
    };
  } catch (error) {
    console.warn("Erro ao buscar projetos para orçamentos:", error);
    return { success: false, error: "Erro de conexão ao banco de dados", data: [] };
  }
}

// Cria um projeto temporário para um cliente existente
export async function createProjectForClient(clientId: string, companyId: string) {
  const auth = await getWriteAccess("quotes");
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
    const inheritedPartner = await withInheritedPartnerId(clientId);
    const project = await prisma.project.create({
      data: {
        client_id: clientId,
        valor_previsto: 0,
        status_geral: "ORCAMENTO",
        ...inheritedPartner,
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
  const auth = await getWriteAccess("quotes");
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
            email: contact.email,
            telefone: contact.telefone,
            telefone_digits: contact.phoneDigits || null,
            cidade: capitalizeText(data.cidade),
            origem: "WHATSAPP",
            status: "LEAD",
            company_id: data.companyId,
          },
        });
      }

      const inheritedPartner = await withInheritedPartnerIdTx(tx, client.id);
      const project = await tx.project.create({
        data: {
          client_id: client.id,
          valor_previsto: 0,
          status_geral: "ORCAMENTO",
          ...inheritedPartner,
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
  const auth = await getModuleAccess("quotes");
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


export async function getProjectSolicitanteOptions(projectId: string) {
  const auth = await getModuleAccess("quotes");
  if (!auth) {
    return {
      success: false as const,
      error: "Não autenticado",
      clientId: null as string | null,
      tipoPessoa: null as "PF" | "PJ" | null,
      contacts: [] as Array<{
        id: string;
        nome: string;
        area: string | null;
        principal: boolean;
      }>,
    };
  }

  try {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        client: { company_id: auth.companyId },
      },
      select: {
        client: {
          select: {
            id: true,
            tipo_pessoa: true,
            contacts: {
              orderBy: [{ principal: "desc" }, { nome: "asc" }],
              select: {
                id: true,
                nome: true,
                area: true,
                principal: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      return {
        success: false as const,
        error: "Projeto não encontrado",
        clientId: null,
        tipoPessoa: null,
        contacts: [],
      };
    }

    const tipoPessoa = (project.client.tipo_pessoa === "PJ" ? "PJ" : "PF") as "PF" | "PJ";
    return {
      success: true as const,
      clientId: project.client.id,
      tipoPessoa,
      contacts: tipoPessoa === "PJ" ? project.client.contacts : [],
    };
  } catch (error) {
    console.error("Erro na Server Action getProjectSolicitanteOptions:", error);
    return {
      success: false as const,
      error: "Erro ao carregar representantes",
      clientId: null,
      tipoPessoa: null,
      contacts: [],
    };
  }
}

