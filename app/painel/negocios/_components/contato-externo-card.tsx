"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import {
  aceitarCompartilhamentoContato,
  recusarCompartilhamentoContato,
} from "@/actions/contato-externo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  TERMO_CONTATO_EXTERNO,
  type EstadoContatoExterno,
  type PapelContatoExterno,
} from "@/lib/contato-externo";

type Props = {
  estado: EstadoContatoExterno;
};

const statusBadge: Record<string, "default" | "secondary" | "destructive"> = {
  pendente: "secondary",
  liberado: "default",
  recusado: "destructive",
};

const statusLabel: Record<string, string> = {
  pendente: "Pendente",
  liberado: "Liberado",
  recusado: "Recusado",
};

const papelLabel: Record<PapelContatoExterno, string> = {
  comprador: "Comprador",
  proprietario: "Proprietario",
};

function linhaAceite(label: string, ok: boolean) {
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
      <span>{label}</span>
      <Badge variant={ok ? "default" : "outline"}>
        {ok ? "Aceito" : "Pendente"}
      </Badge>
    </div>
  );
}

export function ContatoExternoCard({ estado }: Props) {
  const [aceitarState, aceitarAction, aceitando] = useActionState(
    aceitarCompartilhamentoContato,
    {},
  );
  const [recusarState, recusarAction, recusando] = useActionState(
    recusarCompartilhamentoContato,
    {},
  );

  useEffect(() => {
    if (aceitarState.error) toast.error(aceitarState.error);
    if (aceitarState.message) toast.success(aceitarState.message);
  }, [aceitarState]);

  useEffect(() => {
    if (recusarState.error) toast.error(recusarState.error);
    if (recusarState.message) toast.success(recusarState.message);
  }, [recusarState]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardDescription>Sem servico juridico contratado</CardDescription>
            <CardTitle>Seguir com contato externo</CardTitle>
          </div>
          <Badge variant={statusBadge[estado.status] ?? "secondary"}>
            {statusLabel[estado.status] ?? estado.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-muted-foreground text-sm">
          {TERMO_CONTATO_EXTERNO}
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          {linhaAceite("Comprador", estado.temCompradorAceito)}
          {linhaAceite("Proprietario", estado.temProprietarioAceito)}
        </div>

        {estado.status === "liberado" && (
          <div className="flex flex-col gap-3 rounded-lg border p-3">
            <p className="text-sm font-medium">Contatos autorizados</p>
            {estado.contatos.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nenhum contato cadastrado foi encontrado.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {estado.contatos.map((contato) => (
                  <div
                    key={`${contato.usuario_id}-${contato.papel}`}
                    className="rounded-md bg-muted/50 p-3 text-sm"
                  >
                    <p className="font-medium">
                      {contato.nome || contato.email || "Participante"}
                    </p>
                    <p className="text-muted-foreground">
                      {papelLabel[contato.papel]}
                    </p>
                    {contato.email && <p className="mt-2">{contato.email}</p>}
                    {contato.telefone && <p>{contato.telefone}</p>}
                    {!contato.email && !contato.telefone && (
                      <p className="text-muted-foreground mt-2">
                        Sem e-mail ou telefone cadastrado.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {estado.status === "recusado" && (
          <p className="text-destructive text-sm">
            Uma das partes recusou seguir sem servico Cadê. O contato externo
            nao sera liberado neste fluxo.
          </p>
        )}

        {estado.podeResponder ? (
          <div className="flex flex-wrap gap-2 border-t pt-4">
            <form action={aceitarAction}>
              <input type="hidden" name="negocio_id" value={estado.negocioId} />
              <Button type="submit" disabled={aceitando || recusando}>
                {aceitando ? "Registrando..." : "Aceitar e liberar contato"}
              </Button>
            </form>
            <form action={recusarAction}>
              <input type="hidden" name="negocio_id" value={estado.negocioId} />
              <Button
                type="submit"
                variant="outline"
                disabled={aceitando || recusando}
              >
                {recusando ? "Registrando..." : "Recusar"}
              </Button>
            </form>
          </div>
        ) : estado.status === "pendente" ? (
          <p className="text-muted-foreground text-sm">
            Aguardando aceite das partes obrigatorias.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
