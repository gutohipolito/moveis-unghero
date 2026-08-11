import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Syne } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import localBusinessSchema from "@/schemas/localbusiness.json";
import { SITE } from "@/lib/site";

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const body = Syne({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${SITE.name}`,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.manifesto,
  metadataBase: new URL("https://moveisunghero.com.br"),
  alternates: { canonical: "/" },
  openGraph: {
    title: SITE.name,
    description: SITE.tagline,
    url: "https://moveisunghero.com.br",
    siteName: SITE.name,
    locale: "pt_BR",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#f2f1ef",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
        />
      </head>
      <body>
        <Header />
        <main id="main-content">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
