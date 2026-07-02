export const TIPOS_FOLLOWUP_EXTERNO = ["dia_7", "dia_30", "dia_45"] as const;
export const STATUS_FOLLOWUP_EXTERNO = [
  "pendente",
  "respondido",
  "cancelado",
] as const;
export const RESULTADOS_FOLLOWUP_EXTERNO = [
  "fechou",
  "travou",
  "quer_apoio",
  "sem_resposta",
  "encerrar",
] as const;

export type TipoFollowupExterno = (typeof TIPOS_FOLLOWUP_EXTERNO)[number];
export type StatusFollowupExterno = (typeof STATUS_FOLLOWUP_EXTERNO)[number];
export type ResultadoFollowupExterno =
  (typeof RESULTADOS_FOLLOWUP_EXTERNO)[number];

export type FollowupExternoResumo = {
  id: string;
  negocio_id: string;
  fluxo_id: string;
  tipo: string;
  prazo_em: string;
  status: string;
  resultado: string | null;
  observacao: string | null;
  responsavel_id: string | null;
  respondido_por: string | null;
  respondido_em: string | null;
  criado_em?: string | null;
  atualizado_em?: string | null;
};

const ROTULOS_TIPO: Record<TipoFollowupExterno, string> = {
  dia_7: "7 dias",
  dia_30: "30 dias",
  dia_45: "45 dias",
};

const ROTULOS_STATUS: Record<StatusFollowupExterno, string> = {
  pendente: "Pendente",
  respondido: "Respondido",
  cancelado: "Cancelado",
};

const ROTULOS_RESULTADO: Record<ResultadoFollowupExterno, string> = {
  fechou: "Fechou",
  travou: "Travou",
  quer_apoio: "Quer apoio Cadê",
  sem_resposta: "Sem resposta",
  encerrar: "Encerrar",
};

export function isResultadoFollowupExterno(
  value: string,
): value is ResultadoFollowupExterno {
  return RESULTADOS_FOLLOWUP_EXTERNO.includes(value as ResultadoFollowupExterno);
}

export function rotuloTipoFollowupExterno(tipo: string) {
  return ROTULOS_TIPO[tipo as TipoFollowupExterno] ?? tipo;
}

export function rotuloStatusFollowupExterno(status: string) {
  return ROTULOS_STATUS[status as StatusFollowupExterno] ?? status;
}

export function rotuloResultadoFollowupExterno(resultado: string | null) {
  if (!resultado) return "Sem resultado";
  return ROTULOS_RESULTADO[resultado as ResultadoFollowupExterno] ?? resultado;
}

export function followupEstaVencido(followup: Pick<FollowupExternoResumo, "status" | "prazo_em">) {
  return followup.status === "pendente" && new Date(followup.prazo_em) < new Date();
}
