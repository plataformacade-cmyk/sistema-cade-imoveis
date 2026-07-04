import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Receipt,
} from "lucide-react";
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
import { formatBRL, enderecoResumido } from "../../_lib";
import { LIMITE_ESCRITURA, SALARIO_MINIMO } from "@/lib/contrato";
import { ComissaoForm } from "./_components/comissao-form";
import { GerarContratoButton } from "./_components/gerar-contrato-button";
import { ImprimirButton } from "./_components/imprimir-button";
import { AssinarContratoButton } from "./_components/assinar-contrato-button";
import { RevisarContratoForm } from "./_components/revisar-contrato-form";
import { UploadContratoArquivoForm } from "./_components/upload-contrato-arquivo-form";
import { ServicoJuridicoCard } from "../../_components/servico-juridico-card";
import { ContatoExternoCard } from "../../_components/contato-externo-card";
import { carregarEstadoContatoExterno } from "@/lib/contato-externo-server";
import { EnviarDocumentoItem } from "../documentos/_components/enviar-documento-item";
import { StatusDocumentoButtons } from "../documentos/_components/status-documento-buttons";
import {
  rotuloStatusDoc,
  statusAgregado,
  variantStatusDoc,
} from "../documentos/_lib";
import {
  rotuloGarantiaLocacao,
  rotuloPapelNegocio,
} from "@/lib/negocios/tipo";

type ImovelEmbed = {
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  valor_anuncio: number | null;
} | null;

type ParticipanteEmbed = {
  papel: string;
  ativo: boolean;
  usuario_id: string;
  usuarios?: {
    nome: string | null;
    email: string | null;
  } | null;
};

type NegocioContrato = {
  id: string;
  imovel_id: string | null;
  tipo: string | null;
  status: string;
  valor_acordado: number | null;
  tipo_garantia: string | null;
  prazo_meses: number | null;
  reajuste_indice: string | null;
  dia_vencimento: number | null;
  encargos: string | null;
  escritura_publica: boolean;
  imoveis: ImovelEmbed;
  papeis_negocio: ParticipanteEmbed[];
};

type ComissaoLinha = {
  id: string;
  percentual: number | null;
  base_calculo: number | null;
  valor: number | null;
  pagador: string;
  split: { captador_pct?: number; vendedor_pct?: number } | null;
  criado_em: string | null;
};

type ContratoLinha = {
  id: string;
  tipo: string | null;
  url_pdf: string | null;
  arquivo_url: string | null;
  arquivo_nome: string | null;
  status: string;
  versao: number;
  gerado_em: string | null;
  assinado_em: string | null;
  criado_em: string | null;
  revisado_em: string | null;
  motivo_reprovacao: string | null;
  termo_resumo: string | null;
};

type AssinaturaLinha = {
  id: string;
  papel: "comprador" | "proprietario";
  usuario_id: string;
  versao: number;
  assinado_em: string | null;
  usuarios?: {
    nome: string | null;
    email: string | null;
  } | null;
};

type ChecklistItem = {
  id: string;
  titulo: string;
  descricao: string | null;
  obrigatorio: boolean;
};

type DocumentoPix = {
  id: string;
  arquivo_url: string;
  status: string;
  motivo_reprovacao: string | null;
  criado_em: string | null;
  revisado_em: string | null;
};

const CONTRATO_ROTULOS: Record<string, string> = {
  rascunho: "Rascunho",
  gerado: "Gerado",
  pendente_assinaturas: "Pendente de assinaturas",
  assinado: "Assinado",
  validado: "Validado",
  reprovado: "Reprovado",
  cancelado: "Cancelado",
};

const CONTRATO_VARIANTS: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  assinado: "secondary",
  validado: "default",
  reprovado: "destructive",
  cancelado: "outline",
};

const fmtDataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDataHora(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return fmtDataHora.format(d);
}

