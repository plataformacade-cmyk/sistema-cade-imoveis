"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signout } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Activity,
  Building2,
  CalendarDays,
  Handshake,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  UserCheck,
  Users,
} from "lucide-react";

type Item = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  admin: boolean;
};

const LINKS: Item[] = [
  { href: "/painel", label: "Dashboard", icon: LayoutDashboard, admin: false },
  { href: "/painel/imoveis", label: "Imóveis", icon: Building2, admin: false },
  { href: "/painel/negocios", label: "Negócios", icon: Handshake, admin: false },
  { href: "/painel/visitas", label: "Visitas", icon: CalendarDays, admin: false },
  {
    href: "/painel/mensagens",
    label: "Mensagens",
    icon: MessageSquare,
    admin: false,
  },
  { href: "/painel/usuarios", label: "Usuários", icon: Users, admin: true },
  {
    href: "/painel/corretores",
    label: "Corretores",
    icon: UserCheck,
    admin: true,
  },
  {
    href: "/painel/observabilidade",
    label: "Observabilidade",
    icon: Activity,
    admin: true,
  },
  {
    href: "/painel/configuracoes",
    label: "Configurações",
    icon: Settings,
    admin: false,
  },
];

function Marca() {
  return (
    <Link href="/painel" className="flex items-center gap-2 font-semibold">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-cade.svg" alt="" className="size-7" />
      <span className="tracking-tight">
        Cadê<span className="text-primary"> Imóveis</span>
      </span>
    </Link>
  );
}

function Nav({
  isAdmin,
  onNavigate,
}: {
  isAdmin: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const visiveis = LINKS.filter((l) => !l.admin || isAdmin);
  const temAdmin = visiveis.some((l) => l.admin);

  return (
    <nav className="flex flex-col gap-0.5 p-3">
      {visiveis.map((l, i) => {
        const Icon = l.icon;
        const active =
          l.href === "/painel"
            ? pathname === "/painel"
            : pathname.startsWith(l.href);
        // Rótulo de seção antes do 1º item admin.
        const primeiroAdmin = temAdmin && l.admin && !visiveis[i - 1]?.admin;
        return (
          <div key={l.href}>
            {primeiroAdmin && (
              <p className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Administração
              </p>
            )}
            <Link
              href={l.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="size-4 shrink-0" />
              {l.label}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}

function BlocoUsuario({ email }: { email: string }) {
  return (
    <div className="border-t p-3">
      <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary uppercase">
          {email.charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{email}</p>
          <p className="text-xs text-muted-foreground">Minha conta</p>
        </div>
        <form action={signout}>
          <Button
            variant="ghost"
            size="icon"
            type="submit"
            title="Sair"
            className="size-8 shrink-0"
          >
            <LogOut className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

export function PainelShell({
  email,
  isAdmin,
  children,
}: {
  email: string;
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-card md:flex">
        <div className="flex h-16 items-center border-b px-5">
          <Marca />
        </div>
        <div className="flex-1 overflow-y-auto">
          <Nav isAdmin={isAdmin} />
        </div>
        <BlocoUsuario email={email} />
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card/80 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger
                render={
                  <Button variant="ghost" size="icon">
                    <Menu className="size-5" />
                  </Button>
                }
              />
              <SheetContent side="left" className="w-72 p-0">
                <SheetTitle className="flex h-16 items-center border-b px-5 text-left">
                  <Marca />
                </SheetTitle>
                <Nav isAdmin={isAdmin} onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
            <Marca />
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Ver site
            </Link>
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {email}
            </span>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
