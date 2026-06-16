import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

// Política de robôs (pesquisa GEO/AEO do vault):
// - LIBERAR os bots de CITAÇÃO/busca ao vivo (queremos ser citados pelas IAs).
// - Liberar os de TREINO (presença futura nos modelos).
// - BLOQUEAR os "lixões" que raspam e não devolvem tráfego (CCBot, Bytespider).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/painel", "/api"] },
      // Lixões: raspam sem devolver nada.
      { userAgent: "CCBot", disallow: "/" },
      { userAgent: "Bytespider", disallow: "/" },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
