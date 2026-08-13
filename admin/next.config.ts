import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.join(appDir, "..");

const EMBED_ANCESTORS =
  "'self' https://moveisunghero.com.br https://www.moveisunghero.com.br";

/**
 * CSP de contenção sem script-src/style-src.
 * Next.js (hidratação), o script inline de privacidade do dashboard e os
 * <style> de impressão/e-mail quebram com script-src/style-src sem nonce.
 * Com 'unsafe-inline' a diretiva não conteria XSS — pior do que omitir.
 */
const BASE_CSP = [
  `frame-ancestors ${EMBED_ANCESTORS}`,
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
].join("; ");

const SECURITY_HEADERS = [
  // Painel interno: nunca indexar (mais forte que meta robots).
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Content-Security-Policy", value: BASE_CSP },
];

const nextConfig: NextConfig = {
  // Monorepo (site na raiz + admin/): raiz única para Turbopack e file tracing.
  turbopack: {
    root: monorepoRoot,
  },
  outputFileTracingRoot: monorepoRoot,
  serverExternalPackages: ["sharp", "pdf-lib"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
