import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/publico/site-header";
import { SiteFooter } from "@/components/publico/site-footer";
import { Reveal } from "@/components/publico/reveal";
import { buttonVariants } from "@/components/ui/button";
import { PERFIS, PERFIS_LISTA, type Perfil } from "../_perfis";

export function generateStaticParams() {
  return PERFIS_LISTA.map((p) => ({ perfil: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ perfil: string }>;
}): Promise<Metadata> {
  const { perfil } = await params;
  const p = PERFIS[perfil as Perfil["slug"]];
  if (!p) return { title: "Como funciona — Cadê Imóveis" };
  return {
    title: `${p.nome} — Como funciona | Cadê Imóveis`,
    description: p.resumo,
  };
}

export default async function PerfilPage({
  params,
}: {
  params: Promise<{ perfil: string }>;
}) {
  const { perfil } = await params;
  const p = PERFIS[perfil as Perfil["slug"]];
  if (!p) notFound();

  const outros = PERFIS_LISTA.filter((o) => o.slug !== p.slug);

  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        {/* Hero do perfil */}
        <section className="mx-auto max-w-7xl px-4 pt-8 pb-12 md:px-6 md:pt-12">
          <Link
            href="/como-funciona"
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className: "rounded-xl",
            })}
          >
            <ArrowLeft className="mr-1.5 size-4" />
            Outros perfis
          </Link>

          <Reveal className="mt-4 grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                <p.icone className="size-4" />
                {p.nome}
              </span>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance md:text-5xl">
                {p.headline}
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
                {p.resumo}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/cadastro"
                  className={buttonVariants({ size: "lg" })}
                >
                  Começar agora
                </Link>
                <Link
                  href="/plataforma"
                  className={buttonVariants({ variant: "outline", size: "lg" })}
                >
                  Ver imóveis
                </Link>
              </div>
            </div>

            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.imagem}
                alt=""
                loading="lazy"
                className="aspect-[4/3] w-full rounded-2xl object-cover shadow-xl shadow-foreground/5"
              />
            </div>
          </Reveal>
        </section>

        {/* Passos */}
        <section className="border-y bg-muted/30">
          <div className="mx-auto max-w-4xl px-4 py-16 md:px-6 md:py-24">
            <Reveal>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Passo a passo
              </h2>
            </Reveal>
            <ol className="mt-10 flex flex-col gap-5">
              {p.passos.map((passo, i) => (
                <Reveal key={passo.titulo} delay={i * 0.06}>
                  <li className="flex gap-5 rounded-2xl bg-card p-6 ring-1 ring-foreground/10">
                    <div className="flex flex-col items-center">
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <passo.icone className="size-6" />
                      </span>
                    </div>
                    <div>
                      <p className="flex items-center gap-2 font-semibold">
                        <span className="text-sm text-muted-foreground">
                          Passo {i + 1}
                        </span>
                        {passo.titulo}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {passo.texto}
                      </p>
                    </div>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* Outros perfis */}
        <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
          <Reveal>
            <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">
              Você também pode ser…
            </h2>
          </Reveal>
          <div className="mx-auto mt-10 grid max-w-3xl gap-6 sm:grid-cols-2">
            {outros.map((o, i) => (
              <Reveal key={o.slug} delay={i * 0.08}>
                <Link
                  href={`/como-funciona/${o.slug}`}
                  className="group flex h-full items-center gap-4 rounded-2xl border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5"
                >
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <o.icone className="size-6" />
                  </span>
                  <div className="flex-1">
                    <h3 className="font-semibold tracking-tight">{o.nome}</h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {o.chamada}
                    </p>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-primary transition-transform group-hover:translate-x-1" />
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
