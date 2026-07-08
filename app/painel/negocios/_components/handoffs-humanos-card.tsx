import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  handoffAberto,
  rotuloOrigemHandoffHumano,
  rotuloResultadoHandoffHumano,
  rotuloStatusHandoffHumano,
  type HandoffHumanoResumo,
} from "@/lib/handoffs-humanos";
import { HandoffHumanoForm } from "./handoff-humano-form";

type Props = {
  handoffs: HandoffHumanoResumo[];
};

const fmt = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

function badgeStatus(status: string): "default" | "secondary" | "outline" {
  if (status === "concluido") return "default";
  if (status === "aberto" || status === "em_atendimento") return "secondary";
  return "outline";
}

export function HandoffsHumanosCard({ handoffs }: Props) {
  if (handoffs.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardDescription>Handoff comercial</CardDescription>
        <CardTitle>Fila humana do lead</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {handoffs.map((handoff) => (
          <div key={handoff.id} className="rounded-lg border p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">
                  {rotuloOrigemHandoffHumano(handoff.origem)}
                </p>
                <p className="text-muted-foreground text-sm">{handoff.motivo}</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Criado: {fmt.format(new Date(handoff.criado_em))}
                  {handoff.assumido_em
                    ? ` · Assumido: ${fmt.format(new Date(handoff.assumido_em))}`
                    : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={handoff.prioridade === "alta" ? "destructive" : "secondary"}
                >
                  {handoff.prioridade}
                </Badge>
                <Badge variant={badgeStatus(handoff.status)}>
                  {rotuloStatusHandoffHumano(handoff.status)}
                </Badge>
              </div>
            </div>

            {handoff.status === "concluido" ? (
              <div className="mt-3 rounded-md bg-muted/50 p-3 text-sm">
                <p className="font-medium">
                  {rotuloResultadoHandoffHumano(handoff.resultado)}
                </p>
                {handoff.observacao && (
                  <p className="text-muted-foreground mt-1">
                    {handoff.observacao}
                  </p>
                )}
                {handoff.parar_cadencia && (
                  <p className="text-muted-foreground mt-1">
                    Lead removido da cadencia operacional.
                  </p>
                )}
              </div>
            ) : handoffAberto(handoff) ? (
              <HandoffHumanoForm
                handoffId={handoff.id}
                status={handoff.status}
              />
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
