import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

const FOTO_CTA = "/institucional/anunciar.webp";

/** CTA final pra proprietários: "Tem um imóvel? Anuncie grátis". */
export function HomeCtaAnuncie() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
      <div className="grid overflow-hidden rounded-2xl border bg-card shadow-sm md:grid-cols-2">
        <div className="flex flex-col justify-center gap-5 p-8 md:p-12">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Tem um imóvel? <span className="text-primary">Anuncie grátis.</span>
          </h2>
          <p className="max-w-md text-lg text-muted-foreground">
            Publique em minutos, acompanhe cada interessado pelo painel e negocie
            sem perder tempo. Você no controle, do anúncio ao fechamento.
          </p>
          <div>
            <Link
              href="/cadastro"
              className={buttonVariants({
                size: "lg",
                className: "h-11 px-6 text-sm",
              })}
            >
              Anunciar meu imóvel
              <ArrowRight className="ml-1 size-4" />
            </Link>
          </div>
        </div>

        <div className="relative min-h-64 md:min-h-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={FOTO_CTA}
            alt="Fachada de uma casa moderna"
            loading="lazy"
            className="size-full object-cover"
          />
        </div>
      </div>
    </section>
  );
}
