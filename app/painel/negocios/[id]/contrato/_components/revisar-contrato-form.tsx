"use client";

import { useActionState, useEffect } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { revisarContrato, type ContratoState } from "@/actions/contratos";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function RevisarContratoForm({ contratoId }: { contratoId: string }) {
  const [state, formAction, pending] = useActionState<ContratoState, FormData>(
    revisarContrato,
    {},
  );

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.message) toast.success(state.message);
  }, [state]);

  return (
    <div className="flex flex-col gap-3">
      <form action={formAction} className="flex flex-wrap gap-2">
        <input type="hidden" name="contrato_id" value={contratoId} />
        <input type="hidden" name="acao" value="validado" />
        <Button type="submit" size="sm" disabled={pending}>
          <Check className="size-4" />
          Validar contrato
        </Button>
      </form>

      <form action={formAction} className="flex max-w-xl flex-col gap-2">
        <input type="hidden" name="contrato_id" value={contratoId} />
        <input type="hidden" name="acao" value="reprovado" />
        <Textarea
          name="motivo_reprovacao"
          placeholder="Motivo da reprovacao"
          className="min-h-16 text-sm"
          disabled={pending}
        />
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          <X className="size-4" />
          Reprovar contrato
        </Button>
      </form>
    </div>
  );
}
