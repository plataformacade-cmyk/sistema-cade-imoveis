import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Moldura das telas de autenticação (login/cadastro), estilo QuintoAndar:
 * formulário minimalista à esquerda + painel de imagem à direita (some no
 * mobile). A imagem e a frase são parametrizáveis pra dar variedade entre
 * login e cadastro.
 */
export function AuthShell({
  children,
  titulo,
  subtitulo,
  imagem = "/institucional/buscar.webp",
  frase = "O jeito humano de encontrar seu próximo lar em Uberlândia.",
}: {
  children: ReactNode;
  titulo: string;
  subtitulo?: string;
  imagem?: string;
  frase?: string;
}) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Lado do formulário */}
      <div className="flex flex-col justify-center px-6 py-10 sm:px-10 md:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Link
            href="/"
            className="mb-10 flex items-center gap-2 font-semibold"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-cade.svg" alt="" className="size-8" />
            <span className="text-lg tracking-tight">
              Cadê<span className="text-primary"> Imóveis</span>
            </span>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
          {subtitulo && (
            <p className="mt-1.5 text-sm text-muted-foreground">{subtitulo}</p>
          )}
          <div className="mt-8">{children}</div>
        </div>
      </div>

      {/* Lado da imagem (some no mobile) */}
      <div className="relative hidden overflow-hidden lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imagem}
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <p className="absolute inset-x-12 bottom-12 text-2xl font-semibold leading-snug text-white [text-shadow:0_2px_16px_rgba(0,0,0,0.5)]">
          {frase}
        </p>
      </div>
    </main>
  );
}
