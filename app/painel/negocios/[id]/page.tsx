import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, FileSignature } from "lucide-react";
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

type ImovelEmbed = {
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
} | null;

type ParticipanteEmbed = {
  id: string;
  papel: string;
  ativo: boolean;
  criado_em: string | null;
  usuarios: { nome: string | null; email: string | null } | null;
};

type NegocioDetalhe = {
  id: string;
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
  const supabase = await createClient();

  const [negocioRes, usuariosRes] = await Promise.all([
    supabase
      .from("negocios")
      .select(
        "id, status, valor_acordado, criado_em, imoveis(logradouro, numero, bairro, cidade), papeis_negocio(id, papel, ativo, criado_em, usuarios(nome, email))",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("usuarios")
      .select("id, nome, email")
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
