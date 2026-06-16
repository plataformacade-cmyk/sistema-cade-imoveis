import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AlertTriangle } from "lucide-react";
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
import { MarcarAssinadoForm } from "./_components/marcar-assinado-form";
import { ImprimirButton } from "./_components/imprimir-button";

type ImovelEmbed = {
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  valor_anuncio: number | null;
} | null;

type NegocioContrato = {
  id: string;
  tipo: string | null;
  status: string;
  valor_acordado: number | null;
  escritura_publica: boolean;
  imoveis: ImovelEmbed;
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
  status: string;
  gerado_em: string | null;
  assinado_em: string | null;
  criado_em: string | null;
};

const CONTRATO_ROTULOS: Record<string, string> = {
  rascunho: "Rascunho",
  gerado: "Gerado",
  assinado: "Assinado",
};

const fmtDataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDataHora(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return fmtDataHora.format(d);
}

/**
 * Defaults de comissão por tipo de negócio (vindos da pesquisa):
 * - venda urbana: 6% sobre o valor acordado;
 * - locação: equivale a 1 aluguel → 100% sobre o valor acordado (o aluguel).
 */
function defaultsComissao(tipo: string | null): {
  percentual: number;
  pagador: string;
} {
  if (tipo === "locacao") return { percentual: 100, pagador: "proprietario" };
  return { percentual: 6, pagador: "proprietario" };
}

