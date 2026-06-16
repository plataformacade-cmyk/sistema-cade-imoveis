// Rótulos e formatadores compartilhados da área de Negócios.

export const STATUS_OPCOES = [
  { value: "aberto", label: "Aberto" },
  { value: "em_negociacao", label: "Em negociação" },
  { value: "fechado", label: "Fechado" },
  { value: "cancelado", label: "Cancelado" },
] as const;

export const PAPEL_OPCOES = [
  { value: "proprietario", label: "Proprietário" },
  { value: "comprador", label: "Comprador" },
  { value: "corretor", label: "Corretor" },
] as const;

export function rotuloStatus(status: string): string {
  return STATUS_OPCOES.find((s) => s.value === status)?.label ?? status;
}

export function rotuloPapel(papel: string): string {
  return PAPEL_OPCOES.find((p) => p.value === papel)?.label ?? papel;
}

export type StatusVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline";

export function variantStatus(status: string): StatusVariant {
  switch (status) {
    case "fechado":
      return "default";
    case "em_negociacao":
      return "secondary";
    case "cancelado":
      return "destructive";
    default:
      return "outline";
  }
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
  if (!imovel) return "—";
  const linha1 = [imovel.logradouro, imovel.numero]
    .filter(Boolean)
    .join(", ");
  const linha2 = [imovel.bairro, imovel.cidade].filter(Boolean).join(" — ");
  return [linha1, linha2].filter(Boolean).join(" · ") || "—";
}
