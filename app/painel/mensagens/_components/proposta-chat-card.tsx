"use client";

import { useActionState } from "react";
import { Check, HandCoins, X } from "lucide-react";
import { responderProposta, type PropostaState } from "@/actions/propostas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  normalizarTipoNegocio,
  rotuloGarantiaLocacao,
} from "@/lib/negocios/tipo";
import { formatBRL, type StatusVariant } from "../../negocios/_lib";
import { EnviarPropostaChatForm } from "./enviar-proposta-chat-form";

const PROPOSTA_ROTULOS: Record<string, string> = {
  enviada: "Enviada",
  aceita: "Aceita",
  recusada: "Recusada",
  contraproposta: "Contraproposta",
};

function rotuloProposta(status: string) {
  return PROPOSTA_ROTULOS[status] ?? status;
}

function variantProposta(status: string): StatusVariant {
  switch (status) {
    case "aceita":
      return "default";
    case "recusada":
      return "destructive";
    case "contraproposta":
      return "secondary";
    default:
      return "outline";
  }
}

export type PropostaChatCardProps = {
  conversaId: string;
  negocioId: string;
  propostaId: string;
  autorNome: string;
  valor: number | null;
  condicoes: string | null;
  status: string;
  podeResponder: boolean;
  tipoNegocio?: string | null;
  tipoGarantia?: string | null;
  prazoMeses?: number | null;
  reajusteIndice?: string | null;
  diaVencimento?: number | null;
  encargos?: string | null;
};

export function PropostaChatCard({
  conversaId,
  negocioId,
  propostaId,
  autorNome,
  valor,
  condicoes,
  status,
  podeResponder,
  tipoNegocio,
  tipoGarantia,
  prazoMeses,
  reajusteIndice,
  diaVencimento,
  encargos,
}: PropostaChatCardProps) {
  const [aceitarState, aceitarAction, aceitando] = useActionState<
    PropostaState,
    FormData
  >(responderProposta, {});
  const [recusarState, recusarAction, recusando] = useActionState<
    PropostaState,
    FormData
  >(responderProposta, {});
  const pendente = status === "enviada" || status === "contraproposta";
  const erro = aceitarState.error ?? recusarState.error;
  const locacao = normalizarTipoNegocio(tipoNegocio) === "locacao";

  return (
    <div className="w-full max-w-xl rounded-lg border bg-card p-3 text-card-foreground shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <HandCoins className="size-4" />
          </span>
          <div>
            <p className="text-sm font-medium">
              {locacao ? "Proposta de locacao" : "Proposta"}
            </p>
            <p className="text-muted-foreground text-xs">
              {autorNome} - {formatBRL(valor)}
              {locacao ? "/mes" : ""}
            </p>
          </div>
        </div>
        <Badge variant={variantProposta(status)}>{rotuloProposta(status)}</Badge>
      </div>

      {condicoes && (
        <p className="mt-3 whitespace-pre-wrap break-words text-sm text-muted-foreground">
          {condicoes}
        </p>
      )}

      {locacao && (
        <dl className="mt-3 grid gap-2 rounded-md bg-muted/50 p-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Garantia</dt>
            <dd className="font-medium">
              {rotuloGarantiaLocacao(tipoGarantia)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Prazo</dt>
            <dd className="font-medium">
              {prazoMeses ? `${prazoMeses} meses` : "Nao informado"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Reajuste</dt>
            <dd className="font-medium">{reajusteIndice || "Nao informado"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Vencimento</dt>
            <dd className="font-medium">
              {diaVencimento ? `Dia ${diaVencimento}` : "Nao informado"}
            </dd>
          </div>
          {encargos && (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Encargos</dt>
              <dd className="whitespace-pre-wrap font-medium">{encargos}</dd>
            </div>
          )}
        </dl>
      )}

      {podeResponder && pendente && (
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <form action={aceitarAction}>
              <input type="hidden" name="proposta_id" value={propostaId} />
              <input type="hidden" name="acao" value="aceita" />
              <input type="hidden" name="conversa_id" value={conversaId} />
              <Button type="submit" size="sm" disabled={aceitando || recusando}>
                <Check className="size-4" />
                Aceitar
              </Button>
            </form>
            <form action={recusarAction}>
              <input type="hidden" name="proposta_id" value={propostaId} />
              <input type="hidden" name="acao" value="recusada" />
              <input type="hidden" name="conversa_id" value={conversaId} />
              <Button
                type="submit"
                size="sm"
                variant="outline"
                disabled={aceitando || recusando}
              >
                <X className="size-4" />
                Recusar
              </Button>
            </form>
          </div>

          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-primary">
              Fazer contraproposta
            </summary>
            <div className="mt-2">
              <EnviarPropostaChatForm
                negocioId={negocioId}
                conversaId={conversaId}
                modo="contraproposta"
                tipoNegocio={tipoNegocio}
              />
            </div>
          </details>
        </div>
      )}

      {erro && <p className="text-destructive mt-2 text-xs">{erro}</p>}
    </div>
  );
}
