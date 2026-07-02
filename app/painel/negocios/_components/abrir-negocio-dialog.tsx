"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { abrirNegocio, type NegocioState } from "@/actions/negocios";
import { STATUS_NEGOCIO_PADRAO } from "@/lib/negocios/status";
import { STATUS_OPCOES, enderecoResumido } from "../_lib";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ImovelOpcao = {
  id: string;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
};

export function AbrirNegocioDialog({ imoveis }: { imoveis: ImovelOpcao[] }) {
  const [open, setOpen] = useState(false);

  async function abrirNegocioEFechar(
    prev: NegocioState,
    formData: FormData,
  ): Promise<NegocioState> {
    const resultado = await abrirNegocio(prev, formData);
    if (resultado.message) setOpen(false);
    return resultado;
  }

  const [state, formAction, pending] = useActionState<NegocioState, FormData>(
    abrirNegocioEFechar,
    {},
  );

  const imovelItems = imoveis.map((im) => ({
    value: im.id,
    label: enderecoResumido(im),
  }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="size-4" />
            Abrir negócio
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Abrir negócio</DialogTitle>
          <DialogDescription>
            Escolha o imóvel e o status inicial. Os participantes são
            adicionados na página do negócio.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="imovel_id">Imóvel</Label>
            <Select name="imovel_id" items={imovelItems} required>
              <SelectTrigger id="imovel_id" className="w-full">
                <SelectValue placeholder="Selecione um imóvel" />
              </SelectTrigger>
              <SelectContent>
                {imoveis.map((im) => (
                  <SelectItem key={im.id} value={im.id}>
                    {enderecoResumido(im)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {imoveis.length === 0 && (
              <p className="text-muted-foreground text-xs">
                Nenhum imóvel cadastrado ainda.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="status">Status</Label>
            <Select
              name="status"
              defaultValue={STATUS_NEGOCIO_PADRAO}
              items={STATUS_OPCOES as unknown as { value: string; label: string }[]}
              required
            >
              <SelectTrigger id="status" className="w-full">
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
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="valor_acordado">Valor acordado (opcional)</Label>
            <Input
              id="valor_acordado"
              name="valor_acordado"
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
            />
          </div>

          {state.error && (
            <p className="text-destructive text-sm">{state.error}</p>
          )}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Cancelar
            </DialogClose>
            <Button type="submit" disabled={pending || imoveis.length === 0}>
              {pending ? "Abrindo..." : "Abrir negócio"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
