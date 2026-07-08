import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const EVENTOS = [
  "login_sucesso",
  "login_falha",
  "usuario_criado",
  "usuario_editado",
  "imovel_cadastrado",
  "imovel_editado",
  "imovel_arquivado",
  "interesse_demonstrado",
  "lead_qualificacao_salva",
  "negocio_aberto",
  "negocio_status_mudado",
  "visita_agendada",
  "visita_sugerida",
  "visita_confirmada",
  "visita_recusada",
  "visita_status_mudada",
  "proposta_enviada",
  "proposta_respondida",
  "mensagem_contato_bloqueado",
  "servico_juridico_contratado",
  "servico_juridico_status_mudado",
  "contato_externo_aceito",
  "contato_externo_recusado",
  "contato_externo_liberado",
  "followup_externo_criado",
  "followup_externo_respondido",
  "contrato_gerado",
  "contrato_assinado",
  "contrato_status_mudado",
  "contrato_reprovado",
  "contrato_validado",
  "contrato_comprovante_sinal_anexado",
  "cartorial_fluxo_iniciado",
  "cartorial_status_mudado",
  "cartorial_pendencia_criada",
  "cartorial_pendencia_resolvida",
  "cartorial_anexo_enviado",
  "cartorial_concluido",
  "prestador_cartorial_cadastrado",
  "prestador_cartorial_status_mudado",
  "prestador_cartorial_vinculado",
  "prestador_cartorial_removido",
  "prestador_cartorial_acao",
  "suporte_pos_conclusao_criado",
  "suporte_pos_conclusao_status_mudado",
  "hermes_contexto_lido",
  "hermes_contexto_negado",
  "hermes_automacao_executada",
  "hermes_alerta_criado",
  "handoff_humano_criado",
  "handoff_humano_assumido",
  "handoff_humano_resultado_registrado",
  "papel_atribuido",
];

type LogRow = {
  id: number;
  evento: string;
  severidade: string;
  usuario_id: string | null;
  entidade_id: string | null;
  ts: string;
};

function badgeSeveridade(s: string): "default" | "secondary" | "destructive" {
  if (s === "error") return "destructive";
  if (s === "warn") return "secondary";
  return "default";
}

export default async function ObservabilidadePage({
  searchParams,
}: {
  searchParams: Promise<{ evento?: string }>;
}) {
  const { evento } = await searchParams;
  const sessao = await getSessao();
  if (!sessao?.isAdmin) redirect("/painel");
  const supabase = await createClient();

  let query = supabase
    .from("logs_estruturados")
    .select("id, evento, severidade, usuario_id, entidade_id, ts")
    .order("ts", { ascending: false })
    .limit(100);
  if (evento) query = query.eq("evento", evento);

  const { data, error } = await query;
  const logs = (data ?? []) as LogRow[];

  const fmt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Observabilidade</h1>
        <p className="text-muted-foreground text-sm">
          Últimos 100 eventos registrados na plataforma.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/painel/observabilidade"
          className={buttonVariants({
            variant: evento ? "outline" : "default",
            size: "sm",
          })}
        >
          Todos
        </Link>
        {EVENTOS.map((e) => (
          <Link
            key={e}
            href={`/painel/observabilidade?evento=${e}`}
            className={buttonVariants({
              variant: evento === e ? "default" : "outline",
              size: "sm",
            })}
          >
            {e}
          </Link>
        ))}
      </div>

      {error ? (
        <p className="text-muted-foreground text-sm">
          Sem acesso aos logs (apenas administradores).
        </p>
      ) : logs.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhum evento ainda.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quando</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead>Severidade</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Entidade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="whitespace-nowrap tabular-nums">
                  {fmt.format(new Date(l.ts))}
                </TableCell>
                <TableCell className="font-medium">{l.evento}</TableCell>
                <TableCell>
                  <Badge variant={badgeSeveridade(l.severidade)}>
                    {l.severidade}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">
                  {l.usuario_id?.slice(0, 8) ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">
                  {l.entidade_id?.slice(0, 8) ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
