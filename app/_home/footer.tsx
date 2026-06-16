import Link from "next/link";

/** Rodapé institucional com links legais. */
export function HomeFooter() {
  const ano = new Date().getFullYear();
  return (
    <footer className="border-t">
      <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm sm:flex-row md:px-6">
        <p>
          © {ano} Cadê Imóveis. Todos os direitos reservados.
        </p>
        <nav className="flex items-center gap-4">
          <Link href="/termos" className="hover:text-foreground transition-colors">
            Termos de uso
          </Link>
          <Link
            href="/privacidade"
            className="hover:text-foreground transition-colors"
          >
            Privacidade
          </Link>
        </nav>
      </div>
    </footer>
  );
}
