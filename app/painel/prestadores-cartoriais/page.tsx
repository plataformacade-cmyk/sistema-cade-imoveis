import Link from "next/link";
import { redirect } from "next/navigation";
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
import { getSessao } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  CadastroPrestadorCartorialForm,
  StatusPrestadorCartorialForm,
} from "./_components/prestadores-forms";

type Prestador = {
  id: string;
  usuario_id: string;
  tipo: string;
  nome_exibicao: string;
  documento: string | null;
  registro_profissional: string | null;
  empresa: string | null;
  telefone: string | null;
  email: string | null;
  cidades_atuacao: string[] | null;
  documentos_qualificacao: string | null;
  status: string;
  observacoes_admin: string | null;
  atualizado_em: string | null;
  usuarios?: {
    nome: string | null;
    email: string | null;
  } | null;
};

type Vinculo = {
  id: string;
  negocio_id: string;
  papel_operacional: string;
  status: string;
  criado_em: string | null;
  negocios?: {
    status: string;
    imoveis?: {
      bairro: string | null;
      cidade: string | null;
    } | null;
  } | null;
};

const statusBadge: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  pendente: { label: "Pendente", variant: "secondary" },
  aprovado: { label: "Aprovado", variant: "default" },
  reprovado: { label: "Reprovado", variant: "destructive" },
  suspenso: { label: "Suspenso", variant: "outline" },
};

const tipoLabel: Record<string, string> = {
  tabeliao: "Tabeliao",
  despachante: "Despachante",
  assinante_cartorial: "Assinante cartorial",
  agente_cartorial: "Agente cartorial",
  juridico: "Juridico",
  outro: "Outro",
};

const fmtData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function formatData(iso: string | null): string {
  if (!iso) return "-";
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "-";
  return fmtData.format(data);
}

function badge(status: string) {
  return statusBadge[status] ?? { label: status, variant: "outline" as const };
}

export default async function PrestadoresCartoriaisPage() {
  const sessao = await getSessao();
  if (!sessao) redirect("/login");

  const supabase = await createClient();

  if (sessao.isAdmin) {
    const { data, error } = await supabase
      .from("prestadores_cartoriais")
      .select(
        "id, usuario_id, tipo, nome_exibicao, documento, registro_profissional, empresa, telefone, email, cidades_atuacao, documentos_qualificacao, status, observacoes_admin, atualizado_em, usuarios(nome, email)",
      )
      .order("atualizado_em", { ascending: false });

    const prestadores = (data ?? []) as unknown as Prestador[];

    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Prestadores cartoriais</h1>
          <p className="text-muted-foreground text-sm">
            Aprove, suspenda e acompanhe tabeliaes, despachantes, assinantes e
            agentes que podem atuar nos fluxos cartoriais.
          </p>
        </div>

        {error ? (
          <Card>
            <CardHeader>
              <CardTitle>Nao foi possivel carregar prestadores</CardTitle>
              <CardDescription>Tente novamente em instantes.</CardDescription>
            </CardHeader>
          </Card>
        ) : prestadores.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Nenhum prestador cadastrado</CardTitle>
              <CardDescription>
                Prestadores enviados para revisao aparecerao aqui.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prestador</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Atualizado</TableHead>
                    <TableHead className="min-w-80">Revisao</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prestadores.map((prestador) => {
                    const b = badge(prestador.status);
                    return (
                      <TableRow key={prestador.id}>
                        <TableCell>
                          <p className="font-medium">
                            {prestador.nome_exibicao}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {prestador.empresa ?? "Sem empresa"} |{" "}
                            {prestador.registro_profissional ?? "sem registro"}
                          </p>
                          {prestador.documentos_qualificacao && (
                            <p className="text-muted-foreground mt-1 max-w-sm text-xs">
                              {prestador.documentos_qualificacao}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>{tipoLabel[prestador.tipo] ?? prestador.tipo}</TableCell>
                        <TableCell>
                          <p className="text-sm">{prestador.email ?? "-"}</p>
                          <p className="text-muted-foreground text-xs">
                            {prestador.telefone ?? "-"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={b.variant}>{b.label}</Badge>
                        </TableCell>
                        <TableCell>{formatData(prestador.atualizado_em)}</TableCell>
                        <TableCell>
                          <StatusPrestadorCartorialForm prestador={prestador} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  const [{ data: prestadorData }, { data: vinculosData }] = await Promise.all([
    supabase
      .from("prestadores_cartoriais")
      .select(
        "id, usuario_id, tipo, nome_exibicao, documento, registro_profissional, empresa, telefone, email, cidades_atuacao, documentos_qualificacao, status, observacoes_admin, atualizado_em",
      )
      .eq("usuario_id", sessao.user.id)
      .maybeSingle(),
    supabase
      .from("negocio_cartorial_prestadores")
      .select(
        "id, negocio_id, papel_operacional, status, criado_em, negocios(status, imoveis(bairro, cidade))",
      )
      .order("criado_em", { ascending: false }),
  ]);

  const prestador = (prestadorData ?? null) as Prestador | null;
  const vinculos = (vinculosData ?? []) as unknown as Vinculo[];
  const b = prestador ? badge(prestador.status) : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Cadastro de prestador</h1>
        <p className="text-muted-foreground text-sm">
          Envie seus dados para revisao. Depois de aprovado, voce so acessa
          fluxos cartoriais aos quais for vinculado.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            Dados do prestador
            {b && <Badge variant={b.variant}>{b.label}</Badge>}
          </CardTitle>
          {prestador?.observacoes_admin && (
            <CardDescription>{prestador.observacoes_admin}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <CadastroPrestadorCartorialForm
            prestador={prestador}
            emailPadrao={sessao.user.email}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fluxos atribuídos</CardTitle>
          <CardDescription>
            Acesso operacional liberado apenas para cartoriais vinculados por
            um admin ou corretor ativo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {vinculos.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhum fluxo cartorial atribuido.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {vinculos.map((vinculo) => (
                <Link
                  key={vinculo.id}
                  href={`/painel/negocios/${vinculo.negocio_id}/cartorial`}
                  className="rounded-lg border p-4 transition-colors hover:bg-muted/40"
                >
                  <p className="text-sm font-semibold">
                    {vinculo.negocios?.imoveis?.bairro ?? "Imovel"} |{" "}
                    {vinculo.negocios?.imoveis?.cidade ?? "Cidade"}
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {tipoLabel[vinculo.papel_operacional] ??
                      vinculo.papel_operacional}{" "}
                    - {vinculo.status}
                  </p>
                  <p className="text-muted-foreground mt-2 text-xs">
                    Atribuido em {formatData(vinculo.criado_em)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
