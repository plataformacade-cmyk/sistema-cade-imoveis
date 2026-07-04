import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { arquivarImovel } from "@/actions/imoveis";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { buscarMetricasEngajamentoImoveis } from "@/lib/engajamento/imoveis";
import { EngajamentoResumoTabela } from "./_components/engajamento-imovel";
import {
  rotuloTipoNegocio,
  rotuloValorAnuncio,
  sufixoValorAnuncio,
} from "@/lib/negocios/tipo";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Archive } from "lucide-react";

type Imovel = {
  id: string;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  tipo: string | null;
  tipo_negocio: string | null;
  valor_anuncio: number | null;
  status: string;
};

const TIPO_LABEL: Record<string, string> = {
  casa: "Casa",
  apartamento: "Apartamento",
  comercial: "Comercial",
  terreno: "Terreno",
};

const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  ativo: "Ativo",
  em_negociacao: "Em negociação",
  vendido: "Vendido",
  arquivado: "Arquivado",
};

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  rascunho: "outline",
  ativo: "default",
  em_negociacao: "secondary",
  vendido: "secondary",
  arquivado: "destructive",
};

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function endereco(i: Imovel) {
  const linha1 = [i.logradouro, i.numero].filter(Boolean).join(", ");
  const linha2 = [i.bairro, i.cidade && i.uf ? `${i.cidade}/${i.uf}` : i.cidade]
    .filter(Boolean)
    .join(" · ");
  return { linha1: linha1 || "Sem endereço", linha2 };
}

export default async function ImoveisPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("imoveis")
    .select(
      "id, logradouro, numero, bairro, cidade, uf, tipo, tipo_negocio, valor_anuncio, status",
    )
    .order("criado_em", { ascending: false });

  const imoveis = (data ?? []) as Imovel[];
  const metricas = await buscarMetricasEngajamentoImoveis(
    imoveis.map((imovel) => imovel.id),
    30,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Imóveis</h1>
          <p className="text-muted-foreground text-sm">
            Cadastro e gestão dos imóveis.
          </p>
        </div>
        <Link
          href="/painel/imoveis/novo"
          className={buttonVariants()}
        >
          <Plus className="mr-1.5 size-4" />
          Novo imóvel
        </Link>
      </div>

      {imoveis.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <p className="text-muted-foreground text-sm">
            Nenhum imóvel cadastrado ainda.
          </p>
          <Link href="/painel/imoveis/novo" className={buttonVariants()}>
            <Plus className="mr-1.5 size-4" />
            Cadastrar o primeiro
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Endereço</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Operacao</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Engajamento</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {imoveis.map((i) => {
                const e = endereco(i);
                return (
                  <TableRow key={i.id}>
                    <TableCell>
                      <div className="font-medium">{e.linha1}</div>
                      {e.linha2 && (
                        <div className="text-muted-foreground text-xs">
                          {e.linha2}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {i.tipo ? (
                        <Badge variant="outline">
                          {TIPO_LABEL[i.tipo] ?? i.tipo}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {rotuloTipoNegocio(i.tipo_negocio)}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {i.valor_anuncio != null
                        ? `${moeda.format(i.valor_anuncio)}${sufixoValorAnuncio(i.tipo_negocio)}`
                        : "—"}
                      <div className="text-muted-foreground text-xs">
                        {rotuloValorAnuncio(i.tipo_negocio)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[i.status] ?? "outline"}>
                        {STATUS_LABEL[i.status] ?? i.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <EngajamentoResumoTabela metrica={metricas.get(i.id)!} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/painel/imoveis/${i.id}`}
                          className={buttonVariants({
                            variant: "ghost",
                            size: "icon-sm",
                          })}
                          aria-label="Editar"
                          title="Editar"
                        >
                          <Pencil className="size-4" />
                        </Link>
                        {i.status !== "arquivado" && (
                          <form action={arquivarImovel}>
                            <input type="hidden" name="id" value={i.id} />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Arquivar"
                              title="Arquivar"
                            >
                              <Archive className="size-4" />
                            </Button>
                          </form>
                        )}
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
