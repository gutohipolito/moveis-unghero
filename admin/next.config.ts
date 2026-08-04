import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.join(appDir, "..");

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
];

const nextConfig: NextConfig = {
  // Monorepo (site na raiz + admin/): raiz única para Turbopack e file tracing.
  turbopack: {
    root: monorepoRoot,
  },
  outputFileTracingRoot: monorepoRoot,
  serverExternalPackages: ["@napi-rs/canvas", "sharp"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  async headers() {
    // Formulários públicos exibidos via iframe no site institucional
    // (moveisunghero.com.br/cadastro, /orcamento, /cadastro-parceiro).
    const frameAncestors =
      "frame-ancestors 'self' https://moveisunghero.com.br https://www.moveisunghero.com.br";

    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
      ...["/cadastro", "/briefing", "/cadastro-parceiro", "/cadastro-fornecedor", "/catalogos/:path*"].map(
        (source) => ({
          source,
          headers: [{ key: "Content-Security-Policy", value: frameAncestors }],
        })
      ),
    ];
  },
};

export default nextConfig;
