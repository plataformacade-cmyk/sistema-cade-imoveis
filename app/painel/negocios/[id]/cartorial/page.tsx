import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  ClipboardList,
  ExternalLink,
  FileText,
  Landmark,
  Paperclip,
} from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSessao } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { carregarEstadoContatoExterno } from "@/lib/contato-externo-server";
import { enderecoResumido, formatBRL } from "../../_lib";
import { ServicoJuridicoCard } from "../../_components/servico-juridico-card";
import { ContatoExternoCard } from "../../_components/contato-externo-card";
import { EnviarDocumentoItem } from "../documentos/_components/enviar-documento-item";
import { StatusDocumentoButtons } from "../documentos/_components/status-documento-buttons";
import {
  type ChecklistItem,
  rotuloStatusDoc,
  statusAgregado,
  variantStatusDoc,
} from "../documentos/_lib";
import {
  AnexarCartorialForm,
  AtualizarFluxoCartorialForm,
  AtualizarPendenciaCartorialForm,
  ConcluirCartorialForm,
  CriarPendenciaCartorialForm,
  IniciarCartorialForm,
} from "./_components/cartorial-forms";

type ParticipanteEmbed = {
  papel: string;
  ativo: boolean;
  usuario_id: string;
  usuarios?: {
    nome: string | null;
    email: string | null;
  } | null;
};

type NegocioCartorial = {
  id: string;
  imovel_id: string | null;
  tipo: string | null;
  status: string;
  valor_acordado: number | null;
  imoveis: {
    logradouro: string | null;
    numero: string | null;
    bairro: string | null;
    cidade: string | null;
  } | null;
  papeis_negocio: ParticipanteEmbed[];
};

type FluxoCartorial = {
  id: string;
  negocio_id: string;
  modo: "servico_cade" | "externo";
  status: string;
  servico_juridico_contratacao_id: string | null;
  cartorio_nome: string | null;
  cartorio_link: string | null;
  agendamento_em: string | null;
  agendamento_link: string | null;
  itbi_valor: number | null;
  custas_valor: number | null;
  observacoes: string | null;
  confirmacao_operacional: string | null;
  iniciado_em: string | null;
  concluido_em: string | null;
};

type PendenciaCartorial = {
  id: string;
  fluxo_id: string;
  negocio_id: string;
  titulo: string;
  descricao: string | null;
  responsavel_papel: string;
  prazo_em: string | null;
  status: string;
  observacao: string | null;
  criado_em: string | null;
  resolvido_em: string | null;
};

type AnexoCartorial = {
  id: string;
  fluxo_id: string;
  pendencia_id: string | null;
  arquivo_url: string;
  arquivo_nome: string | null;
  descricao: string | null;
  criado_em: string | null;
};

type DocumentoCartorial = {
  id: string;
  checklist_item_id: string | null;
  tipo_doc: string;
  arquivo_url: string;
  status: string;
  motivo_reprovacao: string | null;
  criado_em: string | null;
  revisado_em: string | null;
};

type ContratoResumo = {
  id: string;
  status: string;
  versao: number;
};

const statusCartorialLabel: Record<string, string> = {
  pendente: "Pendente",
  documentos_cartorio: "Documentos do cartorio",
  minuta: "Minuta",
  itbi_custas: "ITBI e custas",
  pendencias: "Pendencias",
  agendado: "Agendado",
  escritura: "Escritura",
  registro: "Registro",
  matricula_atualizada: "Matricula atualizada",
  concluido: "Concluido",
  cancelado: "Cancelado",
};

const statusPendenciaLabel: Record<string, string> = {
  aberta: "Aberta",
  em_andamento: "Em andamento",
  resolvida: "Resolvida",
  cancelada: "Cancelada",
};

const fmtData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const fmtDataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatData(iso: string | null, comHora = false): string {
  if (!iso) return "-";
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "-";
  return comHora ? fmtDataHora.format(data) : fmtData.format(data);
}

function badgeFluxo(status: string): "default" | "secondary" | "outline" | "destructive" {
  if (status === "concluido") return "default";
  if (status === "cancelado") return "destructive";
  if (["registro", "matricula_atualizada", "escritura"].includes(status))
    return "secondary";
  return "outline";
}

