"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { registrarResultadoFollowupExterno } from "@/actions/followups-externos";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  RESULTADOS_FOLLOWUP_EXTERNO,
  rotuloResultadoFollowupExterno,
} from "@/lib/followups-externos";

type Props = {
  followupId: string;
};

export function FollowupExternoForm({ followupId }: Props) {
  const [state, action, pending] = useActionState(
    registrarResultadoFollowupExterno,
    {},
  );

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.message) toast.success(state.message);
  }, [state]);

  return (
    <form action={action} className="grid gap-3 border-t pt-3 md:grid-cols-[220px_1fr_auto]">
      <input type="hidden" name="followup_id" value={followupId} />
      <Select name="resultado" required>
        <SelectTrigger>
          <SelectValue placeholder="Resultado" />
        </SelectTrigger>
        <SelectContent>
          {RESULTADOS_FOLLOWUP_EXTERNO.map((resultado) => (
            <SelectItem key={resultado} value={resultado}>
              {rotuloResultadoFollowupExterno(resultado)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Textarea
        name="observacao"
        placeholder="Resumo do retorno, entrave ou proximo passo."
        className="min-h-10"
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Registrando..." : "Registrar"}
      </Button>
    </form>
  );
}
