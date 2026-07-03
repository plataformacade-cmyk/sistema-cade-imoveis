"use client";

import { useActionState, useEffect } from "react";
import { PenLine } from "lucide-react";
import { toast } from "sonner";
import { assinarContrato, type ContratoState } from "@/actions/contratos";
import { Button } from "@/components/ui/button";

export function AssinarContratoButton({
  contratoId,
  papel,
  disabled,
}: {
  contratoId: string;
  papel: "comprador" | "proprietario";
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState<ContratoState, FormData>(
    assinarContrato,
    {},
  );

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.message) toast.success(state.message);
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="contrato_id" value={contratoId} />
      <input type="hidden" name="papel" value={papel} />
      <Button type="submit" size="sm" disabled={pending || disabled}>
        <PenLine className="size-4" />
        {pending ? "Assinando..." : "Assinar"}
      </Button>
    </form>
  );
}
