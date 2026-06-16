import Link from "next/link";

const COLUNAS = [
  {
    titulo: "Plataforma",
    links: [
      { href: "/plataforma", label: "Buscar imóveis" },
      { href: "/cadastro", label: "Anunciar imóvel" },
      { href: "/como-funciona", label: "Como funciona" },
    ],
  },
  {
    titulo: "Empresa",
    links: [
      { href: "/sobre", label: "Sobre nós" },
      { href: "/blog", label: "Blog" },
      { href: "/login", label: "Entrar" },
    ],
  },
  {
    titulo: "Legal",
    links: [
      { href: "/termos", label: "Termos de uso" },
      { href: "/privacidade", label: "Privacidade" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t bg-muted/30">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-12 md:grid-cols-4 md:px-6">
        <div className="col-span-2 md:col-span-1">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-cade.svg" alt="" className="size-8" />
            Cadê Imóveis
          </Link>
          <p className="mt-3 text-sm text-muted-foreground">
            O jeito humano de comprar, vender e alugar imóveis em Uberlândia.
          </p>
        </div>
        {COLUNAS.map((c) => (
          <div key={c.titulo}>
            <h3 className="text-sm font-semibold">{c.titulo}</h3>
            <ul className="mt-3 space-y-2">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t py-6 text-center text-xs text-muted-foreground">
        © 2026 Cadê Imóveis · Uberlândia/MG · Todos os direitos reservados.
      </div>
    </footer>
  );
}
