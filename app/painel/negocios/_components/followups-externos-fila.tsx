import Link from "next/link";
import { Clock, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  followupEstaVencido,
  rotuloTipoFollowupExterno,
} from "@/lib/followups-externos";
import { enderecoResumido } from "../_lib";

type FollowupFila = {
  id: string;
  negocio_id: string;
  tipo: string;
  prazo_em: string;
  status: string;
  negocios: {
    id: string;
    status: string;
    imoveis: {
      logradouro: string | null;
      numero: string | null;
      bairro: string | null;
      cidade: string | null;
    } | null;
  } | null;
};

type Props = {
  followups: FollowupFila[];
};

const fmt = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function FollowupsExternosFila({ followups }: Props) {
  if (followups.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardDescription>Operacao comercial</CardDescription>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="size-4 text-primary" />
          Follow-ups externos pendentes
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {followups.map((followup) => {
          const vencido = followupEstaVencido(followup);
          return (
            <div
              key={followup.id}
              className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_auto]"
            >
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">
                    {rotuloTipoFollowupExterno(followup.tipo)}
                  </p>
                  {vencido && <Badge variant="destructive">Vencido</Badge>}
                  {!vencido && <Badge variant="secondary">Pendente</Badge>}
                </div>
                <p className="text-muted-foreground text-sm">
                  {enderecoResumido(followup.negocios?.imoveis ?? null)}
                </p>
                <p className="text-muted-foreground text-xs">
                  Prazo: {fmt.format(new Date(followup.prazo_em))}
                </p>
              </div>
              <Link
                href={`/painel/negocios/${followup.negocio_id}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Abrir
                <ArrowRight className="size-4" />
              </Link>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
