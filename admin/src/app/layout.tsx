import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Móveis Unghero | SaaS Admin",
  description: "Painel Administrativo, CRM e Gestão de Fábrica da Móveis Unghero",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gradient-premium bg-no-repeat bg-cover text-foreground selection:bg-primary/30">
        {children}
      </body>
    </html>
  );
}
