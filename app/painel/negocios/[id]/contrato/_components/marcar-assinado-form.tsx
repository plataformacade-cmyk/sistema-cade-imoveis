"use client";

import { useActionState } from "react";
import { PenLine } from "lucide-react";
import { marcarAssinado, type ContratoState } from "@/actions/contratos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Form para marcar um contrato como assinado. Aceita (opcional) a URL do PDF
 * assinado. No MVP a assinatura é manual/externa.
 */
export function MarcarAssinadoForm({
  contratoId,
  negocioId,
}: {
  contratoId: string;
  negocioId: string;
}) {
  const [state, formAction, pending] = useActionState<ContratoState, FormData>(
    marcarAssinado,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="contrato_id" value={contratoId} />
      <input type="hidden" name="negocio_id" value={negocioId} />

      <div className="flex flex-col gap-2 sm:max-w-md">
        <Label htmlFor="url_pdf">URL do PDF assinado (opcional)</Label>
        <Input
          id="url_pdf"
          name="url_pdf"
          type="url"
          placeholder="https://…"
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          <PenLine className="size-4" />
          {pending ? "Salvando..." : "Marcar como assinado"}
        </Button>
        {state.error && (
          <span className="text-destructive text-sm">{state.error}</span>
        )}
      </div>
    </form>
  );
}
