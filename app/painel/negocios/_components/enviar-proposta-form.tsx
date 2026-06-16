"use client";

import { useActionState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import {
  enviarProposta,
  contraproposta,
  type PropostaState,
} from "@/actions/propostas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * Form de proposta. Reaproveitado para proposta normal e contraproposta
 * (muda apenas a action e os rótulos).
 */
export function EnviarPropostaForm({
  negocioId,
  modo = "proposta",
}: {
  negocioId: string;
  modo?: "proposta" | "contraproposta";
}) {
  const action = modo === "contraproposta" ? contraproposta : enviarProposta;
  const [state, formAction, pending] = useActionState<PropostaState, FormData>(
    action,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.message) formRef.current?.reset();
  }, [state.message]);

  const titulo =
    modo === "contraproposta" ? "Fazer contraproposta" : "Enviar proposta";

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="negocio_id" value={negocioId} />

      <div className="flex flex-col gap-2 sm:max-w-xs">
        <Label htmlFor={`valor-${modo}`}>Valor (R$)</Label>
        <Input
          id={`valor-${modo}`}
          name="valor"
          type="number"
          step="0.01"
          min="0"
          placeholder="0,00"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`condicoes-${modo}`}>Condições (opcional)</Label>
        <Textarea
          id={`condicoes-${modo}`}
          name="condicoes"
          placeholder="Ex.: 30% de entrada, financiamento do restante…"
          rows={2}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          <Send className="size-4" />
          {pending ? "Enviando..." : titulo}
        </Button>
        {(state.error || state.message) && (
          <span
            className={`text-sm ${
              state.error ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            {state.error ?? state.message}
          </span>
        )}
      </div>
    </form>
  );
}
