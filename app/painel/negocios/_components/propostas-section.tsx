import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBRL, type StatusVariant } from "../_lib";
import { EnviarPropostaForm } from "./enviar-proposta-form";
import { ResponderPropostaForm } from "./responder-proposta-form";

type PropostaLinha = {
  id: string;
  valor: number | null;
  condicoes: string | null;
  status: string;
  criado_em: string | null;
  autor_id: string;
  usuarios: { nome: string | null; email: string | null } | null;
};

const PROPOSTA_ROTULOS: Record<string, string> = {
  enviada: "Enviada",
  aceita: "Aceita",
  recusada: "Recusada",
  contraproposta: "Contraproposta",
};

function rotuloProposta(status: string): string {
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

const fmtDataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDataHora(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return fmtDataHora.format(d);
}

/**
 * Seção de propostas de um negócio: lista as propostas existentes, com botões
 * de aceitar/recusar nas que ainda estão pendentes, e formulários para enviar
 * uma nova proposta ou uma contraproposta.
 */
export async function PropostasSection({ negocioId }: { negocioId: string }) {
  const sessao = await getSessao();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("propostas")
    .select(
      "id, valor, condicoes, status, criado_em, autor_id, usuarios(nome, email)",
    )
    .eq("negocio_id", negocioId)
    .order("criado_em", { ascending: false });

  const propostas = (data ?? []) as unknown as PropostaLinha[];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Propostas</CardTitle>
        <CardDescription>
          Ofertas e contrapropostas deste negócio.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {error ? (
          <p className="text-destructive text-sm">
            Não foi possível carregar as propostas.
          </p>
        ) : propostas.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhuma proposta enviada ainda.
          </p>
        ) : (
          <div className="rounded-xl ring-1 ring-foreground/10">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Autor</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Condições</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Quando</TableHead>
                  <TableHead className="w-px text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {propostas.map((p) => {
                  const pendente =
                    p.status === "enviada" || p.status === "contraproposta";
                  const podeResponder =
                    Boolean(sessao) && pendente && p.autor_id !== sessao?.user.id;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        {p.usuarios?.nome || p.usuarios?.email || "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatBRL(p.valor)}
                      </TableCell>
                      <TableCell className="max-w-xs whitespace-normal text-muted-foreground">
                        {p.condicoes || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={variantProposta(p.status)}>
                          {rotuloProposta(p.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums text-xs">
                        {formatDataHora(p.criado_em)}
                      </TableCell>
                      <TableCell>
                        {podeResponder ? (
                          <div className="flex justify-end">
                            <ResponderPropostaForm propostaId={p.id} />
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            —
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="grid gap-6 border-t pt-4 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">Enviar proposta</p>
            <EnviarPropostaForm negocioId={negocioId} modo="proposta" />
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">Fazer contraproposta</p>
            <EnviarPropostaForm negocioId={negocioId} modo="contraproposta" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
