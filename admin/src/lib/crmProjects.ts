import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getAuthContext } from "@/lib/auth-guard";
import { resolveStageEntryAt } from "@/lib/crmStageDate";
import { toQuoteViewStats, type QuoteViewStats } from "@/lib/quoteViewTracking";
import { isOpsLimitedRole } from "@/lib/permissions";
import { OPS_CRM_STATUSES } from "@/lib/crmOpsAccess";
import { maybeRedactForRole } from "@/lib/viewerRedact";

export const CRM_PROJECT_SELECT = {
  id: true,
  valor_previsto: true,
  status_geral: true,
  ultimo_contato_em: true,
  createdAt: true,
  updatedAt: true,
  motivo_perda: true,
  observacoes: true,
  conf_tecnica_resp1_id: true,
  conf_tecnica_resp2_id: true,
  conf_tecnica_resp1: { select: { id: true, name: true } },
  conf_tecnica_resp2: { select: { id: true, name: true } },
  quotes: {
    select: {
      aprovado_em: true,
      pdf_shared_at: true,
      pdf_view_count: true,
      pdf_first_viewed_at: true,
      pdf_last_viewed_at: true,
      pdf_last_device: true,
      pdf_last_os: true,
    },
    orderBy: [{ pdf_shared_at: "desc" }, { aprovado_em: "asc" }],
  },
  timeline: {
    select: {
      id: true,
      acao: true,
      data: true,
      user: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      data: "desc",
    },
  },
  client: {
    select: {
      id: true,
      nome: true,
      cidade: true,
      origem: true,
      telefone: true,
      email: true,
    },
  },
  briefing: {
    select: {
      id: true,
      ambientes: true,
      tipo_imovel: true,
      fase_projeto: true,
      pronto: true,
      data_chaves: true,
      tem_projeto: true,
      estilo: true,
      faixa_investimento: true,
      prazo_inicio: true,
      pinterest_link: true,
      referencia_url: true,
      origem_lead: true,
      utm_source: true,
      utm_medium: true,
      utm_campaign: true,
      gclid: true,
      fbclid: true,
      ip: true,
      user_agent: true,
      dispositivo: true,
      os: true,
      resolution: true,
      idioma: true,
      tempo_preenchimento: true,
      score: true,
      roteiro_sugerido: true,
      createdAt: true,
    },
  },
  _count: {
    select: { paymentReceipts: true },
  },
} satisfies Prisma.ProjectSelect;

export async function fetchCrmProjects(companyId: string) {
  const auth = await getAuthContext();
  const opsLimited = isOpsLimitedRole(auth?.cargo);

  const projectsResult = await prisma.project
    .findMany({
      where: {
        client: { company_id: companyId },
        OR: [{ quotes: { some: {} } }, { briefing: { isNot: null } }],
        ...(opsLimited ? { status_geral: { in: [...OPS_CRM_STATUSES] } } : {}),
      },
      select: CRM_PROJECT_SELECT,
    })
    .catch((error) => {
      console.warn("Conexão ao banco falhou no carregamento do CRM.", error);
      return [];
    });

  const mapped = projectsResult.map((project) => {
    const timeline = project.timeline
      ? project.timeline.map((entry) => ({
          id: entry.id,
          acao: entry.acao,
          data: entry.data ? new Date(entry.data).toISOString() : new Date().toISOString(),
          user: entry.user,
        }))
      : [];

    const approvedQuotes = project.quotes
      .filter((q) => q.aprovado_em)
      .sort(
        (a, b) =>
          new Date(a.aprovado_em!).getTime() - new Date(b.aprovado_em!).getTime()
      );
    const firstQuoteApprovedAt = approvedQuotes[0]?.aprovado_em
      ? new Date(approvedQuotes[0].aprovado_em).toISOString()
      : null;

    const sharedOpenQuote =
      project.quotes.find((q) => q.pdf_shared_at && !q.aprovado_em) ??
      project.quotes.find((q) => q.pdf_shared_at) ??
      null;

    const quoteShare: QuoteViewStats | null = sharedOpenQuote
      ? toQuoteViewStats(sharedOpenQuote)
      : null;

    return {
      id: project.id,
      valor_previsto: Number(project.valor_previsto),
      status_geral: project.status_geral,
      ultimo_contato_em: project.ultimo_contato_em
        ? new Date(project.ultimo_contato_em).toISOString()
        : null,
      createdAt: project.createdAt ? new Date(project.createdAt).toISOString() : null,
      updatedAt: project.updatedAt ? new Date(project.updatedAt).toISOString() : null,
      motivo_perda: project.motivo_perda || null,
      observacoes: project.observacoes || null,
      conf_tecnica_resp1_id: project.conf_tecnica_resp1_id || null,
      conf_tecnica_resp1Nome: project.conf_tecnica_resp1?.name || null,
      conf_tecnica_resp2_id: project.conf_tecnica_resp2_id || null,
      conf_tecnica_resp2Nome: project.conf_tecnica_resp2?.name || null,
      stage_entered_at: resolveStageEntryAt(
        project.status_geral,
        timeline,
        firstQuoteApprovedAt
      ),
      quoteShare,
      hasPaymentReceipt: (project._count?.paymentReceipts ?? 0) > 0,
      timeline,
      client: project.client,
      briefing: project.briefing
        ? {
            ...project.briefing,
            createdAt: project.briefing.createdAt
              ? new Date(project.briefing.createdAt).toISOString()
              : null,
          }
        : null,
    };
  });

  const redacted = maybeRedactForRole(mapped, auth?.cargo);
  // Projetista/Marceneiro: não expor telefone/e-mail do cliente no payload do CRM.
  if (!isOpsLimitedRole(auth?.cargo)) return redacted;
  return redacted.map((project) => ({
    ...project,
    client: {
      ...project.client,
      telefone: "",
      email: "",
    },
  }));
}
