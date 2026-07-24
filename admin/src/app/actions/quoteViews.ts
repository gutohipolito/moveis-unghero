"use server";

import { prisma, isDatabaseOffline } from "@/lib/prisma";
import { requireAuth, requireProjectInCompany } from "@/lib/auth-guard";
import { formatQuoteCodigo } from "@/lib/quoteCodigo";

export type QuoteViewHistoryItem = {
  id: string;
  viewedAt: string;
  device: string | null;
  os: string | null;
  deviceLabel: string;
  quoteId: string;
  quoteLabel: string;
};

export async function getProjectQuoteViewHistory(projectId: string): Promise<{
  success: boolean;
  error?: string;
  items?: QuoteViewHistoryItem[];
  sharedAt?: string | null;
  neverOpened?: boolean;
}> {
  try {
    if (isDatabaseOffline()) {
      return { success: false, error: "Banco indisponível." };
    }

    const auth = await requireAuth();
    await requireProjectInCompany(projectId, auth.companyId);

    const [views, sharedQuote] = await Promise.all([
      prisma.quoteView.findMany({
        where: {
          is_preview: false,
          quote: { project_id: projectId },
        },
        orderBy: { viewed_at: "desc" },
        take: 25,
        select: {
          id: true,
          viewed_at: true,
          device: true,
          os: true,
          quote: {
            select: {
              id: true,
              codigo: true,
              versao: true,
            },
          },
        },
      }),
      prisma.quote.findFirst({
        where: {
          project_id: projectId,
          pdf_shared_at: { not: null },
        },
        orderBy: { pdf_shared_at: "desc" },
        select: {
          pdf_shared_at: true,
          pdf_view_count: true,
        },
      }),
    ]);

    const items: QuoteViewHistoryItem[] = views.map((view) => {
      const device = view.device?.trim() || null;
      const os = view.os?.trim() || null;
      return {
        id: view.id,
        viewedAt: view.viewed_at.toISOString(),
        device,
        os,
        deviceLabel:
          device && os ? `${device} · ${os}` : device || os || "Dispositivo não identificado",
        quoteId: view.quote.id,
        quoteLabel: formatQuoteCodigo({
          codigo: view.quote.codigo,
          id: view.quote.id,
        }),
      };
    });

    const sharedAt = sharedQuote?.pdf_shared_at
      ? sharedQuote.pdf_shared_at.toISOString()
      : null;
    const neverOpened = Boolean(sharedAt) && (sharedQuote?.pdf_view_count ?? 0) <= 0;

    return { success: true, items, sharedAt, neverOpened };
  } catch (error) {
    console.error("getProjectQuoteViewHistory:", error);
    return { success: false, error: "Não foi possível carregar o histórico." };
  }
}
