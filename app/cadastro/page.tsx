"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { signup, type AuthState } from "@/actions/auth";
import { GoogleAuthButton } from "@/components/publico/google-auth-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/publico/auth-shell";

export default function CadastroPage() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    signup,
    {},
  );
  const [erroOAuth, setErroOAuth] = useState(false);

  useEffect(() => {
    setErroOAuth(new URLSearchParams(location.search).get("erro") === "auth");
  }, []);

  return (
    <AuthShell
      titulo="Crie sua conta"
      subtitulo="É rápido e grátis — comece a anunciar ou buscar agora"
      imagem="/institucional/acolhedor.webp"
      frase="Anuncie, converse e feche negócio direto pela plataforma."
    >
      <div className="flex flex-col gap-4">
        {erroOAuth && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Não foi possível concluir o acesso com Google. Tente novamente.
          </p>
        )}

        <GoogleAuthButton next="/cadastro/completar">
          Criar conta com o Google
        </GoogleAuthButton>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          ou crie com e-mail
          <span className="h-px flex-1 bg-border" />
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" name="nome" type="text" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
            />
          </div>
          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          {state.message && (
            <p className="text-sm text-green-600">{state.message}</p>
          )}
          <Button type="submit" className="h-11" disabled={pending}>
            {pending ? "Criando..." : "Criar conta"}
          </Button>
        </form>
      </div>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </AuthShell>
  );
}
