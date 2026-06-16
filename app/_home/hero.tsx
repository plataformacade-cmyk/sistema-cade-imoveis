"use client";

import { Search } from "lucide-react";
import { useEffect, useRef, type CSSProperties } from "react";

const TIPOS = [
  { value: "", label: "Qualquer tipo" },
  { value: "casa", label: "Casa" },
  { value: "apartamento", label: "Apartamento" },
  { value: "comercial", label: "Comercial" },
  { value: "terreno", label: "Terreno" },
] as const;

// Vídeo de fundo (Higgsfield, image-to-video da foto de Uberlândia).
// O poster é a foto estática — aparece na hora, sem flash branco, e é o
// fallback se o vídeo não carregar.
const VIDEO_HERO = "/hero-uberlandia.mp4";
const POSTER_HERO = "/hero-uberlandia.webp";

const STATS = [
  { n: "12+", l: "imóveis ativos" },
  { n: "8", l: "bairros em Uberlândia" },
  { n: "100%", l: "negociado na plataforma" },
];

const d = (s: string) => ({ "--d": s }) as CSSProperties;

/**
 * Hero cinematográfico (padrão da casa, versão clara): VÍDEO de fundo em loop
 * mudo (com poster = foto, sem flash), overlay creme, headline + busca com
 * entrada em CSS puro (.entra) — roda no 1º paint e pausa sob a cortina da
 * intro, retomando em sincronia quando ela sobe.
 */
export function HomeHero() {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Garante o play (alguns navegadores barram autoplay até interação) e
  // segura o vídeo pausado enquanto a cortina da intro está no ar, pra ele
  // começar do frame 0 quando o site aparece.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const intro = document.documentElement.classList.contains("intro-ativa");
    const tocar = () => v.play().catch(() => {});
    if (intro) {
      v.pause();
      const poll = setInterval(() => {
        if (!document.documentElement.classList.contains("intro-ativa")) {
          clearInterval(poll);
          tocar();
        }
      }, 120);
      return () => clearInterval(poll);
    }
    tocar();
  }, []);

  return (
    <section className="relative isolate overflow-hidden">
      <div className="midia-chega absolute inset-0 -z-10 overflow-hidden">
        <video
          ref={videoRef}
          poster={POSTER_HERO}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          aria-hidden
          className="size-full object-cover"
        >
          <source src="/hero-uberlandia.webm" type="video/webm" />
          <source src={VIDEO_HERO} type="video/mp4" />
        </video>
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/85 via-background/55 to-background" />

      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 py-24 text-center md:px-6 md:py-36">
        <h1
          className="entra max-w-3xl text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl md:text-6xl"
          style={d("0s")}
        >
          Encontre seu próximo lar em{" "}
          <span className="bg-gradient-to-r from-primary to-amber-500 bg-clip-text italic text-transparent">
            Uberlândia
          </span>
        </h1>

        <p
          className="entra max-w-xl text-lg text-balance text-muted-foreground"
          style={d("0.12s")}
        >
          Casas, apartamentos e terrenos selecionados — busque, converse e feche
          negócio direto pela plataforma.
        </p>

        <form
          method="get"
          action="/plataforma"
          className="entra mt-2 flex w-full max-w-3xl flex-col gap-2 rounded-2xl border bg-card/95 p-2 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:rounded-full"
          style={d("0.24s")}
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
        </form>

        <div
          className="entra mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-4"
          style={d("0.36s")}
        >
          {STATS.map((s) => (
            <div key={s.l} className="text-center">
              <div className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {s.n}
              </div>
              <div className="text-sm text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
