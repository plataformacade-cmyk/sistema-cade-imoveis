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
import {
  normalizarTipoNegocio,
  rotuloGarantiaLocacao,
} from "@/lib/negocios/tipo";

type PropostaLinha = {
  id: string;
  valor: number | null;
  condicoes: string | null;
  status: string;
  criado_em: string | null;
  autor_id: string;
  tipo_negocio: string | null;
  tipo_garantia: string | null;
  prazo_meses: number | null;
  reajuste_indice: string | null;
  dia_vencimento: number | null;
  encargos: string | null;
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

  const [{ data: negocio }, { data, error }] = await Promise.all([
    supabase.from("negocios").select("tipo").eq("id", negocioId).maybeSingle(),
    supabase
      .from("propostas")
      .select(
        "id, valor, condicoes, status, criado_em, autor_id, tipo_negocio, tipo_garantia, prazo_meses, reajuste_indice, dia_vencimento, encargos, usuarios(nome, email)",
      )
      .eq("negocio_id", negocioId)
      .order("criado_em", { ascending: false }),
  ]);

  const tipoNegocio = normalizarTipoNegocio(String(negocio?.tipo ?? "venda"));
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
                  <TableHead>Detalhes</TableHead>
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
                        {normalizarTipoNegocio(p.tipo_negocio ?? tipoNegocio) ===
                        "locacao"
                          ? "/mes"
                          : ""}
                      </TableCell>
                      <TableCell className="max-w-xs whitespace-normal text-muted-foreground">
                        <div className="flex flex-col gap-1">
                          {normalizarTipoNegocio(
                            p.tipo_negocio ?? tipoNegocio,
                          ) === "locacao" && (
                            <span>
                              {rotuloGarantiaLocacao(p.tipo_garantia)}
                              {p.prazo_meses
                                ? ` - ${p.prazo_meses} meses`
                                : ""}
                              {p.dia_vencimento
                                ? ` - vence dia ${p.dia_vencimento}`
                                : ""}
                            </span>
                          )}
                          <span>{p.condicoes || "—"}</span>
                          {p.encargos && <span>Encargos: {p.encargos}</span>}
                        </div>
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
            <EnviarPropostaForm
              negocioId={negocioId}
              modo="proposta"
              tipoNegocio={tipoNegocio}
            />
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">Fazer contraproposta</p>
            <EnviarPropostaForm
              negocioId={negocioId}
              modo="contraproposta"
              tipoNegocio={tipoNegocio}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
