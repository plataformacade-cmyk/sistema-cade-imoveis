// Rótulos e formatadores compartilhados da área de Visitas.

export const STATUS_OPCOES = [
  { value: "solicitada", label: "Solicitada" },
  { value: "aguardando_confirmacao", label: "Aguardando confirmação" },
  { value: "confirmada", label: "Confirmada" },
  { value: "realizada", label: "Realizada" },
  { value: "cancelada", label: "Cancelada" },
  { value: "reagendada", label: "Reagendada" },
  { value: "nao_compareceu", label: "Não compareceu" },
] as const;

export const CANAL_OPCOES = [
  { value: "presencial", label: "Presencial" },
  { value: "video", label: "Vídeo" },
] as const;

export function rotuloStatus(status: string): string {
  return STATUS_OPCOES.find((s) => s.value === status)?.label ?? status;
}

export function rotuloCanal(canal: string): string {
  return CANAL_OPCOES.find((c) => c.value === canal)?.label ?? canal;
}

export type StatusVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline";

export function variantStatus(status: string): StatusVariant {
  switch (status) {
    case "confirmada":
    case "realizada":
      return "default";
    case "aguardando_confirmacao":
    case "reagendada":
      return "secondary";
    case "cancelada":
    case "nao_compareceu":
      return "destructive";
    default:
      return "outline";
  }
}

const fmtDataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDataHora(valor: string | null | undefined): string {
  if (!valor) return "—";
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return "—";
  return fmtDataHora.format(d);
}

export function enderecoResumido(imovel: {
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
} | null): string {
  if (!imovel) return "—";
  const linha1 = [imovel.logradouro, imovel.numero].filter(Boolean).join(", ");
  const linha2 = [imovel.bairro, imovel.cidade].filter(Boolean).join(" — ");
  return [linha1, linha2].filter(Boolean).join(" · ") || "—";
}
