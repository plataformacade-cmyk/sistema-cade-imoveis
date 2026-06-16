"use client";

import { useActionState, useEffect, useRef } from "react";
import { SendHorizontal } from "lucide-react";
import { enviarMensagem, type MensagemState } from "@/actions/mensagens";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function EnviarMensagemForm({ conversaId }: { conversaId: string }) {
  const [state, formAction, pending] = useActionState<MensagemState, FormData>(
    enviarMensagem,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Limpa o campo após enviar com sucesso.
  useEffect(() => {
    if (state.message) formRef.current?.reset();
  }, [state.message]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-2"
    >
      <input type="hidden" name="conversa_id" value={conversaId} />
      <div className="flex items-end gap-2">
        <Textarea
          name="corpo"
          placeholder="Escreva uma mensagem…"
          required
          rows={2}
          className="flex-1"
        />
        <Button type="submit" disabled={pending} aria-label="Enviar">
          <SendHorizontal className="size-4" />
          {pending ? "Enviando..." : "Enviar"}
        </Button>
      </div>
      {state.error && <p className="text-destructive text-sm">{state.error}</p>}
    </form>
  );
}
