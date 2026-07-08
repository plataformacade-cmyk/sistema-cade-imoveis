import Link from "next/link";
import { ArrowRight, UserRoundCheck } from "lucide-react";
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
  rotuloOrigemHandoffHumano,
  rotuloStatusHandoffHumano,
} from "@/lib/handoffs-humanos";
import { enderecoResumido } from "../_lib";

type HandoffFila = {
  id: string;
  negocio_id: string;
  origem: string;
  motivo: string;
  prioridade: string;
  status: string;
  criado_em: string;
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
  handoffs: HandoffFila[];
};

const fmt = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function HandoffsHumanosFila({ handoffs }: Props) {
  if (handoffs.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardDescription>Operacao comercial</CardDescription>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserRoundCheck className="size-4 text-primary" />
          Handoffs humanos pendentes
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {handoffs.map((handoff) => (
          <div
            key={handoff.id}
            className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_auto]"
          >
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">
                  {rotuloOrigemHandoffHumano(handoff.origem)}
                </p>
                <Badge
                  variant={handoff.prioridade === "alta" ? "destructive" : "secondary"}
                >
                  {handoff.prioridade}
                </Badge>
                <Badge variant="outline">
                  {rotuloStatusHandoffHumano(handoff.status)}
                </Badge>
              </div>
              <p className="text-muted-foreground line-clamp-2 text-sm">
                {handoff.motivo}
              </p>
              <p className="text-muted-foreground text-sm">
                {enderecoResumido(handoff.negocios?.imoveis ?? null)}
              </p>
              <p className="text-muted-foreground text-xs">
                Criado: {fmt.format(new Date(handoff.criado_em))}
              </p>
            </div>
            <Link
              href={`/painel/negocios/${handoff.negocio_id}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Abrir
              <ArrowRight className="size-4" />
            </Link>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
