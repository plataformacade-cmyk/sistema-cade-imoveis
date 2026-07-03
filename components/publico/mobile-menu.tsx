"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { criarCadastroAnunciarHref } from "@/lib/auth-redirect";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NAV } from "./nav";

export function MobileMenu({ logado }: { logado: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="outline" size="icon" className="md:hidden">
            <Menu className="size-5" />
          </Button>
        }
      />
      <SheetContent side="right" className="w-72 p-0">
        <SheetTitle className="px-5 py-4 text-left text-lg">
          Cadê Imóveis
        </SheetTitle>
        <nav className="flex flex-col gap-1 px-3">
          {NAV.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="mt-4 flex flex-col gap-2 px-5">
          {logado ? (
            <Link
              href="/painel"
              onClick={() => setOpen(false)}
              className={buttonVariants()}
            >
              Meu painel
            </Link>
          ) : (
            <>
              <Link
                href={criarCadastroAnunciarHref()}
                onClick={() => setOpen(false)}
                className={buttonVariants()}
              >
                Anunciar imóvel
              </Link>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className={buttonVariants({ variant: "outline" })}
              >
                Entrar
              </Link>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
