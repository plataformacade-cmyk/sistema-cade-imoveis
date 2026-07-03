"use client";

import { useActionState, useEffect, useRef } from "react";
import { Headset, SendHorizontal } from "lucide-react";
import {
  abrirTicketPosConclusao,
  type SuporteState,
} from "@/actions/suporte";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type TicketResumo = {
  id: string;
  assunto: string | null;
  status: string;
  origem_negocio: string | null;
  atualizado_em: string;
};

const STATUS_LABEL: Record<string, string> = {
  ativa: "Com o assistente",
  aguardando_humano: "Aguardando equipe",
  resolvida: "Resolvida",
};

const ORIGEM_LABEL: Record<string, string> = {
  servico_cade: "Servico Cade",
  externo: "Fluxo externo",
  cartorial: "Cartorial",
  manual: "Manual",
};

function formatarData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SuportePosConclusaoCard({
  negocioId,
  podeAbrir,
  tickets,
}: {
  negocioId: string;
  podeAbrir: boolean;
  tickets: TicketResumo[];
}) {
  const [state, action, pending] = useActionState<SuporteState, FormData>(
    abrirTicketPosConclusao,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.message) formRef.current?.reset();
  }, [state.message]);

  return (
    <Card>
      <CardHeader>
        <CardDescription>Pos-conclusao</CardDescription>
        <CardTitle className="flex items-center gap-2">
          <Headset className="size-5 text-primary" />
          Suporte vinculado ao negocio
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Abra um ticket para tratar pontos que apareceram depois da
            conclusao. O chamado fica vinculado ao historico do negocio para a
            equipe localizar contrato, documentos e cartorial sem alterar esses
            registros.
          </p>

          {tickets.length > 0 && (
            <div className="rounded-lg border">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {ticket.assunto || "Ticket pos-conclusao"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Atualizado em {formatarData(ticket.atualizado_em)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ticket.origem_negocio && (
                      <Badge variant="outline">
                        {ORIGEM_LABEL[ticket.origem_negocio] ??
                          ticket.origem_negocio}
                      </Badge>
                    )}
                    <Badge variant="secondary">
                      {STATUS_LABEL[ticket.status] ?? ticket.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {podeAbrir ? (
          <form ref={formRef} action={action} className="grid gap-3">
            <input type="hidden" name="negocio_id" value={negocioId} />
            <div className="grid gap-1.5">
              <Label htmlFor="suporte-pos-assunto">Assunto</Label>
              <Input
                id="suporte-pos-assunto"
                name="assunto"
                maxLength={120}
                required
                placeholder="Ex.: Duvida sobre documento final"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="suporte-pos-descricao">Descricao</Label>
              <Textarea
                id="suporte-pos-descricao"
                name="descricao"
                rows={4}
                maxLength={2000}
                required
                placeholder="Descreva o que aconteceu depois da conclusao."
              />
            </div>
            {state.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
            {state.message && (
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                {state.message}
              </p>
            )}
            <div>
              <Button type="submit" disabled={pending}>
                <SendHorizontal className="size-4" />
                {pending ? "Abrindo..." : "Abrir ticket"}
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            Apenas comprador ou proprietario ativo pode abrir um ticket deste
            tipo.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
