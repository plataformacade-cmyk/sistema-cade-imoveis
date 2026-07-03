import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/publico/site-header";
import { SiteFooter } from "@/components/publico/site-footer";
import { Reveal } from "@/components/publico/reveal";
import { buttonVariants } from "@/components/ui/button";
import { PERFIS_LISTA } from "./_perfis";
import { criarCadastroAnunciarHref } from "@/lib/auth-redirect";
import { faqLd } from "@/lib/seo";

export const metadata = {
  title: "Como funciona — Cadê Imóveis",
  description:
    "Entenda como a Cadê funciona para o seu perfil: proprietário, corretor ou interessado. Simples, transparente e humano, do primeiro clique à chave na mão.",
};

const FAQ = [
  {
    pergunta: "Anunciar na Cadê tem algum custo?",
    resposta:
      "Criar sua conta e publicar seu imóvel é simples e direto. Você fala com pessoas realmente interessadas, sem intermediários desnecessários no caminho.",
  },
  {
    pergunta: "Preciso ser corretor para anunciar?",
    resposta:
      "Não. A Cadê é para proprietários, locatários, compradores e também para corretores parceiros. Cada pessoa anuncia e busca do seu jeito.",
  },
  {
    pergunta: "Como sei que os anúncios são confiáveis?",
    resposta:
      "Prezamos pela transparência: incentivamos fotos reais e informações completas. E você sempre conversa diretamente com quem anuncia antes de qualquer visita.",
  },
  {
    pergunta: "A Cadê atende toda Uberlândia?",
    resposta:
      "Sim! Do Centro ao Granja Marileusa, passando por Santa Mônica, Tibery, Jardim Karaíba e dezenas de outros bairros. Conhecemos a cidade de ponta a ponta.",
  },
];

export default function ComoFuncionaPage() {
  return (
    <>
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd(FAQ)) }}
      />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b bg-muted/30">
          <Reveal className="mx-auto block max-w-4xl px-4 py-16 text-center md:px-6 md:py-24">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              Simples do começo ao fim
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance md:text-5xl">
              Como funciona a Cadê Imóveis
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              A jornada muda um pouco dependendo de quem é você. Escolha o seu
              perfil e veja, passo a passo, como a Cadê trabalha para você.
            </p>
          </Reveal>
        </section>

        {/* Quem é você? — seletor de perfil */}
        <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
          <Reveal>
            <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">
              Quem é você?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
              Toque no card que combina com o seu momento.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {PERFIS_LISTA.map((p, i) => (
              <Reveal key={p.slug} delay={i * 0.08}>
                <Link
                  href={`/como-funciona/${p.slug}`}
                  className="group flex h-full flex-col gap-4 rounded-2xl border bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5"
                >
                  <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <p.icone className="size-7" />
                  </span>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold tracking-tight">
                      {p.nome}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {p.chamada}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                    Ver como funciona
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="border-y bg-muted/30">
          <Reveal className="mx-auto block max-w-3xl px-4 py-16 md:px-6 md:py-24">
            <div className="text-center">
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Perguntas frequentes
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                As dúvidas mais comuns de quem está começando com a Cadê.
              </p>
            </div>

            <div className="mt-12 space-y-4">
              {FAQ.map((item) => (
                <details
                  key={item.pergunta}
                  className="group rounded-2xl bg-card p-6 ring-1 ring-foreground/10"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                    {item.pergunta}
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {item.resposta}
                  </p>
                </details>
              ))}
            </div>
          </Reveal>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
          <Reveal>
            <div className="overflow-hidden rounded-2xl bg-primary px-6 py-14 text-center text-primary-foreground md:px-12 md:py-20">
              <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance md:text-4xl">
                Pronto para começar?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/85">
                Anuncie seu imóvel ou encontre o próximo lar em Uberlândia. É
                rápido, transparente e cheio de gente de verdade para te ajudar.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                  href={criarCadastroAnunciarHref()}
                  className={buttonVariants({ variant: "secondary", size: "lg" })}
                >
                  Anunciar imóvel
                </Link>
                <Link
                  href="/plataforma"
                  className={buttonVariants({
                    variant: "outline",
                    size: "lg",
                    className:
                      "border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground",
                  })}
                >
                  Buscar imóveis
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
