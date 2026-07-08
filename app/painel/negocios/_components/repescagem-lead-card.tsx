"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import {
  marcarNegocioPerdidoComRepescagem,
  registrarRespostaRepescagem,
} from "@/actions/repescagens";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { RepescagemResumo } from "@/lib/repescagens";
import { rotuloStatusRepescagem } from "@/lib/repescagens";

type Props = {
  negocioId: string;
  statusNegocio: string;
  repescagem: RepescagemResumo | null;
  podeOperar: boolean;
  podeResponder: boolean;
};

const fmt = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

function dinheiro(valor: number | null | undefined) {
  if (valor == null) return null;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(valor);
}

export function RepescagemLeadCard({
  negocioId,
  statusNegocio,
  repescagem,
  podeOperar,
  podeResponder,
}: Props) {
  const [perderState, perderAction, perdendo] = useActionState(
    marcarNegocioPerdidoComRepescagem,
    {},
  );
  const [respostaState, respostaAction, respondendo] = useActionState(
    registrarRespostaRepescagem,
    {},
  );

  useEffect(() => {
    if (perderState.error) toast.error(perderState.error);
    if (perderState.message) toast.success(perderState.message);
  }, [perderState]);

  useEffect(() => {
    if (respostaState.error) toast.error(respostaState.error);
    if (respostaState.message) toast.success(respostaState.message);
  }, [respostaState]);

  const encerrado = ["concluido", "perdido", "acompanhamento_externo"].includes(statusNegocio);
  const recomendados = repescagem?.imoveis_recomendados ?? [];

  if (!repescagem && !podeOperar) return null;

  return (
    <Card>
      <CardHeader>
        <CardDescription>Repescagem</CardDescription>
        <CardTitle className="flex items-center gap-2 text-lg">
          <RotateCcw className="size-4" />
          Fluxo de perdido e similares
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {!repescagem && !encerrado && podeOperar && (
          <form action={perderAction} className="grid gap-3">
            <input type="hidden" name="negocio_id" value={negocioId} />
            <Textarea
              name="motivo_perda"
              placeholder="Motivo opcional: nao gostou do imovel, preco, localizacao, sem resposta..."
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="aceita_similares"
                value="sim"
                defaultChecked
              />
              Agendar repescagem com imoveis similares
            </label>
            <Button type="submit" variant="destructive" disabled={perdendo}>
              {perdendo ? "Registrando..." : "Marcar como perdido"}
            </Button>
          </form>
        )}

        {repescagem && (
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={repescagem.status === "encerrado" ? "secondary" : "outline"}>
                {rotuloStatusRepescagem(repescagem.status)}
              </Badge>
              <span className="text-muted-foreground text-sm">
                Tentativas: {repescagem.tentativas}
              </span>
              {repescagem.proxima_tentativa_em && (
                <span className="text-muted-foreground text-sm">
                  Proxima: {fmt.format(new Date(repescagem.proxima_tentativa_em))}
                </span>
              )}
            </div>

            {repescagem.motivo_perda && (
              <p className="text-muted-foreground text-sm">
                Motivo registrado: {repescagem.motivo_perda}
              </p>
            )}

            {recomendados.length > 0 && (
              <div className="grid gap-2">
                <p className="text-sm font-medium">Imoveis recomendados</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {recomendados.slice(0, 4).map((imovel) => (
                    <Link
                      key={imovel.id}
                      href={`/plataforma/imoveis/${imovel.id}`}
                      className="rounded-lg border p-3 text-sm hover:bg-muted"
                    >
                      <span className="font-medium">
                        {imovel.titulo || imovel.tipo || "Imovel similar"}
                      </span>
                      <span className="text-muted-foreground block">
                        {[imovel.bairro, imovel.cidade].filter(Boolean).join(", ")}
                      </span>
                      {dinheiro(imovel.valor_anuncio) && (
                        <span className="block tabular-nums">
                          {dinheiro(imovel.valor_anuncio)}
                          {imovel.tipo_negocio === "locacao" ? "/mes" : ""}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {podeResponder && repescagem.status !== "encerrado" && (
              <form action={respostaAction} className="grid gap-3 border-t pt-3">
                <input type="hidden" name="repescagem_id" value={repescagem.id} />
                <input type="hidden" name="negocio_id" value={negocioId} />
                <Textarea
                  name="resposta_lead"
                  placeholder="Resposta do lead, motivo de perda ou proximo tipo de imovel desejado."
                  defaultValue={repescagem.resposta_lead ?? ""}
                />
                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="aceita_similares"
                      value="sim"
                      defaultChecked={repescagem.aceita_similares ?? true}
                    />
                    Aceita receber similares
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="parar_cadencia"
                      value="sim"
                      defaultChecked={repescagem.parar_cadencia}
                    />
                    Parar cadencia
                  </label>
                </div>
                <Button type="submit" disabled={respondendo}>
                  {respondendo ? "Salvando..." : "Registrar resposta"}
                </Button>
              </form>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