export default async function ContratoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [negocioRes, comissaoRes, contratoRes] = await Promise.all([
    supabase
      .from("negocios")
      .select(
        "id, tipo, status, valor_acordado, escritura_publica, imoveis(logradouro, numero, bairro, cidade, valor_anuncio)",
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
        "id, tipo, url_pdf, status, gerado_em, assinado_em, criado_em",
      )
      .eq("negocio_id", id)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (negocioRes.error) {
    return (
      <p className="text-destructive text-sm">
        Não foi possível carregar o negócio.
      </p>
    );
  }
  if (!negocioRes.data) notFound();

  const negocio = negocioRes.data as unknown as NegocioContrato;
  const comissao = (comissaoRes.data ?? null) as ComissaoLinha | null;
  const contrato = (contratoRes.data ?? null) as ContratoLinha | null;

  const padroes = defaultsComissao(negocio.tipo);
  // Base de cálculo padrão = valor acordado (ou, na falta, o valor de anúncio).
  const basePadrao =
    negocio.valor_acordado ?? negocio.imoveis?.valor_anuncio ?? 0;

  // Regra dos 30 SM: venda com valor > limite exige escritura pública.
  const exigeEscritura =
    negocio.tipo === "venda" &&
    negocio.valor_acordado != null &&
    negocio.valor_acordado > LIMITE_ESCRITURA;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link
          href={`/painel/negocios/${negocio.id}`}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft className="size-4" />
          Negócio
        </Link>
      </div>

      <div className="print:hidden">
        <h1 className="font-heading text-xl">Contrato e comissão</h1>
        <p className="text-muted-foreground text-sm">
          {enderecoResumido(negocio.imoveis)}
        </p>
      </div>

      {(exigeEscritura || negocio.escritura_publica) && (
        <Card className="border-amber-500/40 ring-amber-500/30 print:hidden">
          <CardContent className="flex items-start gap-3 pt-0">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" />
            <div className="text-sm">
              <p className="font-medium">Escritura pública obrigatória</p>
              <p className="text-muted-foreground">
                Venda acima de 30 salários mínimos ({formatBRL(LIMITE_ESCRITURA)},
                considerando SM = {formatBRL(SALARIO_MINIMO)}) exige escritura
                pública em cartório (Código Civil, art. 108). O instrumento
                particular não basta para a transferência de propriedade.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Seção Comissão */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Comissão</CardTitle>
          <CardDescription>
            Defaults conforme o tipo do negócio
            {negocio.tipo === "locacao"
              ? " (locação: 1 aluguel)."
              : " (venda urbana: 6%)."}{" "}
            O split captador/vendedor deve somar 100%.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {comissao && (
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">
                Última comissão registrada:{" "}
              </span>
              <span className="font-medium tabular-nums">
                {formatBRL(comissao.valor)}
              </span>{" "}
              <span className="text-muted-foreground">
                ({comissao.percentual ?? "—"}% sobre{" "}
                {formatBRL(comissao.base_calculo)} · captador{" "}
                {comissao.split?.captador_pct ?? "—"}% / vendedor{" "}
                {comissao.split?.vendedor_pct ?? "—"}% ·{" "}
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

      {/* Seção Contrato */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Contrato</CardTitle>
          <CardDescription>
            Gere o contrato, revise o resumo imprimível e marque como assinado.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!contrato ? (
            <>
              <p className="text-muted-foreground text-sm">
                Nenhum contrato gerado ainda.
              </p>
              <GerarContratoButton negocioId={negocio.id} />
            </>
          ) : (
            <>
              <dl className="grid gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground text-xs">Status</dt>
                  <dd>
                    <Badge
                      variant={
                        contrato.status === "assinado" ? "default" : "secondary"
                      }
                    >
                      {CONTRATO_ROTULOS[contrato.status] ?? contrato.status}
                    </Badge>
                  </dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground text-xs">Gerado em</dt>
                  <dd className="tabular-nums text-sm">
                    {formatDataHora(contrato.gerado_em)}
                  </dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground text-xs">Assinado em</dt>
                  <dd className="tabular-nums text-sm">
                    {formatDataHora(contrato.assinado_em)}
                  </dd>
                </div>
              </dl>

              {contrato.url_pdf && (
                <a
                  href={contrato.url_pdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({
                    variant: "outline",
                    size: "sm",
                    className: "w-fit",
                  })}
                >
                  Abrir PDF assinado
                </a>
              )}

              <div className="flex flex-wrap items-center gap-3 border-t pt-4">
                <ImprimirButton />
                {/* Permite regerar o contrato (reaplica a regra de escritura). */}
                <GerarContratoButton negocioId={negocio.id} />
              </div>

              {contrato.status !== "assinado" && (
                <div className="border-t pt-4">
                  <p className="mb-3 text-sm font-medium">
                    Confirmar assinatura
                  </p>
                  <MarcarAssinadoForm
                    contratoId={contrato.id}
                    negocioId={negocio.id}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Resumo imprimível — visível na tela quando há contrato, e o único
          bloco que aparece na impressão (window.print). */}
      {contrato && (
        <section className="rounded-xl bg-card p-8 ring-1 ring-foreground/10 print:block print:p-0 print:ring-0">
          <header className="mb-6 border-b pb-4">
            <h2 className="font-heading text-2xl">
              {negocio.tipo === "locacao"
                ? "Contrato de Locação"
                : "Contrato de Compra e Venda"}
            </h2>
            <p className="text-muted-foreground text-sm">
              Cadê Imóveis · documento gerado em{" "}
              {formatDataHora(contrato.gerado_em)}
            </p>
          </header>

          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground text-xs">Imóvel</dt>
              <dd>{enderecoResumido(negocio.imoveis)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Tipo de negócio</dt>
              <dd className="capitalize">{negocio.tipo ?? "—"}</dd>
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
              <dt className="text-muted-foreground text-xs">Escritura pública</dt>
              <dd>
                {negocio.escritura_publica || exigeEscritura
                  ? "Obrigatória (cartório)"
                  : "Não obrigatória"}
              </dd>
            </div>
            {comissao && (
              <>
                <div>
                  <dt className="text-muted-foreground text-xs">Comissão</dt>
                  <dd className="tabular-nums">
                    {formatBRL(comissao.valor)} ({comissao.percentual ?? "—"}%)
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">
                    Pagador / split
                  </dt>
                  <dd className="capitalize">
                    {comissao.pagador} · captador{" "}
                    {comissao.split?.captador_pct ?? "—"}% / vendedor{" "}
                    {comissao.split?.vendedor_pct ?? "—"}%
                  </dd>
                </div>
              </>
            )}
          </dl>

          {(negocio.escritura_publica || exigeEscritura) && (
            <p className="mt-6 rounded-lg bg-amber-500/10 px-3 py-2 text-sm">
              Atenção: por se tratar de venda acima de 30 salários mínimos
              ({formatBRL(LIMITE_ESCRITURA)}), a transferência exige escritura
              pública lavrada em cartório (Código Civil, art. 108).
            </p>
          )}

          <div className="mt-12 grid gap-12 sm:grid-cols-2">
            <div className="border-t pt-2 text-center text-sm">
              Vendedor / Locador
            </div>
            <div className="border-t pt-2 text-center text-sm">
              Comprador / Locatário
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
