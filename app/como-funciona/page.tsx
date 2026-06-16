import Link from "next/link";
import { SiteHeader } from "@/components/publico/site-header";
import { SiteFooter } from "@/components/publico/site-footer";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/publico/reveal";
import {
  ClipboardList,
  Megaphone,
  MessageCircle,
  Handshake,
  CheckCircle2,
  Search,
  Heart,
  CalendarCheck,
  KeyRound,
} from "lucide-react";

export const metadata = {
  title: "Como funciona — Cadê Imóveis",
  description:
    "Entenda como anunciar e como buscar imóveis na Cadê Imóveis: simples, transparente e humano, do primeiro clique até a chave na mão.",
};

const PASSOS_ANUNCIA = [
  {
    icone: ClipboardList,
    titulo: "Cadastre seu imóvel",
    texto:
      "Preencha as informações, suba boas fotos e defina o valor. Leva poucos minutos.",
    foto: "/institucional/anunciar.webp",
    fotoAlt: "Casa moderna pronta para ser anunciada na Cadê",
  },
  {
    icone: Megaphone,
    titulo: "Publique para a cidade toda",
    texto:
      "Seu anúncio entra no ar e aparece para quem está procurando exatamente o que você oferece.",
  },
  {
    icone: MessageCircle,
    titulo: "Receba os interesses",
    texto:
      "Pessoas realmente interessadas demonstram interesse e chegam direto até você, sem ruído.",
  },
  {
    icone: Handshake,
    titulo: "Negocie com clareza",
    texto:
      "Converse, tire dúvidas e combine as condições com total transparência para os dois lados.",
  },
  {
    icone: CheckCircle2,
    titulo: "Feche o negócio",
    texto:
      "Alinhou tudo? É hora de assinar e comemorar. A gente acompanha até o final.",
  },
];

const PASSOS_BUSCA = [
  {
    icone: Search,
    titulo: "Busque do seu jeito",
    texto:
      "Filtre por bairro, preço, tipo e tamanho até encontrar o imóvel que combina com você.",
    foto: "/institucional/buscar.webp",
    fotoAlt: "Sala de estar de um imóvel à espera de novos moradores",
  },
  {
    icone: Heart,
    titulo: "Demonstre interesse",
    texto:
      "Gostou? Um clique avisa quem anuncia que você quer saber mais. Sem compromisso.",
  },
  {
    icone: MessageCircle,
    titulo: "Converse direto",
    texto:
      "Tire suas dúvidas falando com quem realmente conhece o imóvel — gente de verdade.",
  },
  {
    icone: CalendarCheck,
    titulo: "Agende a visita",
    texto:
      "Combine o melhor dia e horário para conhecer o imóvel pessoalmente, no seu ritmo.",
  },
  {
    icone: KeyRound,
    titulo: "Feche e mude-se",
    texto:
      "Encontrou o seu lar? A gente te ajuda a fechar com segurança até a chave na mão.",
  },
];

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
  {
    pergunta: "Como funciona a visita ao imóvel?",
    resposta:
      "Depois de demonstrar interesse e conversar, vocês combinam o melhor dia e horário diretamente. Tudo no seu tempo, sem pressão.",
  },
];

function Trilha({
  titulo,
  subtitulo,
  cor,
  passos,
}: {
  titulo: string;
  subtitulo: string;
  cor: string;
  passos: typeof PASSOS_ANUNCIA;
}) {
  const fotoPasso = passos.find((p) => p.foto);

  return (
    <div className="rounded-2xl bg-card p-6 ring-1 ring-foreground/10 md:p-10">
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${cor}`}
          >
            {subtitulo}
          </span>
          <h3 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">
            {titulo}
          </h3>

          <ol className="mt-8 space-y-6">
            {passos.map((p, i) => (
              <li key={p.titulo} className="flex gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <p.icone className="size-5" />
                </span>
                <div>
                  <p className="flex items-center gap-2 font-semibold">
                    <span className="text-sm text-muted-foreground">
                      Passo {i + 1}
                    </span>
                    {p.titulo}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {p.texto}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {fotoPasso?.foto && (
          <div className="order-first lg:order-last">
            <img
              src={fotoPasso.foto}
              alt={fotoPasso.fotoAlt ?? ""}
              loading="lazy"
              className="h-full min-h-64 w-full rounded-2xl object-cover shadow-lg shadow-foreground/5"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function ComoFuncionaPage() {
  return (
    <>
      <SiteHeader />

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
              Seja para anunciar ou para encontrar o seu próximo lar, a gente
              tirou a burocracia do caminho. Veja como é fácil — em poucos passos,
              do seu jeito.
            </p>
          </Reveal>
        </section>

        {/* Trilhas */}
        <section className="mx-auto max-w-7xl space-y-10 px-4 py-16 md:px-6 md:py-24">
          <Reveal>
            <Trilha
              subtitulo="Para quem anuncia"
              titulo="Coloque seu imóvel para a cidade ver"
              cor="bg-primary/10 text-primary"
              passos={PASSOS_ANUNCIA}
            />
          </Reveal>
          <Reveal delay={0.1}>
            <Trilha
              subtitulo="Para quem busca"
              titulo="Encontre o lar que combina com você"
              cor="bg-primary/10 text-primary"
              passos={PASSOS_BUSCA}
            />
          </Reveal>
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
          <Reveal className="overflow-hidden rounded-2xl bg-primary px-6 py-14 text-center text-primary-foreground md:px-12 md:py-20 block">
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance md:text-4xl">
              Pronto para começar?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/85">
              Anuncie seu imóvel ou encontre o próximo lar em Uberlândia. É rápido,
              transparente e cheio de gente de verdade para te ajudar.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/cadastro"
                className={buttonVariants({
                  variant: "secondary",
                  size: "lg",
                })}
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
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
