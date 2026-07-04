import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
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
import { enderecoResumido } from "../../_lib";
import { ServicoJuridicoCard } from "../../_components/servico-juridico-card";
import { ContatoExternoCard } from "../../_components/contato-externo-card";
import { carregarEstadoContatoExterno } from "@/lib/contato-externo-server";
import { EnviarDocumentoItem } from "./_components/enviar-documento-item";
import {
  CadastrarEmpresaVendedorForm,
  DeclaracaoEmpresaForm,
  DesvincularEmpresaButton,
} from "./_components/empresas-vendedor-forms";
import { GarantiaForm } from "./_components/garantia-form";
import { StatusDocumentoButtons } from "./_components/status-documento-buttons";
import {
  type ChecklistItem,
  type PerfilChecklist,
  ehCertidaoEmpresa,
  formatarCnpj,
  PERFIL_CHECKLIST_LABEL,
  PERFIL_CHECKLIST_ORDEM,
  rotuloGarantia,
  rotuloStatusDoc,
  rotuloTipoDoc,
  statusAgregado,
  variantStatusDoc,
} from "./_lib";

type Documento = {
  id: string;
  checklist_item_id: string | null;
  tipo_doc: string;
  perfil: PerfilChecklist | null;
  arquivo_url: string;
  status: string;
  motivo_reprovacao: string | null;
  criado_em: string | null;
  revisado_em: string | null;
  vendedor_empresa_id: string | null;
};

type ParticipanteEmbed = {
  papel: string;
  ativo: boolean;
  usuario_id: string;
  usuarios?: {
    nome: string | null;
    email: string | null;
  } | null;
};

type NegocioDoc = {
  id: string;
  imovel_id: string | null;
  tipo: string | null;
  status: string;
  tipo_garantia: string | null;
  prazo_meses: number | null;
  imoveis: {
    logradouro: string | null;
    numero: string | null;
    bairro: string | null;
    cidade: string | null;
  } | null;
  papeis_negocio: ParticipanteEmbed[];
};

type DeclaracaoEmpresa = {
  vendedor_id: string;
  possui_empresa: boolean;
  declarado_em: string | null;
};

type EmpresaVendedor = {
  id: string;
  usuario_id: string;
  cnpj: string;
  razao_social: string | null;
  nome_fantasia: string | null;
};

type VinculoEmpresa = {
  id: string;
  vendedor_id: string;
  vendedor_empresa_id: string;
  ativo: boolean;
  vendedor_empresas: EmpresaVendedor | EmpresaVendedor[] | null;
};

const fmtDataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDataHora(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return fmtDataHora.format(d);
}

function documentosDoItem(
  documentos: Documento[],
  item: ChecklistItem,
): Documento[] {
  return documentos.filter((d) => d.checklist_item_id === item.id);
}

function documentosDaEmpresa(
  documentos: Documento[],
  item: ChecklistItem,
  empresaId: string,
): Documento[] {
  return documentos.filter(
    (d) =>
      d.checklist_item_id === item.id && d.vendedor_empresa_id === empresaId,
  );
}

function documentosSemChecklist(documentos: Documento[]): Documento[] {
  return documentos.filter((d) => !d.checklist_item_id);
}

function empresaDoVinculo(vinculo: VinculoEmpresa): EmpresaVendedor | null {
  if (Array.isArray(vinculo.vendedor_empresas)) {
    return vinculo.vendedor_empresas[0] ?? null;
  }
  return vinculo.vendedor_empresas ?? null;
}

