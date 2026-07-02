export const STATUS_NEGOCIO_PADRAO = "qualificacao";

export const STATUS_NEGOCIO_OPCOES = [
  { value: "qualificacao", label: "Qualificação" },
  { value: "visita", label: "Visita" },
  { value: "proposta", label: "Proposta" },
  { value: "documentos", label: "Documentos" },
  { value: "contrato", label: "Contrato" },
  { value: "cartorial", label: "Cartorial" },
  { value: "acompanhamento_externo", label: "Acompanhamento externo" },
  { value: "concluido", label: "Concluído" },
  { value: "perdido", label: "Perdido" },
] as const;

export type StatusNegocio = (typeof STATUS_NEGOCIO_OPCOES)[number]["value"];

export const STATUS_NEGOCIO_VALUES = STATUS_NEGOCIO_OPCOES.map(
  (status) => status.value,
);

export type StatusVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline";

export function isStatusNegocio(status: string): status is StatusNegocio {
  return STATUS_NEGOCIO_VALUES.includes(status as StatusNegocio);
}

export function rotuloStatusNegocio(status: string): string {
  return (
    STATUS_NEGOCIO_OPCOES.find((opcao) => opcao.value === status)?.label ??
    status
  );
}

export function variantStatusNegocio(status: string): StatusVariant {
  switch (status) {
    case "concluido":
      return "default";
    case "perdido":
      return "destructive";
    case "proposta":
    case "documentos":
    case "contrato":
    case "cartorial":
    case "acompanhamento_externo":
      return "secondary";
    default:
      return "outline";
  }
}
