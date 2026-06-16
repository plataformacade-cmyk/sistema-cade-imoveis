import Link from "next/link";
import { getSessao } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";

/**
 * Header público da landing. Server Component — lê a sessão pra decidir
 * entre "Entrar" (visitante) e "Painel" (logado).
 */
export async function HomeHeader() {
  const sessao = await getSessao();

  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="text-lg font-semibold">
          Cadê <span className="text-primary">Imóveis</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            href="/plataforma"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Buscar imóveis
          </Link>
          {sessao ? (
            <Link
              href="/painel"
              className={buttonVariants({ size: "sm" })}
            >
              Painel
            </Link>
          ) : (
            <Link href="/login" className={buttonVariants({ size: "sm" })}>
              Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
