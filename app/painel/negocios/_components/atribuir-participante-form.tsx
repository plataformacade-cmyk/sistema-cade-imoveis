"use client";

import { useActionState, useEffect, useRef } from "react";
import { UserPlus } from "lucide-react";
import {
  atribuirParticipante,
  type NegocioState,
} from "@/actions/negocios";
import { PAPEL_OPCOES } from "../_lib";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type UsuarioOpcao = { id: string; nome: string | null; email: string | null };

export function AtribuirParticipanteForm({
  negocioId,
  usuarios,
}: {
  negocioId: string;
  usuarios: UsuarioOpcao[];
}) {
  const [state, formAction, pending] = useActionState<NegocioState, FormData>(
    atribuirParticipante,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  const usuarioItems = usuarios.map((u) => ({
    value: u.id,
    label: u.nome || u.email || u.id,
  }));

  // Limpa os selects após sucesso (remonta via key não é trivial com base-ui,
  // então resetamos o form nativo).
  useEffect(() => {
    if (state.message) formRef.current?.reset();
  }, [state.message]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-4 sm:flex-row sm:items-end"
    >
      <input type="hidden" name="negocio_id" value={negocioId} />

      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="usuario_id">Usuário</Label>
        <Select name="usuario_id" items={usuarioItems} required>
          <SelectTrigger id="usuario_id" className="w-full">
            <SelectValue placeholder="Selecione um usuário" />
          </SelectTrigger>
          <SelectContent>
            {usuarios.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.nome || u.email || u.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2 sm:w-48">
        <Label htmlFor="papel">Papel</Label>
        <Select
          name="papel"
          items={PAPEL_OPCOES as unknown as { value: string; label: string }[]}
          required
        >
          <SelectTrigger id="papel" className="w-full">
            <SelectValue placeholder="Selecione o papel" />
          </SelectTrigger>
          <SelectContent>
            {PAPEL_OPCOES.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={pending || usuarios.length === 0}>
        <UserPlus className="size-4" />
        {pending ? "Atribuindo..." : "Atribuir"}
      </Button>

      {(state.error || state.message) && (
        <p
          className={`text-sm sm:basis-full ${
            state.error ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {state.error ?? state.message}
        </p>
      )}
    </form>
  );
}
