import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import localBusinessSchema from "@/schemas/localbusiness.json";

export const metadata: Metadata = {
  title: "Móveis Unghero | Móveis Sob Medida em Farroupilha e Serra Gaúcha",
  description: "Há mais de 20 anos fabricando móveis sob medida e planejados de alto padrão em Farroupilha, Caxias do Sul, Bento Gonçalves e Garibaldi. Projetos feitos com afeto.",
  metadataBase: new URL("https://moveisunghero.com.br"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Móveis Unghero | Móveis Sob Medida e Planejados",
    description: "Há mais de 20 anos fabricando móveis sob medida e planejados de alto padrão na Serra Gaúcha. Feito com afeto e precisão.",
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
