import Link from "next/link";
import { notFound } from "next/navigation";
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
import { AcoesImovel } from "./_components/acoes-imovel";
import { EngajamentoTracker } from "./_components/engajamento-tracker";
import { ImovelCard, type ImovelCardData } from "@/components/publico/imovel-card";
import { infoDoBairro } from "./_bairros";
import { SITE, imovelLd, breadcrumbLd, slugBairro } from "@/lib/seo";
import { getSessao } from "@/lib/auth";
import {
  buscarImovelPublicoDetalhe,
  buscarImoveisPublicos,
  enderecoCompleto,
  enderecoPublico,
  usuarioPodeVerEnderecoImovel,
} from "@/lib/imoveis/privacidade-endereco";
import {
  rotuloTipoNegocio,
  sufixoValorAnuncio,
} from "@/lib/negocios/tipo";

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

function rotuloCaracteristica(chave: string): string {
  const limpo = chave.replace(/[_-]+/g, " ").trim();
  return limpo.charAt(0).toUpperCase() + limpo.slice(1);
}

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
  const [imovel, sessao] = await Promise.all([
    buscarImovelPublicoDetalhe(id),
    getSessao(),
  ]);

  if (!imovel) notFound();

  const podeVerEndereco = await usuarioPodeVerEnderecoImovel(imovel, sessao);
  const fotos = imovel.fotos ?? [];
  const tipoLabel = TIPO_LABEL[imovel.tipo ?? ""] ?? imovel.tipo ?? "Imovel";
  const tipoNegocio = imovel.tipo_negocio ?? undefined;
  const tipoNegocioLabel = rotuloTipoNegocio(imovel.tipo_negocio);
  const sufixoValor = sufixoValorAnuncio(imovel.tipo_negocio);
  const titulo = `${tipoLabel}${imovel.bairro ? ` em ${imovel.bairro}` : ""}`;
  const cidadeUf =
    imovel.cidade && imovel.uf
      ? `${imovel.cidade}/${imovel.uf}`
      : (imovel.cidade ?? "");
  const local = enderecoPublico(imovel);
  const ruaNumero = [imovel.logradouro, imovel.numero]
    .filter(Boolean)
    .join(", ");
  const localizacaoHeader = podeVerEndereco
    ? [ruaNumero, local].filter(Boolean).join(" - ")
    : local;
  const enderecoVisivel = podeVerEndereco
    ? enderecoCompleto(imovel)
    : local || "Uberlandia/MG";
  const consultaMapa = podeVerEndereco
    ? [ruaNumero, imovel.bairro, cidadeUf].filter(Boolean).join(", ")
    : [imovel.bairro, cidadeUf].filter(Boolean).join(", ");
  const comodidades = extrairComodidades(imovel.caracteristicas);
  const bairroInfo = infoDoBairro(imovel.bairro);

  const relacionados: ImovelCardData[] = [];
  const vistos = new Set<string>([imovel.id]);
  async function buscarRel(coluna: "bairro" | "tipo", valor: string | null) {
    if (!valor || relacionados.length >= 4) return;
    const lista = await buscarImoveisPublicos(
      coluna === "bairro"
        ? { bairro: valor, tipoNegocio, limit: 8 }
        : { tipo: valor, tipoNegocio, limit: 8 },
    );
    for (const r of lista as ImovelCardData[]) {
      if (relacionados.length >= 4 || vistos.has(r.id)) continue;
      vistos.add(r.id);
      relacionados.push(r);
    }
  }
  await buscarRel("bairro", imovel.bairro);
  await buscarRel("tipo", imovel.tipo);

  const urlImovel = `${SITE.url}/plataforma/imoveis/${imovel.id}`;
  const jsonld = [
    imovelLd({
      titulo,
      descricao: `${tipoLabel} para ${tipoNegocioLabel.toLowerCase()} em ${imovel.bairro ?? "Uberlandia"} com ${imovel.area_m2 ?? "-"} m2. Negocie direto pela Cade Imoveis.`,
      url: urlImovel,
      fotos: fotos.slice(0, 6),
      preco: imovel.valor_anuncio,
      enderecoExato: podeVerEndereco,
      logradouro: imovel.logradouro,
      numero: imovel.numero,
      bairro: imovel.bairro,
      cidade: imovel.cidade,
      uf: imovel.uf,
      cep: imovel.cep,
      area: imovel.area_m2,
      quartos: imovel.quartos,
    }),
    breadcrumbLd([
      { nome: "Inicio", url: "/" },
      { nome: "Imoveis", url: "/plataforma" },
      ...(imovel.bairro
        ? [{ nome: imovel.bairro, url: `/imoveis-em/${slugBairro(imovel.bairro)}` }]
        : []),
      { nome: titulo, url: `/plataforma/imoveis/${imovel.id}` },
    ]),
  ];

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
      label: "m2 de area",
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
      <EngajamentoTracker imovelId={imovel.id} />
      {jsonld.map((bloco, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(bloco) }}
        />
      ))}
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
                    alt={`${titulo} - foto ${idx + 2}`}
                    loading="lazy"
                    className="h-36 w-full rounded-2xl object-cover md:h-[13.4rem]"
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-72 w-full items-center justify-center rounded-2xl bg-muted text-sm text-muted-foreground">
            Sem fotos disponiveis
          </div>
        )}

        {fotos.length > 5 && (
          <div className="mt-3 flex flex-wrap gap-3">
            {fotos.slice(5).map((src, idx) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={idx}
                src={src}
                alt={`${titulo} - foto ${idx + 6}`}
                loading="lazy"
                className="size-24 rounded-xl object-cover"
              />
            ))}
          </div>
        )}
      </section>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-8">
          <header className="flex flex-col gap-3 border-b pb-6">
            <span className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {tipoLabel} para {tipoNegocioLabel.toLowerCase()}
            </span>
            <h1 className="text-3xl font-semibold tracking-tight">{titulo}</h1>
            {localizacaoHeader && (
              <p className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="size-4 shrink-0" />
                {localizacaoHeader}
              </p>
            )}
          </header>

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

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold">Sobre o imovel</h2>
            <p className="leading-relaxed text-muted-foreground">
              {tipoLabel}
              {imovel.bairro ? ` localizado em ${imovel.bairro}` : ""}
              {cidadeUf ? `, ${cidadeUf}` : ""}.
              {imovel.area_m2 != null ? ` Com ${imovel.area_m2} m2` : ""}
              {imovel.quartos != null
                ? `, ${imovel.quartos} ${imovel.quartos === 1 ? "quarto" : "quartos"}`
                : ""}
              {imovel.vagas != null
                ? ` e ${imovel.vagas} ${imovel.vagas === 1 ? "vaga" : "vagas"} de garagem`
                : ""}
              . Demonstre interesse para conversar diretamente com o anunciante e
              receber mais detalhes sobre a {tipoNegocioLabel.toLowerCase()}.
            </p>
          </section>

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

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold">Localizacao</h2>
            <div className="overflow-hidden rounded-2xl border">
              <div className="flex items-start gap-2 bg-muted/40 px-4 py-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium">{enderecoVisivel}</p>
                  {!podeVerEndereco && (
                    <p className="text-xs text-muted-foreground">
                      Localizacao aproximada. O endereco completo e liberado
                      apenas dentro da negociacao.
                    </p>
                  )}
                </div>
              </div>
              <iframe
                title={
                  podeVerEndereco
                    ? `Mapa de ${ruaNumero || local}`
                    : `Mapa aproximado de ${local || "Uberlandia/MG"}`
                }
                src={`https://www.google.com/maps?q=${encodeURIComponent(
                  consultaMapa || "Uberlandia, MG",
                )}&z=${podeVerEndereco ? "15" : "13"}&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-72 w-full border-0"
              />
            </div>
          </section>

          {imovel.bairro && (
            <section className="flex flex-col gap-3">
              <h2 className="text-xl font-semibold">
                Sobre o bairro <span className="text-primary">{imovel.bairro}</span>
              </h2>
              <p className="leading-relaxed text-muted-foreground">
                {bairroInfo.descricao}
              </p>
              <ul className="mt-1 flex flex-wrap gap-2">
                {bairroInfo.destaques.map((d) => (
                  <li
                    key={d}
                    className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
                  >
                    {d}
                  </li>
                ))}
              </ul>
              {bairroInfo.pontos.length > 0 && (
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {bairroInfo.pontos.map((ponto) => (
                    <div
                      key={ponto.nome}
                      className="rounded-lg border bg-card p-4"
                    >
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                        <div>
                          <p className="text-sm font-semibold">{ponto.nome}</p>
                          <p className="text-muted-foreground text-xs">
                            {ponto.categoria}
                          </p>
                        </div>
                      </div>
                      <p className="text-muted-foreground mt-3 text-sm">
                        {ponto.distancia} - {ponto.tempo}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {bairroInfo.pontos.length > 0 && (
                <p className="text-muted-foreground text-xs">
                  Distâncias aproximadas por região, sem expor o endereço exato
                  do imóvel.
                </p>
              )}
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {imovel.tipo_negocio === "locacao" ? "Aluguel mensal" : "Valor"}
              </p>
              <p className="text-3xl font-semibold tracking-tight">
                {imovel.valor_anuncio != null
                  ? `${moeda.format(imovel.valor_anuncio)}${sufixoValor}`
                  : "Sob consulta"}
              </p>
            </div>

            <BotaoInteresse imovelId={imovel.id} />

            <AcoesImovel imovelId={imovel.id} titulo={titulo} />

            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              Seu interesse e registrado com seguranca. O anunciante sera
              notificado para entrar em contato.
            </p>
          </div>
        </aside>
      </div>

      {relacionados.length > 0 && (
        <section className="mt-14 border-t pt-10">
          <div className="mb-5 flex items-end justify-between gap-4">
            <h2 className="text-2xl font-semibold tracking-tight">
              Imoveis relacionados
            </h2>
            <Link
              href={
                imovel.bairro
                  ? `/imoveis-em/${slugBairro(imovel.bairro)}`
                  : "/plataforma"
              }
              className="shrink-0 text-sm font-medium text-primary hover:underline"
            >
              Ver mais {imovel.bairro ? `em ${imovel.bairro}` : "imoveis"} -&gt;
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {relacionados.map((r) => (
              <ImovelCard key={r.id} imovel={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
