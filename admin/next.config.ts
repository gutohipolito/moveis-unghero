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
    return [
      {
        // Permite que a página de cadastro seja exibida em iframe apenas
        // a partir do site institucional (moveisunghero.com.br/cadastro).
        source: "/cadastro",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://moveisunghero.com.br https://www.moveisunghero.com.br",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
