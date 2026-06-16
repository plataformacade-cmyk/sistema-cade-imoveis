"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup, type AuthState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/publico/auth-shell";

export default function CadastroPage() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    signup,
    {},
  );

  return (
    <AuthShell
      titulo="Crie sua conta"
      subtitulo="É rápido e grátis — comece a anunciar ou buscar agora"
      imagem="/institucional/acolhedor.webp"
      frase="Anuncie, converse e feche negócio direto pela plataforma."
    >
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

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </AuthShell>
  );
}
