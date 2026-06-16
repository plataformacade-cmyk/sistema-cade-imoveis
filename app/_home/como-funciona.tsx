import { Search, MessageCircle, Handshake, KeyRound } from "lucide-react";

const PASSOS = [
  {
    icon: Search,
    titulo: "Busque",
    texto:
      "Filtre por bairro, tipo e valor e encontre os imóveis que combinam com você.",
  },
  {
    icon: MessageCircle,
    titulo: "Converse",
    texto:
      "Fale direto com quem anuncia, pela plataforma — sem ligação fria nem intermediário que some.",
  },
  {
    icon: Handshake,
    titulo: "Negocie",
    texto:
      "Acompanhe propostas e o andamento num só lugar, com tudo registrado.",
  },
  {
    icon: KeyRound,
    titulo: "Realize",
    texto: "Feche o negócio com segurança e pegue a chave do seu novo lar.",
  },
] as const;

/** Seção "Como funciona": 4 passos com ícones lucide. */
export function HomeComoFunciona() {
  return (
    <section className="border-t bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <div className="mb-12 flex flex-col gap-3">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Como funciona
          </h2>
          <p className="max-w-xl text-lg text-muted-foreground">
            Do primeiro clique à chave na mão — simples, do começo ao fim.
          </p>
        </div>

        <ol className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PASSOS.map((p, i) => (
            <li
              key={p.titulo}
              className="flex flex-col gap-3 rounded-2xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-lg"
            >
              <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <p.icon className="size-6" />
              </span>
              <h3 className="text-lg font-semibold tracking-tight">
                <span className="text-muted-foreground">{i + 1}. </span>
                {p.titulo}
              </h3>
              <p className="text-sm text-muted-foreground">{p.texto}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
