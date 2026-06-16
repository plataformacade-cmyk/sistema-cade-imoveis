import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ChatSuporte } from "@/components/suporte/chat-suporte";
import { SITE, organizationLd, websiteLd } from "@/lib/seo";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "Cadê Imóveis — imóveis em Uberlândia",
    template: "%s — Cadê Imóveis",
  },
  description: SITE.descricao,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: SITE.locale,
    siteName: SITE.nome,
    url: SITE.url,
    title: "Cadê Imóveis — imóveis em Uberlândia",
    description: SITE.descricao,
    images: [{ url: "/hero-uberlandia.webp" }],
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* JSON-LD global: organização + site (base do grafo de entidade p/ IAs) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd()) }}
        />
        {children}
        <ChatSuporte />
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
