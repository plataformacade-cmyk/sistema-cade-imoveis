import Link from "next/link";
import { ArrowRight, Bath, BedDouble, Car, MapPin, Ruler } from "lucide-react";
import {
  rotuloTipoNegocio,
  sufixoValorAnuncio,
} from "@/lib/negocios/tipo";

export type ImovelCardData = {
  id: string;
  tipo: string | null;
  tipo_negocio?: string | null;
  bairro: string | null;
  cidade: string | null;
  quartos: number | null;
  vagas: number | null;
  area_m2: number | null;
  banheiros?: number | null;
  valor_anuncio: number | null;
  fotos: string[] | null;
};

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const TIPO_LABEL: Record<string, string> = {
  casa: "Casa",
  apartamento: "Apartamento",
  comercial: "Comercial",
  terreno: "Terreno",
};

/** Card de imóvel estilo marketplace (Airbnb-like): foto grande + specs + preço. */
export function ImovelCard({ imovel }: { imovel: ImovelCardData }) {
  const foto = imovel.fotos?.[0];
  const tipo = imovel.tipo ? (TIPO_LABEL[imovel.tipo] ?? imovel.tipo) : "Imóvel";

  return (
    <Link
      href={`/plataforma/imoveis/${imovel.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={foto}
            alt={`${tipo} em ${imovel.bairro ?? imovel.cidade ?? ""}`}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            Sem foto
          </div>
        )}
        {/* Reveal no hover: gradiente sobe + dica "Ver detalhes" (briefing item 5). */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <span className="pointer-events-none absolute bottom-3 right-3 inline-flex translate-y-2 items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-foreground opacity-0 shadow-sm backdrop-blur transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
          Ver detalhes
          <ArrowRight className="size-3.5" />
        </span>
        <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur">
          {tipo}
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
          {rotuloTipoNegocio(imovel.tipo_negocio)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" />
          <span className="truncate">
            {imovel.bairro}
            {imovel.cidade ? `, ${imovel.cidade}` : ""}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {imovel.quartos ? (
            <span className="flex items-center gap-1">
              <BedDouble className="size-4" />
              {imovel.quartos}
            </span>
          ) : null}
          {imovel.banheiros ? (
            <span className="flex items-center gap-1">
              <Bath className="size-4" />
              {imovel.banheiros}
            </span>
          ) : null}
          {imovel.vagas ? (
            <span className="flex items-center gap-1">
              <Car className="size-4" />
              {imovel.vagas}
            </span>
          ) : null}
          {imovel.area_m2 ? (
            <span className="flex items-center gap-1">
              <Ruler className="size-4" />
              {imovel.area_m2} m²
            </span>
          ) : null}
        </div>

        <div className="mt-auto pt-2">
          <span className="text-lg font-bold tracking-tight">
            {imovel.valor_anuncio != null
              ? `${BRL.format(imovel.valor_anuncio)}${sufixoValorAnuncio(imovel.tipo_negocio)}`
              : "Sob consulta"}
          </span>
        </div>
      </div>
    </Link>
  );
}
