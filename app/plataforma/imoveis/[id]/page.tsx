import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, BedDouble, Car, Maximize, MapPin } from "lucide-react";
import { BotaoInteresse } from "./_components/botao-interesse";

type ImovelDetalhe = {
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
  status: string;
};

const TIPO_LABEL: Record<string, string> = {
  casa: "Casa",
  apartamento: "Apartamento",
  comercial: "Comercial",
  terreno: "Terreno",
};

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export default async function ImovelDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data } = await supabase
    .from("imoveis")
    // LGPD: NÃO seleciona logradouro/numero/complemento/cep nem contato.
    .select(
      "id, bairro, cidade, uf, tipo, area_m2, quartos, vagas, valor_anuncio, fotos, status",
    )
    .eq("id", id)
    .single();

  // Só imóvel ativo aparece na vitrine pública.
  if (!data || data.status !== "ativo") notFound();

  const imovel = data as ImovelDetalhe;
  const fotos = imovel.fotos ?? [];
  const titulo = `${
    TIPO_LABEL[imovel.tipo ?? ""] ?? imovel.tipo ?? "Imóvel"
  }${imovel.bairro ? ` em ${imovel.bairro}` : ""}`;
  const local = [
    imovel.bairro,
    imovel.cidade && imovel.uf
      ? `${imovel.cidade}/${imovel.uf}`
      : imovel.cidade,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-4 md:p-6">
      <Link
        href="/plataforma"
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        <ArrowLeft className="mr-1.5 size-4" />
        Voltar à vitrine
      </Link>

      {/* Galeria */}
      {fotos.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fotos[0]}
            alt={titulo}
            className="aspect-[4/3] w-full rounded-xl object-cover sm:col-span-2"
          />
          {fotos.slice(1).map((src, idx) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={idx}
              src={src}
              alt={`${titulo} — foto ${idx + 2}`}
              className="aspect-[4/3] w-full rounded-xl object-cover"
            />
          ))}
        </div>
      ) : (
        <div className="bg-muted text-muted-foreground flex aspect-[16/9] w-full items-center justify-center rounded-xl text-sm">
          Sem fotos
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold">{titulo}</h1>
              {imovel.tipo && (
                <Badge variant="outline">
                  {TIPO_LABEL[imovel.tipo] ?? imovel.tipo}
                </Badge>
              )}
            </div>
            {local && (
              <p className="text-muted-foreground flex items-center gap-1.5">
                <MapPin className="size-4" />
                {local}
              </p>
            )}
          </div>

          {/* Características */}
          <div className="flex flex-wrap gap-6 text-sm">
            {imovel.quartos != null && (
              <span className="flex items-center gap-1.5">
                <BedDouble className="text-muted-foreground size-4" />
                {imovel.quartos} {imovel.quartos === 1 ? "quarto" : "quartos"}
              </span>
            )}
            {imovel.vagas != null && (
              <span className="flex items-center gap-1.5">
                <Car className="text-muted-foreground size-4" />
                {imovel.vagas} {imovel.vagas === 1 ? "vaga" : "vagas"}
              </span>
            )}
            {imovel.area_m2 != null && (
              <span className="flex items-center gap-1.5">
                <Maximize className="text-muted-foreground size-4" />
                {imovel.area_m2} m²
              </span>
            )}
          </div>

          <p className="text-muted-foreground text-xs">
            Por privacidade, o endereço completo é compartilhado apenas após o
            contato com o anunciante.
          </p>
        </div>

        {/* Painel lateral: valor + interesse */}
        <Card className="h-fit">
          <CardContent className="flex flex-col gap-4">
            <div>
              <p className="text-muted-foreground text-xs">Valor</p>
              <p className="text-2xl font-semibold tabular-nums">
                {imovel.valor_anuncio != null
                  ? moeda.format(imovel.valor_anuncio)
                  : "Sob consulta"}
              </p>
            </div>
            <BotaoInteresse imovelId={imovel.id} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
