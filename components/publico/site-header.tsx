import Link from "next/link";
import { getSessao } from "@/lib/auth";
import { criarCadastroAnunciarHref } from "@/lib/auth-redirect";
import { buttonVariants } from "@/components/ui/button";
import { MobileMenu } from "./mobile-menu";
import { NAV } from "./nav";

export async function SiteHeader() {
  const sessao = await getSessao();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-cade.svg" alt="" className="size-9" />
          <span className="text-lg tracking-tight">
            Cadê<span className="text-primary"> Imóveis</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {sessao ? (
            <Link href="/painel" className={buttonVariants({ size: "sm" })}>
              Meu painel
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className={buttonVariants({
                  variant: "ghost",
                  size: "sm",
                  className: "hidden sm:inline-flex",
                })}
              >
                Entrar
              </Link>
              <Link
                href={criarCadastroAnunciarHref()}
                className={buttonVariants({
                  size: "sm",
                  className: "hidden sm:inline-flex",
                })}
              >
                Anunciar imóvel
              </Link>
            </>
          )}
          <MobileMenu logado={!!sessao} />
        </div>
      </div>
    </header>
  );
}
