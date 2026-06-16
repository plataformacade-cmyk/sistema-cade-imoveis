import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
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
import {
  formatBRL,
  rotuloStatus,
  variantStatus,
  enderecoResumido,
} from "./_lib";
import { AbrirNegocioDialog } from "./_components/abrir-negocio-dialog";
import { StatusSelect } from "./_components/status-select";

type ImovelEmbed = {
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
} | null;

type NegocioLinha = {
  id: string;
  status: string;
  valor_acordado: number | null;
  criado_em: string | null;
  imoveis: ImovelEmbed;
  papeis_negocio: { count: number }[];
};

export default async function NegociosPage() {
  const supabase = await createClient();

  const [negociosRes, imoveisRes] = await Promise.all([
    supabase
      .from("negocios")
      .select(
        "id, status, valor_acordado, criado_em, imoveis(logradouro, numero, bairro, cidade), papeis_negocio(count)",
      )
      .order("criado_em", { ascending: false }),
    supabase
      .from("imoveis")
      .select("id, logradouro, numero, bairro, cidade")
      .order("logradouro", { ascending: true }),
  ]);

  const negocios = (negociosRes.data ?? []) as unknown as NegocioLinha[];
  const imoveis = imoveisRes.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Negócios</h1>
          <p className="text-muted-foreground text-sm">
            Negociações entre proprietários, compradores e corretores.
          </p>
        </div>
        <AbrirNegocioDialog imoveis={imoveis} />
      </div>

      {negociosRes.error ? (
        <p className="text-destructive text-sm">
          Não foi possível carregar os negócios.
        </p>
      ) : negocios.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nenhum negócio aberto ainda.
        </p>
      ) : (
        <div className="rounded-xl ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imóvel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor acordado</TableHead>
                <TableHead className="text-right">Participantes</TableHead>
                <TableHead className="w-px" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {negocios.map((n) => {
                const participantes = n.papeis_negocio?.[0]?.count ?? 0;
                return (
                  <TableRow key={n.id}>
                    <TableCell className="max-w-xs whitespace-normal">
                      {enderecoResumido(n.imoveis)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={variantStatus(n.status)}>
                        {rotuloStatus(n.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBRL(n.valor_acordado)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {participantes}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <StatusSelect negocioId={n.id} status={n.status} />
                        <Link
                          href={`/painel/negocios/${n.id}`}
                          className={buttonVariants({
                            variant: "outline",
                            size: "sm",
                          })}
                        >
                          Ver
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
