"use client";

import { useActionState, useEffect } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { definirGarantia, type GarantiaState } from "@/actions/garantia";
import { GARANTIA_OPCOES } from "../_lib";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Define a garantia de uma locação. Tipo é seleção ÚNICA (é lei). Prazo em
 * meses, default 30.
 */
export function GarantiaForm({
  negocioId,
  tipoGarantia,
  prazoMeses,
}: {
  negocioId: string;
  tipoGarantia: string | null;
  prazoMeses: number | null;
}) {
  const [state, formAction, pending] = useActionState<GarantiaState, FormData>(
    definirGarantia,
    {},
  );

  useEffect(() => {
    if (state.message) toast.success(state.message);
    else if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 sm:flex-row sm:items-end"
    >
      <input type="hidden" name="negocio_id" value={negocioId} />

      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="tipo_garantia">Tipo de garantia</Label>
        <Select
          name="tipo_garantia"
          items={GARANTIA_OPCOES as unknown as { value: string; label: string }[]}
          defaultValue={tipoGarantia ?? undefined}
          required
        >
          <SelectTrigger id="tipo_garantia" className="w-full">
            <SelectValue placeholder="Selecione a garantia" />
          </SelectTrigger>
          <SelectContent>
            {GARANTIA_OPCOES.map((g) => (
              <SelectItem key={g.value} value={g.value}>
                {g.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2 sm:w-40">
        <Label htmlFor="prazo_meses">Prazo (meses)</Label>
        <Input
          id="prazo_meses"
          name="prazo_meses"
          type="number"
          min={1}
          defaultValue={prazoMeses ?? 30}
          required
        />
      </div>

      <Button type="submit" disabled={pending}>
        <ShieldCheck className="size-4" />
        {pending ? "Salvando..." : "Salvar garantia"}
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
