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

function Nav({
  isAdmin,
  onNavigate,
}: {
  isAdmin: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1 p-2">
      {LINKS.filter((l) => !l.admin || isAdmin).map((l) => {
        const Icon = l.icon;
        const active =
          l.href === "/painel"
            ? pathname === "/painel"
            : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <Icon className="size-4" />
            {l.label}
          </Link>
        );
      })}
    </nav>
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
    <div className="flex min-h-screen">
      <aside className="bg-sidebar hidden w-60 shrink-0 border-r md:block">
        <div className="flex h-14 items-center border-b px-4 font-semibold">
          Cadê Imóveis
        </div>
        <Nav isAdmin={isAdmin} />
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger
                render={
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="size-5" />
                  </Button>
                }
              />
              <SheetContent side="left" className="w-64 p-0">
                <SheetTitle className="px-4 py-4 text-left">
                  Cadê Imóveis
                </SheetTitle>
                <Nav isAdmin={isAdmin} onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground hidden text-sm sm:inline">
              {email}
            </span>
            <form action={signout}>
              <Button variant="outline" size="sm" type="submit">
                <LogOut className="mr-2 size-4" />
                Sair
              </Button>
            </form>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
