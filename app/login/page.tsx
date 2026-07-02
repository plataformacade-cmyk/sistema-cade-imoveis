"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { login, type AuthState } from "@/actions/auth";
import { GoogleAuthButton } from "@/components/publico/google-auth-button";
import {
  criarCadastroHref,
  ehDestinoInteresse,
  resolverAuthNext,
} from "@/lib/auth-redirect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/publico/auth-shell";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    login,
    {},
  );
  const searchParams = useSearchParams();
  const erroOAuth = searchParams.get("erro") === "auth";
  const nextSeguro = resolverAuthNext(searchParams.get("next"), "/painel");

  return (
    <AuthShell
      titulo="Entre ou crie sua conta"
      subtitulo="Abra as portas para um novo lar"
      imagem="/institucional/buscar.webp"
    >
      <div className="flex flex-col gap-4">
        {erroOAuth && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Não foi possível concluir o acesso com Google. Tente novamente.
          </p>
        )}

        {ehDestinoInteresse(nextSeguro) && (
          <p className="rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary">
            Entre para registrar seu interesse neste imóvel.
          </p>
        )}

        <GoogleAuthButton next={nextSeguro} />

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          ou entre com e-mail
          <span className="h-px flex-1 bg-border" />
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="next" value={nextSeguro} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Senha</Label>
              <Link
                href="/recuperar-senha"
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                Esqueci a senha
              </Link>
            </div>
            <Input id="password" name="password" type="password" required />
          </div>
          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <Button type="submit" className="h-11" disabled={pending}>
            {pending ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Não tem conta?{" "}
          <Link
            href={criarCadastroHref(nextSeguro)}
            className="font-medium text-primary hover:underline"
          >
            Criar conta
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
