import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BedDouble, Car, Maximize, MapPin, Search } from "lucide-react";

type ImovelVitrine = {
  id: string;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  tipo: string | null;
  area_m2: number | null;
  quartos: number | null;
  vagas: number | null;
  valor_anuncio: number | null;
  fotos: string[] | null;
};

const TIPO_LABEL: Record<string, string> = {
  casa: "Casa",
  apartamento: "Apartamento",
  comercial: "Comercial",
  terreno: "Terreno",
};

const TIPOS = ["casa", "apartamento", "comercial", "terreno"] as const;

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

/** Texto limpo ou undefined. */
function txt(v: string | undefined): string | undefined {
  const s = (v ?? "").trim();
  return s === "" ? undefined : s;
}

/** Inteiro positivo ou undefined. */
function num(v: string | undefined): number | undefined {
  const s = (v ?? "").trim();
  if (s === "") return undefined;
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

type Params = {
  q?: string;
  tipo?: string;
  cidade?: string;
  quartos?: string;
  valor_min?: string;
  valor_max?: string;
};

export default async function VitrinePage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const sp = await searchParams;
  const q = txt(sp.q);
  const tipo = txt(sp.tipo);
  const cidade = txt(sp.cidade);
  const quartosMin = num(sp.quartos);
  const valorMin = num(sp.valor_min);
  const valorMax = num(sp.valor_max);

  const supabase = await createClient();
  let query = supabase
    .from("imoveis")
    .select(
      "id, bairro, cidade, uf, tipo, area_m2, quartos, vagas, valor_anuncio, fotos",
    )
    .eq("status", "ativo")
    .order("criado_em", { ascending: false })
    .limit(60);

  if (q) {
    const termo = `%${q}%`;
    query = query.or(
      `logradouro.ilike.${termo},bairro.ilike.${termo},cidade.ilike.${termo}`,
    );
  }
  if (tipo && (TIPOS as readonly string[]).includes(tipo))
    query = query.eq("tipo", tipo);
  if (cidade) query = query.ilike("cidade", `%${cidade}%`);
  if (quartosMin != null) query = query.gte("quartos", quartosMin);
  if (valorMin != null) query = query.gte("valor_anuncio", valorMin);
  if (valorMax != null) query = query.lte("valor_anuncio", valorMax);

  const { data } = await query;
  const imoveis = (data ?? []) as ImovelVitrine[];

  const temFiltro =
    !!q || !!tipo || !!cidade || quartosMin != null || valorMin != null ||
    valorMax != null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Encontre seu imóvel</h1>
        <p className="text-muted-foreground text-sm">
          Busque por bairro, cidade e tipo. Demonstre interesse com um clique.
        </p>
      </div>

      {/* Filtros (GET) */}
      <form
        method="get"
        action="/plataforma"
        className="grid grid-cols-1 gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-3">
          <label htmlFor="q" className="text-sm font-medium">
            Busca
          </label>
          <Input
            id="q"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Bairro, cidade ou rua"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="tipo" className="text-sm font-medium">
            Tipo
          </label>
          {/* HTML select nativo: serializa direto no GET, sem JS. */}
          <select
            id="tipo"
            name="tipo"
            defaultValue={tipo ?? ""}
            className="border-input bg-transparent dark:bg-input/30 h-8 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
          <label htmlFor="cidade" className="text-sm font-medium">
            Cidade
          </label>
          <Input
            id="cidade"
            name="cidade"
            defaultValue={cidade ?? ""}
            placeholder="Ex.: Curitiba"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="quartos" className="text-sm font-medium">
            Quartos (mín.)
          </label>
          <Input
            id="quartos"
            name="quartos"
            type="number"
            min="0"
            defaultValue={quartosMin != null ? String(quartosMin) : ""}
            placeholder="0"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="valor_min" className="text-sm font-medium">
            Valor mín. (R$)
          </label>
          <Input
            id="valor_min"
            name="valor_min"
            type="number"
            min="0"
            defaultValue={valorMin != null ? String(valorMin) : ""}
            placeholder="0"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="valor_max" className="text-sm font-medium">
            Valor máx. (R$)
          </label>
          <Input
            id="valor_max"
            name="valor_max"
            type="number"
            min="0"
            defaultValue={valorMax != null ? String(valorMax) : ""}
            placeholder="Sem limite"
          />
        </div>

        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
          <Button type="submit">
            <Search className="mr-1.5 size-4" />
            Buscar
          </Button>
          {temFiltro && (
            <Link
              href="/plataforma"
              className={buttonVariants({ variant: "outline" })}
            >
              Limpar filtros
            </Link>
          )}
        </div>
      </form>

      {/* Grade de resultados */}
      {imoveis.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <p className="text-muted-foreground text-sm">
            {temFiltro
              ? "Nenhum imóvel encontrado com esses filtros."
              : "Nenhum imóvel disponível no momento."}
          </p>
          {temFiltro && (
            <Link
              href="/plataforma"
              className={buttonVariants({ variant: "outline" })}
            >
              Limpar filtros
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {imoveis.map((i) => {
            const foto = i.fotos?.[0] ?? null;
            const titulo = `${TIPO_LABEL[i.tipo ?? ""] ?? i.tipo ?? "Imóvel"}${
              i.bairro ? ` em ${i.bairro}` : ""
            }`;
            const local = [
              i.bairro,
              i.cidade && i.uf ? `${i.cidade}/${i.uf}` : i.cidade,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <Link
                key={i.id}
                href={`/plataforma/imoveis/${i.id}`}
                className="block transition-opacity hover:opacity-90"
              >
                <Card className="h-full pt-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {foto ? (
                    <img
                      src={foto}
                      alt={titulo}
                      className="aspect-[4/3] w-full object-cover"
                    />
                  ) : (
                    <div className="bg-muted text-muted-foreground flex aspect-[4/3] w-full items-center justify-center text-sm">
                      Sem foto
                    </div>
                  )}
                  <CardContent className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-medium leading-snug">{titulo}</h2>
                      {i.tipo && (
                        <Badge variant="outline" className="shrink-0">
                          {TIPO_LABEL[i.tipo] ?? i.tipo}
                        </Badge>
                      )}
                    </div>
                    <p className="text-lg font-semibold tabular-nums">
                      {i.valor_anuncio != null
                        ? moeda.format(i.valor_anuncio)
                        : "Sob consulta"}
                    </p>
                    {local && (
                      <p className="text-muted-foreground flex items-center gap-1 text-sm">
                        <MapPin className="size-3.5" />
                        {local}
                      </p>
                    )}
                  </CardContent>
                  <CardFooter className="text-muted-foreground gap-4 text-xs">
                    {i.quartos != null && (
                      <span className="flex items-center gap-1">
                        <BedDouble className="size-3.5" />
                        {i.quartos} {i.quartos === 1 ? "quarto" : "quartos"}
                      </span>
                    )}
                    {i.vagas != null && (
                      <span className="flex items-center gap-1">
                        <Car className="size-3.5" />
                        {i.vagas} {i.vagas === 1 ? "vaga" : "vagas"}
                      </span>
                    )}
                    {i.area_m2 != null && (
                      <span className="flex items-center gap-1">
                        <Maximize className="size-3.5" />
                        {i.area_m2} m²
                      </span>
                    )}
                  </CardFooter>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