function renderTabelaDocumentos({
  documentos,
  linksAssinados,
  podeVerificar,
  checklist,
}: {
  documentos: Documento[];
  linksAssinados: Map<string, string>;
  podeVerificar: boolean;
  checklist: ChecklistItem[];
}) {
  if (documentos.length === 0) return null;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Arquivo</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Quando</TableHead>
          <TableHead>Revisao</TableHead>
          {podeVerificar && (
            <TableHead className="w-px text-right">Acoes</TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {documentos.map((d) => {
          const link = linksAssinados.get(d.id);
          return (
            <TableRow key={d.id}>
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
              </TableCell>
              <TableCell>
                <Badge variant={variantStatusDoc(d.status)}>
                  {rotuloStatusDoc(d.status)}
                </Badge>
                {!d.checklist_item_id && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    {rotuloTipoDoc(d.tipo_doc, checklist)}
                  </p>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums text-xs">
                {formatDataHora(d.criado_em)}
              </TableCell>
              <TableCell className="max-w-xs text-xs">
                {d.motivo_reprovacao ? (
                  <span className="text-destructive">
                    {d.motivo_reprovacao}
                  </span>
                ) : d.revisado_em ? (
                  <span className="text-muted-foreground">
                    {formatDataHora(d.revisado_em)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              {podeVerificar && (
                <TableCell>
                  <StatusDocumentoButtons documentoId={d.id} />
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default async function DocumentosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const sessao = await getSessao();

  const { data: negocioData, error: negocioError } = await supabase
    .from("negocios")
    .select(
      "id, imovel_id, tipo, status, tipo_garantia, prazo_meses, imoveis(logradouro, numero, bairro, cidade), papeis_negocio(papel, ativo, usuario_id, usuarios(nome, email))",
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

  const negocio = negocioData as unknown as NegocioDoc;
  const tipoNegocio = negocio.tipo === "locacao" ? "locacao" : "venda";
  const [
    documentosRes,
    checklistRes,
    declaracoesRes,
    empresasRes,
    servicosRes,
  ] =
    await Promise.all([
      supabase
        .from("documentos")
        .select(
          "id, checklist_item_id, tipo_doc, perfil, arquivo_url, status, motivo_reprovacao, criado_em, revisado_em, vendedor_empresa_id",
        )
        .eq("negocio_id", id)
        .order("criado_em", { ascending: false }),
      supabase
        .from("documentos_checklist_itens")
        .select(
          "id, tipo_negocio, perfil, codigo, titulo, descricao, obrigatorio, etapa, ordem",
        )
        .eq("ativo", true)
        .in("tipo_negocio", [tipoNegocio, "ambos"])
        .order("perfil", { ascending: true })
        .order("ordem", { ascending: true }),
      supabase
        .from("negocio_vendedor_declaracoes")
        .select("vendedor_id, possui_empresa, declarado_em")
        .eq("negocio_id", id),
      supabase
        .from("negocio_vendedor_empresas")
        .select(
          "id, vendedor_id, vendedor_empresa_id, ativo, vendedor_empresas(id, usuario_id, cnpj, razao_social, nome_fantasia)",
        )
        .eq("negocio_id", id)
        .eq("ativo", true),
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

  if (
    documentosRes.error ||
    checklistRes.error ||
    declaracoesRes.error ||
    empresasRes.error ||
    servicosRes.error
  ) {
    return (
      <p className="text-destructive text-sm">
        Nao foi possivel carregar os documentos.
      </p>
    );
  }

  const documentos = (documentosRes.data ?? []) as unknown as Documento[];
  const checklist = (checklistRes.data ?? []) as unknown as ChecklistItem[];
  const declaracoes = (declaracoesRes.data ??
    []) as unknown as DeclaracaoEmpresa[];
  const vinculosEmpresa = (empresasRes.data ?? []) as unknown as VinculoEmpresa[];
  const servicos = servicosRes.data ?? [];
  const servico =
    servicos.find((item) => item.negocio_id === negocio.id) ??
    servicos[0] ??
    null;
  const ehLocacao = tipoNegocio === "locacao";
  const perfilLabel = {
    ...PERFIL_CHECKLIST_LABEL,
    comprador: ehLocacao ? "Locatario" : PERFIL_CHECKLIST_LABEL.comprador,
    vendedor: ehLocacao ? "Locador" : PERFIL_CHECKLIST_LABEL.vendedor,
  };

  const papeisUsuarioAtivos = (negocio.papeis_negocio ?? []).filter(
    (p) => p.ativo && p.usuario_id === sessao?.user.id,
  );
  const ehCorretorDoNegocio = (negocio.papeis_negocio ?? []).some(
    (p) =>
      p.ativo &&
      p.papel === "corretor" &&
      p.usuario_id === sessao?.user.id,
  );
  const podeVerificar = Boolean(sessao?.isAdmin) || ehCorretorDoNegocio;
  const usuarioPodeOperar =
    Boolean(sessao?.isAdmin) ||
    papeisUsuarioAtivos.some((p) =>
      ["proprietario", "corretor", "admin"].includes(p.papel),
    );
  const podeContratarServico =
    usuarioPodeOperar &&
    ["documentos", "contrato", "cartorial"].includes(negocio.status);
  const podeAtualizarServico =
    Boolean(sessao?.isAdmin) ||
    papeisUsuarioAtivos.some((p) => ["corretor", "admin"].includes(p.papel));
  const contatoExterno = await carregarEstadoContatoExterno({
    negocioId: negocio.id,
    statusNegocio: negocio.status,
    tipoNegocio,
    sessao,
    servicoAtivo: Boolean(servico),
  });

  const linksAssinados = new Map<string, string>();
  await Promise.all(
    documentos.map(async (d) => {
      const { data } = await supabase.storage
        .from("documentos-negocio")
        .createSignedUrl(d.arquivo_url, 60 * 60);
      if (data?.signedUrl) linksAssinados.set(d.id, data.signedUrl);
    }),
  );

  const usuarioId = sessao?.user.id ?? "";
  const outrosDocumentos = documentosSemChecklist(documentos);
  const vendedores = (negocio.papeis_negocio ?? []).filter(
    (p) => p.ativo && p.papel === "proprietario",
  );
  const declaracaoPorVendedor = new Map(
    declaracoes.map((d) => [d.vendedor_id, d]),
  );
  const empresasPorVendedor = new Map<string, VinculoEmpresa[]>();
  for (const vinculo of vinculosEmpresa) {
    const lista = empresasPorVendedor.get(vinculo.vendedor_id) ?? [];
    lista.push(vinculo);
    empresasPorVendedor.set(vinculo.vendedor_id, lista);
  }
  const certidoesEmpresa = checklist.filter(ehCertidaoEmpresa);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/painel/negocios/${negocio.id}`}
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        <ArrowLeft className="size-4" />
        Voltar ao negocio
      </Link>

      <Card>
        <CardHeader>
          <CardDescription>Documentos - Due diligence</CardDescription>
          <CardTitle className="text-xl">
            {enderecoResumido(negocio.imoveis)}
          </CardTitle>
          <CardDescription>
            {ehLocacao ? "Locacao" : "Venda"} - checklist por{" "}
            {ehLocacao ? "locatario, locador" : "comprador, vendedor"}, imovel
            e contrato.
          </CardDescription>
        </CardHeader>
      </Card>

      {(servico || podeContratarServico) && (
        <ServicoJuridicoCard
          negocioId={negocio.id}
          imovelId={negocio.imovel_id}
          tipoNegocio={tipoNegocio}
          origem="documentos"
          servico={servico}
          podeContratar={podeContratarServico}
          podeAtualizarStatus={podeAtualizarServico}
        />
      )}

      {contatoExterno?.mostrar && (
        <ContatoExternoCard estado={contatoExterno} />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Checklist de documentos</CardTitle>
          <CardDescription>
            Itens obrigatorios e opcionais ficam separados por perfil. Admin ou
            corretor revisa documentos recebidos.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-8">
          {PERFIL_CHECKLIST_ORDEM.map((perfil) => {
            const itens = checklist.filter(
              (i) => i.perfil === perfil && !ehCertidaoEmpresa(i),
            );
            const mostraEmpresas =
              perfil === "vendedor" &&
              !ehLocacao &&
              certidoesEmpresa.length > 0;
            if (itens.length === 0 && !mostraEmpresas) return null;

            return (
              <section key={perfil} className="flex flex-col gap-4">
                <div>
                  <h2 className="text-base font-semibold">
                    {perfilLabel[perfil]}
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {itens.length} item(ns) para este perfil.
                  </p>
                </div>

                {itens.map((item) => {
                  const enviados = documentosDoItem(documentos, item);
                  const status = statusAgregado(enviados);

                  return (
                    <div
                      key={item.id}
                      className="flex flex-col gap-3 rounded-lg p-4 ring-1 ring-foreground/10"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <FileText className="text-muted-foreground size-4" />
                            <span className="font-medium">{item.titulo}</span>
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

                        <EnviarDocumentoItem
                          negocioId={negocio.id}
                          usuarioId={usuarioId}
                          checklistItemId={item.id}
                        />
                      </div>

                      {renderTabelaDocumentos({
                        documentos: enviados,
                        linksAssinados,
                        podeVerificar,
                        checklist,
                      })}
                    </div>
                  );
                })}

                {mostraEmpresas && (
                  <div className="flex flex-col gap-4 rounded-lg p-4 ring-1 ring-foreground/10">
                    <div>
                      <h3 className="text-sm font-semibold">
                        Empresas do vendedor
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        Informe se o vendedor possui empresa aberta e anexe as
                        certidoes obrigatorias por CNPJ.
                      </p>
                    </div>

                    {vendedores.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        Nenhum vendedor ativo vinculado a este negocio.
                      </p>
                    ) : (
                      vendedores.map((vendedor) => {
                        const declaracao = declaracaoPorVendedor.get(
                          vendedor.usuario_id,
                        );
                        const vinculos =
                          empresasPorVendedor.get(vendedor.usuario_id) ?? [];
                        const podeEditarVendedor =
                          Boolean(sessao?.isAdmin) ||
                          ehCorretorDoNegocio ||
                          vendedor.usuario_id === usuarioId;
                        const estadoDeclaracao = declaracao
                          ? declaracao.possui_empresa
                            ? "Com empresa declarada"
                            : "Declarou nao possuir empresa"
                          : "Nao informado";
                        const nomeVendedor =
                          vendedor.usuarios?.nome ??
                          vendedor.usuarios?.email ??
                          "Vendedor";

                        return (
                          <div
                            key={vendedor.usuario_id}
                            className="flex flex-col gap-4 border-t pt-4 first:border-t-0 first:pt-0"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="font-medium">{nomeVendedor}</p>
                                <p className="text-muted-foreground text-xs">
                                  Estado: {estadoDeclaracao}
                                </p>
                              </div>
                              {podeEditarVendedor && (
                                <DeclaracaoEmpresaForm
                                  negocioId={negocio.id}
                                  vendedorId={vendedor.usuario_id}
                                />
                              )}
                            </div>

                            {podeEditarVendedor && (
                              <CadastrarEmpresaVendedorForm
                                negocioId={negocio.id}
                                vendedorId={vendedor.usuario_id}
                              />
                            )}

                            {vinculos.length === 0 ? (
                              <p className="text-muted-foreground text-sm">
                                Nenhum CNPJ vinculado para este vendedor.
                              </p>
                            ) : (
                              vinculos.map((vinculo) => {
                                const empresa = empresaDoVinculo(vinculo);
                                if (!empresa) return null;

                                return (
                                  <div
                                    key={vinculo.id}
                                    className="flex flex-col gap-4 rounded-md border p-3"
                                  >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                      <div>
                                        <p className="font-medium">
                                          {formatarCnpj(empresa.cnpj)}
                                        </p>
                                        <p className="text-muted-foreground text-sm">
                                          {empresa.razao_social ??
                                            empresa.nome_fantasia ??
                                            "Razao social nao informada"}
                                        </p>
                                      </div>
                                      {podeEditarVendedor && (
                                        <DesvincularEmpresaButton
                                          negocioId={negocio.id}
                                          vendedorId={vendedor.usuario_id}
                                          vinculoId={vinculo.id}
                                        />
                                      )}
                                    </div>

                                    {certidoesEmpresa.map((item) => {
                                      const enviados = documentosDaEmpresa(
                                        documentos,
                                        item,
                                        empresa.id,
                                      );
                                      const status = statusAgregado(enviados);

                                      return (
                                        <div
                                          key={`${empresa.id}-${item.id}`}
                                          className="flex flex-col gap-3 rounded-md bg-muted/30 p-3"
                                        >
                                          <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                              <div className="flex flex-wrap items-center gap-2">
                                                <FileText className="text-muted-foreground size-4" />
                                                <span className="font-medium">
                                                  {item.titulo}
                                                </span>
                                                <Badge
                                                  variant={variantStatusDoc(
                                                    status,
                                                  )}
                                                >
                                                  {rotuloStatusDoc(status)}
                                                </Badge>
                                                <Badge variant="secondary">
                                                  Obrigatorio
                                                </Badge>
                                              </div>
                                              {item.descricao && (
                                                <p className="text-muted-foreground mt-1 text-sm">
                                                  {item.descricao}
                                                </p>
                                              )}
                                            </div>

                                            {podeEditarVendedor && (
                                              <EnviarDocumentoItem
                                                negocioId={negocio.id}
                                                usuarioId={usuarioId}
                                                checklistItemId={item.id}
                                                vendedorEmpresaId={empresa.id}
                                              />
                                            )}
                                          </div>

                                          {renderTabelaDocumentos({
                                            documentos: enviados,
                                            linksAssinados,
                                            podeVerificar,
                                            checklist,
                                          })}
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </section>
            );
          })}

          {outrosDocumentos.length > 0 && (
            <section className="flex flex-col gap-3 border-t pt-4">
              <div>
                <h2 className="text-base font-semibold">Outros documentos</h2>
                <p className="text-muted-foreground text-sm">
                  Documentos antigos ou fora do checklist versionado.
                </p>
              </div>
              {renderTabelaDocumentos({
                documentos: outrosDocumentos,
                linksAssinados,
                podeVerificar,
                checklist,
              })}
            </section>
          )}
        </CardContent>
      </Card>

      {ehLocacao && (
        <Card>
          <CardHeader>
            <CardTitle>Garantia de locacao</CardTitle>
            <CardDescription>
              Garantia e selecao unica. Atual:{" "}
              <span className="font-medium">
                {rotuloGarantia(negocio.tipo_garantia)}
              </span>
              {negocio.prazo_meses ? ` - ${negocio.prazo_meses} meses` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GarantiaForm
              negocioId={negocio.id}
              tipoGarantia={negocio.tipo_garantia}
              prazoMeses={negocio.prazo_meses}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
