import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Móveis Unghero | Painel Operacional",
  description: "CRM, fábrica e gestão interna da Móveis Unghero",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gradient-premium text-foreground selection:bg-primary/25">
        {children}
      </body>
    </html>
  );
}
