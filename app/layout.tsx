import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import localBusinessSchema from "@/schemas/localbusiness.json";

export const metadata: Metadata = {
  title: "Móveis Unghero | Móveis Sob Medida em Farroupilha e Serra Gaúcha",
  description: "A Móveis Unghero fabrica cozinhas, closets, dormitórios e ambientes corporativos sob medida em Farroupilha-RS. Atendemos toda a Serra Gaúcha, incluindo Caxias do Sul, Bento Gonçalves e Garibaldi.",
  metadataBase: new URL("https://moveisunghero.com.br"),
  authors: [{ name: "Móveis Unghero", url: "https://moveisunghero.com.br/nossos-especialistas" }],
  creator: "Móveis Unghero",
  publisher: "Móveis Unghero",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Móveis Unghero | Móveis Sob Medida e Planejados",
    description: "Móveis sob medida desenvolvidos em Farroupilha-RS. Cozinhas, closets, dormitórios e ambientes corporativos para toda a Serra Gaúcha.",
    url: "https://moveisunghero.com.br",
    siteName: "Móveis Unghero",
    locale: "pt_BR",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  }
};

export const viewport: Viewport = {
  themeColor: "#0c0d0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" style={{ scrollBehavior: 'smooth' }}>
      <head>
        {/* Injeção de Dados Estruturados JSON-LD do Negócio Local para SEO/IAs */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
        />
      </head>
      <body>
        <Header />
        <main id="main-content" style={{ minHeight: 'calc(100vh - var(--header-height))', paddingTop: 'var(--header-height)' }}>
          {children}
        </main>
        <Footer />
        <WhatsAppButton />
      </body>
    </html>
  );
}
