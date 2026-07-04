import "server-only";

import { buscarImoveisPublicos } from "@/lib/imoveis/privacidade-endereco";
import { moedaBRL } from "@/lib/seo";
import {
  normalizarTipoNegocio,
  rotuloTipoNegocio,
  sufixoValorAnuncio,
} from "@/lib/negocios/tipo";
import type { RespostaAgente } from "./agente";

const TIPOS: Record<string, string[]> = {
  casa: ["casa", "sobrado"],
  apartamento: ["apartamento", "apto", "flat"],
  comercial: ["comercial", "sala", "loja", "galpao", "ponto"],
  terreno: ["terreno", "lote"],
};

const BAIRROS = [
  "santa monica",
  "tibery",
  "centro",
  "morada da colina",
  "jardim karaiba",
  "granja marileusa",
  "saraiva",
  "brasil",
  "fundinho",
  "martins",
  "cidade jardim",
  "alto umuarama",
  "umuarama",
  "granada",
  "shopping park",
];

function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function pareceBusca(texto: string) {
  const t = normalizar(texto);
  return [
    "imovel",
    "imoveis",
    "casa",
    "apartamento",
    "terreno",
    "comercial",
    "alugar",
    "aluguel",
    "comprar",
    "venda",
    "quartos",
    "bairro",
    "morar",
  ].some((gatilho) => t.includes(gatilho));
}

function inferirTipo(texto: string) {
  for (const [tipo, gatilhos] of Object.entries(TIPOS)) {
    if (gatilhos.some((gatilho) => texto.includes(gatilho))) return tipo;
  }
  return undefined;
}

function inferirTipoNegocio(texto: string) {
  if (["alugar", "aluguel", "locacao", "locar"].some((p) => texto.includes(p))) {
    return "locacao";
  }
  if (["comprar", "compra", "venda", "financiamento"].some((p) => texto.includes(p))) {
    return "venda";
  }
  return undefined;
}

function inferirBairro(texto: string) {
  return BAIRROS.find((bairro) => texto.includes(bairro));
}

function inferirQuartos(texto: string) {
  const match = texto.match(/(\d+)\s*(?:quarto|quartos|dorm|dormitorio|dormitorios)/);
  if (!match) return undefined;
  const quartos = Number(match[1]);
  return Number.isFinite(quartos) && quartos > 0 ? quartos : undefined;
}

function valorHumanoParaNumero(valor: string, unidade?: string) {
  const base = Number(valor.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(base)) return undefined;
  const u = normalizar(unidade ?? "");
  if (u.startsWith("mi")) return Math.round(base * 1_000_000);
  if (u.startsWith("mil") || u === "k") return Math.round(base * 1_000);
  return Math.round(base);
}

function inferirValorMax(texto: string) {
  const match =
    texto.match(/(?:ate|maximo|no maximo|menos de)\s*(?:r\$)?\s*([\d.,]+)\s*(milhao|milhoes|mil|k)?/) ||
    texto.match(/(?:r\$)?\s*([\d.,]+)\s*(milhao|milhoes|mil|k)?\s*(?:ou menos|no maximo)/);
  if (!match) return undefined;
  return valorHumanoParaNumero(match[1], match[2]);
}

function linkVitrine(filtros: {
  tipoNegocio?: string;
  tipo?: string;
  bairro?: string;
  quartosMin?: number;
  valorMax?: number;
}) {
  const qs = new URLSearchParams();
  if (filtros.tipoNegocio) qs.set("tipo_negocio", filtros.tipoNegocio);
  if (filtros.tipo) qs.set("tipo", filtros.tipo);
  if (filtros.bairro) qs.set("bairro", filtros.bairro);
  if (filtros.quartosMin != null) qs.set("quartos", String(filtros.quartosMin));
  if (filtros.valorMax != null) qs.set("valor_max", String(filtros.valorMax));
  const query = qs.toString();
  return query ? `/plataforma?${query}` : "/plataforma";
}

type ImovelResultado = Awaited<ReturnType<typeof buscarImoveisPublicos>>[number];

function linhaImovel(imovel: ImovelResultado, index: number) {
  const tipoNegocio = normalizarTipoNegocio(imovel.tipo_negocio);
  const preco =
    imovel.valor_anuncio != null
      ? `${moedaBRL.format(imovel.valor_anuncio)}${sufixoValorAnuncio(tipoNegocio)}`
      : "valor sob consulta";
  const specs = [
    imovel.tipo,
    imovel.quartos ? `${imovel.quartos} quarto(s)` : null,
    imovel.area_m2 ? `${imovel.area_m2} m2` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return `${index}. ${rotuloTipoNegocio(tipoNegocio)} em ${imovel.bairro ?? "bairro informado"}, ${imovel.cidade ?? "Uberlandia"} - ${preco}${specs ? ` - ${specs}` : ""}\n/plataforma/imoveis/${imovel.id}`;
}

export async function responderBuscaImoveis(pergunta: string): Promise<RespostaAgente | null> {
  if (!pareceBusca(pergunta)) return null;

  const texto = normalizar(pergunta);
  const filtros = {
    tipoNegocio: inferirTipoNegocio(texto),
    tipo: inferirTipo(texto),
    bairro: inferirBairro(texto),
    quartosMin: inferirQuartos(texto),
    valorMax: inferirValorMax(texto),
  };

  const imoveis = await buscarImoveisPublicos({
    tipoNegocio: filtros.tipoNegocio,
    tipo: filtros.tipo,
    bairro: filtros.bairro,
    quartosMin: filtros.quartosMin,
    valorMax: filtros.valorMax,
    limit: 3,
  });

  const vitrine = linkVitrine(filtros);
  if (!imoveis.length) {
    return {
      resposta:
        "Nao encontrei um imovel ativo exatamente com esses filtros agora.\n\n" +
        `Voce pode abrir a busca ja filtrada aqui:\n${vitrine}\n\n` +
        "Se quiser, me diga bairro, tipo de imovel, faixa de preco e se e compra ou aluguel.",
      sugereAtendente: false,
      modo: "consultor",
    };
  }

  const resumoFiltros = [
    filtros.tipoNegocio ? rotuloTipoNegocio(filtros.tipoNegocio) : null,
    filtros.tipo,
    filtros.bairro,
    filtros.quartosMin ? `${filtros.quartosMin}+ quartos` : null,
    filtros.valorMax ? `ate ${moedaBRL.format(filtros.valorMax)}` : null,
  ].filter(Boolean);

  return {
    resposta:
      `Encontrei ${imoveis.length} opcao(oes) ativa(s)` +
      (resumoFiltros.length ? ` para ${resumoFiltros.join(", ")}` : "") +
      ".\n\n" +
      imoveis.map((imovel, index) => linhaImovel(imovel, index + 1)).join("\n\n") +
      `\n\nVer mais na vitrine:\n${vitrine}\n\n` +
      "Mostro apenas bairro/cidade aqui. O endereco completo segue protegido ate o fluxo permitido.",
    sugereAtendente: false,
    modo: "consultor",
  };
}
