"use client";

import { useActionState, useRef } from "react";
import { mudarStatusVisita, type VisitaState } from "@/actions/visitas";
import { STATUS_OPCOES } from "../_lib";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Select que muda o status de uma visita na hora (submete ao escolher).
 * O valor real vai num input escondido, atualizado pelo Select base-ui.
 */
export function StatusVisitaSelect({
  visitaId,
  status,
  size = "sm",
}: {
  visitaId: string;
  status: string;
  size?: "sm" | "default";
}) {
  const [, formAction, pending] = useActionState<VisitaState, FormData>(
    mudarStatusVisita,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);
  const valorRef = useRef<HTMLInputElement>(null);

  // Mantém o input escondido sincronizado e submete ao mudar.
  function aoMudar(valor: string) {
    if (valor === status) return;
    if (valorRef.current) valorRef.current.value = valor;
    formRef.current?.requestSubmit();
  }

  return (
    <form ref={formRef} action={formAction}>
      <input type="hidden" name="visita_id" value={visitaId} />
      <input ref={valorRef} type="hidden" name="status" defaultValue={status} />
      <Select
        defaultValue={status}
        items={STATUS_OPCOES as unknown as { value: string; label: string }[]}
        onValueChange={(v) => aoMudar(String(v))}
        disabled={pending}
      >
        <SelectTrigger size={size} aria-label="Mudar status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPCOES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </form>
  );
}
