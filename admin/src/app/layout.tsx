import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";
import PwaImmersiveMode from "@/components/PwaImmersiveMode";
import { publicAssetOrigin, PUBLIC_SHARE_ICON_PATH } from "@/lib/publicPageMetadata";

const APP_NAME = "Sistema - Móveis Unghero";
const APP_DESCRIPTION = "CRM, fábrica e gestão interna da Móveis Unghero";
const assetOrigin = publicAssetOrigin();

export const metadata: Metadata = {
  metadataBase: new URL(assetOrigin),
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
  // Fallback se alguma rota pública herdar só o root — miniatura ao lado, nunca summary_large_image.
  openGraph: {
    siteName: "Móveis Unghero",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: PUBLIC_SHARE_ICON_PATH,
        width: 192,
        height: 192,
        alt: "Móveis Unghero",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary",
    images: [PUBLIC_SHARE_ICON_PATH],
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
