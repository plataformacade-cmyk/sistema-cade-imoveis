"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { atualizarSenha, type ConfigState } from "@/actions/configuracoes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SenhaForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<ConfigState, FormData>(
    atualizarSenha,
    {},
  );

  useEffect(() => {
    if (state.ok) {
      toast.success("Senha atualizada.");
      formRef.current?.reset();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="senha">Nova senha</Label>
        <Input
          id="senha"
          name="senha"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmacao">Confirme a nova senha</Label>
        <Input
          id="confirmacao"
          name="confirmacao"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>

      {state.error && <p className="text-destructive text-sm">{state.error}</p>}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Trocar senha"}
        </Button>
      </div>
    </form>
  );
}
