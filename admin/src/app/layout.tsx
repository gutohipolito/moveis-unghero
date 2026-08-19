import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";
import PwaImmersiveMode from "@/components/PwaImmersiveMode";

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
              "(function(){try{sessionStorage.removeItem('mu-nav-loading');document.documentElement.classList.remove('mu-nav-loading');document.documentElement.removeAttribute('aria-busy');}catch(e){}})();",
          }}
        />
        <PwaRegister />
        <PwaImmersiveMode />
        {children}
      </body>
    </html>
  );
}
