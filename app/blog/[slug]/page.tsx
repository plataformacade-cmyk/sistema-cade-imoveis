import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Tag } from "lucide-react";
import { SiteHeader } from "@/components/publico/site-header";
import { SiteFooter } from "@/components/publico/site-footer";
import { Reveal } from "@/components/publico/reveal";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { POSTS, getPost, formatarData } from "../_posts";
import { CardPost, BlocoNewsletter } from "../_components";

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Artigo não encontrado — Cadê Imóveis" };
  return {
    title: `${post.titulo} — Cadê Imóveis`,
    description: post.resumo,
    openGraph: {
      type: "article",
      locale: "pt_BR",
      siteName: "Cadê Imóveis",
      title: post.titulo,
      description: post.resumo,
      images: [{ url: post.capa, alt: post.capaAlt }],
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) notFound();

  const relacionados = POSTS.filter(
    (p) => p.slug !== post.slug && p.categoria === post.categoria,
  ).slice(0, 3);

  // Complementa com outros recentes se a categoria tiver poucos artigos.
  const sugestoes =
    relacionados.length >= 2
      ? relacionados
      : [
          ...relacionados,
          ...POSTS.filter(
            (p) =>
              p.slug !== post.slug &&
              !relacionados.some((r) => r.slug === p.slug),
          ),
        ].slice(0, 3);

  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        <article>
          {/* Cabeçalho */}
          <div className="mx-auto max-w-3xl px-4 pt-10 md:px-6 md:pt-16">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Voltar para o blog
            </Link>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href={`/blog?categoria=${encodeURIComponent(post.categoria)}`}>
                <Badge className="transition-opacity hover:opacity-90">
                  {post.categoria}
                </Badge>
              </Link>
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <span>{formatarData(post.data)}</span>
                <span aria-hidden>·</span>
                <Clock className="size-3.5" />
                <span>{post.tempoLeitura} min de leitura</span>
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-balance md:text-5xl">
              {post.titulo}
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              {post.resumo}
            </p>

            {/* Linha de autor */}
            <div className="mt-6 flex items-center gap-3 border-y py-4">
              <img
                src={post.autor.avatar}
                alt={post.autor.nome}
                loading="lazy"
                className="size-11 shrink-0 rounded-full object-cover ring-1 ring-foreground/10"
              />
              <div className="text-sm leading-tight">
                <p className="font-semibold text-foreground">
                  {post.autor.nome}
                </p>
                <p className="text-muted-foreground">
                  {formatarData(post.data)}
                </p>
              </div>
            </div>
          </div>

          {/* Capa */}
          <div className="mx-auto mt-8 max-w-5xl px-4 md:px-6">
            <img
              src={post.capa}
              alt={post.capaAlt}
              loading="lazy"
              className="aspect-[16/9] w-full rounded-2xl object-cover shadow-xl shadow-foreground/5"
            />
          </div>

          {/* Conteúdo */}
          <div className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
            <div className="space-y-6 text-lg leading-relaxed text-foreground/90">
              {post.conteudo.map((bloco, i) =>
                bloco.startsWith("## ") ? (
                  <h2
                    key={i}
                    className="scroll-mt-24 pt-6 text-2xl font-semibold tracking-tight text-foreground md:text-3xl"
                  >
                    {bloco.replace(/^##\s+/, "")}
                  </h2>
                ) : (
                  <p key={i}>{bloco}</p>
                ),
              )}
            </div>

            {/* Tags */}
            {post.tags.length > 0 && (
              <div className="mt-12 flex flex-wrap items-center gap-2 border-t pt-8">
                <Tag className="size-4 text-muted-foreground" />
                {post.tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* Sobre o autor */}
            <div className="mt-10 flex flex-col gap-4 rounded-2xl bg-muted/40 p-6 ring-1 ring-foreground/10 sm:flex-row sm:items-start md:p-8">
              <img
                src={post.autor.avatar}
                alt={post.autor.nome}
                loading="lazy"
                className="size-16 shrink-0 rounded-full object-cover ring-1 ring-foreground/10"
              />
              <div>
                <span className="text-xs font-semibold tracking-wide text-primary uppercase">
                  Sobre o autor
                </span>
                <h3 className="mt-1 text-lg font-semibold tracking-tight">
                  {post.autor.nome}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {post.autor.bio}
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-10 rounded-2xl bg-muted/40 p-8 text-center ring-1 ring-foreground/10">
              <h3 className="text-xl font-semibold tracking-tight">
                Pronto para o próximo passo?
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                Encontre o imóvel certo em Uberlândia ou anuncie o seu com a
                simplicidade e a transparência da Cadê.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link href="/plataforma" className={buttonVariants()}>
                  Buscar imóveis
                </Link>
                <Link
                  href="/cadastro"
                  className={buttonVariants({ variant: "outline" })}
                >
                  Anunciar imóvel
                </Link>
              </div>
            </div>
          </div>
        </article>

        {/* Relacionados */}
        {sugestoes.length > 0 && (
          <section className="border-t bg-muted/30">
            <div className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-20">
              <Reveal>
                <h2 className="text-2xl font-semibold tracking-tight">
                  Continue lendo
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Mais conteúdo sobre o mercado imobiliário de Uberlândia.
                </p>
              </Reveal>
              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {sugestoes.map((p, i) => (
                  <Reveal key={p.slug} delay={(i % 3) * 0.08}>
                    <CardPost post={p} />
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Newsletter */}
        <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
          <Reveal>
            <BlocoNewsletter />
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
