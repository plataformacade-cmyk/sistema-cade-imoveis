import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  followupEstaVencido,
  rotuloResultadoFollowupExterno,
  rotuloStatusFollowupExterno,
  rotuloTipoFollowupExterno,
  type FollowupExternoResumo,
} from "@/lib/followups-externos";
import { FollowupExternoForm } from "./followup-externo-form";

type Props = {
  followups: FollowupExternoResumo[];
};

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  pendente: "secondary",
  respondido: "default",
  cancelado: "outline",
};

const fmt = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function FollowupsExternosCard({ followups }: Props) {
  if (followups.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardDescription>Cadencia operacional</CardDescription>
        <CardTitle>Follow-ups pos-compartilhamento</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {followups.map((followup) => {
          const vencido = followupEstaVencido(followup);
          return (
            <div key={followup.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">
                    {rotuloTipoFollowupExterno(followup.tipo)}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Prazo: {fmt.format(new Date(followup.prazo_em))}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {vencido && <Badge variant="destructive">Vencido</Badge>}
                  <Badge variant={statusVariant[followup.status] ?? "outline"}>
                    {rotuloStatusFollowupExterno(followup.status)}
                  </Badge>
                </div>
              </div>

              {followup.status === "respondido" ? (
                <div className="mt-3 rounded-md bg-muted/50 p-3 text-sm">
                  <p className="font-medium">
                    {rotuloResultadoFollowupExterno(followup.resultado)}
                  </p>
                  {followup.observacao && (
                    <p className="text-muted-foreground mt-1">
                      {followup.observacao}
                    </p>
                  )}
                </div>
              ) : followup.status === "pendente" ? (
                <FollowupExternoForm followupId={followup.id} />
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
