export const TIPOS_NEGOCIO = ["venda", "locacao"] as const;

export type TipoNegocio = (typeof TIPOS_NEGOCIO)[number];

export const TIPO_NEGOCIO_PADRAO: TipoNegocio = "venda";

export const TIPO_NEGOCIO_OPCOES = [
  { value: "venda", label: "Venda" },
  { value: "locacao", label: "Locacao" },
] as const;

export const GARANTIA_LOCACAO_OPCOES = [
  { value: "fiador", label: "Fiador" },
  { value: "caucao", label: "Caucao" },
  { value: "seguro_fianca", label: "Seguro-fianca" },
  { value: "titulo_capitalizacao", label: "Titulo de capitalizacao" },
] as const;

export type TipoGarantiaLocacao =
  (typeof GARANTIA_LOCACAO_OPCOES)[number]["value"];

export function isTipoNegocio(valor: string): valor is TipoNegocio {
  return (TIPOS_NEGOCIO as readonly string[]).includes(valor);
}

export function normalizarTipoNegocio(valor: string | null | undefined) {
  return valor === "locacao" ? "locacao" : "venda";
}

export function rotuloTipoNegocio(tipo: string | null | undefined) {
  return normalizarTipoNegocio(tipo) === "locacao" ? "Locacao" : "Venda";
}

export function rotuloValorAnuncio(tipo: string | null | undefined) {
  return normalizarTipoNegocio(tipo) === "locacao"
    ? "Aluguel mensal"
    : "Valor de venda";
}

export function sufixoValorAnuncio(tipo: string | null | undefined) {
  return normalizarTipoNegocio(tipo) === "locacao" ? "/mes" : "";
}

export function rotuloPapelNegocio(
  papel: string,
  tipo: string | null | undefined,
) {
  const locacao = normalizarTipoNegocio(tipo) === "locacao";
  if (papel === "comprador") return locacao ? "Locatario" : "Comprador";
  if (papel === "proprietario") return locacao ? "Locador" : "Proprietario";
  if (papel === "corretor") return "Corretor";
  return papel;
}

export function rotuloGarantiaLocacao(valor: string | null | undefined) {
  return (
    GARANTIA_LOCACAO_OPCOES.find((opcao) => opcao.value === valor)?.label ??
    "Nao definida"
  );
}
