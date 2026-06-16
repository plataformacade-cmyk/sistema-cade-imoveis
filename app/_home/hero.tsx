import { Search } from "lucide-react";

const TIPOS = [
  { value: "", label: "Qualquer tipo" },
  { value: "casa", label: "Casa" },
  { value: "apartamento", label: "Apartamento" },
  { value: "comercial", label: "Comercial" },
  { value: "terreno", label: "Terreno" },
] as const;

const FOTO_HERO =
  "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1920&q=80";

/**
 * Hero estilo Airbnb: foto grande, overlay claro e barra de busca que
 * leva pra /plataforma com os filtros na query string (form GET — sem JS).
 */
export function HomeHero() {
  return (
    <section className="relative isolate overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={FOTO_HERO}
        alt="Sala ampla e iluminada de um imóvel"
        loading="lazy"
        className="absolute inset-0 -z-10 size-full object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/85 via-background/55 to-background/90" />

      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 py-24 text-center md:py-36 md:px-6">
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl md:text-6xl">
          Encontre seu próximo lar em{" "}
          <span className="text-primary">Uberlândia</span>
        </h1>
        <p className="max-w-xl text-lg text-balance text-muted-foreground">
          Casas, apartamentos e terrenos selecionados — busque, converse e feche
          negócio direto pela plataforma.
        </p>

        {/* Barra de busca */}
        <form
          method="get"
          action="/plataforma"
          className="mt-2 flex w-full max-w-3xl flex-col gap-2 rounded-2xl border bg-card/95 p-2 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:rounded-full sm:p-2"
        >
          <div className="flex flex-1 items-center gap-2 px-3">
            <Search className="size-5 shrink-0 text-muted-foreground" />
            <input
              type="text"
              name="q"
              placeholder="Bairro, cidade ou endereço…"
              aria-label="Buscar por bairro, cidade ou endereço"
              className="h-11 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="hidden w-px self-stretch bg-border sm:block" />

          <select
            name="tipo"
            aria-label="Tipo de imóvel"
            className="h-11 rounded-full bg-transparent px-3 text-sm text-foreground outline-none sm:w-44"
            defaultValue=""
          >
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          >
            <Search className="size-4" />
            Buscar
          </button>
        </form>
      </div>
    </section>
  );
}
