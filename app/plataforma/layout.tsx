import Link from "next/link";
import { getSessao } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";

// Header público simples da vitrine. NÃO usa o painel-shell (aquele é privado).
export default async function PlataformaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessao = await getSessao();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center justify-between border-b px-4 md:px-6">
        <Link href="/plataforma" className="font-semibold">
          Cadê Imóveis
        </Link>
        {sessao ? (
          <Link
            href="/painel"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Painel
          </Link>
        ) : (
          <Link
            href="/login"
            className={buttonVariants({ size: "sm" })}
          >
            Entrar
          </Link>
        )}
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
