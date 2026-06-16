"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { agendarVisita, type VisitaState } from "@/actions/visitas";
import { CANAL_OPCOES, enderecoResumido } from "../_lib";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export function AgendarVisitaDialog({ imoveis }: { imoveis: ImovelOpcao[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<VisitaState, FormData>(
    agendarVisita,
    {},
  );

  const imovelItems = imoveis.map((im) => ({
    value: im.id,
    label: enderecoResumido(im),
  }));

  // Fecha o diálogo quando a ação concluir com sucesso.
  useEffect(() => {
    if (state.message) setOpen(false);
  }, [state.message]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="size-4" />
            Agendar visita
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agendar visita</DialogTitle>
          <DialogDescription>
            Escolha o imóvel, a data e o canal. A visita entra como
            &ldquo;solicitada&rdquo;.
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
            <Label htmlFor="data_hora">Data e hora</Label>
            <Input
              id="data_hora"
              name="data_hora"
              type="datetime-local"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="canal">Canal</Label>
            <Select
              name="canal"
              defaultValue="presencial"
              items={CANAL_OPCOES as unknown as { value: string; label: string }[]}
              required
            >
              <SelectTrigger id="canal" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CANAL_OPCOES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="observacoes">Observações (opcional)</Label>
            <Textarea
              id="observacoes"
              name="observacoes"
              placeholder="Ex.: cliente prefere o período da tarde."
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
              {pending ? "Agendando..." : "Agendar visita"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
