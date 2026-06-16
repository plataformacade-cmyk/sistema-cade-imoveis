import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import {
  ArrowLeft,
  BedDouble,
  Car,
  Ruler,
  CalendarDays,
  MapPin,
  Check,
  ShieldCheck,
} from "lucide-react";
import { BotaoInteresse } from "./_components/botao-interesse";

type ImovelDetalhe = {
  id: string;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  cep: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  tipo: string | null;
  area_m2: number | null;
  quartos: number | null;
  vagas: number | null;
  ano_construcao: number | null;
  caracteristicas: Record<string, unknown> | null;
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

/** Rótulo legível pra uma chave de característica (snake_case → "Snake case"). */
function rotuloCaracteristica(chave: string): string {
  const limpo = chave.replace(/[_-]+/g, " ").trim();
  return limpo.charAt(0).toUpperCase() + limpo.slice(1);
}

/**
 * Extrai comodidades do jsonb `caracteristicas`. Aceita:
 *  - { piscina: true, churrasqueira: true } → lista as chaves verdadeiras
 *  - { piscina: "Piscina aquecida" } → usa o valor
 *  - { amenidades: ["Piscina", "Academia"] } → usa o array
 */
function extrairComodidades(c: Record<string, unknown> | null): string[] {
  if (!c) return [];
  const out: string[] = [];
  for (const [chave, valor] of Object.entries(c)) {
    if (Array.isArray(valor)) {
      for (const v of valor) if (typeof v === "string" && v.trim()) out.push(v.trim());
    } else if (typeof valor === "boolean") {
      if (valor) out.push(rotuloCaracteristica(chave));
    } else if (typeof valor === "string") {
      if (valor.trim()) out.push(valor.trim());
    } else if (typeof valor === "number") {
      out.push(`${rotuloCaracteristica(chave)}: ${valor}`);
    }
  }
  return out;
}

export default async function ImovelDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data } = await supabase
    .from("imoveis")
    .select(
      "id, logradouro, numero, complemento, cep, bairro, cidade, uf, tipo, area_m2, quartos, vagas, ano_construcao, caracteristicas, valor_anuncio, fotos, status",
    )
    .eq("id", id)
    .single();

  // Só imóvel ativo aparece no marketplace público.
  if (!data || data.status !== "ativo") notFound();

  const imovel = data as ImovelDetalhe;
  const fotos = imovel.fotos ?? [];
  const tipoLabel = TIPO_LABEL[imovel.tipo ?? ""] ?? imovel.tipo ?? "Imóvel";
  const titulo = `${tipoLabel}${imovel.bairro ? ` em ${imovel.bairro}` : ""}`;
  const cidadeUf =
    imovel.cidade && imovel.uf
      ? `${imovel.cidade}/${imovel.uf}`
      : (imovel.cidade ?? "");
  const local = [imovel.bairro, cidadeUf].filter(Boolean).join(" · ");
  const ruaNumero = [imovel.logradouro, imovel.numero]
    .filter(Boolean)
    .join(", ");
  const enderecoCompleto = [
    ruaNumero,
    imovel.complemento,
    [imovel.bairro, cidadeUf].filter(Boolean).join(" · "),
    imovel.cep ? `CEP ${imovel.cep}` : null,
  ]
    .filter(Boolean)
    .join(" — ");
  const comodidades = extrairComodidades(imovel.caracteristicas);

  const specs = [
    imovel.quartos != null && {
      icon: BedDouble,
      valor: imovel.quartos,
      label: imovel.quartos === 1 ? "Quarto" : "Quartos",
    },
    imovel.vagas != null && {
      icon: Car,
      valor: imovel.vagas,
      label: imovel.vagas === 1 ? "Vaga" : "Vagas",
    },
    imovel.area_m2 != null && {
      icon: Ruler,
      valor: `${imovel.area_m2}`,
      label: "m² de área",
    },
    imovel.ano_construcao != null && {
      icon: CalendarDays,
      valor: imovel.ano_construcao,
      label: "Ano",
    },
  ].filter(Boolean) as {
    icon: typeof BedDouble;
    valor: string | number;
    label: string;
  }[];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-10">
      <Link
        href="/plataforma"
        className={buttonVariants({
          variant: "ghost",
          size: "sm",
          className: "rounded-xl",
        })}
      >
        <ArrowLeft className="mr-1.5 size-4" />
        Voltar para a busca
      </Link>

      {/* GALERIA estilo Airbnb */}
      <section className="mt-4">
        {fotos.length > 0 ? (
          <div className="grid gap-3 md:h-[28rem] md:grid-cols-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fotos[0]}
              alt={titulo}
              loading="lazy"
              className="h-72 w-full rounded-2xl object-cover md:h-full"
            />
            {fotos.length > 1 && (
              <div className="grid grid-cols-2 gap-3">
                {fotos.slice(1, 5).map((src, idx) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={idx}
                    src={src}
                    alt={`${titulo} — foto ${idx + 2}`}
                    loading="lazy"
                    className="h-36 w-full rounded-2xl object-cover md:h-[13.4rem]"
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-72 w-full items-center justify-center rounded-2xl bg-muted text-sm text-muted-foreground">
            Sem fotos disponíveis
          </div>
        )}

        {/* Miniaturas adicionais (a partir da 6ª foto) */}
        {fotos.length > 5 && (
          <div className="mt-3 flex flex-wrap gap-3">
            {fotos.slice(5).map((src, idx) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={idx}
                src={src}
                alt={`${titulo} — foto ${idx + 6}`}
                loading="lazy"
                className="size-24 rounded-xl object-cover"
              />
            ))}
          </div>
        )}
      </section>

      {/* CONTEÚDO + CARD STICKY */}
      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_22rem]">
        {/* Coluna principal */}
        <div className="flex flex-col gap-8">
          <header className="flex flex-col gap-3 border-b pb-6">
            <span className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {tipoLabel}
            </span>
            <h1 className="text-3xl font-semibold tracking-tight">{titulo}</h1>
            {(ruaNumero || local) && (
              <p className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="size-4 shrink-0" />
                {[ruaNumero, local].filter(Boolean).join(" · ")}
              </p>
            )}
          </header>

          {/* Specs com ícones */}
          {specs.length > 0 && (
            <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {specs.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div
                    key={i}
                    className="flex flex-col gap-1 rounded-2xl border bg-card p-4"
                  >
                    <Icon className="size-5 text-primary" />
                    <span className="text-xl font-semibold tracking-tight">
                      {s.valor}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </section>
          )}

          {/* Descrição */}
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold">Sobre o imóvel</h2>
            <p className="leading-relaxed text-muted-foreground">
              {tipoLabel}
              {imovel.bairro ? ` localizado em ${imovel.bairro}` : ""}
              {cidadeUf ? `, ${cidadeUf}` : ""}.
              {imovel.area_m2 != null ? ` Com ${imovel.area_m2} m²` : ""}
              {imovel.quartos != null
                ? `, ${imovel.quartos} ${imovel.quartos === 1 ? "quarto" : "quartos"}`
                : ""}
              {imovel.vagas != null
                ? ` e ${imovel.vagas} ${imovel.vagas === 1 ? "vaga" : "vagas"} de garagem`
                : ""}
              . Demonstre interesse para conversar diretamente com o anunciante e
              receber mais detalhes.
            </p>
          </section>

          {/* Comodidades */}
          {comodidades.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-xl font-semibold">Comodidades</h2>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {comodidades.map((c, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Check className="size-4" />
                    </span>
                    {c}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Mapa (placeholder) */}
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold">Localização</h2>
            <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border bg-muted/40 px-6 text-center">
              <MapPin className="size-8 text-primary" />
              <p className="font-medium">{ruaNumero || local}</p>
              {enderecoCompleto && (
                <p className="max-w-md text-sm text-muted-foreground">
                  {enderecoCompleto}
                </p>
              )}
            </div>
          </section>
        </div>

        {/* Card lateral STICKY */}
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Valor</p>
              <p className="text-3xl font-semibold tracking-tight">
                {imovel.valor_anuncio != null
                  ? moeda.format(imovel.valor_anuncio)
                  : "Sob consulta"}
              </p>
            </div>

            <BotaoInteresse imovelId={imovel.id} />

            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              Seu interesse é registrado com segurança. O anunciante será
              notificado para entrar em contato.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
