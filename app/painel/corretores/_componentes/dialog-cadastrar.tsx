"use client";

import { useActionState, useEffect, useState } from "react";
import { cadastrarCorretor, type CorretorState } from "@/actions/corretores";
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

export type UsuarioOpcao = { id: string; nome: string | null; email: string | null };
export type ImobiliariaOpcao = { id: string; nome: string | null };

export function DialogCadastrar({
  usuarios,
  imobiliarias,
}: {
  usuarios: UsuarioOpcao[];
  imobiliarias: ImobiliariaOpcao[];
}) {
  const [aberto, setAberto] = useState(false);
  const [state, formAction, pending] = useActionState<CorretorState, FormData>(
    cadastrarCorretor,
    {},
  );

  useEffect(() => {
    if (!state.message) return;
    const id = window.setTimeout(() => setAberto(false), 0);
    return () => window.clearTimeout(id);
  }, [state.message]);

  // Mapas value->label exigidos pelo Select base-ui (para o SelectValue).
  const itensUsuarios = Object.fromEntries(
    usuarios.map((u) => [u.id, u.nome ?? u.email ?? "Sem nome"]),
  );
  const itensImobiliarias: Record<string, string> = {
    "": "Sem imobiliária",
    ...Object.fromEntries(
      imobiliarias.map((i) => [i.id, i.nome ?? "Sem nome"]),
    ),
  };

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={<Button>Cadastrar corretor</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cadastrar corretor</DialogTitle>
          <DialogDescription>
            Vincule um usuário existente ao registro de corretor parceiro.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Usuário</Label>
            <Select name="usuario_id" items={itensUsuarios}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um usuário" />
              </SelectTrigger>
              <SelectContent>
                {usuarios.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.nome ?? u.email ?? "Sem nome"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="corretor-creci">CRECI</Label>
            <Input
              id="corretor-creci"
              name="creci"
              type="text"
              required
              placeholder="000000"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="corretor-creci-uf">UF do CRECI (opcional)</Label>
            <Input
              id="corretor-creci-uf"
              name="creci_uf"
              type="text"
              maxLength={2}
              placeholder="SP"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Imobiliária (opcional)</Label>
            <Select
              name="imobiliaria_id"
              items={itensImobiliarias}
              defaultValue=""
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sem imobiliária</SelectItem>
                {imobiliarias.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.nome ?? "Sem nome"}
                  </SelectItem>
                ))}
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
              {pending ? "Cadastrando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
