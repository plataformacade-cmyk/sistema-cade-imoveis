"use client";

import { useActionState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import {
  contraproposta,
  enviarProposta,
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

export function EnviarPropostaChatForm({
  negocioId,
  conversaId,
  modo = "proposta",
  tipoNegocio = "venda",
}: {
  negocioId: string;
  conversaId: string;
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
    modo === "contraproposta" ? "Contraproposta" : "Enviar proposta";

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-3 rounded-lg border bg-card p-3"
    >
      <input type="hidden" name="negocio_id" value={negocioId} />
      <input type="hidden" name="conversa_id" value={conversaId} />

      <div className="grid gap-2 sm:grid-cols-[minmax(0,180px)_1fr_auto] sm:items-end">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`chat-valor-${modo}`}>
            {locacao ? "Aluguel mensal (R$)" : "Valor (R$)"}
          </Label>
          <Input
            id={`chat-valor-${modo}`}
            name="valor"
            type="number"
            step="0.01"
            min="0"
            placeholder="0,00"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`chat-condicoes-${modo}`}>
            Condicoes e observacoes
          </Label>
          <Textarea
            id={`chat-condicoes-${modo}`}
            name="condicoes"
            placeholder="Entrada, financiamento, prazo, itens inclusos..."
            rows={2}
          />
        </div>
        <Button type="submit" disabled={pending} className="sm:mb-0">
          <Send className="size-4" />
          {pending ? "Enviando..." : titulo}
        </Button>
      </div>

      {locacao && (
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`chat-tipo-garantia-${modo}`}>Garantia</Label>
            <Select name="tipo_garantia" required>
              <SelectTrigger id={`chat-tipo-garantia-${modo}`}>
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`chat-prazo-meses-${modo}`}>Prazo (meses)</Label>
            <Input
              id={`chat-prazo-meses-${modo}`}
              name="prazo_meses"
              type="number"
              min="1"
              step="1"
              placeholder="30"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`chat-reajuste-${modo}`}>Reajuste</Label>
            <Input
              id={`chat-reajuste-${modo}`}
              name="reajuste_indice"
              placeholder="IPCA"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`chat-vencimento-${modo}`}>Vencimento</Label>
            <Input
              id={`chat-vencimento-${modo}`}
              name="dia_vencimento"
              type="number"
              min="1"
              max="31"
              step="1"
              placeholder="10"
            />
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2 lg:col-span-4">
            <Label htmlFor={`chat-encargos-${modo}`}>Encargos</Label>
            <Textarea
              id={`chat-encargos-${modo}`}
              name="encargos"
              placeholder="Condominio, IPTU, seguro incendio e demais encargos..."
              rows={2}
            />
          </div>
        </div>
      )}

      {(state.error || state.message) && (
        <p
          className={`text-sm ${
            state.error ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {state.error ?? state.message}
        </p>
      )}
    </form>
  );
}
