import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
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
import { enderecoResumido } from "../../_lib";
import {
  checklistPara,
  rotuloGarantia,
  rotuloStatusDoc,
  rotuloTipoDoc,
  variantStatusDoc,
} from "./_lib";
import { EnviarDocumentoItem } from "./_components/enviar-documento-item";
import { StatusDocumentoButtons } from "./_components/status-documento-buttons";
import { GarantiaForm } from "./_components/garantia-form";

type Documento = {
  id: string;
  tipo_doc: string;
  arquivo_url: string;
  status: string;
  criado_em: string | null;
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
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return fmtDataHora.format(d);
}

export default async function DocumentosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const sessao = await getSessao();

  const [negocioRes, documentosRes] = await Promise.all([
    supabase
      .from("negocios")
      .select(
        "id, tipo, tipo_garantia, prazo_meses, imoveis(logradouro, numero, bairro, cidade), papeis_negocio(papel, ativo, usuario_id)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("documentos")
      .select("id, tipo_doc, arquivo_url, status, criado_em")
      .eq("negocio_id", id)
      .order("criado_em", { ascending: false }),
  ]);

  if (negocioRes.error) {
    return (
      <p className="text-destructive text-sm">
        Não foi possível carregar o negócio.
      </p>
    );
  }
  if (!negocioRes.data) notFound();

  const negocio = negocioRes.data as unknown as NegocioDoc;
  const documentos = (documentosRes.data ?? []) as unknown as Documento[];
  const ehLocacao = negocio.tipo === "locacao";
  const checklist = checklistPara(negocio.tipo);

  // Quem pode verificar/reprovar: admin ou corretor (ativo) deste negócio.
  const ehCorretorDoNegocio = (negocio.papeis_negocio ?? []).some(
    (p) =>
      p.ativo &&
      p.papel === "corretor" &&
      p.usuario_id === sessao?.user.id,
  );
  const podeVerificar = Boolean(sessao?.isAdmin) || ehCorretorDoNegocio;

  // Bucket é privado — gera signed URLs (1h) pra visualizar cada documento.
  const linksAssinados = new Map<string, string>();
  await Promise.all(
    documentos.map(async (d) => {
      const { data } = await supabase.storage
        .from("documentos-negocio")
        .createSignedUrl(d.arquivo_url, 60 * 60);
      if (data?.signedUrl) linksAssinados.set(d.id, data.signedUrl);
    }),
  );

  // Agrupa os documentos enviados por tipo (para mostrar no checklist).
  const porTipo = new Map<string, Documento[]>();
  for (const d of documentos) {
    const arr = porTipo.get(d.tipo_doc) ?? [];
    arr.push(d);
    porTipo.set(d.tipo_doc, arr);
  }

  const usuarioId = sessao?.user.id ?? "";

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/painel/negocios/${negocio.id}`}
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        <ArrowLeft className="size-4" />
        Voltar ao negócio
      </Link>

      <Card>
        <CardHeader>
          <CardDescription>Documentos · Due Diligence</CardDescription>
          <CardTitle className="text-xl">
            {enderecoResumido(negocio.imoveis)}
          </CardTitle>
          <CardDescription>
            {ehLocacao ? "Locação" : "Venda"} — documentos exigidos abaixo.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Checklist de documentos</CardTitle>
          <CardDescription>
            Envie cada documento. Admin/corretor verifica ou reprova.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {checklist.map((item) => {
            const enviados = porTipo.get(item.tipo) ?? [];
            return (
              <div
                key={item.tipo}
                className="flex flex-col gap-3 rounded-xl ring-1 ring-foreground/10 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="text-muted-foreground size-4" />
                    <span className="font-medium">{item.label}</span>
                    <Badge
                      variant={enviados.length ? "outline" : "secondary"}
                    >
                      {enviados.length
                        ? `${enviados.length} enviado(s)`
                        : "Pendente"}
                    </Badge>
                  </div>
                  <EnviarDocumentoItem
                    negocioId={negocio.id}
                    usuarioId={usuarioId}
                    tipoDoc={item.tipo}
                  />
                </div>

                {enviados.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Arquivo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Quando</TableHead>
                        {podeVerificar && (
                          <TableHead className="w-px text-right">
                            Ações
                          </TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {enviados.map((d) => {
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
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={variantStatusDoc(d.status)}>
                                {rotuloStatusDoc(d.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground tabular-nums text-xs">
                              {formatDataHora(d.criado_em)}
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
                )}
              </div>
            );
          })}

          {/* Documentos de tipos fora do checklist (ex.: tipo de negócio mudou). */}
          {documentos.filter(
            (d) => !checklist.some((i) => i.tipo === d.tipo_doc),
          ).length > 0 && (
            <div className="flex flex-col gap-2 border-t pt-4">
              <p className="text-muted-foreground text-sm">Outros documentos</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Status</TableHead>
                    {podeVerificar && (
                      <TableHead className="w-px text-right">Ações</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documentos
                    .filter(
                      (d) => !checklist.some((i) => i.tipo === d.tipo_doc),
                    )
                    .map((d) => {
                      const link = linksAssinados.get(d.id);
                      return (
                        <TableRow key={d.id}>
                          <TableCell>
                            {rotuloTipoDoc(d.tipo_doc, negocio.tipo)}
                          </TableCell>
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
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={variantStatusDoc(d.status)}>
                              {rotuloStatusDoc(d.status)}
                            </Badge>
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
            </div>
          )}
        </CardContent>
      </Card>

      {ehLocacao && (
        <Card>
          <CardHeader>
            <CardTitle>Garantia de locação</CardTitle>
            <CardDescription>
              Garantia é seleção única. Atual:{" "}
              <span className="font-medium">
                {rotuloGarantia(negocio.tipo_garantia)}
              </span>
              {negocio.prazo_meses ? ` · ${negocio.prazo_meses} meses` : ""}
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
