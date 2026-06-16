import Link from "next/link";
import { MapPin } from "lucide-react";

// Duas faixas que rolam em direções opostas (marquee). Listas diferentes pra
// não parecer repetição.
const LINHA_1 = [
  "Santa Mônica",
  "Jardim Karaíba",
  "Morada da Colina",
  "Centro",
  "Tibery",
  "Saraiva",
] as const;

const LINHA_2 = [
  "Granja Marileusa",
  "Lídice",
  "Brasil",
  "Granada",
  "Jardim Inconfidência",
  "Cidade Jardim",
] as const;

function Chip({ bairro }: { bairro: string }) {
  return (
    <Link
      href={`/plataforma?q=${encodeURIComponent(bairro)}`}
      className="group inline-flex shrink-0 items-center gap-2 rounded-full border bg-card px-5 py-3 text-sm font-medium shadow-sm transition-all hover:border-primary/40 hover:shadow-lg"
    >
      <MapPin className="size-4 text-primary" />
      {bairro}
    </Link>
  );
}

/** Faixa rolante (marquee) de bairros — cada chip leva à busca pré-filtrada. */
function Faixa({
  itens,
  direcao,
}: {
  itens: readonly string[];
  direcao: "left" | "right";
}) {
  return (
    <div
      className={`flex gap-3 ${direcao === "left" ? "marquee-left" : "marquee-right"}`}
    >
      {/* Conteúdo duplicado: a animação desloca 50% → loop sem emenda. */}
      {[...itens, ...itens].map((b, i) => (
        <Chip key={`${b}-${i}`} bairro={b} />
      ))}
    </div>
  );
}

/** Bairros populares de Uberlândia em duas faixas rolantes opostas. */
export function HomeBairros() {
  return (
    <section className="py-20">
      <div className="mx-auto mb-10 max-w-7xl px-4 md:px-6">
        <div className="flex flex-col gap-3">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Bairros em destaque
          </h2>
          <p className="max-w-xl text-lg text-muted-foreground">
            Explore os bairros mais procurados de Uberlândia.
          </p>
        </div>
      </div>

      {/* Máscara com fade nas bordas; pausa no hover. */}
      <div className="marquee-mask relative flex flex-col gap-3 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <Faixa itens={LINHA_1} direcao="left" />
        <Faixa itens={LINHA_2} direcao="right" />
      </div>
    </section>
  );
}
