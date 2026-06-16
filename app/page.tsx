import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Building2,
  Handshake,
  MessageSquare,
  Search,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HomeHeader } from "./_home/header";
import { HomeFooter } from "./_home/footer";

export const metadata: Metadata = {
  title: "Cadê Imóveis — o jeito humano de comprar, vender e alugar",
  description:
    "Anuncie, busque e negocie imóveis pela Cadê. Proprietários acompanham, compradores conversam direto pela plataforma e corretores parceiros trabalham com tecnologia.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Cadê Imóveis",
    title: "Cadê Imóveis — o jeito humano de comprar, vender e alugar",
    description:
      "Anuncie, busque e negocie imóveis pela Cadê. Tudo pela plataforma, do anúncio ao fechamento.",
  },
};

/** Cartões da proposta de valor (um por público). */
const VALORES = [
  {
    icon: Building2,
    titulo: "Para quem tem imóvel",
    texto:
      "Anuncie em minutos e acompanhe cada interessado pelo painel. Você no controle, sem perder negócio.",
  },
  {
    icon: Search,
    titulo: "Para quem procura",
    texto:
      "Busque por bairro, tipo e valor, e converse direto pela plataforma — sem ligação fria nem intermediário some.",
  },
  {
    icon: Handshake,
    titulo: "Para o corretor parceiro",
    texto:
      "Trabalhe com tecnologia: leads organizados, conversas no mesmo lugar e processo claro do começo ao fim.",
  },
] as const;

/** Passos do "como funciona". */
const PASSOS = [
  { n: "1", titulo: "Cadastre-se", texto: "Crie sua conta gratuita em segundos." },
  { n: "2", titulo: "Publique", texto: "Cadastre seu imóvel com fotos e detalhes." },
  {
    n: "3",
    titulo: "Receba interesse",
    texto: "Compradores e locatários demonstram interesse com um clique.",
  },
  {
    n: "4",
    titulo: "Converse",
    texto: "Negocie pela plataforma, com tudo registrado num só lugar.",
  },
  { n: "5", titulo: "Feche o negócio", texto: "Conclua a negociação com segurança." },
] as const;

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <HomeHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="from-primary/15 pointer-events-none absolute inset-0 bg-gradient-to-b to-transparent" />
          <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-20 text-center md:py-28 md:px-6">
            <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl">
              O jeito{" "}
              <span className="text-primary">humano</span> de comprar, vender e
              alugar imóveis
            </h1>
            <p className="text-muted-foreground max-w-2xl text-lg text-balance">
              Do anúncio ao fechamento, tudo acontece pela plataforma: você
              anuncia, encontra e negocia sem ruído — com a pessoa certa, no
              lugar certo.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/cadastro"
                className={buttonVariants({ size: "lg" })}
              >
                Anunciar meu imóvel
                <ArrowRight className="ml-1.5 size-4" />
              </Link>
              <Link
                href="/plataforma"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                <Search className="mr-1.5 size-4" />
                Quero buscar
              </Link>
            </div>
          </div>
        </section>

        {/* Proposta de valor */}
        <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
          <div className="mb-10 flex flex-col items-center gap-2 text-center">
            <h2 className="font-heading text-2xl font-semibold sm:text-3xl">
              Feito para os dois lados do negócio
            </h2>
            <p className="text-muted-foreground max-w-xl">
              Cada papel tem seu espaço na Cadê — e todo mundo fala pela mesma
              plataforma.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {VALORES.map((v) => (
              <Card key={v.titulo} className="h-full">
                <CardHeader>
                  <div className="bg-primary/10 text-primary mb-2 flex size-10 items-center justify-center rounded-lg">
                    <v.icon className="size-5" />
                  </div>
                  <CardTitle>{v.titulo}</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  {v.texto}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Como funciona */}
        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-6">
            <div className="mb-10 flex flex-col items-center gap-2 text-center">
              <h2 className="font-heading text-2xl font-semibold sm:text-3xl">
                Como funciona
              </h2>
              <p className="text-muted-foreground max-w-xl">
                Cinco passos simples, do cadastro ao fechamento.
              </p>
            </div>
            <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {PASSOS.map((p) => (
                <li
                  key={p.n}
                  className="flex flex-col gap-2 rounded-xl border bg-card p-4"
                >
                  <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-full text-sm font-semibold">
                    {p.n}
                  </span>
                  <h3 className="font-medium">{p.titulo}</h3>
                  <p className="text-muted-foreground text-sm">{p.texto}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* CTA final */}
        <section className="mx-auto max-w-6xl px-4 py-20 md:px-6">
          <div className="bg-card flex flex-col items-center gap-5 rounded-2xl border px-6 py-12 text-center ring-1 ring-foreground/10">
            <MessageSquare className="text-primary size-8" />
            <h2 className="font-heading text-2xl font-semibold text-balance sm:text-3xl">
              Pronto pra começar?
            </h2>
            <p className="text-muted-foreground max-w-md">
              Crie sua conta e anuncie seu imóvel hoje — ou comece buscando o
              próximo lar.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/cadastro" className={buttonVariants({ size: "lg" })}>
                Anunciar meu imóvel
              </Link>
              <Link
                href="/plataforma"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                Quero buscar
              </Link>
            </div>
          </div>
        </section>
      </main>

      <HomeFooter />
    </div>
  );
}
