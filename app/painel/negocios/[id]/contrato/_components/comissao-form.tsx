"use client";

import { useActionState, useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import {
  registrarComissao,
  type ComissaoState,
} from "@/actions/comissoes";
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

const PAGADOR_OPCOES = [
  { value: "proprietario", label: "Proprietário" },
  { value: "comprador", label: "Comprador" },
  { value: "inquilino", label: "Inquilino" },
] as const;

const fmtBRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/**
 * Formulário de comissão. Os defaults (percentual, base e pagador) vêm
 * calculados pelo servidor conforme o tipo do negócio. Mostra o valor da
 * comissão recalculado ao vivo e valida (no servidor) que o split soma 100%.
 */
export function ComissaoForm({
  negocioId,
  percentualPadrao,
  basePadrao,
  pagadorPadrao,
  captadorPadrao = 50,
  vendedorPadrao = 50,
}: {
  negocioId: string;
  percentualPadrao: number;
  basePadrao: number;
  pagadorPadrao: string;
  captadorPadrao?: number;
  vendedorPadrao?: number;
}) {
  const [state, formAction, pending] = useActionState<ComissaoState, FormData>(
    registrarComissao,
    {},
  );

  const [percentual, setPercentual] = useState(String(percentualPadrao));
  const [base, setBase] = useState(String(basePadrao));
  const [captador, setCaptador] = useState(String(captadorPadrao));
  const [vendedor, setVendedor] = useState(String(vendedorPadrao));

  const valorCalculado = useMemo(() => {
    const p = Number(percentual.replace(",", "."));
    const b = Number(base.replace(",", "."));
    if (Number.isNaN(p) || Number.isNaN(b)) return null;
    return (b * p) / 100;
  }, [percentual, base]);

  const somaSplit = useMemo(() => {
    const c = Number(captador.replace(",", "."));
    const v = Number(vendedor.replace(",", "."));
    if (Number.isNaN(c) || Number.isNaN(v)) return null;
    return c + v;
  }, [captador, vendedor]);

  const splitOk = somaSplit !== null && Math.round(somaSplit * 100) / 100 === 100;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="negocio_id" value={negocioId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="percentual">Percentual (%)</Label>
          <Input
            id="percentual"
            name="percentual"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={percentual}
            onChange={(e) => setPercentual(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="base_calculo">Base de cálculo (R$)</Label>
          <Input
            id="base_calculo"
            name="base_calculo"
            type="number"
            step="0.01"
            min="0"
            value={base}
            onChange={(e) => setBase(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:max-w-xs">
        <Label htmlFor="pagador-trigger">Pagador</Label>
        <Select name="pagador" defaultValue={pagadorPadrao}>
          <SelectTrigger id="pagador-trigger" aria-label="Pagador">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGADOR_OPCOES.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <fieldset className="flex flex-col gap-2 border-t pt-4">
        <legend className="text-sm font-medium">Split da comissão</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="captador_pct">Captador (%)</Label>
            <Input
              id="captador_pct"
              name="captador_pct"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={captador}
              onChange={(e) => setCaptador(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="vendedor_pct">Vendedor (%)</Label>
            <Input
              id="vendedor_pct"
              name="vendedor_pct"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={vendedor}
              onChange={(e) => setVendedor(e.target.value)}
              required
            />
          </div>
        </div>
        <p
          className={`text-xs ${
            splitOk ? "text-muted-foreground" : "text-destructive"
          }`}
        >
          {somaSplit === null
            ? "Informe os dois percentuais do split."
            : splitOk
              ? "Soma do split: 100% ✓"
              : `Soma do split: ${somaSplit}% (precisa ser 100%)`}
        </p>
      </fieldset>

      <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
        <span className="text-muted-foreground">Valor da comissão: </span>
        <span className="font-medium tabular-nums">
          {valorCalculado == null ? "—" : fmtBRL.format(valorCalculado)}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending || !splitOk}>
          <Calculator className="size-4" />
          {pending ? "Registrando..." : "Registrar comissão"}
        </Button>
        {(state.error || state.message) && (
          <span
            className={`text-sm ${
              state.error ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            {state.error ?? state.message}
          </span>
        )}
      </div>
    </form>
  );
}
