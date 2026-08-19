import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";
import PwaImmersiveMode from "@/components/PwaImmersiveMode";
import AppPageLoader from "@/components/AppPageLoader";

const APP_NAME = "Sistema - Móveis Unghero";
const APP_DESCRIPTION = "CRM, fábrica e gestão interna da Móveis Unghero";

export const metadata: Metadata = {
  title: "Sistema - Móveis Unghero",
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  // Painel interno: não deve ser indexado por buscadores (Google, etc.).
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sistema - Móveis Unghero",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [{ url: "/icon-mu.png", type: "image/png", sizes: "512x512" }],
    apple: [{ url: "/icon-mu.png", type: "image/png", sizes: "512x512" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#d9a007",
  width: "device-width",
  initialScale: 1,
  // Zoom liberado: o A4 do orçamento/recibo precisa de pinch no mobile.
  // Zoom indesejado ao focar input já é evitado por font-size 16px em globals.css.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-gradient-premium text-foreground selection:bg-primary/25"
      >
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{if(sessionStorage.getItem('mu-nav-loading')==='1'){document.documentElement.classList.add('mu-nav-loading');document.documentElement.setAttribute('aria-busy','true');}}catch(e){}})();",
          }}
        />
        <style
          dangerouslySetInnerHTML={{
            __html:
              "#mu-page-loader{display:none}html.mu-nav-loading #mu-page-loader{display:flex}",
          }}
        />
        <div
          id="mu-page-loader"
          className="mu-page-loader"
          role="status"
          aria-live="assertive"
          aria-label="Carregando a página"
        >
          <div className="mu-page-loader-bar" aria-hidden="true" />
          <div className="mu-page-loader-panel">
            <div className="mu-page-loader-spinner" aria-hidden="true" />
            <p className="mu-page-loader-title">Carregando</p>
            <p className="mu-page-loader-sub">
              Aguarde, estamos buscando as informações. Isso não é um erro.
            </p>
          </div>
        </div>
        <PwaRegister />
        <PwaImmersiveMode />
        <Suspense fallback={null}>
          <AppPageLoader />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
