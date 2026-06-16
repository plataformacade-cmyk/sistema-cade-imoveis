import type { MetadataRoute } from "next";

// Web App Manifest (convenção nativa do Next 16).
// Servido em /manifest.webmanifest — torna o Cadê Imóveis instalável como PWA.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cadê Imóveis",
    short_name: "Cadê",
    description: "Plataforma imobiliária — anuncie, busque e negocie pela Cadê.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#EA580C",
    lang: "pt-BR",
    icons: [
      {
        // Ícone gerado por código em app/icon.tsx (quadrado laranja com "C").
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
