import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

/** Crawlers / preview do WhatsApp e redes — não contam como abertura real. */
const PREVIEW_UA_RE =
  /whatsapp|facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|discordbot|telegrambot|preview|bot|crawler|spider|embedly|quora link preview|showyoubot|outbrain|pinterest|vkshare|w3c_validator/i;

export function isQuoteLinkPreviewAgent(userAgent?: string | null): boolean {
  if (!userAgent?.trim()) return false;
  return PREVIEW_UA_RE.test(userAgent);
}

export type ParsedUserAgent = {
  device: "Mobile" | "Tablet" | "Desktop";
  os: "iOS" | "Android" | "Windows" | "macOS" | "Linux" | "Chrome OS" | "Desconhecido";
  label: string;
};

/** Extrai dispositivo e SO a partir do User-Agent (sem libs externas). */
export function parseQuoteUserAgent(userAgent?: string | null): ParsedUserAgent {
  const ua = userAgent?.trim() || "";
  if (!ua) {
    return { device: "Desktop", os: "Desconhecido", label: "Desktop · Desconhecido" };
  }

  const lower = ua.toLowerCase();

  let os: ParsedUserAgent["os"] = "Desconhecido";
  if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(ua) || (/mac os x/i.test(ua) && /mobile/i.test(ua))) os = "iOS";
  else if (/cros/i.test(ua)) os = "Chrome OS";
  else if (/windows nt|win64|win32/i.test(ua)) os = "Windows";
  else if (/macintosh|mac os x/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua)) os = "Linux";

  let device: ParsedUserAgent["device"] = "Desktop";
  if (/ipad|tablet|kindle|silk|(android(?!.*mobile))/i.test(ua)) {
    device = "Tablet";
  } else if (/mobi|iphone|ipod|android.*mobile|windows phone|opera mini/i.test(ua) || lower.includes("mobile")) {
    device = "Mobile";
  }

  // iPadOS 13+ pode se apresentar como Macintosh
  if (os === "macOS" && /mobile|touch/i.test(ua)) {
    os = "iOS";
    device = "Tablet";
  }

  const label = `${device} · ${os}`;

  return { device, os, label };
}

export type QuoteViewStats = {
  sharedAt: string | null;
  viewCount: number;
  firstViewedAt: string | null;
  lastViewedAt: string | null;
  neverOpened: boolean;
  lastDevice: string | null;
  lastOs: string | null;
  lastDeviceLabel: string | null;
};

export function toQuoteViewStats(input: {
  pdf_shared_at?: Date | string | null;
  pdf_view_count?: number | null;
  pdf_first_viewed_at?: Date | string | null;
  pdf_last_viewed_at?: Date | string | null;
  pdf_last_device?: string | null;
  pdf_last_os?: string | null;
}): QuoteViewStats {
  const sharedAt = input.pdf_shared_at
    ? new Date(input.pdf_shared_at).toISOString()
    : null;
  const viewCount = Number(input.pdf_view_count ?? 0);
  const lastDevice = input.pdf_last_device?.trim() || null;
  const lastOs = input.pdf_last_os?.trim() || null;
  const lastDeviceLabel =
    lastDevice && lastOs
      ? `${lastDevice} · ${lastOs}`
      : lastDevice || lastOs || null;

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
    lastDevice,
    lastOs,
    lastDeviceLabel,
  };
}

export function formatQuoteViewLabel(stats: QuoteViewStats): string | null {
  if (!stats.sharedAt) return null;
  if (stats.neverOpened) return "Proposta não aberta";

  const deviceBit = stats.lastDeviceLabel ? ` · ${stats.lastDeviceLabel}` : "";

  if (stats.viewCount === 1) {
    return stats.lastViewedAt
      ? `Abriu 1x · ${formatRelativeShort(stats.lastViewedAt)}${deviceBit}`
      : `Abriu 1x${deviceBit}`;
  }
  return stats.lastViewedAt
    ? `Abriu ${stats.viewCount}x · última ${formatRelativeShort(stats.lastViewedAt)}${deviceBit}`
    : `Abriu ${stats.viewCount}x${deviceBit}`;
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
    const parsed = parseQuoteUserAgent(userAgent);
    const now = new Date();

    await prisma.$transaction([
      prisma.quoteView.create({
        data: {
          id: randomUUID(),
          quote_id: quoteId,
          viewed_at: now,
          user_agent: userAgent?.slice(0, 500) || null,
          is_preview: isPreview,
          device: parsed.device,
          os: parsed.os,
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
                "pdf_last_viewed_at" = ${now},
                "pdf_last_device" = ${parsed.device},
                "pdf_last_os" = ${parsed.os}
              WHERE "id" = ${quoteId}
            `,
          ]),
    ]);
  } catch (error) {
    console.warn("Falha ao registrar visualização do orçamento:", error);
  }
}