function defaultsComissao(tipo: string | null): {
  percentual: number;
  pagador: string;
} {
  if (tipo === "locacao") return { percentual: 100, pagador: "proprietario" };
  return { percentual: 6, pagador: "proprietario" };
}

function nomeParticipante(participante: ParticipanteEmbed | AssinaturaLinha) {
  return (
    participante.usuarios?.nome ??
    participante.usuarios?.email ??
    "Participante"
  );
}

function participantesPorPapel(
  papeis: ParticipanteEmbed[],
  papel: "comprador" | "proprietario",
) {
  return papeis.filter((p) => p.ativo && p.papel === papel);
}

function assinaturaPorPapel(
  assinaturas: AssinaturaLinha[],
  papel: "comprador" | "proprietario",
) {
  return assinaturas.find((a) => a.papel === papel) ?? null;
}

function papeisUsuarioAtivos(
  papeis: ParticipanteEmbed[],
  usuarioId: string | undefined,
) {
  if (!usuarioId) return [];
  return papeis.filter((p) => p.ativo && p.usuario_id === usuarioId);
}

function usuarioPodeAssinarPapel(
  papeis: ParticipanteEmbed[],
  usuarioId: string | undefined,
  papel: "comprador" | "proprietario",
) {
  if (!usuarioId) return false;
  return papeis.some(
    (p) => p.ativo && p.usuario_id === usuarioId && p.papel === papel,
  );
}

function estadoOperacional(
  contrato: ContratoLinha | null,
  statusPix: string,
  tipoNegocio: "venda" | "locacao",
): { label: string; detalhe: string } {
  if (!contrato) {
    return {
      label: "Pendente de contrato",
      detalhe: "Gere a primeira versao do contrato para iniciar assinaturas.",
    };
  }
  if (contrato.status === "reprovado") {
    return {
      label: "Reprovado",
      detalhe: contrato.motivo_reprovacao ?? "Revise o motivo informado.",
    };
  }
  if (contrato.status === "validado") {
    return {
      label: "Validado",
      detalhe: "Contrato validado pela operacao.",
    };
  }
  if (contrato.status !== "assinado") {
    return {
      label: "Pendente de assinatura",
      detalhe: "Comprador e proprietario precisam registrar aceite interno.",
    };
  }
  if (tipoNegocio === "locacao") {
    return {
      label: "Em revisao",
      detalhe: "Contrato de locacao assinado e pronto para revisao operacional.",
    };
  }
  if (statusPix === "pendente") {
    return {
      label: "Pendente de comprovante",
      detalhe: "Anexe o comprovante de sinal/Pix quando houver.",
    };
  }
  if (statusPix === "reprovado") {
    return {
      label: "Comprovante reprovado",
      detalhe: "Envie novo comprovante ou revise a justificativa.",
    };
  }
  return {
    label: "Em revisao",
    detalhe: "Contrato assinado e comprovante pronto para revisao operacional.",
  };
}

