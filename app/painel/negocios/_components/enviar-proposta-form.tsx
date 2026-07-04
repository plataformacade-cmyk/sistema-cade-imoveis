"use client";

import { useActionState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import {
  enviarProposta,
  contraproposta,
  type PropostaState,
} from "@/actions/propostas";
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
import { Textarea } from "@/components/ui/textarea";
import {
  GARANTIA_LOCACAO_OPCOES,
  normalizarTipoNegocio,
} from "@/lib/negocios/tipo";

/**
 * Form de proposta. Reaproveitado para proposta normal e contraproposta
 * (muda apenas a action e os rótulos).
 */
export function EnviarPropostaForm({
  negocioId,
  modo = "proposta",
  tipoNegocio = "venda",
}: {
  negocioId: string;
  modo?: "proposta" | "contraproposta";
  tipoNegocio?: string | null;
}) {
  const tipoNormalizado = normalizarTipoNegocio(tipoNegocio);
  const locacao = tipoNormalizado === "locacao";
  const action = modo === "contraproposta" ? contraproposta : enviarProposta;
  const [state, formAction, pending] = useActionState<PropostaState, FormData>(
    action,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.message) formRef.current?.reset();
  }, [state.message]);

  const titulo =
    modo === "contraproposta" ? "Fazer contraproposta" : "Enviar proposta";

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="negocio_id" value={negocioId} />

      <div className="flex flex-col gap-2 sm:max-w-xs">
        <Label htmlFor={`valor-${modo}`}>
          {locacao ? "Aluguel mensal (R$)" : "Valor (R$)"}
        </Label>
        <Input
          id={`valor-${modo}`}
          name="valor"
          type="number"
          step="0.01"
          min="0"
          placeholder="0,00"
          required
        />
      </div>

      {locacao && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`tipo-garantia-${modo}`}>Garantia</Label>
            <Select name="tipo_garantia" required>
              <SelectTrigger id={`tipo-garantia-${modo}`}>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {GARANTIA_LOCACAO_OPCOES.map((opcao) => (
                  <SelectItem key={opcao.value} value={opcao.value}>
                    {opcao.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`prazo-meses-${modo}`}>Prazo (meses)</Label>
            <Input
              id={`prazo-meses-${modo}`}
              name="prazo_meses"
              type="number"
              min="1"
              step="1"
              placeholder="30"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`reajuste-indice-${modo}`}>
              Indice de reajuste
            </Label>
            <Input
              id={`reajuste-indice-${modo}`}
              name="reajuste_indice"
              placeholder="IPCA, IGPM..."
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`dia-vencimento-${modo}`}>
              Dia de vencimento
            </Label>
            <Input
              id={`dia-vencimento-${modo}`}
              name="dia_vencimento"
              type="number"
              min="1"
              max="31"
              step="1"
              placeholder="10"
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor={`condicoes-${modo}`}>Condições (opcional)</Label>
        <Textarea
          id={`condicoes-${modo}`}
          name="condicoes"
          placeholder="Ex.: 30% de entrada, financiamento do restante…"
          rows={2}
        />
      </div>

      {locacao && (
        <div className="flex flex-col gap-2">
          <Label htmlFor={`encargos-${modo}`}>Encargos (opcional)</Label>
          <Textarea
            id={`encargos-${modo}`}
            name="encargos"
            placeholder="Condominio, IPTU, seguro incendio, contas e demais encargos..."
            rows={2}
          />
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          <Send className="size-4" />
          {pending ? "Enviando..." : titulo}
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
