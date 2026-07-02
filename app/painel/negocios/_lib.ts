import {
  rotuloStatusNegocio,
  STATUS_NEGOCIO_OPCOES,
  variantStatusNegocio,
  type StatusVariant,
} from "@/lib/negocios/status";

export const STATUS_OPCOES = STATUS_NEGOCIO_OPCOES;

export const PAPEL_OPCOES = [
  { value: "proprietario", label: "Proprietário" },
  { value: "comprador", label: "Comprador" },
  { value: "corretor", label: "Corretor" },
] as const;

export function rotuloStatus(status: string): string {
  return rotuloStatusNegocio(status);
}

export function rotuloPapel(papel: string): string {
  return PAPEL_OPCOES.find((p) => p.value === papel)?.label ?? papel;
}

export type { StatusVariant };

export function variantStatus(status: string): StatusVariant {
  return variantStatusNegocio(status);
}

const fmtBRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatBRL(valor: number | null | undefined): string {
  if (valor == null) return "—";
  return fmtBRL.format(valor);
}

export function enderecoResumido(imovel: {
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
} | null): string {
  if (!imovel) return "-";
  const linha1 = [imovel.logradouro, imovel.numero]
    .filter(Boolean)
    .join(", ");
  const linha2 = [imovel.bairro, imovel.cidade].filter(Boolean).join(" — ");
  return [linha1, linha2].filter(Boolean).join(" · ") || "—";
}
