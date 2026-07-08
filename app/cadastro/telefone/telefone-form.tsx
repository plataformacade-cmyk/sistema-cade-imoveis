"use client";

import { useActionState } from "react";
import {
  salvarTelefoneObrigatorio,
  type TelefoneObrigatorioState,
} from "@/actions/telefone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TelefoneObrigatorioForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<
    TelefoneObrigatorioState,
    FormData
  >(salvarTelefoneObrigatorio, {});

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />
      <div className="space-y-2">
        <Label htmlFor="telefone">Telefone com DDD</Label>
        <Input
          id="telefone"
          name="telefone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(34) 99999-9999"
          required
        />
      </div>

      {state.error && <p className="text-destructive text-sm">{state.error}</p>}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Salvando..." : "Continuar"}
      </Button>
    </form>
  );
}
