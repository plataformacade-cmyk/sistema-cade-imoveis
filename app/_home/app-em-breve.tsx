import { Bell, Smartphone } from "lucide-react";

/**
 * Seção "App em breve" (inspiração QuintoAndar/Loft): leve a Cadê no bolso.
 * Mockup de celular em CSS (sem imagem extra) mostrando um anúncio + selos
 * de loja "em breve". Fundo laranja suave da marca.
 */
export function HomeAppEmBreve() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
      <div className="grid items-center gap-10 overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-amber-500 px-6 py-12 text-primary-foreground md:grid-cols-2 md:px-12 md:py-16">
        <div className="flex flex-col gap-5">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">
            <Smartphone className="size-3.5" />
            Em breve
          </span>
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Leve a Cadê no bolso
          </h2>
          <p className="max-w-md text-primary-foreground/90">
            Estamos preparando o aplicativo da Cadê Imóveis para você buscar,
            conversar e acompanhar suas negociações direto do celular. Quer ser
            avisado no lançamento?
          </p>
          <div className="flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-black/20 px-4 py-2.5 text-sm font-medium backdrop-blur">
              <AppleIcon className="size-5" />
              <span className="flex flex-col leading-tight">
                <span className="text-[10px] font-normal opacity-80">
                  Em breve na
                </span>
                App Store
              </span>
            </span>
            <span className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-black/20 px-4 py-2.5 text-sm font-medium backdrop-blur">
              <PlayIcon className="size-5" />
              <span className="flex flex-col leading-tight">
                <span className="text-[10px] font-normal opacity-80">
                  Em breve no
                </span>
                Google Play
              </span>
            </span>
          </div>
          <a
            href="/cadastro"
            className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-primary transition-transform hover:scale-[1.02]"
          >
            <Bell className="size-4" />
            Quero ser avisado
          </a>
        </div>

        {/* Mockup de celular (CSS) */}
        <div className="flex justify-center md:justify-end">
          <div className="relative h-[26rem] w-56 rounded-[2.5rem] border-[6px] border-black/80 bg-black/80 shadow-2xl">
            {/* notch */}
            <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-black" />
            <div className="size-full overflow-hidden rounded-[2rem] bg-background">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/institucional/buscar.webp"
                alt="Prévia do app da Cadê Imóveis"
                className="h-3/5 w-full object-cover"
              />
              <div className="flex flex-col gap-2 p-3 text-left text-foreground">
                <div className="flex items-center gap-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo-cade.svg" alt="" className="size-5" />
                  <span className="text-xs font-semibold">Cadê Imóveis</span>
                </div>
                <div className="h-2 w-3/4 rounded-full bg-muted" />
                <div className="h-2 w-1/2 rounded-full bg-muted" />
                <div className="mt-1 h-7 w-full rounded-lg bg-primary/15" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.36 1.43c.05 1.02-.36 2.02-1.02 2.75-.7.78-1.84 1.38-2.94 1.3-.07-1 .42-2.04 1.05-2.72.7-.77 1.92-1.34 2.91-1.33ZM20.5 17.1c-.55 1.28-.82 1.85-1.53 2.98-.99 1.58-2.39 3.55-4.12 3.56-1.54.02-1.93-1-4.02-.99-2.08.01-2.51 1.01-4.05.99-1.73-.02-3.05-1.79-4.04-3.37C-.06 16.07-.34 10.9 1.4 8.16c1.04-1.62 2.68-2.57 4.22-2.57 1.57 0 2.56 1.04 3.86 1.04 1.26 0 2.03-1.04 3.85-1.04 1.37 0 2.83.75 3.86 2.04-3.39 1.86-2.84 6.7.31 7.47Z" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3.6 2.3c-.3.2-.5.6-.5 1.1v17.2c0 .5.2.9.5 1.1l9.1-9.7L3.6 2.3Zm11 9.7 2.6-2.8L6.4 2.9c-.3-.2-.6-.2-.8-.1l9 9.2Zm0 .9-9 9.2c.2.1.5.1.8-.1l10.8-6.3-2.6-2.8Zm5.8-3.4L17.9 8 15 11l2.9 3 2.5-1.5c.7-.4.7-1.5 0-2Z" />
    </svg>
  );
}
