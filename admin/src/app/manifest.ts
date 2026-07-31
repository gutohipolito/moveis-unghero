import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Sistema - Móveis Unghero",
    short_name: "Sistema MU",
    description: "CRM, fábrica e gestão operacional da Móveis Unghero",
    start_url: "/crm",
    scope: "/",
    display: "standalone",
    display_override: ["fullscreen", "standalone", "minimal-ui"],
    orientation: "any",
    lang: "pt-BR",
    dir: "ltr",
    background_color: "#f5f2ed",
    theme_color: "#d9a007",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icon-mu-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-mu.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-mu.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Funil comercial",
        short_name: "CRM",
        url: "/crm",
        icons: [{ src: "/icon-mu-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Chão de fábrica",
        short_name: "Fábrica",
        url: "/factory",
        icons: [{ src: "/icon-mu-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Agenda",
        short_name: "Agenda",
        url: "/agenda",
        icons: [{ src: "/icon-mu-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
