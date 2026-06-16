import Link from "next/link";
import { SiteHeader } from "@/components/publico/site-header";
import { SiteFooter } from "@/components/publico/site-footer";
import { Badge } from "@/components/ui/badge";
import { POSTS, formatarData } from "./_posts";

export const metadata = {
  title: "Blog — Cadê Imóveis",
  description:
    "Dicas, guias e novidades sobre o mercado imobiliário de Uberlândia: financiamento, documentação, bairros e muito mais.",
};

export default function BlogPage() {
  const [destaque, ...demais] = POSTS;

  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        {/* Cabeçalho */}
        <section className="border-b bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-20">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              Blog da Cadê
            </span>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-balance md:text-5xl">
              Tudo sobre o mercado imobiliário de Uberlândia
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Guias práticos, dicas de quem entende e novidades para você comprar,
              vender ou alugar com mais segurança e tranquilidade.
            </p>
          </div>
        </section>

        {/* Destaque */}
        <section className="mx-auto max-w-7xl px-4 pt-12 md:px-6 md:pt-16">
          <Link
            href={`/blog/${destaque.slug}`}
            className="group grid overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10 transition-shadow hover:shadow-xl hover:shadow-foreground/5 lg:grid-cols-2"
          >
            <div className="overflow-hidden">
              <img
                src={destaque.capa}
                alt={destaque.capaAlt}
                loading="lazy"
                className="h-64 w-full object-cover transition-transform duration-500 group-hover:scale-105 lg:h-full"
              />
            </div>
            <div className="flex flex-col justify-center gap-4 p-6 md:p-10">
              <div className="flex items-center gap-3">
                <Badge>{destaque.categoria}</Badge>
                <span className="text-sm text-muted-foreground">
                  {formatarData(destaque.data)}
                </span>
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">
                {destaque.titulo}
              </h2>
              <p className="leading-relaxed text-muted-foreground">
                {destaque.resumo}
              </p>
              <span className="text-sm font-medium text-primary">
                Ler artigo →
              </span>
            </div>
          </Link>
        </section>

        {/* Grade de posts */}
        <section className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {demais.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10 transition-shadow hover:shadow-lg hover:shadow-foreground/5"
              >
                <div className="overflow-hidden">
                  <img
                    src={post.capa}
                    alt={post.capaAlt}
                    loading="lazy"
                    className="h-48 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{post.categoria}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatarData(post.data)}
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold tracking-tight text-balance group-hover:text-primary">
                    {post.titulo}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                    {post.resumo}
                  </p>
                  <span className="mt-4 text-sm font-medium text-primary">
                    Ler artigo →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
