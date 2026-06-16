"use client";

import { useActionState } from "react";
import { Check, X } from "lucide-react";
import { responderProposta, type PropostaState } from "@/actions/propostas";
import { Button } from "@/components/ui/button";

/**
 * Botões aceitar/recusar uma proposta. Cada botão submete a mesma action
 * com um valor de `acao` diferente (via input escondido por botão).
 */
export function ResponderPropostaForm({ propostaId }: { propostaId: string }) {
  const [state, formAction, pending] = useActionState<PropostaState, FormData>(
    responderProposta,
    {},
  );

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <form action={formAction}>
          <input type="hidden" name="proposta_id" value={propostaId} />
          <input type="hidden" name="acao" value="aceita" />
          <Button type="submit" size="sm" disabled={pending}>
            <Check className="size-4" />
            Aceitar
          </Button>
        </form>
        <form action={formAction}>
          <input type="hidden" name="proposta_id" value={propostaId} />
          <input type="hidden" name="acao" value="recusada" />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={pending}
          >
            <X className="size-4" />
            Recusar
          </Button>
        </form>
      </div>
      {state.error && <p className="text-destructive text-xs">{state.error}</p>}
    </div>
  );
}
