import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";

const APP_NAME = "Móveis Unghero";
const APP_DESCRIPTION = "CRM, fábrica e gestão interna da Móveis Unghero";

export const metadata: Metadata = {
  title: "Móveis Unghero | Painel Operacional",
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Unghero",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [{ url: "/icon", type: "image/png" }],
    apple: [{ url: "/apple-icon", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#d9a007",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gradient-premium text-foreground selection:bg-primary/25">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
