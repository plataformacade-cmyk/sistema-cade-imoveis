"use client";

import { useActionState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import {
  contraproposta,
  enviarProposta,
  type PropostaState,
} from "@/actions/propostas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function EnviarPropostaChatForm({
  negocioId,
  conversaId,
  modo = "proposta",
}: {
  negocioId: string;
  conversaId: string;
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
    modo === "contraproposta" ? "Contraproposta" : "Enviar proposta";

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-3 rounded-lg border bg-card p-3"
    >
      <input type="hidden" name="negocio_id" value={negocioId} />
      <input type="hidden" name="conversa_id" value={conversaId} />

      <div className="grid gap-2 sm:grid-cols-[minmax(0,180px)_1fr_auto] sm:items-end">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`chat-valor-${modo}`}>Valor (R$)</Label>
          <Input
            id={`chat-valor-${modo}`}
            name="valor"
            type="number"
            step="0.01"
            min="0"
            placeholder="0,00"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`chat-condicoes-${modo}`}>
            Condicoes e observacoes
          </Label>
          <Textarea
            id={`chat-condicoes-${modo}`}
            name="condicoes"
            placeholder="Entrada, financiamento, prazo, itens inclusos..."
            rows={2}
          />
        </div>
        <Button type="submit" disabled={pending} className="sm:mb-0">
          <Send className="size-4" />
          {pending ? "Enviando..." : titulo}
        </Button>
      </div>

      {(state.error || state.message) && (
        <p
          className={`text-sm ${
            state.error ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {state.error ?? state.message}
        </p>
      )}
    </form>
  );
}
