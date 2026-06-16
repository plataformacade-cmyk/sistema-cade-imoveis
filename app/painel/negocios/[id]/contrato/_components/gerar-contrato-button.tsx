"use client";

import { useActionState } from "react";
import { FileText } from "lucide-react";
import { gerarContrato, type ContratoState } from "@/actions/contratos";
import { Button } from "@/components/ui/button";

/**
 * Botão "Gerar contrato": cria o registro de contrato (status 'gerado') e
 * aplica a regra de escritura pública no negócio.
 */
export function GerarContratoButton({ negocioId }: { negocioId: string }) {
  const [state, formAction, pending] = useActionState<ContratoState, FormData>(
    gerarContrato,
    {},
  );

  return (
    <div className="flex flex-col gap-2">
      <form action={formAction}>
        <input type="hidden" name="negocio_id" value={negocioId} />
        <Button type="submit" disabled={pending}>
          <FileText className="size-4" />
          {pending ? "Gerando..." : "Gerar contrato"}
        </Button>
      </form>
      {state.error && <p className="text-destructive text-xs">{state.error}</p>}
    </div>
  );
}
