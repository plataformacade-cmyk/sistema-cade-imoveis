// Constantes e helpers de SEO/GEO/AEO da Cadê Imóveis.
// Técnicas aplicadas (pesquisa do vault "busca com IA — como ser recomendado"):
// JSON-LD em todas as páginas-chave, Organization + Article(Person) + FAQPage
// (o tipo mais extraído pelas IAs) + RealEstateListing + BreadcrumbList.

export const SITE = {
  // Domínio provisório (Vercel) até o cadeimoveis.com entrar (com o Fernando).
  url: "https://cade-imoveis-app.vercel.app",
  nome: "Cadê Imóveis",
  descricao:
    "Marketplace imobiliário de Uberlândia: busque, anuncie e negocie casas, apartamentos e terrenos direto pela plataforma, com transparência.",
  cidade: "Uberlândia",
  uf: "MG",
  locale: "pt_BR",
  // Perfis oficiais (preencher quando existirem) — sameAs desambigua a entidade.
  sameAs: [] as string[],
};

/** Slug de bairro estável para as páginas /imoveis-em/<bairro>. */
export function slugBairro(bairro: string): string {
  return bairro
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const moedaBRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

/** A organização (RealEstateAgent) — vai no layout, base do grafo de entidade. */
export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "@id": `${SITE.url}/#organizacao`,
    name: SITE.nome,
    url: SITE.url,
    description: SITE.descricao,
    areaServed: { "@type": "City", name: `${SITE.cidade}, ${SITE.uf}` },
    logo: `${SITE.url}/logo-cade.svg`,
    image: `${SITE.url}/hero-uberlandia.webp`,
    ...(SITE.sameAs.length ? { sameAs: SITE.sameAs } : {}),
  };
}

/** O site + caixa de busca (sitelinks searchbox). */
export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE.url}/#site`,
    url: SITE.url,
    name: SITE.nome,
    inLanguage: "pt-BR",
    publisher: { "@id": `${SITE.url}/#organizacao` },
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE.url}/plataforma?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbLd(itens: { nome: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: itens.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.nome,
      item: it.url.startsWith("http") ? it.url : `${SITE.url}${it.url}`,
    })),
  };
}

export function faqLd(faq: { pergunta: string; resposta: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.pergunta,
      acceptedAnswer: { "@type": "Answer", text: f.resposta },
    })),
  };
}

export function articleLd(a: {
  titulo: string;
  resumo: string;
  url: string;
  capa: string;
  data: string;
  atualizado?: string;
  autor: string;
}) {
  const img = a.capa.startsWith("http") ? a.capa : `${SITE.url}${a.capa}`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: a.titulo,
    description: a.resumo,
    image: [img],
    datePublished: a.data,
    dateModified: a.atualizado ?? a.data,
    inLanguage: "pt-BR",
    mainEntityOfPage: { "@type": "WebPage", "@id": a.url },
    author: { "@type": "Person", name: a.autor },
    publisher: { "@id": `${SITE.url}/#organizacao` },
  };
}

/** Anúncio de imóvel — RealEstateListing com oferta, endereço e geo. */
export function imovelLd(i: {
  titulo: string;
  descricao: string;
  url: string;
  fotos: string[];
  preco: number | null;
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
  area?: number | null;
  quartos?: number | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: i.titulo,
    description: i.descricao,
    url: i.url,
    image: i.fotos.map((f) => (f.startsWith("http") ? f : `${SITE.url}${f}`)),
    datePosted: undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: [i.logradouro, i.numero].filter(Boolean).join(", ") || undefined,
      addressLocality: i.cidade ?? SITE.cidade,
      addressRegion: i.uf ?? SITE.uf,
      postalCode: i.cep ?? undefined,
      addressCountry: "BR",
    },
    ...(i.area || i.quartos
      ? {
          floorSize: i.area ? { "@type": "QuantitativeValue", value: i.area, unitCode: "MTK" } : undefined,
          numberOfRooms: i.quartos ?? undefined,
        }
      : {}),
    ...(i.preco != null
      ? {
          offers: {
            "@type": "Offer",
            price: i.preco,
            priceCurrency: "BRL",
            availability: "https://schema.org/InStock",
          },
        }
      : {}),
  };
}
