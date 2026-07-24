import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

/** Crawlers / preview do WhatsApp e redes — não contam como abertura real. */
const PREVIEW_UA_RE =
  /whatsapp|facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|discordbot|telegrambot|preview|bot|crawler|spider|embedly|quora link preview|showyoubot|outbrain|pinterest|vkshare|w3c_validator/i;

export function isQuoteLinkPreviewAgent(userAgent?: string | null): boolean {
  if (!userAgent?.trim()) return false;
  return PREVIEW_UA_RE.test(userAgent);
}

export type QuoteViewStats = {
  sharedAt: string | null;
  viewCount: number;
  firstViewedAt: string | null;
  lastViewedAt: string | null;
  neverOpened: boolean;
};

export function toQuoteViewStats(input: {
  pdf_shared_at?: Date | string | null;
  pdf_view_count?: number | null;
  pdf_first_viewed_at?: Date | string | null;
  pdf_last_viewed_at?: Date | string | null;
}): QuoteViewStats {
  const sharedAt = input.pdf_shared_at
    ? new Date(input.pdf_shared_at).toISOString()
    : null;
  const viewCount = Number(input.pdf_view_count ?? 0);
  return {
    sharedAt,
    viewCount,
    firstViewedAt: input.pdf_first_viewed_at
      ? new Date(input.pdf_first_viewed_at).toISOString()
      : null,
    lastViewedAt: input.pdf_last_viewed_at
      ? new Date(input.pdf_last_viewed_at).toISOString()
      : null,
    neverOpened: Boolean(sharedAt) && viewCount <= 0,
  };
}

export function formatQuoteViewLabel(stats: QuoteViewStats): string | null {
  if (!stats.sharedAt) return null;
  if (stats.neverOpened) return "Proposta não aberta";
  if (stats.viewCount === 1) {
    return stats.lastViewedAt
      ? `Abriu 1x · ${formatRelativeShort(stats.lastViewedAt)}`
      : "Abriu 1x";
  }
  return stats.lastViewedAt
    ? `Abriu ${stats.viewCount}x · última ${formatRelativeShort(stats.lastViewedAt)}`
    : `Abriu ${stats.viewCount}x`;
}

function formatRelativeShort(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ontem";
  if (days < 7) return `há ${days} dias`;
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

/** Registra abertura do link público. Ignora falhas para não quebrar a página do cliente. */
export async function recordQuotePublicView(
  quoteId: string,
  userAgent?: string | null
): Promise<void> {
  try {
    const isPreview = isQuoteLinkPreviewAgent(userAgent);
    const now = new Date();

    await prisma.$transaction([
      prisma.quoteView.create({
        data: {
          id: randomUUID(),
          quote_id: quoteId,
          viewed_at: now,
          user_agent: userAgent?.slice(0, 500) || null,
          is_preview: isPreview,
        },
      }),
      ...(isPreview
        ? []
        : [
            prisma.$executeRaw`
              UPDATE "Quote"
              SET
                "pdf_view_count" = "pdf_view_count" + 1,
                "pdf_first_viewed_at" = COALESCE("pdf_first_viewed_at", ${now}),
                "pdf_last_viewed_at" = ${now}
              WHERE "id" = ${quoteId}
            `,
          ]),
    ]);
  } catch (error) {
    console.warn("Falha ao registrar visualização do orçamento:", error);
  }
}
