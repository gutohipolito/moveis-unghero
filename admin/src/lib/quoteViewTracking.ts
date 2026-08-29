import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

/** Crawlers / preview do WhatsApp e redes — não contam como abertura real. */
const PREVIEW_UA_RE =
  /whatsapp|facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|discordbot|telegrambot|preview|bot|crawler|spider|embedly|quora link preview|showyoubot|outbrain|pinterest|vkshare|w3c_validator/i;

export function isQuoteLinkPreviewAgent(userAgent?: string | null): boolean {
  if (!userAgent?.trim()) return false;
  return PREVIEW_UA_RE.test(userAgent);
}

/** UA interno do proxy HostGator — nunca é o dispositivo real do cliente. */
export function isQuoteProxyUserAgent(userAgent?: string | null): boolean {
  return Boolean(userAgent?.trim() && /^MoveisUnghero-QuoteProxy\//i.test(userAgent.trim()));
}

export type ParsedUserAgent = {
  device: "Mobile" | "Tablet" | "Desktop";
  os: "iOS" | "Android" | "Windows" | "macOS" | "Linux" | "Chrome OS" | "Desconhecido";
  label: string;
};

export type QuoteClientDeviceSignals = {
  mobile?: boolean;
  tablet?: boolean;
  maxTouchPoints?: number;
  platform?: string;
  /** Largura útil da viewport (px) — reforça detecção mobile quando UA é genérico. */
  viewportWidth?: number;
};

function normalizeHintMobile(raw?: string | null): "?1" | "?0" | "" {
  const v = (raw || "").trim().replace(/"/g, "");
  if (v === "?1" || v === "1" || v.toLowerCase() === "true") return "?1";
  if (v === "?0" || v === "0" || v.toLowerCase() === "false") return "?0";
  return "";
}

/** Há sinal confiável de dispositivo além do UA do proxy? */
export function hasUsableQuoteDeviceSignal(
  userAgent?: string | null,
  hints?: { mobile?: string | null; platform?: string | null },
  client?: QuoteClientDeviceSignals | null
): boolean {
  if (client?.mobile === true || client?.tablet === true) return true;
  if (Number(client?.maxTouchPoints || 0) > 0) return true;
  if (Number(client?.viewportWidth || 0) > 0) return true;
  if (normalizeHintMobile(hints?.mobile)) return true;
  if ((hints?.platform || "").trim().replace(/"/g, "")) return true;
  const ua = userAgent?.trim() || "";
  if (!ua || isQuoteProxyUserAgent(ua)) return false;
  return true;
}

/** Extrai dispositivo e SO a partir do User-Agent, Client Hints e sinais do navegador. */
export function parseQuoteUserAgent(
  userAgent?: string | null,
  hints?: { mobile?: string | null; platform?: string | null },
  client?: QuoteClientDeviceSignals | null
): ParsedUserAgent {
  const rawUa = userAgent?.trim() || "";
  const ua = isQuoteProxyUserAgent(rawUa) ? "" : rawUa;
  const hintMobile = normalizeHintMobile(hints?.mobile);
  const hintPlatform = (hints?.platform?.trim() || "").replace(/"/g, "");
  const clientPlatform = (client?.platform || "").trim();
  const touchPoints = Number(client?.maxTouchPoints || 0);
  const viewportWidth = Number(client?.viewportWidth || 0);

  const uaLooksPhone = /iphone|ipod|windows phone|opera mini|android.+mobile|mobile safari|mobile\//i.test(
    ua
  );
  const uaLooksTablet = /ipad|tablet|kindle|silk|(android(?!.*mobile))/i.test(ua);
  const uaLooksMobile = uaLooksPhone || /mobi/i.test(ua);
  const isIpadOs =
    Boolean(client?.tablet) ||
    (/ipad/i.test(ua) ) ||
    ((/macintel/i.test(clientPlatform) || /macintosh|mac os x/i.test(ua)) &&
      touchPoints > 1);

  if (isIpadOs) {
    return { device: "Tablet", os: "iOS", label: "Tablet · iOS" };
  }

  const clientSaysMobile =
    client?.mobile === true ||
    hintMobile === "?1" ||
    (touchPoints > 0 && viewportWidth > 0 && viewportWidth < 768 && !client?.tablet);

  if (clientSaysMobile) {
    let os: ParsedUserAgent["os"] = "Desconhecido";
    if (/android/i.test(ua) || /android/i.test(hintPlatform) || /android/i.test(clientPlatform)) {
      os = "Android";
    } else if (
      /iphone|ipad|ipod|ios/i.test(ua) ||
      /ios|iphone/i.test(hintPlatform) ||
      /iphone|ipad/i.test(clientPlatform)
    ) {
      os = "iOS";
    } else {
      os = platformHintToOs(hintPlatform || clientPlatform);
      if (os === "Desconhecido" && ua) {
        if (/android/i.test(ua)) os = "Android";
        else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
      }
    }
    const device = /ipad|tablet/i.test(ua) || client?.tablet ? "Tablet" : "Mobile";
    return { device, os, label: `${device} · ${os}` };
  }

  // Sem UA real e sem sinais do cliente — não assumir Desktop (proxy antigo fazia isso).
  if (!ua && !hintPlatform && !clientPlatform && hintMobile !== "?0") {
    return { device: "Desktop", os: "Desconhecido", label: "Desktop · Desconhecido" };
  }

  let os: ParsedUserAgent["os"] = "Desconhecido";
  if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(ua) || (/mac os x/i.test(ua) && /mobile/i.test(ua))) os = "iOS";
  else if (/cros/i.test(ua)) os = "Chrome OS";
  else if (/windows nt|win64|win32/i.test(ua)) os = "Windows";
  else if (/macintosh|mac os x/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua)) os = "Linux";

  if (os === "Desconhecido" && (hintPlatform || clientPlatform)) {
    os = platformHintToOs(hintPlatform || clientPlatform);
  }

  let device: ParsedUserAgent["device"] = "Desktop";
  if (uaLooksTablet) {
    device = "Tablet";
  } else if (uaLooksMobile || uaLooksPhone) {
    device = "Mobile";
  } else if (hintMobile === "?0") {
    device = "Desktop";
  } else if (touchPoints > 0 && viewportWidth > 0 && viewportWidth < 1024 && viewportWidth >= 768) {
    device = "Tablet";
  }

  if (os === "macOS" && /mobile|touch/i.test(ua)) {
    os = "iOS";
    device = "Tablet";
  }

  const label = `${device} · ${os}`;
  return { device, os, label };
}

function platformHintToOs(platform: string): ParsedUserAgent["os"] {
  const p = platform.toLowerCase();
  if (p.includes("android")) return "Android";
  if (p.includes("ios") || p.includes("iphone") || p.includes("ipad")) return "iOS";
  if (p.includes("windows")) return "Windows";
  if (p.includes("mac")) return "macOS";
  if (p.includes("chrome")) return "Chrome OS";
  if (p.includes("linux")) return "Linux";
  return "Desconhecido";
}

/**
 * Resolve o UA do visitante a partir dos headers da request
 * (proxy HostGator encaminha X-Quote-Client-UA).
 */
export function resolveQuoteViewUserAgent(hdrs: {
  get(name: string): string | null;
}): {
  userAgent: string | null;
  hints: { mobile: string | null; platform: string | null };
} {
  const forwarded =
    hdrs.get("x-quote-client-ua")?.trim() ||
    hdrs.get("x-forwarded-user-agent")?.trim() ||
    null;
  const rawUa = hdrs.get("user-agent")?.trim() || null;
  const candidate = forwarded || rawUa;
  const userAgent =
    candidate && !isQuoteProxyUserAgent(candidate) ? candidate : null;

  return {
    userAgent,
    hints: {
      mobile: hdrs.get("sec-ch-ua-mobile"),
      platform: hdrs.get("sec-ch-ua-platform"),
    },
  };
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
  userAgent?: string | null,
  hints?: { mobile?: string | null; platform?: string | null },
  client?: QuoteClientDeviceSignals | null
): Promise<void> {
  try {
    const ua = isQuoteProxyUserAgent(userAgent) ? null : userAgent;
    const isPreview = isQuoteLinkPreviewAgent(ua);
    // Proxy antigo grava MoveisUnghero-QuoteProxy → tudo virava Desktop.
    // Sem UA real nem sinais do browser, espera o beacon do cliente.
    if (!isPreview && !hasUsableQuoteDeviceSignal(ua, hints, client)) {
      return;
    }

    const parsed = parseQuoteUserAgent(ua, hints, client);
    const now = new Date();

    await prisma.$transaction([
      prisma.quoteView.create({
        data: {
          id: randomUUID(),
          quote_id: quoteId,
          viewed_at: now,
          user_agent: ua?.slice(0, 500) || null,
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

/** Ajusta o dispositivo da abertura recente (iPad / UA reduzido) sem contar de novo. */
export async function refineQuotePublicView(
  quoteId: string,
  userAgent?: string | null,
  hints?: { mobile?: string | null; platform?: string | null },
  client?: QuoteClientDeviceSignals | null
): Promise<void> {
  try {
    const ua = isQuoteProxyUserAgent(userAgent) ? null : userAgent;
    if (isQuoteLinkPreviewAgent(ua)) return;
    if (!hasUsableQuoteDeviceSignal(ua, hints, client)) return;

    const parsed = parseQuoteUserAgent(ua, hints, client);
    const cutoff = new Date(Date.now() - 15 * 60 * 1000);
    const last = await prisma.quoteView.findFirst({
      where: {
        quote_id: quoteId,
        is_preview: false,
        viewed_at: { gte: cutoff },
      },
      orderBy: { viewed_at: "desc" },
      select: { id: true, user_agent: true },
    });

    if (!last) {
      await recordQuotePublicView(quoteId, ua, hints, client);
      return;
    }

    await prisma.$transaction([
      prisma.quoteView.update({
        where: { id: last.id },
        data: {
          device: parsed.device,
          os: parsed.os,
          ...(ua ? { user_agent: ua.slice(0, 500) } : {}),
        },
      }),
      prisma.quote.update({
        where: { id: quoteId },
        data: {
          pdf_last_device: parsed.device,
          pdf_last_os: parsed.os,
        },
      }),
    ]);
  } catch (error) {
    console.warn("Falha ao refinar dispositivo da abertura:", error);
  }
}
