import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      { source: "/faq", destination: "/processo", permanent: true },
      { source: "/blog", destination: "/projetos", permanent: true },
      { source: "/blog/:slug", destination: "/projetos", permanent: true },
      { source: "/cidades", destination: "/", permanent: true },
      { source: "/cidades/:slug", destination: "/", permanent: true },
      { source: "/ambientes", destination: "/projetos", permanent: true },
      { source: "/ambientes/:category", destination: "/projetos", permanent: true },
      {
        source: "/ambientes/:category/:slug",
        destination: "/projetos",
        permanent: true,
      },
      { source: "/nossos-especialistas", destination: "/sobre", permanent: true },
      { source: "/avaliar", destination: "/contato", permanent: true },
    ];
  },
};

export default nextConfig;
