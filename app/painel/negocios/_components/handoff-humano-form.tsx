"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import {
  assumirHandoffHumano,
  registrarResultadoHandoffHumano,
} from "@/actions/handoffs-humanos";
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
  RESULTADOS_HANDOFF_HUMANO,
  rotuloResultadoHandoffHumano,
} from "@/lib/handoffs-humanos";

type Props = {
  handoffId: string;
  status: string;
};

export function HandoffHumanoForm({ handoffId, status }: Props) {
  const [assumirState, assumirAction, assumindo] = useActionState(
    assumirHandoffHumano,
    {},
  );
  const [resultadoState, resultadoAction, registrando] = useActionState(
    registrarResultadoHandoffHumano,
    {},
  );

  useEffect(() => {
    if (assumirState.error) toast.error(assumirState.error);
    if (assumirState.message) toast.success(assumirState.message);
  }, [assumirState]);

  useEffect(() => {
    if (resultadoState.error) toast.error(resultadoState.error);
    if (resultadoState.message) toast.success(resultadoState.message);
  }, [resultadoState]);

  return (
    <div className="grid gap-3 border-t pt-3">
      {status === "aberto" && (
        <form action={assumirAction}>
          <input type="hidden" name="handoff_id" value={handoffId} />
          <Button type="submit" variant="outline" size="sm" disabled={assumindo}>
            {assumindo ? "Assumindo..." : "Assumir contato"}
          </Button>
        </form>
      )}

      <form
        action={resultadoAction}
        className="grid gap-3 md:grid-cols-[220px_1fr_auto]"
      >
        <input type="hidden" name="handoff_id" value={handoffId} />
        <Select name="resultado" required>
          <SelectTrigger>
            <SelectValue placeholder="Resultado" />
          </SelectTrigger>
          <SelectContent>
            {RESULTADOS_HANDOFF_HUMANO.map((resultado) => (
              <SelectItem key={resultado} value={resultado}>
                {rotuloResultadoHandoffHumano(resultado)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Textarea
          name="observacao"
          placeholder="Resumo da abordagem humana, retorno do lead ou proximo passo."
          className="min-h-10"
        />
        <Button type="submit" disabled={registrando}>
          {registrando ? "Registrando..." : "Registrar"}
        </Button>
      </form>
    </div>
  );
}
