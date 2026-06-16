import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/publico/site-header";
import { SiteFooter } from "@/components/publico/site-footer";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { POSTS, getPost, formatarData } from "../_posts";

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

  const relacionados = POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);

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

            <div className="mt-6 flex items-center gap-3">
              <Badge>{post.categoria}</Badge>
              <span className="text-sm text-muted-foreground">
                {formatarData(post.data)} · {post.autor}
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-balance md:text-5xl">
              {post.titulo}
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              {post.resumo}
            </p>
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
            <div className="space-y-5 text-base leading-relaxed text-foreground/90">
              {post.conteudo.map((bloco, i) =>
                bloco.startsWith("## ") ? (
                  <h2
                    key={i}
                    className="pt-4 text-2xl font-semibold tracking-tight text-foreground"
                  >
                    {bloco.replace(/^##\s+/, "")}
                  </h2>
                ) : (
                  <p key={i}>{bloco}</p>
                ),
              )}
            </div>

            {/* CTA */}
            <div className="mt-12 rounded-2xl bg-muted/40 p-8 text-center ring-1 ring-foreground/10">
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
        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-20">
            <h2 className="text-2xl font-semibold tracking-tight">
              Continue lendo
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relacionados.map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10 transition-shadow hover:shadow-lg hover:shadow-foreground/5"
                >
                  <div className="overflow-hidden">
                    <img
                      src={p.capa}
                      alt={p.capaAlt}
                      loading="lazy"
                      className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{p.categoria}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatarData(p.data)}
                      </span>
                    </div>
                    <h3 className="mt-3 text-base font-semibold tracking-tight text-balance group-hover:text-primary">
                      {p.titulo}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
