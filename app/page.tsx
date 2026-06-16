import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { SiteHeader } from "@/components/publico/site-header";
import { SiteFooter } from "@/components/publico/site-footer";
import { ImovelCard, type ImovelCardData } from "@/components/publico/imovel-card";
import { createClient } from "@/lib/supabase/server";
import { Reveal } from "@/components/publico/reveal";
import { HomeHero } from "./_home/hero";
import { HomeComoFunciona } from "./_home/como-funciona";
import { HomeBairros } from "./_home/bairros";
import { HomeCtaAnuncie } from "./_home/cta-anuncie";

export const metadata: Metadata = {
  title: "Cadê Imóveis — encontre seu próximo lar em Uberlândia",
  description:
    "Busque casas, apartamentos e terrenos em Uberlândia. Converse direto pela plataforma e negocie sem ruído. Tem um imóvel? Anuncie grátis.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Cadê Imóveis",
    title: "Cadê Imóveis — encontre seu próximo lar em Uberlândia",
    description:
      "Casas, apartamentos e terrenos selecionados em Uberlândia. Busque, converse e feche negócio pela plataforma.",
  },
};

/**
 * Fotos Unsplash de demonstração — usadas só quando ainda não há imóveis
 * ativos no banco, pra home nunca aparecer vazia no lançamento.
 */
const FOTOS_DEMO = [
  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80",
];

const DESTAQUES_DEMO: ImovelCardData[] = [
  {
    id: "demo-1",
    tipo: "casa",
    bairro: "Morada da Colina",
    cidade: "Uberlândia",
    quartos: 4,
    vagas: 3,
    area_m2: 320,
    valor_anuncio: 1450000,
    fotos: [FOTOS_DEMO[0]],
  },
  {
    id: "demo-2",
    tipo: "apartamento",
    bairro: "Santa Mônica",
    cidade: "Uberlândia",
    quartos: 3,
    vagas: 2,
    area_m2: 98,
    valor_anuncio: 640000,
    fotos: [FOTOS_DEMO[1]],
  },
  {
    id: "demo-3",
    tipo: "apartamento",
    bairro: "Jardim Karaíba",
    cidade: "Uberlândia",
    quartos: 2,
    vagas: 1,
    area_m2: 72,
    valor_anuncio: 420000,
    fotos: [FOTOS_DEMO[2]],
  },
  {
    id: "demo-4",
    tipo: "casa",
    bairro: "Centro",
    cidade: "Uberlândia",
    quartos: 3,
    vagas: 2,
    area_m2: 180,
    valor_anuncio: 780000,
    fotos: [FOTOS_DEMO[3]],
  },
];

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("imoveis")
    .select(
      "id, tipo, bairro, cidade, quartos, vagas, area_m2, valor_anuncio, fotos",
    )
    .eq("status", "ativo")
    .order("criado_em", { ascending: false })
    .limit(8);

  const reais = (data ?? []) as ImovelCardData[];
  const destaques = reais.length > 0 ? reais : DESTAQUES_DEMO;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <HomeHero />

        {/* Imóveis em destaque */}
        <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-3">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Imóveis em destaque
              </h2>
              <p className="max-w-xl text-lg text-muted-foreground">
                Os anúncios mais recentes da plataforma.
              </p>
            </div>
            <Link
              href="/plataforma"
              className={buttonVariants({
                variant: "outline",
                size: "lg",
                className: "h-10 px-4 text-sm",
              })}
            >
              Ver todos
              <ArrowRight className="ml-1 size-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {destaques.map((imovel) => (
              <ImovelCard key={imovel.id} imovel={imovel} />
            ))}
          </div>
        </section>

        <Reveal>
          <HomeComoFunciona />
        </Reveal>
        <Reveal>
          <HomeBairros />
        </Reveal>
        <Reveal>
          <HomeCtaAnuncie />
        </Reveal>
      </main>

      <SiteFooter />
    </div>
  );
}
