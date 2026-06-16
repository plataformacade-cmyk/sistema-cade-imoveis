"use client";

import { useActionState, useEffect, useState } from "react";
import { convidarUsuario, type UsuarioState } from "@/actions/usuarios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DialogConvidar() {
  const [aberto, setAberto] = useState(false);
  const [state, formAction, pending] = useActionState<UsuarioState, FormData>(
    convidarUsuario,
    {},
  );

  // Fecha o dialog quando o convite vai com sucesso.
  useEffect(() => {
    if (state.message) setAberto(false);
  }, [state.message]);

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={<Button>Convidar usuário</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar usuário</DialogTitle>
          <DialogDescription>
            Enviaremos um e-mail com o link para criar a conta.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="convite-email">E-mail</Label>
            <Input
              id="convite-email"
              name="email"
              type="email"
              required
              placeholder="pessoa@exemplo.com"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="convite-nome">Nome (opcional)</Label>
            <Input id="convite-nome" name="nome" type="text" />
          </div>
          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Cancelar
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Enviando..." : "Enviar convite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
