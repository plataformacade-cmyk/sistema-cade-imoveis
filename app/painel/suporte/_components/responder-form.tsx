"use client";

import { useActionState, useEffect, useRef } from "react";
import { SendHorizontal } from "lucide-react";
import { responderSuporte, type SuporteState } from "@/actions/suporte";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ResponderForm({ conversaId }: { conversaId: string }) {
  const [state, formAction, pending] = useActionState<SuporteState, FormData>(
    responderSuporte,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.message) formRef.current?.reset();
  }, [state.message]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="conversa_id" value={conversaId} />
      <div className="flex items-end gap-2">
        <Textarea
          name="corpo"
          placeholder="Responder como atendente…"
          required
          rows={2}
          className="flex-1"
        />
        <Button type="submit" disabled={pending} aria-label="Enviar resposta">
          <SendHorizontal className="size-4" />
          {pending ? "Enviando…" : "Responder"}
        </Button>
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
