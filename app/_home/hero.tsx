"use client";

import { Search } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

const TIPOS = [
  { value: "", label: "Qualquer tipo" },
  { value: "casa", label: "Casa" },
  { value: "apartamento", label: "Apartamento" },
  { value: "comercial", label: "Comercial" },
  { value: "terreno", label: "Terreno" },
] as const;

const FOTO_HERO =
  "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1920&q=80";

const STATS = [
  { n: "12+", l: "imóveis ativos" },
  { n: "8", l: "bairros em Uberlândia" },
  { n: "100%", l: "negociado na plataforma" },
];

/**
 * Hero cinematográfico (padrão da casa, versão clara): mídia de fundo com
 * Ken Burns (movimento CONTÍNUO), overlay creme, headline com entrada
 * staggered (Motion, degrada com reduced-motion) e faixa de stats.
 */
export function HomeHero() {
  const reduce = useReducedMotion();
  const entra = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 22 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay, ease: "easeOut" as const },
        };

  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={FOTO_HERO}
          alt="Sala ampla e iluminada de um imóvel"
          className="size-full object-cover animate-ken-burns"
        />
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/85 via-background/60 to-background" />

      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 py-24 text-center md:px-6 md:py-36">
        <motion.h1
          {...entra(0)}
          className="max-w-3xl text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl md:text-6xl"
        >
          Encontre seu próximo lar em{" "}
          <span className="bg-gradient-to-r from-primary to-amber-500 bg-clip-text italic text-transparent">
            Uberlândia
          </span>
        </motion.h1>

        <motion.p
          {...entra(0.12)}
          className="max-w-xl text-lg text-balance text-muted-foreground"
        >
          Casas, apartamentos e terrenos selecionados — busque, converse e feche
          negócio direto pela plataforma.
        </motion.p>

        <motion.form
          {...entra(0.24)}
          method="get"
          action="/plataforma"
          className="mt-2 flex w-full max-w-3xl flex-col gap-2 rounded-2xl border bg-card/95 p-2 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:rounded-full"
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
            defaultValue=""
            className="h-11 rounded-full bg-transparent px-3 text-sm text-foreground outline-none sm:w-44"
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
        </motion.form>

        <motion.div
          {...entra(0.36)}
          className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-4"
        >
          {STATS.map((s) => (
            <div key={s.l} className="text-center">
              <div className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {s.n}
              </div>
              <div className="text-sm text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
