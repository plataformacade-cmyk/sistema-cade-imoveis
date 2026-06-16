"use client";

import { useActionState } from "react";
import { Check, X } from "lucide-react";
import {
  mudarStatusDocumento,
  type DocumentoState,
} from "@/actions/documentos";
import { Button } from "@/components/ui/button";

/**
 * Botões verificar/reprovar de um documento. Cada botão submete a mesma action
 * com um `status` diferente (via input escondido por botão). Só renderizado para
 * admin/corretor do negócio.
 */
export function StatusDocumentoButtons({
  documentoId,
}: {
  documentoId: string;
}) {
  const [state, formAction, pending] = useActionState<DocumentoState, FormData>(
    mudarStatusDocumento,
    {},
  );

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <form action={formAction}>
          <input type="hidden" name="documento_id" value={documentoId} />
          <input type="hidden" name="status" value="verificado" />
          <Button type="submit" size="sm" disabled={pending}>
            <Check className="size-4" />
            Verificar
          </Button>
        </form>
        <form action={formAction}>
          <input type="hidden" name="documento_id" value={documentoId} />
          <input type="hidden" name="status" value="reprovado" />
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            <X className="size-4" />
            Reprovar
          </Button>
        </form>
      </div>
      {state.error && <p className="text-destructive text-xs">{state.error}</p>}
    </div>
  );
}
