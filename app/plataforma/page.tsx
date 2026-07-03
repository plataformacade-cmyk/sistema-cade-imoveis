import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImovelCard, type ImovelCardData } from "@/components/publico/imovel-card";
import { Reveal } from "@/components/publico/reveal";
import { Search, SlidersHorizontal, Home } from "lucide-react";
import { buscarImoveisPublicos } from "@/lib/imoveis/privacidade-endereco";

const TIPO_LABEL: Record<string, string> = {
  casa: "Casa",
  apartamento: "Apartamento",
  comercial: "Comercial",
  terreno: "Terreno",
};

const TIPOS = ["casa", "apartamento", "comercial", "terreno"] as const;

/** Texto limpo ou undefined. */
function txt(v: string | undefined): string | undefined {
  const s = (v ?? "").trim();
  return s === "" ? undefined : s;
}

/** Número finito ou undefined. */
function num(v: string | undefined): number | undefined {
  const s = (v ?? "").trim();
  if (s === "") return undefined;
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

type Params = {
  q?: string;
  tipo?: string;
  bairro?: string;
  quartos?: string;
  valor_min?: string;
  valor_max?: string;
};

const campoSelect =
  "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";
const campoInput =
  "h-10 rounded-xl border-input bg-background text-sm shadow-none focus-visible:ring-[3px]";

export default async function VitrinePage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const sp = await searchParams;
  const q = txt(sp.q);
  const tipo = txt(sp.tipo);
  const bairro = txt(sp.bairro);
  const quartosMin = num(sp.quartos);
  const valorMin = num(sp.valor_min);
  const valorMax = num(sp.valor_max);

  const imoveis = (await buscarImoveisPublicos({
    q,
    tipo: tipo && (TIPOS as readonly string[]).includes(tipo) ? tipo : undefined,
    bairro,
    quartosMin,
    valorMin,
    valorMax,
    limit: 60,
  })) as ImovelCardData[];

  const temFiltro =
    !!q ||
    !!tipo ||
    !!bairro ||
    quartosMin != null ||
    valorMin != null ||
    valorMax != null;

  const total = imoveis.length;
  const contagem =
    total === 0
      ? "Nenhum imóvel"
      : `${total} ${total === 1 ? "imóvel encontrado" : "imóveis encontrados"}`;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 md:py-12">
      {/* Cabeçalho */}
      <Reveal>
        <header className="flex flex-col gap-2">
          <p className="text-sm font-medium text-primary">Marketplace</p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Imóveis à venda em Uberlândia
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            Encontre seu próximo lar com fotos reais, filtros precisos e contato
            direto com o anunciante.
          </p>
        </header>
      </Reveal>

      {/* Barra de filtros premium (GET, sem JS) */}
      <form
        method="get"
        action="/plataforma"
        className="mt-8 rounded-2xl border bg-card p-5 shadow-sm md:p-6"
      >
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <SlidersHorizontal className="size-4" />
          Filtrar imóveis
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {/* Busca livre — ocupa mais espaço */}
          <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-2">
            <label htmlFor="q" className="text-xs font-medium text-foreground">
              Buscar
            </label>
            <Input
              id="q"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Bairro, cidade ou tipo"
              className={campoInput}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="tipo" className="text-xs font-medium text-foreground">
              Tipo
            </label>
            <select
              id="tipo"
              name="tipo"
              defaultValue={tipo ?? ""}
              className={campoSelect}
            >
              <option value="">Todos</option>
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {TIPO_LABEL[t]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="bairro"
              className="text-xs font-medium text-foreground"
            >
              Bairro
            </label>
            <Input
              id="bairro"
              name="bairro"
              defaultValue={bairro ?? ""}
              placeholder="Ex.: Santa Mônica"
              className={campoInput}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="quartos"
              className="text-xs font-medium text-foreground"
            >
              Quartos (mín.)
            </label>
            <select
              id="quartos"
              name="quartos"
              defaultValue={quartosMin != null ? String(quartosMin) : ""}
              className={campoSelect}
            >
              <option value="">Qualquer</option>
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}+
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground">
              Faixa de preço (R$)
            </label>
            <div className="flex items-center gap-2">
              <Input
                aria-label="Valor mínimo"
                name="valor_min"
                type="number"
                min="0"
                defaultValue={valorMin != null ? String(valorMin) : ""}
                placeholder="Mín."
                className={campoInput}
              />
              <span className="text-muted-foreground">–</span>
              <Input
                aria-label="Valor máximo"
                name="valor_max"
                type="number"
                min="0"
                defaultValue={valorMax != null ? String(valorMax) : ""}
                placeholder="Máx."
                className={campoInput}
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" className="rounded-xl">
            <Search className="mr-1.5 size-4" />
            Buscar imóveis
          </Button>
          {temFiltro && (
            <Link
              href="/plataforma"
              className={buttonVariants({
                variant: "ghost",
                size: "lg",
                className: "rounded-xl",
              })}
            >
              Limpar filtros
            </Link>
          )}
        </div>
      </form>

      {/* Contagem */}
      <div className="mt-8 flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {contagem}
        </h2>
      </div>

      {/* Grade */}
      {total === 0 ? (
        <div className="mt-4 flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed bg-muted/30 px-6 py-20 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Home className="size-6" />
          </span>
          <div className="space-y-1">
            <p className="text-lg font-semibold">
              {temFiltro
                ? "Nenhum imóvel com esses filtros"
                : "Nenhum imóvel disponível ainda"}
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              {temFiltro
                ? "Tente ampliar a faixa de preço ou remover algum filtro."
                : "Novos imóveis aparecem aqui assim que forem anunciados."}
            </p>
          </div>
          {temFiltro && (
            <Link
              href="/plataforma"
              className={buttonVariants({
                variant: "outline",
                className: "rounded-xl",
              })}
            >
              Limpar filtros
            </Link>
          )}
        </div>
      ) : (
        <Reveal className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {imoveis.map((i) => (
            <ImovelCard key={i.id} imovel={i} />
          ))}
        </Reveal>
      )}
    </div>
  );
}
