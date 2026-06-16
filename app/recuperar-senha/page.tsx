"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPassword, type AuthState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function RecuperarSenhaPage() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    resetPassword,
    {},
  );

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Recuperar senha</CardTitle>
          <CardDescription>
            Enviamos um link de redefinição pro seu e-mail
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            {state.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
            {state.message && (
              <p className="text-sm text-green-600">{state.message}</p>
            )}
            <Button type="submit" disabled={pending}>
              {pending ? "Enviando..." : "Enviar link"}
            </Button>
          </form>
          <p className="mt-4 text-sm">
            <Link href="/login" className="underline">
              Voltar para o login
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
