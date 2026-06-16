"use client";

import { useActionState, useEffect, useState } from "react";
import { editarUsuario, type UsuarioState } from "@/actions/usuarios";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type UsuarioEditavel = {
  id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  status: string | null;
};

const ITENS_STATUS = {
  ativo: "Ativo",
  inativo: "Inativo",
  convidado: "Convidado",
};

export function DialogEditar({ usuario }: { usuario: UsuarioEditavel }) {
  const [aberto, setAberto] = useState(false);
  const [state, formAction, pending] = useActionState<UsuarioState, FormData>(
    editarUsuario,
    {},
  );

  useEffect(() => {
    if (state.message) setAberto(false);
  }, [state.message]);

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm">
            Editar
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar usuário</DialogTitle>
          <DialogDescription>
            {usuario.email ?? "Sem e-mail"}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={usuario.id} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="editar-nome">Nome</Label>
            <Input
              id="editar-nome"
              name="nome"
              type="text"
              defaultValue={usuario.nome ?? ""}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="editar-telefone">Telefone</Label>
            <Input
              id="editar-telefone"
              name="telefone"
              type="text"
              defaultValue={usuario.telefone ?? ""}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Status</Label>
            <Select
              name="status"
              items={ITENS_STATUS}
              defaultValue={usuario.status ?? "ativo"}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
                <SelectItem value="convidado">Convidado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Cancelar
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
