import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.join(appDir, "..");

const nextConfig: NextConfig = {
  // Monorepo (site na raiz + admin/): raiz única para Turbopack e file tracing.
  turbopack: {
    root: monorepoRoot,
  },
  outputFileTracingRoot: monorepoRoot,
  async headers() {
    // Formulários públicos exibidos via iframe no site institucional
    // (moveisunghero.com.br/cadastro, /orcamento, /cadastro-parceiro).
    const frameAncestors =
      "frame-ancestors 'self' https://moveisunghero.com.br https://www.moveisunghero.com.br";
    return ["/cadastro", "/briefing", "/cadastro-parceiro"].map((source) => ({
      source,
      headers: [{ key: "Content-Security-Policy", value: frameAncestors }],
    }));
  },
};

export default nextConfig;
