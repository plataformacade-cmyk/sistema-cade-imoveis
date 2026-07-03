import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, MapPin } from "lucide-react";
import { SiteHeader } from "@/components/publico/site-header";
import { SiteFooter } from "@/components/publico/site-footer";
import { Reveal } from "@/components/publico/reveal";
import { buttonVariants } from "@/components/ui/button";
import { ImovelCard, type ImovelCardData } from "@/components/publico/imovel-card";
import { SITE, slugBairro, breadcrumbLd, moedaBRL } from "@/lib/seo";
import { infoDoBairro } from "../../plataforma/imoveis/[id]/_bairros";
import { buscarImoveisPublicos } from "@/lib/imoveis/privacidade-endereco";

// Bairros conhecidos (pré-renderizados); outros renderizam sob demanda.
const BAIRROS_CONHECIDOS = [
  "Santa Mônica", "Jardim Karaíba", "Granja Marileusa", "Morada da Colina",
  "Centro", "Tibery", "Saraiva", "Brasil", "Lídice", "Granada",
  "Jardim Inconfidência",
];

export function generateStaticParams() {
  return BAIRROS_CONHECIDOS.map((b) => ({ bairro: slugBairro(b) }));
}

function tituloCase(slug: string) {
  return slug
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

async function buscar(slug: string) {
  const todos = (await buscarImoveisPublicos({
    limit: 500,
  })) as (ImovelCardData & { bairro: string | null })[];
  const noBairro = todos.filter(
    (i) => i.bairro && slugBairro(i.bairro) === slug,
  );
  const nome = noBairro[0]?.bairro ?? tituloCase(slug);
  return { noBairro, nome };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ bairro: string }>;
}): Promise<Metadata> {
  const { bairro } = await params;
  const { nome, noBairro } = await buscar(bairro);
  const titulo = `Imóveis em ${nome}, Uberlândia${noBairro.length ? ` (${noBairro.length})` : ""}`;
  const desc = `Casas, apartamentos e terrenos para comprar e alugar em ${nome}, Uberlândia. Veja preços, fotos e converse direto pela Cadê Imóveis.`;
  return {
    title: titulo,
    description: desc,
    alternates: { canonical: `/imoveis-em/${bairro}` },
    openGraph: { title: titulo, description: desc, type: "website" },
  };
}

export default async function ImoveisEmBairroPage({
  params,
}: {
  params: Promise<{ bairro: string }>;
}) {
  const { bairro } = await params;
  const { noBairro, nome } = await buscar(bairro);
  const info = infoDoBairro(nome);

  const precos = noBairro
    .map((i) => i.valor_anuncio)
    .filter((v): v is number => typeof v === "number");
  const menor = precos.length ? Math.min(...precos) : null;

  // Resposta-primeiro (GEO/AEO): responde a intenção logo no início.
  const lead =
    noBairro.length > 0
      ? `Encontre ${noBairro.length} ${noBairro.length === 1 ? "imóvel disponível" : "imóveis disponíveis"} em ${nome}, Uberlândia${menor ? `, a partir de ${moedaBRL.format(menor)}` : ""}. Veja fotos, preços e características e converse direto com quem anuncia pela Cadê.`
      : `Veja imóveis para comprar e alugar em ${nome}, Uberlândia. Cadastre um alerta ou explore os bairros vizinhos na Cadê Imóveis.`;

  const jsonld = [
    breadcrumbLd([
      { nome: "Início", url: "/" },
      { nome: "Imóveis", url: "/plataforma" },
      { nome: nome, url: `/imoveis-em/${bairro}` },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `Imóveis em ${nome}, Uberlândia`,
      description: lead,
      url: `${SITE.url}/imoveis-em/${bairro}`,
      about: { "@type": "Place", name: `${nome}, Uberlândia, MG` },
    },
  ];

  return (
    <>
      <SiteHeader />
      {jsonld.map((b, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(b) }}
        />
      ))}

      <main className="flex-1">
        <section className="border-b bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
            <Link
              href="/plataforma"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <MapPin className="size-4" />
              Todos os imóveis
            </Link>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance md:text-5xl">
              Imóveis em {nome}
              <span className="text-primary">, Uberlândia</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {lead}
            </p>
          </div>
        </section>

        {/* Sobre o bairro */}
        <section className="mx-auto max-w-7xl px-4 py-10 md:px-6">
          <Reveal className="rounded-2xl bg-card p-6 ring-1 ring-foreground/10 md:p-8">
            <h2 className="text-xl font-semibold tracking-tight">
              Sobre morar em {nome}
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              {info.descricao}
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {info.destaques.map((d) => (
                <li
                  key={d}
                  className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
                >
                  {d}
                </li>
              ))}
            </ul>
          </Reveal>
        </section>

        {/* Grade de imóveis */}
        <section className="mx-auto max-w-7xl px-4 pb-16 md:px-6 md:pb-24">
          {noBairro.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {noBairro.map((imovel, i) => (
                <Reveal key={imovel.id} delay={(i % 3) * 0.08}>
                  <ImovelCard imovel={imovel} />
                </Reveal>
              ))}
            </div>
          ) : (
            <div className="mx-auto max-w-md rounded-2xl bg-muted/40 px-6 py-16 text-center ring-1 ring-foreground/10">
              <h2 className="text-xl font-semibold tracking-tight">
                Ainda não há anúncios em {nome}
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Explore os imóveis em outros bairros de Uberlândia ou anuncie o
                seu por aqui.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link href="/plataforma" className={buttonVariants()}>
                  Ver todos os imóveis
                </Link>
                <Link
                  href="/cadastro"
                  className={buttonVariants({ variant: "outline" })}
                >
                  Anunciar imóvel
                </Link>
              </div>
            </div>
          )}

          {noBairro.length > 0 && (
            <div className="mt-10 text-center">
              <Link
                href="/plataforma"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                Ver imóveis em toda Uberlândia
                <ArrowRight className="ml-1 size-4" />
              </Link>
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
