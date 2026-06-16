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
        src: "/logo-cade.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