function badgePendencia(
  status: string,
): "default" | "secondary" | "outline" | "destructive" {
  if (status === "resolvida") return "default";
  if (status === "cancelada") return "outline";
  if (status === "em_andamento") return "secondary";
  return "destructive";
}

function documentosDoItem(
  documentos: DocumentoCartorial[],
  item: ChecklistItem,
) {
  return documentos.filter((doc) => doc.checklist_item_id === item.id);
}

function anexosDaPendencia(anexos: AnexoCartorial[], pendenciaId: string) {
  return anexos.filter((anexo) => anexo.pendencia_id === pendenciaId);
}

function renderDocumentos({
  documentos,
  links,
  podeRevisar,
}: {
  documentos: DocumentoCartorial[];
  links: Map<string, string>;
  podeRevisar: boolean;
}) {
  if (documentos.length === 0) return null;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Arquivo</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Quando</TableHead>
          {podeRevisar && <TableHead className="text-right">Acoes</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {documentos.map((doc) => {
          const link = links.get(doc.id);
          return (
            <TableRow key={doc.id}>
              <TableCell>
                {link ? (
                  <a
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline underline-offset-2"
                  >
                    Ver documento
                  </a>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
                {doc.motivo_reprovacao && (
                  <p className="text-destructive mt-1 text-xs">
                    {doc.motivo_reprovacao}
                  </p>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={variantStatusDoc(doc.status)}>
                  {rotuloStatusDoc(doc.status)}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {formatData(doc.criado_em, true)}
              </TableCell>
              {podeRevisar && (
                <TableCell>
                  <StatusDocumentoButtons documentoId={doc.id} />
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default async function CartorialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessao = await getSessao();
  const supabase = await createClient();

  const { data: negocioData, error: negocioError } = await supabase
    .from("negocios")
    .select(
      "id, imovel_id, tipo, status, valor_acordado, imoveis(logradouro, numero, bairro, cidade), papeis_negocio(papel, ativo, usuario_id, usuarios(nome, email))",
    )
    .eq("id", id)
    .maybeSingle();

  if (negocioError) {
    return (
      <p className="text-destructive text-sm">
        Nao foi possivel carregar o negocio.
      </p>
    );
  }
  if (!negocioData) notFound();

  const negocio = negocioData as unknown as NegocioCartorial;
  const tipoNegocio = negocio.tipo === "locacao" ? "locacao" : "venda";
  const papeisUsuario = (negocio.papeis_negocio ?? []).filter(
    (p) => p.ativo && p.usuario_id === sessao?.user.id,
  );
  const podeOperar =
    Boolean(sessao?.isAdmin) ||
    papeisUsuario.some((p) => ["corretor", "admin"].includes(p.papel));
  const usuarioId = sessao?.user.id ?? "";

  const [contratoRes, fluxoRes, servicosRes] = await Promise.all([
    supabase
      .from("contratos")
      .select("id, status, versao")
      .eq("negocio_id", negocio.id)
      .order("versao", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("negocio_cartorial_fluxos")
      .select(
        "id, negocio_id, modo, status, servico_juridico_contratacao_id, cartorio_nome, cartorio_link, agendamento_em, agendamento_link, itbi_valor, custas_valor, observacoes, confirmacao_operacional, iniciado_em, concluido_em",
      )
      .eq("negocio_id", negocio.id)
      .maybeSingle(),
    negocio.imovel_id
      ? supabase
          .from("servicos_juridicos_contratacoes")
          .select(
            "id, pacote, status, tipo_negocio, origem, criado_em, negocio_id",
          )
          .eq("imovel_id", negocio.imovel_id)
          .in("status", ["contratado", "em_atendimento"])
          .order("criado_em", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (servicosRes.error) {
    return (
      <p className="text-destructive text-sm">
        Nao foi possivel carregar o cartorial.
      </p>
    );
  }

  const contrato = (contratoRes.data ?? null) as ContratoResumo | null;
  const fluxo = (fluxoRes.data ?? null) as FluxoCartorial | null;
  const servicos = servicosRes.data ?? [];
  const servico =
    servicos.find((item) => item.negocio_id === negocio.id) ??
    servicos[0] ??
    null;
  const contatoExterno = await carregarEstadoContatoExterno({
    negocioId: negocio.id,
    statusNegocio: negocio.status,
    tipoNegocio,
    sessao,
    servicoAtivo: Boolean(servico),
  });

  const podeContratarServico =
    podeOperar && ["contrato", "cartorial"].includes(negocio.status);

  const [pendenciasRes, anexosRes, checklistRes, documentosRes] = fluxo
    ? await Promise.all([
        supabase
          .from("negocio_cartorial_pendencias")
          .select(
            "id, fluxo_id, negocio_id, titulo, descricao, responsavel_papel, prazo_em, status, observacao, criado_em, resolvido_em",
          )
          .eq("fluxo_id", fluxo.id)
          .order("criado_em", { ascending: false }),
        supabase
          .from("negocio_cartorial_anexos")
          .select(
            "id, fluxo_id, pendencia_id, arquivo_url, arquivo_nome, descricao, criado_em",
          )
          .eq("fluxo_id", fluxo.id)
          .order("criado_em", { ascending: false }),
        supabase
          .from("documentos_checklist_itens")
          .select(
            "id, tipo_negocio, perfil, codigo, titulo, descricao, obrigatorio, etapa, ordem",
          )
          .eq("ativo", true)
          .in("tipo_negocio", ["venda", "ambos"])
          .like("codigo", "cartorio_%")
          .order("ordem", { ascending: true }),
        supabase
          .from("documentos")
          .select(
            "id, checklist_item_id, tipo_doc, arquivo_url, status, motivo_reprovacao, criado_em, revisado_em",
          )
          .eq("negocio_id", negocio.id)
          .like("tipo_doc", "cartorio_%")
          .order("criado_em", { ascending: false }),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ];

  if (
    pendenciasRes.error ||
    anexosRes.error ||
    checklistRes.error ||
    documentosRes.error
  ) {
    return (
      <p className="text-destructive text-sm">
        Nao foi possivel carregar o fluxo cartorial.
      </p>
    );
  }

  const pendencias = (pendenciasRes.data ?? []) as PendenciaCartorial[];
  const anexos = (anexosRes.data ?? []) as AnexoCartorial[];
  const checklist = (checklistRes.data ?? []) as ChecklistItem[];
  const documentos = (documentosRes.data ?? []) as DocumentoCartorial[];

  const linksDocumentos = new Map<string, string>();
  await Promise.all(
    documentos.map(async (doc) => {
      const { data } = await supabase.storage
        .from("documentos-negocio")
        .createSignedUrl(doc.arquivo_url, 60 * 60);
      if (data?.signedUrl) linksDocumentos.set(doc.id, data.signedUrl);
    }),
  );

  const linksAnexos = new Map<string, string>();
  await Promise.all(
    anexos.map(async (anexo) => {
      const { data } = await supabase.storage
        .from("documentos-negocio")
        .createSignedUrl(anexo.arquivo_url, 60 * 60);
      if (data?.signedUrl) linksAnexos.set(anexo.id, data.signedUrl);
    }),
  );

  const pendenciasAbertas = pendencias.filter((p) =>
    ["aberta", "em_andamento"].includes(p.status),
  );
  const matriculaFinal = documentos.filter(
    (doc) => doc.tipo_doc === "cartorio_matricula_atualizada_final",
  );
  const statusMatriculaFinal = statusAgregado(matriculaFinal);
  const contratoPronto = contrato?.status === "validado";
  const podeIniciar =
    podeOperar &&
    tipoNegocio === "venda" &&
    ["contrato", "cartorial"].includes(negocio.status) &&
    (negocio.status === "cartorial" || contratoPronto);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={`/painel/negocios/${negocio.id}`}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft className="size-4" />
          Negocio
        </Link>
        <div className="flex flex-wrap gap-2">
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
            Contrato
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardDescription>Fluxo cartorial</CardDescription>
          <CardTitle className="text-xl">
            {enderecoResumido(negocio.imoveis)}
          </CardTitle>
          <CardDescription>
            Venda - {formatBRL(negocio.valor_acordado)} - contrato{" "}
            {contrato ? `v${contrato.versao} ${contrato.status}` : "pendente"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground text-xs">Status do negocio</p>
            <p className="text-sm font-medium">{negocio.status}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground text-xs">Status cartorial</p>
            <Badge variant={badgeFluxo(fluxo?.status ?? "pendente")}>
              {statusCartorialLabel[fluxo?.status ?? "pendente"] ?? "Pendente"}
            </Badge>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground text-xs">Modo</p>
            <p className="text-sm font-medium">
              {fluxo?.modo === "servico_cade"
                ? "Servico Cade"
                : "Acompanhamento externo"}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground text-xs">Pendencias abertas</p>
            <p className="text-sm font-medium">{pendenciasAbertas.length}</p>
          </div>
        </CardContent>
      </Card>

      {tipoNegocio !== "venda" && (
        <Card>
          <CardHeader>
            <CardTitle>Cartorial indisponivel para locacao</CardTitle>
            <CardDescription>
              A v1 da OPE-233 cobre apenas compra e venda. Jornada de locacao
              fica em task propria.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {tipoNegocio === "venda" && (servico || podeContratarServico) && (
        <ServicoJuridicoCard
          negocioId={negocio.id}
          imovelId={negocio.imovel_id}
          tipoNegocio="venda"
          origem="contrato"
          servico={servico}
          podeContratar={podeContratarServico}
          podeAtualizarStatus={podeOperar}
        />
      )}

      {contatoExterno?.mostrar && (
        <ContatoExternoCard estado={contatoExterno} />
      )}

      {!fluxo && tipoNegocio === "venda" && (
        <Card>
          <CardHeader>
            <CardTitle>Iniciar etapa cartorial</CardTitle>
            <CardDescription>
              O fluxo exige contrato validado e negocio na etapa de contrato.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {podeIniciar ? (
              <IniciarCartorialForm negocioId={negocio.id} />
            ) : (
              <p className="text-muted-foreground text-sm">
                Aguarde contrato validado ou operador autorizado para iniciar.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {fluxo && (
        <>
          {podeOperar && (
            <Card>
              <CardHeader>
                <CardTitle>Operacao cartorial</CardTitle>
                <CardDescription>
                  Registre cartorio, agendamento, valores de ITBI/custas e
                  avanco da etapa.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AtualizarFluxoCartorialForm fluxo={fluxo} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Resumo operacional</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground flex items-center gap-2 text-xs">
                  <Landmark className="size-4" />
                  Cartorio
                </p>
                <p className="text-sm font-medium">
                  {fluxo.cartorio_nome ?? "-"}
                </p>
                {fluxo.cartorio_link && (
                  <a
                    href={fluxo.cartorio_link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary mt-1 inline-flex items-center gap-1 text-xs underline"
                  >
                    Abrir link <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground flex items-center gap-2 text-xs">
                  <CalendarClock className="size-4" />
                  Agendamento
                </p>
                <p className="text-sm font-medium">
                  {formatData(fluxo.agendamento_em, true)}
                </p>
                {fluxo.agendamento_link && (
                  <a
                    href={fluxo.agendamento_link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary mt-1 inline-flex items-center gap-1 text-xs underline"
                  >
                    Abrir agendamento <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground text-xs">Custos</p>
                <p className="text-sm">
                  ITBI: {formatBRL(fluxo.itbi_valor)} | Custas:{" "}
                  {formatBRL(fluxo.custas_valor)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Checklist cartorial</CardTitle>
              <CardDescription>
                Segunda leva documental, ITBI, escritura, registro e matricula
                final.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {checklist.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nenhum item cartorial ativo no checklist.
                </p>
              ) : (
                checklist.map((item) => {
                  const docs = documentosDoItem(documentos, item);
                  const status = statusAgregado(docs);
                  return (
                    <section
                      key={item.id}
                      className="flex flex-col gap-3 rounded-lg p-4 ring-1 ring-foreground/10"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <FileText className="text-muted-foreground size-4" />
                            <h2 className="text-sm font-semibold">
                              {item.titulo}
                            </h2>
                            <Badge variant={variantStatusDoc(status)}>
                              {rotuloStatusDoc(status)}
                            </Badge>
                            <Badge
                              variant={item.obrigatorio ? "secondary" : "outline"}
                            >
                              {item.obrigatorio ? "Obrigatorio" : "Opcional"}
                            </Badge>
                          </div>
                          {item.descricao && (
                            <p className="text-muted-foreground mt-1 text-sm">
                              {item.descricao}
                            </p>
                          )}
                          <p className="text-muted-foreground mt-1 text-xs">
                            Etapa: {item.etapa}
                          </p>
                        </div>
                        {usuarioId && (
                          <EnviarDocumentoItem
                            negocioId={negocio.id}
                            usuarioId={usuarioId}
                            checklistItemId={item.id}
                          />
                        )}
                      </div>
                      {renderDocumentos({
                        documentos: docs,
                        links: linksDocumentos,
                        podeRevisar: podeOperar,
                      })}
                    </section>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pendencias cartoriais</CardTitle>
              <CardDescription>
                Pendencias bloqueiam a conclusao enquanto estiverem abertas ou
                em andamento.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {podeOperar && <CriarPendenciaCartorialForm fluxoId={fluxo.id} />}

              {pendencias.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nenhuma pendencia cartorial registrada.
                </p>
              ) : (
                pendencias.map((pendencia) => {
                  const anexosPendencia = anexosDaPendencia(anexos, pendencia.id);
                  return (
                    <section
                      key={pendencia.id}
                      className="flex flex-col gap-3 rounded-lg border p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <ClipboardList className="text-muted-foreground size-4" />
                            <h2 className="text-sm font-semibold">
                              {pendencia.titulo}
                            </h2>
                            <Badge variant={badgePendencia(pendencia.status)}>
                              {statusPendenciaLabel[pendencia.status] ??
                                pendencia.status}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground mt-1 text-sm">
                            {pendencia.descricao ?? "Sem descricao."}
                          </p>
                          <p className="text-muted-foreground mt-1 text-xs">
                            Responsavel: {pendencia.responsavel_papel} | Prazo:{" "}
                            {formatData(pendencia.prazo_em)}
                          </p>
                          {pendencia.observacao && (
                            <p className="text-muted-foreground mt-2 text-sm">
                              {pendencia.observacao}
                            </p>
                          )}
                        </div>
                        {podeOperar && (
                          <AtualizarPendenciaCartorialForm
                            pendenciaId={pendencia.id}
                            status={pendencia.status}
                          />
                        )}
                      </div>

                      {usuarioId && (
                        <AnexarCartorialForm
                          negocioId={negocio.id}
                          fluxoId={fluxo.id}
                          pendenciaId={pendencia.id}
                          usuarioId={usuarioId}
                        />
                      )}

                      {anexosPendencia.length > 0 && (
                        <div className="grid gap-2 md:grid-cols-2">
                          {anexosPendencia.map((anexo) => {
                            const link = linksAnexos.get(anexo.id);
                            return (
                              <a
                                key={anexo.id}
                                href={link ?? "#"}
                                target={link ? "_blank" : undefined}
                                rel="noreferrer"
                                className="flex items-start gap-2 rounded-md bg-muted/40 p-3 text-sm"
                              >
                                <Paperclip className="mt-0.5 size-4" />
                                <span>
                                  <span className="font-medium">
                                    {anexo.arquivo_nome ?? "Anexo"}
                                  </span>
                                  <span className="text-muted-foreground block text-xs">
                                    {anexo.descricao ?? "Sem descricao"} -{" "}
                                    {formatData(anexo.criado_em, true)}
                                  </span>
                                </span>
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conclusao cartorial</CardTitle>
              <CardDescription>
                A conclusao exige zero pendencias abertas e matricula final
                verificada ou confirmacao operacional.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-xs">
                    Matricula final
                  </p>
                  <Badge variant={variantStatusDoc(statusMatriculaFinal)}>
                    {rotuloStatusDoc(statusMatriculaFinal)}
                  </Badge>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-xs">
                    Pendencias abertas
                  </p>
                  <p className="text-sm font-medium">
                    {pendenciasAbertas.length}
                  </p>
                </div>
              </div>
              {fluxo.confirmacao_operacional && (
                <p className="text-muted-foreground rounded-lg bg-muted/40 p-3 text-sm">
                  {fluxo.confirmacao_operacional}
                </p>
              )}
              {podeOperar ? (
                <ConcluirCartorialForm fluxoId={fluxo.id} />
              ) : (
                <p className="text-muted-foreground text-sm">
                  Apenas admin ou corretor ativo conclui o cartorial.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
