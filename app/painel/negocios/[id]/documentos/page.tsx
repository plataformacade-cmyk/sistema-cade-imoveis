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
import { EnviarDocumentoItem } from "./_components/enviar-documento-item";
import { GarantiaForm } from "./_components/garantia-form";
import { StatusDocumentoButtons } from "./_components/status-documento-buttons";
import {
  type ChecklistItem,
  type PerfilChecklist,
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
};

type ParticipanteEmbed = {
  papel: string;
  ativo: boolean;
  usuario_id: string;
};

type NegocioDoc = {
  id: string;
  tipo: string | null;
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

function documentosSemChecklist(documentos: Documento[]): Documento[] {
  return documentos.filter((d) => !d.checklist_item_id);
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
      "id, tipo, tipo_garantia, prazo_meses, imoveis(logradouro, numero, bairro, cidade), papeis_negocio(papel, ativo, usuario_id)",
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
  const tipoNegocio = negocio.tipo ?? "venda";
  const [documentosRes, checklistRes] = await Promise.all([
    supabase
      .from("documentos")
      .select(
        "id, checklist_item_id, tipo_doc, perfil, arquivo_url, status, motivo_reprovacao, criado_em, revisado_em",
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
  ]);

  if (documentosRes.error || checklistRes.error) {
    return (
      <p className="text-destructive text-sm">
        Nao foi possivel carregar os documentos.
      </p>
    );
  }

  const documentos = (documentosRes.data ?? []) as unknown as Documento[];
  const checklist = (checklistRes.data ?? []) as unknown as ChecklistItem[];
  const ehLocacao = tipoNegocio === "locacao";

  const ehCorretorDoNegocio = (negocio.papeis_negocio ?? []).some(
    (p) =>
      p.ativo &&
      p.papel === "corretor" &&
      p.usuario_id === sessao?.user.id,
  );
  const podeVerificar = Boolean(sessao?.isAdmin) || ehCorretorDoNegocio;

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
            {ehLocacao ? "Locacao" : "Venda"} - checklist por comprador,
            vendedor, imovel e contrato.
          </CardDescription>
        </CardHeader>
      </Card>

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
            const itens = checklist.filter((i) => i.perfil === perfil);
            if (itens.length === 0) return null;

            return (
              <section key={perfil} className="flex flex-col gap-4">
                <div>
                  <h2 className="text-base font-semibold">
                    {PERFIL_CHECKLIST_LABEL[perfil]}
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
