import Link from "next/link";
import { ArrowRight, Newspaper } from "lucide-react";
import { SiteHeader } from "@/components/publico/site-header";
import { SiteFooter } from "@/components/publico/site-footer";
import { Reveal } from "@/components/publico/reveal";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { POSTS, listarCategorias } from "./_posts";
import { CardPost, LinhaAutor, BlocoNewsletter } from "./_components";

export const metadata = {
  title: "Blog — Cadê Imóveis",
  description:
    "Dicas, guias e novidades sobre o mercado imobiliário de Uberlândia: financiamento, documentação, bairros, aluguel e muito mais.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Cadê Imóveis",
    title: "Blog — Cadê Imóveis",
    description:
      "Guias práticos sobre o mercado imobiliário de Uberlândia para comprar, vender ou alugar com segurança.",
  },
};

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria } = await searchParams;
  const categorias = listarCategorias();
  const filtroAtivo =
    categoria && categorias.includes(categoria) ? categoria : null;

  const filtrados = filtroAtivo
    ? POSTS.filter((p) => p.categoria === filtroAtivo)
    : POSTS;

  const [destaque, ...demais] = filtrados;
  const temResultados = filtrados.length > 0;
  // Só mostra destaque grande quando não há filtro (visão geral mais rica).
  const mostrarDestaque = !filtroAtivo && temResultados;
  const grade = mostrarDestaque ? demais : filtrados;

  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        {/* Cabeçalho */}
        <section className="border-b bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-20">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                <Newspaper className="size-4" />
                Blog da Cadê
              </span>
              <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-balance md:text-5xl">
                Tudo sobre o mercado imobiliário de Uberlândia
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                Guias práticos, dicas de quem entende e novidades para você
                comprar, vender ou alugar com mais segurança e tranquilidade.
              </p>
            </Reveal>

            {/* Filtro por categoria (chips) */}
            <Reveal delay={0.1} className="mt-8 flex flex-wrap gap-2">
              <Link
                href="/blog"
                aria-current={!filtroAtivo ? "page" : undefined}
                className={
                  !filtroAtivo
                    ? "inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors"
                    : "inline-flex items-center rounded-full bg-card px-4 py-2 text-sm font-medium text-muted-foreground ring-1 ring-foreground/10 transition-colors hover:bg-muted hover:text-foreground"
                }
              >
                Todos
              </Link>
              {categorias.map((cat) => {
                const ativo = filtroAtivo === cat;
                return (
                  <Link
                    key={cat}
                    href={`/blog?categoria=${encodeURIComponent(cat)}`}
                    aria-current={ativo ? "page" : undefined}
                    className={
                      ativo
                        ? "inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors"
                        : "inline-flex items-center rounded-full bg-card px-4 py-2 text-sm font-medium text-muted-foreground ring-1 ring-foreground/10 transition-colors hover:bg-muted hover:text-foreground"
                    }
                  >
                    {cat}
                  </Link>
                );
              })}
            </Reveal>
          </div>
        </section>

        {/* Post em destaque (só na visão geral) */}
        {mostrarDestaque && destaque && (
          <section className="mx-auto max-w-7xl px-4 pt-12 md:px-6 md:pt-16">
            <Reveal>
              <Link
                href={`/blog/${destaque.slug}`}
                className="group grid overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10 transition-all duration-300 hover:shadow-2xl hover:shadow-foreground/5 hover:ring-foreground/15 lg:grid-cols-2"
              >
                <div className="relative overflow-hidden">
                  <img
                    src={destaque.capa}
                    alt={destaque.capaAlt}
                    loading="lazy"
                    className="h-64 w-full object-cover transition-transform duration-500 group-hover:scale-105 lg:h-full"
                  />
                  <Badge className="absolute top-4 left-4 shadow-sm">
                    {destaque.categoria}
                  </Badge>
                </div>
                <div className="flex flex-col justify-center gap-5 p-6 md:p-10 lg:p-12">
                  <span className="text-xs font-semibold tracking-wide text-primary uppercase">
                    Em destaque
                  </span>
                  <h2 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl lg:text-4xl">
                    {destaque.titulo}
                  </h2>
                  <p className="leading-relaxed text-muted-foreground">
                    {destaque.resumo}
                  </p>
                  <LinhaAutor post={destaque} detalhada />
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                    Ler artigo
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </Reveal>
          </section>
        )}

        {/* Grade de posts */}
        <section className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
          {temResultados ? (
            <>
              {filtroAtivo && (
                <Reveal>
                  <h2 className="mb-8 text-2xl font-semibold tracking-tight">
                    {filtroAtivo}
                    <span className="ml-2 text-base font-normal text-muted-foreground">
                      ({grade.length}{" "}
                      {grade.length === 1 ? "artigo" : "artigos"})
                    </span>
                  </h2>
                </Reveal>
              )}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {grade.map((post, i) => (
                  <Reveal key={post.slug} delay={(i % 3) * 0.08}>
                    <CardPost post={post} />
                  </Reveal>
                ))}
              </div>
            </>
          ) : (
            <Reveal>
              <div className="mx-auto max-w-md rounded-2xl bg-muted/40 px-6 py-16 text-center ring-1 ring-foreground/10">
                <span className="inline-flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Newspaper className="size-6" />
                </span>
                <h2 className="mt-5 text-xl font-semibold tracking-tight">
                  Nenhum artigo nesta categoria
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  Ainda não publicamos nada por aqui. Que tal explorar os outros
                  temas do blog?
                </p>
                <Link
                  href="/blog"
                  className={buttonVariants({ className: "mt-6" })}
                >
                  Ver todos os artigos
                </Link>
              </div>
            </Reveal>
          )}
        </section>

        {/* Newsletter */}
        <section className="mx-auto max-w-7xl px-4 pb-16 md:px-6 md:pb-24">
          <Reveal>
            <BlocoNewsletter />
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
