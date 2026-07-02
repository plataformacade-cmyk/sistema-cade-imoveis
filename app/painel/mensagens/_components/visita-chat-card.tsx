"use client";

import { useActionState } from "react";
import { CalendarDays, Check, X } from "lucide-react";
import {
  confirmarVisitaNoChat,
  recusarVisitaNoChat,
  type VisitaState,
} from "@/actions/visitas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { rotuloCanal, rotuloStatus, variantStatus } from "../../visitas/_lib";

const fmtDataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatarDataHora(valor: string | null | undefined) {
  if (!valor) return "-";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "-";
  return fmtDataHora.format(data);
}

export type VisitaChatCardProps = {
  conversaId: string;
  visitaId: string;
  dataHora: string | null;
  canal: string | null;
  observacoes: string | null;
  status: string;
  podeResponder: boolean;
};

export function VisitaChatCard({
  conversaId,
  visitaId,
  dataHora,
  canal,
  observacoes,
  status,
  podeResponder,
}: VisitaChatCardProps) {
  const [confirmarState, confirmarAction, confirmando] = useActionState<
    VisitaState,
    FormData
  >(confirmarVisitaNoChat, {});
  const [recusarState, recusarAction, recusando] = useActionState<
    VisitaState,
    FormData
  >(recusarVisitaNoChat, {});
  const aguardando = ["solicitada", "aguardando_confirmacao", "reagendada"].includes(
    status,
  );
  const erro = confirmarState.error ?? recusarState.error;

  return (
    <div className="w-full max-w-md rounded-lg border bg-card p-3 text-card-foreground shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarDays className="size-4" />
          </span>
          <div>
            <p className="text-sm font-medium">Visita</p>
            <p className="text-muted-foreground text-xs">
              {formatarDataHora(dataHora)} · {rotuloCanal(canal ?? "")}
            </p>
          </div>
        </div>
        <Badge variant={variantStatus(status)}>{rotuloStatus(status)}</Badge>
      </div>

      {observacoes && (
        <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
          {observacoes}
        </p>
      )}

      {podeResponder && aguardando && (
        <div className="mt-3 flex flex-wrap gap-2">
          <form action={confirmarAction}>
            <input type="hidden" name="conversa_id" value={conversaId} />
            <input type="hidden" name="visita_id" value={visitaId} />
            <Button type="submit" size="sm" disabled={confirmando || recusando}>
              <Check className="size-4" />
              Confirmar
            </Button>
          </form>
          <form action={recusarAction}>
            <input type="hidden" name="conversa_id" value={conversaId} />
            <input type="hidden" name="visita_id" value={visitaId} />
            <Button
              type="submit"
              size="sm"
              variant="outline"
              disabled={confirmando || recusando}
            >
              <X className="size-4" />
              Recusar
            </Button>
          </form>
        </div>
      )}

      {erro && <p className="text-destructive mt-2 text-xs">{erro}</p>}
    </div>
  );
}