export default async function ContratoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessao = await getSessao();
  const supabase = await createClient();

  const [negocioRes, comissaoRes, contratoRes] = await Promise.all([
    supabase
      .from("negocios")
      .select(
        "id, imovel_id, tipo, status, valor_acordado, tipo_garantia, prazo_meses, reajuste_indice, dia_vencimento, encargos, escritura_publica, imoveis(logradouro, numero, bairro, cidade, valor_anuncio), papeis_negocio(papel, ativo, usuario_id, usuarios(nome, email))",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("comissoes")
      .select(
        "id, percentual, base_calculo, valor, pagador, split, criado_em",
      )
      .eq("negocio_id", id)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("contratos")
      .select(
        "id, tipo, url_pdf, arquivo_url, arquivo_nome, status, versao, gerado_em, assinado_em, criado_em, revisado_em, motivo_reprovacao, termo_resumo",
      )
      .eq("negocio_id", id)
      .order("versao", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (negocioRes.error) {
    return (
      <p className="text-destructive text-sm">
        Nao foi possivel carregar o negocio.
      </p>
    );
  }
  if (!negocioRes.data) notFound();

  const negocio = negocioRes.data as unknown as NegocioContrato;
  const comissao = (comissaoRes.data ?? null) as ComissaoLinha | null;
  const contrato = (contratoRes.data ?? null) as ContratoLinha | null;
  const tipoNegocio = negocio.tipo === "locacao" ? "locacao" : "venda";

  const [assinaturasRes, pixItemRes, pixDocsRes, servicosRes] =
    await Promise.all([
      contrato
        ? supabase
            .from("contrato_assinaturas")
            .select("id, papel, usuario_id, versao, assinado_em, usuarios(nome, email)")
            .eq("contrato_id", contrato.id)
            .order("assinado_em", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      tipoNegocio === "venda"
        ? supabase
            .from("documentos_checklist_itens")
            .select("id, titulo, descricao, obrigatorio")
            .eq("ativo", true)
            .eq("perfil", "contrato_minuta")
            .eq("codigo", "minuta_comprovante_sinal")
            .in("tipo_negocio", [tipoNegocio, "ambos"])
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      tipoNegocio === "venda"
        ? supabase
            .from("documentos")
            .select(
              "id, arquivo_url, status, motivo_reprovacao, criado_em, revisado_em",
            )
            .eq("negocio_id", id)
            .eq("tipo_doc", "minuta_comprovante_sinal")
            .order("criado_em", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
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

  if (assinaturasRes.error || pixDocsRes.error || servicosRes.error) {
    return (
      <p className="text-destructive text-sm">
        Nao foi possivel carregar o contrato.
      </p>
    );
  }

  const assinaturas = (assinaturasRes.data ?? []) as unknown as AssinaturaLinha[];
  const pixItem = (pixItemRes.data ?? null) as ChecklistItem | null;
  const pixDocs = (pixDocsRes.data ?? []) as unknown as DocumentoPix[];
  const servicos = servicosRes.data ?? [];
  const servico =
    servicos.find((item) => item.negocio_id === negocio.id) ??
    servicos[0] ??
    null;

  const papeisUsuario = papeisUsuarioAtivos(
    negocio.papeis_negocio ?? [],
    sessao?.user.id,
  );
  const usuarioPodeOperar =
    Boolean(sessao?.isAdmin) ||
    papeisUsuario.some((p) =>
      ["proprietario", "corretor", "admin"].includes(p.papel),
    );
  const podeRevisar =
    Boolean(sessao?.isAdmin) ||
    papeisUsuario.some((p) => ["corretor", "admin"].includes(p.papel));
  const podeContratarServico =
    usuarioPodeOperar &&
    ["documentos", "contrato", "cartorial"].includes(negocio.status);
  const podeAtualizarServico = podeRevisar;
  const contatoExterno = await carregarEstadoContatoExterno({
    negocioId: negocio.id,
    statusNegocio: negocio.status,
    tipoNegocio,
    sessao,
    servicoAtivo: Boolean(servico),
  });

  const padroes = defaultsComissao(negocio.tipo);
  const basePadrao =
    negocio.valor_acordado ?? negocio.imoveis?.valor_anuncio ?? 0;
  const exigeEscritura =
    negocio.tipo === "venda" &&
    negocio.valor_acordado != null &&
    negocio.valor_acordado > LIMITE_ESCRITURA;

  let contratoArquivoAssinado: string | null = null;
  if (contrato?.arquivo_url) {
    const { data } = await supabase.storage
      .from("documentos-negocio")
      .createSignedUrl(contrato.arquivo_url, 60 * 60);
    contratoArquivoAssinado = data?.signedUrl ?? null;
  }

  const linksPix = new Map<string, string>();
  await Promise.all(
    pixDocs.map(async (doc) => {
      const { data } = await supabase.storage
        .from("documentos-negocio")
        .createSignedUrl(doc.arquivo_url, 60 * 60);
      if (data?.signedUrl) linksPix.set(doc.id, data.signedUrl);
    }),
  );

  const statusPix = statusAgregado(pixDocs);
  const estado = estadoOperacional(contrato, statusPix, tipoNegocio);
  const usuarioId = sessao?.user.id ?? "";
  const assinavel =
    contrato != null &&
    ["gerado", "pendente_assinaturas"].includes(contrato.status);
  const compradores = participantesPorPapel(negocio.papeis_negocio, "comprador");
  const proprietarios = participantesPorPapel(
    negocio.papeis_negocio,
    "proprietario",
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link
          href={`/painel/negocios/${negocio.id}`}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft className="size-4" />
          Negocio
        </Link>
      </div>

      <div className="print:hidden">
        <h1 className="font-heading text-xl">
          Contrato, assinaturas e comprovante
        </h1>
        <p className="text-muted-foreground text-sm">
          {enderecoResumido(negocio.imoveis)}
        </p>
      </div>

      {(exigeEscritura || negocio.escritura_publica) && (
        <Card className="border-amber-500/40 ring-amber-500/30 print:hidden">
          <CardContent className="flex items-start gap-3 pt-0">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" />
            <div className="text-sm">
              <p className="font-medium">Escritura publica obrigatoria</p>
              <p className="text-muted-foreground">
                Venda acima de 30 salarios minimos ({formatBRL(LIMITE_ESCRITURA)},
                considerando SM = {formatBRL(SALARIO_MINIMO)}) exige escritura
                publica em cartorio. O contrato particular nao substitui a
                transferencia formal de propriedade.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {(servico || podeContratarServico) && (
        <div className="print:hidden">
          <ServicoJuridicoCard
            negocioId={negocio.id}
            imovelId={negocio.imovel_id}
            tipoNegocio={tipoNegocio}
            origem="contrato"
            servico={servico}
            podeContratar={podeContratarServico}
            podeAtualizarStatus={podeAtualizarServico}
          />
        </div>
      )}

      {contatoExterno?.mostrar && (
        <div className="print:hidden">
          <ContatoExternoCard estado={contatoExterno} />
        </div>
      )}

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Comissao</CardTitle>
          <CardDescription>
            Defaults conforme o tipo do negocio
            {negocio.tipo === "locacao"
              ? " (locacao: 1 aluguel)."
              : " (venda urbana: 6%)."}{" "}
            O split captador/vendedor deve somar 100%.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {comissao && (
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">
                Ultima comissao registrada:{" "}
              </span>
              <span className="font-medium tabular-nums">
                {formatBRL(comissao.valor)}
              </span>{" "}
              <span className="text-muted-foreground">
                ({comissao.percentual ?? "-"}% sobre{" "}
                {formatBRL(comissao.base_calculo)}; captador{" "}
                {comissao.split?.captador_pct ?? "-"}% / vendedor{" "}
                {comissao.split?.vendedor_pct ?? "-"}%;{" "}
                {formatDataHora(comissao.criado_em)})
              </span>
            </div>
          )}
          <ComissaoForm
            negocioId={negocio.id}
            percentualPadrao={comissao?.percentual ?? padroes.percentual}
            basePadrao={comissao?.base_calculo ?? basePadrao}
            pagadorPadrao={comissao?.pagador ?? padroes.pagador}
            captadorPadrao={comissao?.split?.captador_pct ?? 50}
            vendedorPadrao={comissao?.split?.vendedor_pct ?? 50}
          />
        </CardContent>
      </Card>

      <Card className="print:hidden">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardDescription>Esteira de contrato</CardDescription>
              <CardTitle>{estado.label}</CardTitle>
            </div>
            {contrato && (
              <Badge variant={CONTRATO_VARIANTS[contrato.status] ?? "secondary"}>
                {CONTRATO_ROTULOS[contrato.status] ?? contrato.status}
              </Badge>
            )}
          </div>
          <CardDescription>{estado.detalhe}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {!contrato ? (
            <div className="flex flex-col gap-3 rounded-lg border p-4">
              <p className="text-muted-foreground text-sm">
                Nenhum contrato foi gerado para este negocio.
              </p>
              {usuarioPodeOperar ? (
                <GerarContratoButton negocioId={negocio.id} />
              ) : (
                <p className="text-muted-foreground text-sm">
                  Aguarde proprietario, corretor ou admin gerar o contrato.
                </p>
              )}
            </div>
          ) : (
            <>
              <section className="grid gap-3 md:grid-cols-4">
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-xs">Versao</p>
                  <p className="text-sm font-medium">v{contrato.versao}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-xs">Gerado em</p>
                  <p className="text-sm">{formatDataHora(contrato.gerado_em)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-xs">Assinado em</p>
                  <p className="text-sm">{formatDataHora(contrato.assinado_em)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-xs">Revisao</p>
                  <p className="text-sm">{formatDataHora(contrato.revisado_em)}</p>
                </div>
              </section>

              {contrato.motivo_reprovacao && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
                  <p className="font-medium">Motivo da reprovacao</p>
                  <p className="text-muted-foreground">
                    {contrato.motivo_reprovacao}
                  </p>
                </div>
              )}

              <section className="flex flex-col gap-3 rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold">
                      Arquivo formal do contrato
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      Anexe PDF ou imagem do contrato assinado quando houver
                      documento externo. O arquivo fica privado.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ImprimirButton />
                    {usuarioPodeOperar && (
                      <GerarContratoButton negocioId={negocio.id} />
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {contratoArquivoAssinado ? (
                    <a
                      href={contratoArquivoAssinado}
                      target="_blank"
                      rel="noreferrer"
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                      })}
                    >
                      <FileText className="size-4" />
                      Abrir arquivo privado
                    </a>
                  ) : contrato.url_pdf ? (
                    <a
                      href={contrato.url_pdf}
                      target="_blank"
                      rel="noreferrer"
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                      })}
                    >
                      <FileText className="size-4" />
                      Abrir URL legado
                    </a>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Nenhum arquivo anexado.
                    </p>
                  )}
                </div>

                {usuarioPodeOperar && (
                  <UploadContratoArquivoForm
                    contratoId={contrato.id}
                    negocioId={negocio.id}
                    usuarioId={usuarioId}
                  />
                )}
              </section>

              <section className="flex flex-col gap-3 rounded-lg border p-4">
                <div>
                  <h2 className="text-sm font-semibold">
                    Assinaturas internas
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Cada parte assina o proprio papel. A auditoria guarda data,
                    usuario, versao, user-agent e hash do IP.
                  </p>
                </div>

                {(["comprador", "proprietario"] as const).map((papel) => {
                  const assinatura = assinaturaPorPapel(assinaturas, papel);
                  const pessoas =
                    papel === "comprador" ? compradores : proprietarios;
                  const possoAssinar =
                    assinavel &&
                    !assinatura &&
                    usuarioPodeAssinarPapel(
                      negocio.papeis_negocio,
                      sessao?.user.id,
                      papel,
                    );

                  return (
                    <div
                      key={papel}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted/40 p-3"
                    >
                      <div>
                        <p className="text-sm font-medium capitalize">
                          {rotuloPapelNegocio(papel, tipoNegocio)}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {assinatura
                            ? `Assinado por ${nomeParticipante(assinatura)} em ${formatDataHora(assinatura.assinado_em)}`
                            : pessoas.length > 0
                              ? pessoas.map(nomeParticipante).join(", ")
                              : "Nenhum participante ativo neste papel."}
                        </p>
                      </div>
                      {assinatura ? (
                        <Badge variant="default">
                          <CheckCircle2 className="size-3" />
                          Assinado
                        </Badge>
                      ) : possoAssinar ? (
                        <AssinarContratoButton
                          contratoId={contrato.id}
                          papel={papel}
                        />
                      ) : (
                        <Badge variant="outline">Pendente</Badge>
                      )}
                    </div>
                  );
                })}
              </section>

              {tipoNegocio === "venda" ? (
                <section className="flex flex-col gap-3 rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="flex items-center gap-2 text-sm font-semibold">
                        <Receipt className="size-4" />
                        Comprovante de sinal/Pix
                      </h2>
                      <p className="text-muted-foreground text-sm">
                        {pixItem?.descricao ??
                          "Anexe o comprovante de Pix ou transferencia quando houver sinal."}
                      </p>
                    </div>
                    <Badge variant={variantStatusDoc(statusPix)}>
                      {rotuloStatusDoc(statusPix)}
                    </Badge>
                  </div>

                  {pixItem && usuarioId ? (
                    <EnviarDocumentoItem
                      negocioId={negocio.id}
                      usuarioId={usuarioId}
                      checklistItemId={pixItem.id}
                    />
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Item de checklist nao disponivel para este tipo de negocio.
                    </p>
                  )}

                  {pixDocs.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {pixDocs.map((doc) => {
                        const link = linksPix.get(doc.id);
                        return (
                          <div
                            key={doc.id}
                            className="flex flex-wrap items-start justify-between gap-3 rounded-md bg-muted/40 p-3"
                          >
                            <div>
                              {link ? (
                                <a
                                  href={link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-primary text-sm underline underline-offset-2"
                                >
                                  Ver comprovante
                                </a>
                              ) : (
                                <p className="text-sm">Comprovante enviado</p>
                              )}
                              <p className="text-muted-foreground text-xs">
                                Enviado em {formatDataHora(doc.criado_em)}
                              </p>
                              {doc.motivo_reprovacao && (
                                <p className="text-destructive text-xs">
                                  {doc.motivo_reprovacao}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge variant={variantStatusDoc(doc.status)}>
                                {rotuloStatusDoc(doc.status)}
                              </Badge>
                              {podeRevisar && (
                                <StatusDocumentoButtons documentoId={doc.id} />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              ) : (
                <section className="flex flex-col gap-3 rounded-lg border p-4">
                  <div>
                    <h2 className="text-sm font-semibold">
                      Dados da locacao
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      Locacao nao exige comprovante de sinal/Pix nem etapa
                      cartorial nesta v1.
                    </p>
                  </div>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground text-xs">
                        Garantia
                      </dt>
                      <dd>{rotuloGarantiaLocacao(negocio.tipo_garantia)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground text-xs">Prazo</dt>
                      <dd>
                        {negocio.prazo_meses
                          ? `${negocio.prazo_meses} meses`
                          : "Nao informado"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground text-xs">
                        Reajuste
                      </dt>
                      <dd>{negocio.reajuste_indice || "Nao informado"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground text-xs">
                        Vencimento
                      </dt>
                      <dd>
                        {negocio.dia_vencimento
                          ? `Dia ${negocio.dia_vencimento}`
                          : "Nao informado"}
                      </dd>
                    </div>
                    {negocio.encargos && (
                      <div className="sm:col-span-2">
                        <dt className="text-muted-foreground text-xs">
                          Encargos
                        </dt>
                        <dd className="whitespace-pre-wrap">
                          {negocio.encargos}
                        </dd>
                      </div>
                    )}
                  </dl>
                </section>
              )}

              {contatoExterno?.mostrar && !servico && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                  <p className="font-medium">Evidencia sem servico Cade</p>
                  <p className="text-muted-foreground">
                    Neste caminho a plataforma armazena contrato, assinaturas e
                    comprovantes como evidencia operacional. A assessoria
                    juridica nao foi contratada neste fluxo.
                  </p>
                </div>
              )}

              {podeRevisar && (
                <section className="flex flex-col gap-3 rounded-lg border p-4">
                  <div>
                    <h2 className="text-sm font-semibold">
                      Revisao operacional
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      Admin ou corretor ativo pode validar ou reprovar o
                      contrato. A reprovacao exige motivo.
                    </p>
                  </div>
                  <RevisarContratoForm contratoId={contrato.id} />
                </section>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {contrato && (
        <section className="rounded-xl bg-card p-8 ring-1 ring-foreground/10 print:block print:p-0 print:ring-0">
          <header className="mb-6 border-b pb-4">
            <h2 className="font-heading text-2xl">
              {negocio.tipo === "locacao"
                ? "Contrato de Locacao"
                : "Contrato de Compra e Venda"}
            </h2>
            <p className="text-muted-foreground text-sm">
              Cade Imoveis - versao {contrato.versao} gerada em{" "}
              {formatDataHora(contrato.gerado_em)}
            </p>
          </header>

          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground text-xs">Imovel</dt>
              <dd>{enderecoResumido(negocio.imoveis)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Tipo de negocio</dt>
              <dd className="capitalize">{negocio.tipo ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">
                {negocio.tipo === "locacao"
                  ? "Valor do aluguel"
                  : "Valor acordado"}
              </dt>
              <dd className="tabular-nums">
                {formatBRL(negocio.valor_acordado)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">
                {tipoNegocio === "locacao" ? "Cartorial" : "Escritura publica"}
              </dt>
              <dd>
                {tipoNegocio === "locacao"
                  ? "Nao aplicavel"
                  : negocio.escritura_publica || exigeEscritura
                    ? "Obrigatoria em cartorio"
                    : "Nao obrigatoria"}
              </dd>
            </div>
            {tipoNegocio === "locacao" && (
              <>
                <div>
                  <dt className="text-muted-foreground text-xs">Garantia</dt>
                  <dd>{rotuloGarantiaLocacao(negocio.tipo_garantia)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Prazo</dt>
                  <dd>
                    {negocio.prazo_meses
                      ? `${negocio.prazo_meses} meses`
                      : "Nao informado"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Reajuste</dt>
                  <dd>{negocio.reajuste_indice || "Nao informado"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Vencimento</dt>
                  <dd>
                    {negocio.dia_vencimento
                      ? `Dia ${negocio.dia_vencimento}`
                      : "Nao informado"}
                  </dd>
                </div>
              </>
            )}
            {comissao && (
              <>
                <div>
                  <dt className="text-muted-foreground text-xs">Comissao</dt>
                  <dd className="tabular-nums">
                    {formatBRL(comissao.valor)} ({comissao.percentual ?? "-"}%)
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">
                    Pagador / split
                  </dt>
                  <dd className="capitalize">
                    {comissao.pagador} - captador{" "}
                    {comissao.split?.captador_pct ?? "-"}% / vendedor{" "}
                    {comissao.split?.vendedor_pct ?? "-"}%
                  </dd>
                </div>
              </>
            )}
          </dl>

          {tipoNegocio === "venda" && (negocio.escritura_publica || exigeEscritura) && (
            <p className="mt-6 rounded-lg bg-amber-500/10 px-3 py-2 text-sm">
              Atencao: por se tratar de venda acima de 30 salarios minimos
              ({formatBRL(LIMITE_ESCRITURA)}), a transferencia exige escritura
              publica lavrada em cartorio.
            </p>
          )}

          <div className="mt-12 grid gap-12 sm:grid-cols-2">
            <div className="border-t pt-2 text-center text-sm">
              {tipoNegocio === "locacao" ? "Locador" : "Vendedor"}
            </div>
            <div className="border-t pt-2 text-center text-sm">
              {tipoNegocio === "locacao" ? "Locatario" : "Comprador"}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
