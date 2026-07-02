"use client";

import { useActionState } from "react";
import { Check, X } from "lucide-react";
import {
  mudarStatusDocumento,
  type DocumentoState,
} from "@/actions/documentos";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <form action={formAction} className="flex items-center">
          <input type="hidden" name="documento_id" value={documentoId} />
          <input type="hidden" name="status" value="verificado" />
          <Button type="submit" size="sm" disabled={pending}>
            <Check className="size-4" />
            Verificar
          </Button>
        </form>

        <form action={formAction} className="flex max-w-72 flex-col gap-2">
          <input type="hidden" name="documento_id" value={documentoId} />
          <input type="hidden" name="status" value="reprovado" />
          <Textarea
            name="motivo_reprovacao"
            placeholder="Motivo da reprovacao"
            className="min-h-12 text-xs"
            disabled={pending}
          />
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            <X className="size-4" />
            Reprovar
          </Button>
        </form>
      </div>

      {state.error && <p className="text-destructive text-xs">{state.error}</p>}
      {state.message && (
        <p className="text-muted-foreground text-xs">{state.message}</p>
      )}
    </div>
  );
}
