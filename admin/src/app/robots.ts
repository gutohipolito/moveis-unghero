import type { MetadataRoute } from "next";

/**
 * Painel interno (admin.moveisunghero.com.br): bloqueia toda indexação por
 * buscadores. O site institucional (moveisunghero.com.br) tem seu próprio
 * robots.ts e permanece indexável.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
