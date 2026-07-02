import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, FileSignature } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
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
import {
  formatBRL,
  rotuloStatus,
  rotuloPapel,
  variantStatus,
  enderecoResumido,
} from "../_lib";
import { StatusSelect } from "../_components/status-select";
import { AtribuirParticipanteForm } from "../_components/atribuir-participante-form";
import { PropostasSection } from "../_components/propostas-section";
import { AbrirConversaButton } from "../_components/abrir-conversa-button";
import { ServicoJuridicoCard } from "../_components/servico-juridico-card";
import { ContatoExternoCard } from "../_components/contato-externo-card";
import { FollowupsExternosCard } from "../_components/followups-externos-card";
import { carregarEstadoContatoExterno } from "@/lib/contato-externo-server";
import type { FollowupExternoResumo } from "@/lib/followups-externos";

type ImovelEmbed = {
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
} | null;

type ParticipanteEmbed = {
  id: string;
  usuario_id: string;
  papel: string;
  ativo: boolean;
  criado_em: string | null;
  usuarios: { nome: string | null; email: string | null } | null;
};

type NegocioDetalhe = {
  id: string;
  imovel_id: string | null;
  tipo: string | null;
  status: string;
  valor_acordado: number | null;
  criado_em: string | null;
  imoveis: ImovelEmbed;
  papeis_negocio: ParticipanteEmbed[];
};

export default async function NegocioDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessao = await getSessao();
  const supabase = await createClient();

  const [negocioRes, usuariosRes] = await Promise.all([
    supabase
      .from("negocios")
      .select(
        "id, imovel_id, tipo, status, valor_acordado, criado_em, imoveis(logradouro, numero, bairro, cidade), papeis_negocio(id, usuario_id, papel, ativo, criado_em, usuarios(nome, email))",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("usuarios")
      .select("id, nome, email")
      .is("anonimizado_em", null)
      .order("nome", { ascending: true }),
  ]);

  if (negocioRes.error) {
    return (
      <p className="text-destructive text-sm">
        Não foi possível carregar o negócio.
      </p>
    );
  }
  if (!negocioRes.data) notFound();

  const negocio = negocioRes.data as unknown as NegocioDetalhe;
  const usuarios = usuariosRes.data ?? [];
  const participantes = negocio.papeis_negocio ?? [];
  const { data: servicos } = negocio.imovel_id
    ? await supabase
        .from("servicos_juridicos_contratacoes")
        .select("id, pacote, status, tipo_negocio, origem, criado_em, negocio_id")
        .eq("imovel_id", negocio.imovel_id)
        .in("status", ["contratado", "em_atendimento"])
        .order("criado_em", { ascending: false })
    : { data: [] };
  const servico =
    servicos?.find((item) => item.negocio_id === negocio.id) ??
    servicos?.[0] ??
    null;
  const papeisUsuario = participantes
    .filter((p) => p.ativo && p.usuario_id === sessao?.user.id)
    .map((p) => p.papel);
  const usuarioPodeOperar =
    Boolean(sessao?.isAdmin) ||
    papeisUsuario.some((papel) =>
      ["proprietario", "corretor", "admin"].includes(papel),
    );
  const podeContratarServico =
    usuarioPodeOperar &&
    ["documentos", "contrato", "cartorial"].includes(negocio.status);
  const podeAtualizarServico =
    Boolean(sessao?.isAdmin) ||
    papeisUsuario.some((papel) => ["corretor", "admin"].includes(papel));
  const podeOperarFollowups =
    Boolean(sessao?.isAdmin) ||
    papeisUsuario.some((papel) => ["corretor", "admin"].includes(papel));
  const tipoNegocio = negocio.tipo === "locacao" ? "locacao" : "venda";
  const contatoExterno = await carregarEstadoContatoExterno({
    negocioId: negocio.id,
    statusNegocio: negocio.status,
    sessao,
    servicoAtivo: Boolean(servico),
  });
  const { data: followupsData } = podeOperarFollowups
    ? await supabase
        .from("negocio_followups_externos")
        .select(
          "id, negocio_id, fluxo_id, tipo, prazo_em, status, resultado, observacao, responsavel_id, respondido_por, respondido_em, criado_em, atualizado_em",
        )
        .eq("negocio_id", negocio.id)
        .order("prazo_em", { ascending: true })
    : { data: [] };
  const followups = (followupsData ?? []) as unknown as FollowupExternoResumo[];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/painel/negocios"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft className="size-4" />
          Negócios
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/painel/negocios/${negocio.id}/documentos`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <FileText className="size-4" />
            Documentos
          </Link>
          <Link
            href={`/painel/negocios/${negocio.id}/contrato`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <FileSignature className="size-4" />
            Contrato
          </Link>
          <AbrirConversaButton negocioId={negocio.id} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardDescription>Negócio</CardDescription>
          <CardTitle className="text-xl">
            {enderecoResumido(negocio.imoveis)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <dt className="text-muted-foreground text-xs">Status</dt>
              <dd>
                <Badge variant={variantStatus(negocio.status)}>
                  {rotuloStatus(negocio.status)}
                </Badge>
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-muted-foreground text-xs">Valor acordado</dt>
              <dd className="tabular-nums">
                {formatBRL(negocio.valor_acordado)}
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-muted-foreground text-xs">Mudar status</dt>
              <dd>
                <StatusSelect
                  negocioId={negocio.id}
                  status={negocio.status}
                  size="default"
                />
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {(servico || podeContratarServico) && (
        <ServicoJuridicoCard
          negocioId={negocio.id}
          imovelId={negocio.imovel_id}
          tipoNegocio={tipoNegocio}
          origem="proposta_aceita"
          servico={servico}
          podeContratar={podeContratarServico}
          podeAtualizarStatus={podeAtualizarServico}
        />
      )}

      {contatoExterno?.mostrar && (
        <ContatoExternoCard estado={contatoExterno} />
      )}

      {podeOperarFollowups && <FollowupsExternosCard followups={followups} />}

      <Card>
        <CardHeader>
          <CardTitle>Participantes</CardTitle>
          <CardDescription>
            Proprietários, compradores e corretores deste negócio.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {participantes.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhum participante atribuído ainda.
            </p>
          ) : (
            <div className="rounded-xl ring-1 ring-foreground/10">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participantes.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        {p.usuarios?.nome || p.usuarios?.email || "—"}
                      </TableCell>
                      <TableCell>{rotuloPapel(p.papel)}</TableCell>
                      <TableCell>
                        <Badge variant={p.ativo ? "outline" : "secondary"}>
                          {p.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="border-t pt-4">
            <p className="mb-3 text-sm font-medium">Atribuir participante</p>
            <AtribuirParticipanteForm
              negocioId={negocio.id}
              usuarios={usuarios}
            />
          </div>
        </CardContent>
      </Card>

      <PropostasSection negocioId={negocio.id} />
    </div>
  );
}
