import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  rotuloCanal,
  rotuloStatus,
  variantStatus,
  formatDataHora,
  enderecoResumido,
} from "./_lib";
import { AgendarVisitaDialog } from "./_components/agendar-visita-dialog";
import { StatusVisitaSelect } from "./_components/status-visita-select";

type ImovelEmbed = {
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
} | null;

type VisitaLinha = {
  id: string;
  negocio_id: string | null;
  status: string;
  canal: string;
  data_hora: string | null;
  imoveis: ImovelEmbed;
};

export default async function VisitasPage() {
  const supabase = await createClient();

  const [visitasRes, imoveisRes] = await Promise.all([
    supabase
      .from("visitas")
      .select(
        "id, negocio_id, status, canal, data_hora, imoveis(logradouro, numero, bairro, cidade)",
      )
      .order("data_hora", { ascending: false }),
    supabase
      .from("imoveis")
      .select("id, logradouro, numero, bairro, cidade")
      .order("logradouro", { ascending: true }),
  ]);

  const visitas = (visitasRes.data ?? []) as unknown as VisitaLinha[];
  const imoveis = imoveisRes.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Visitas</h1>
          <p className="text-muted-foreground text-sm">
            Agenda de visitas aos imóveis.
          </p>
        </div>
        <AgendarVisitaDialog imoveis={imoveis} />
      </div>

      {visitasRes.error ? (
        <p className="text-destructive text-sm">
          Não foi possível carregar as visitas.
        </p>
      ) : visitas.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <p className="text-muted-foreground text-sm">
            Nenhuma visita agendada ainda.
          </p>
        </div>
      ) : (
        <div className="rounded-xl ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imóvel</TableHead>
                <TableHead>Data / hora</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Negocio</TableHead>
                <TableHead className="w-px" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visitas.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="max-w-xs whitespace-normal">
                    {enderecoResumido(v.imoveis)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatDataHora(v.data_hora)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{rotuloCanal(v.canal)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={variantStatus(v.status)}>
                      {rotuloStatus(v.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {v.negocio_id ? (
                      <Link
                        href={`/painel/negocios/${v.negocio_id}`}
                        className={buttonVariants({
                          variant: "outline",
                          size: "sm",
                        })}
                      >
                        Abrir
                      </Link>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end">
                      <StatusVisitaSelect visitaId={v.id} status={v.status} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
