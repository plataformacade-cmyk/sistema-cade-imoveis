import Link from "next/link";
import { MapPin } from "lucide-react";

const BAIRROS = [
  "Santa Mônica",
  "Jardim Karaíba",
  "Morada da Colina",
  "Centro",
  "Tibery",
  "Saraiva",
  "Granja Marileusa",
  "Cidade Jardim",
] as const;

/** Bairros populares de Uberlândia — cada chip leva à busca pré-filtrada. */
export function HomeBairros() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
      <div className="mb-10 flex flex-col gap-3">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Bairros em destaque
        </h2>
        <p className="max-w-xl text-lg text-muted-foreground">
          Explore os bairros mais procurados de Uberlândia.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {BAIRROS.map((bairro) => (
          <Link
            key={bairro}
            href={`/plataforma?q=${encodeURIComponent(bairro)}`}
            className="group inline-flex items-center gap-2 rounded-full border bg-card px-5 py-3 text-sm font-medium shadow-sm transition-all hover:border-primary/40 hover:shadow-lg"
          >
            <MapPin className="size-4 text-primary" />
            {bairro}
          </Link>
        ))}
      </div>
    </section>
  );
}
