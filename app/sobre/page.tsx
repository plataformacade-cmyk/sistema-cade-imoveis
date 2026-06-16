import Link from "next/link";
import { SiteHeader } from "@/components/publico/site-header";
import { SiteFooter } from "@/components/publico/site-footer";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/publico/reveal";
import { Heart, Handshake, ShieldCheck, Sparkles } from "lucide-react";

export const metadata = {
  title: "Sobre nós — Cadê Imóveis",
  description:
    "Conheça a Cadê Imóveis: nascemos para humanizar o mercado imobiliário de Uberlândia, com transparência, gente de verdade e zero burocracia.",
};

const VALORES = [
  {
    icone: Heart,
    titulo: "Gente em primeiro lugar",
    texto:
      "Por trás de cada imóvel existe uma história, um sonho ou um recomeço. A gente trata cada pessoa como gostaríamos de ser tratados.",
  },
  {
    icone: ShieldCheck,
    titulo: "Transparência total",
    texto:
      "Sem letra miúda, sem pegadinha. Informação clara desde o primeiro clique até a chave na mão.",
  },
  {
    icone: Handshake,
    titulo: "Negócio justo",
    texto:
      "Aproximamos quem anuncia de quem busca, com condições claras para os dois lados. Todo mundo sai ganhando.",
  },
  {
    icone: Sparkles,
    titulo: "Simples de verdade",
    texto:
      "Tecnologia para tirar a burocracia do caminho — e não para complicar. Anunciar e buscar tem que ser fácil.",
  },
];

const NUMEROS = [
  { valor: "1.200+", rotulo: "Imóveis anunciados" },
  { valor: "60+", rotulo: "Bairros de Uberlândia" },
  { valor: "8.000+", rotulo: "Visitas agendadas" },
  { valor: "97%", rotulo: "Clientes satisfeitos" },
];

export default function SobrePage() {
  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-7xl px-4 pt-12 pb-16 md:px-6 md:pt-20">
          <Reveal className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                Feito em Uberlândia, para Uberlândia
              </span>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance md:text-5xl">
                O jeito{" "}
                <span className="text-primary">humano</span> de viver o mercado
                imobiliário
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
                A Cadê Imóveis nasceu de uma inquietação simples: por que comprar,
                vender ou alugar um imóvel ainda é tão burocrático e frio? A gente
                veio para mudar isso — com tecnologia, transparência e, acima de
                tudo, gente de verdade do seu lado.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/plataforma" className={buttonVariants({ size: "lg" })}>
                  Explorar imóveis
                </Link>
                <Link
                  href="/como-funciona"
                  className={buttonVariants({ variant: "outline", size: "lg" })}
                >
                  Como funciona
                </Link>
              </div>
            </div>

            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=1200&q=80"
                alt="Equipe da Cadê Imóveis sorrindo em uma reunião"
                loading="lazy"
                className="aspect-[4/5] w-full rounded-2xl object-cover shadow-xl shadow-foreground/5 sm:aspect-[4/3] lg:aspect-[4/5]"
              />
              <img
                src="https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=1200&q=80"
                alt="Atendimento próximo e humano"
                loading="lazy"
                className="absolute -bottom-6 -left-6 hidden w-40 rounded-2xl border-4 border-background object-cover shadow-lg lg:block"
              />
            </div>
          </Reveal>
        </section>

        {/* Missão */}
        <section className="border-y bg-muted/30">
          <Reveal className="mx-auto block max-w-4xl px-4 py-16 text-center md:px-6 md:py-24">
            <p className="text-sm font-semibold tracking-wide text-primary uppercase">
              Nossa missão
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-balance md:text-4xl">
              Humanizar o mercado imobiliário de Uberlândia
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              Acreditamos que encontrar um lar — ou um novo começo — deveria ser
              uma experiência leve, clara e cheia de cuidado. Por isso colocamos
              pessoas no centro de tudo: do anúncio à entrega das chaves, você
              sempre conversa com gente que se importa.
            </p>
          </Reveal>
        </section>

        {/* Valores */}
        <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                O que nos move
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Valores que guiam cada conversa, cada anúncio e cada visita.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALORES.map((v) => (
              <div
                key={v.titulo}
                className="rounded-2xl bg-card p-6 ring-1 ring-foreground/10 transition-shadow hover:shadow-lg hover:shadow-foreground/5"
              >
                <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <v.icone className="size-6" />
                </span>
                <h3 className="mt-5 text-lg font-semibold">{v.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {v.texto}
                </p>
              </div>
            ))}
            </div>
          </Reveal>
        </section>

        {/* Números */}
        <section className="border-y bg-primary text-primary-foreground">
          <Reveal className="mx-auto block max-w-7xl px-4 py-14 md:px-6">
            <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
              {NUMEROS.map((n) => (
                <div key={n.rotulo}>
                  <p className="text-4xl font-semibold tracking-tight md:text-5xl">
                    {n.valor}
                  </p>
                  <p className="mt-2 text-sm text-primary-foreground/80">
                    {n.rotulo}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* História */}
        <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
          <Reveal className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <img
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=80"
              alt="Fundador da Cadê Imóveis"
              loading="lazy"
              className="aspect-[4/3] w-full rounded-2xl object-cover shadow-xl shadow-foreground/5"
            />
            <div>
              <p className="text-sm font-semibold tracking-wide text-primary uppercase">
                Nossa história
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-balance md:text-4xl">
                Começou com uma pergunta: cadê o imóvel certo?
              </h2>
              <div className="mt-6 space-y-4 text-base leading-relaxed text-muted-foreground">
                <p>
                  Tudo começou com a frustração de procurar imóvel em Uberlândia e
                  esbarrar sempre nos mesmos problemas: anúncios desatualizados,
                  fotos que não correspondiam à realidade e um contato impessoal,
                  cheio de intermediários.
                </p>
                <p>
                  Decidimos construir a plataforma que gostaríamos de usar — direta,
                  honesta e próxima. Reunimos tecnologia de ponta e um time que
                  conhece cada cantinho da cidade, do Centro ao Granja Marileusa.
                </p>
                <p>
                  Hoje, a Cadê conecta quem anuncia a quem busca com a simplicidade
                  de uma conversa entre vizinhos — e a confiança de quem faz tudo às
                  claras.
                </p>
              </div>
              <Link
                href="/cadastro"
                className={buttonVariants({ size: "lg", className: "mt-8" })}
              >
                Faça parte da Cadê
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
