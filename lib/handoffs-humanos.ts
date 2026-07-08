export const STATUS_HANDOFF_HUMANO = [
  "aberto",
  "em_atendimento",
  "concluido",
  "cancelado",
] as const;

export const RESULTADOS_HANDOFF_HUMANO = [
  "contato_realizado",
  "sem_resposta",
  "quer_apoio",
  "reagendar",
  "parar_cadencia",
  "perdido",
] as const;

export type StatusHandoffHumano = (typeof STATUS_HANDOFF_HUMANO)[number];
export type ResultadoHandoffHumano = (typeof RESULTADOS_HANDOFF_HUMANO)[number];

export type HandoffHumanoResumo = {
  id: string;
  negocio_id: string;
  automacao_execucao_id: string | null;
  origem: string;
  motivo: string;
  contexto: Record<string, unknown> | null;
  prioridade: string;
  status: string;
  responsavel_id: string | null;
  assumido_em: string | null;
  resultado: string | null;
  observacao: string | null;
  parar_cadencia: boolean;
  concluido_em: string | null;
  criado_em: string;
  atualizado_em: string;
};

const ROTULOS_STATUS: Record<StatusHandoffHumano, string> = {
  aberto: "Aberto",
  em_atendimento: "Em atendimento",
  concluido: "Concluido",
  cancelado: "Cancelado",
};

const ROTULOS_RESULTADO: Record<ResultadoHandoffHumano, string> = {
  contato_realizado: "Contato realizado",
  sem_resposta: "Sem resposta",
  quer_apoio: "Quer apoio Cade",
  reagendar: "Reagendar",
  parar_cadencia: "Lead pediu para parar",
  perdido: "Marcar como perdido",
};

const ROTULOS_ORIGEM: Record<string, string> = {
  hermes_negocio_travado: "Hermes: negocio travado",
  followup_externo: "Follow-up externo",
  manual: "Manual",
};

export function isResultadoHandoffHumano(
  value: string,
): value is ResultadoHandoffHumano {
  return RESULTADOS_HANDOFF_HUMANO.includes(value as ResultadoHandoffHumano);
}

export function rotuloStatusHandoffHumano(status: string) {
  return ROTULOS_STATUS[status as StatusHandoffHumano] ?? status;
}

export function rotuloResultadoHandoffHumano(resultado: string | null) {
  if (!resultado) return "Sem resultado";
  return ROTULOS_RESULTADO[resultado as ResultadoHandoffHumano] ?? resultado;
}

export function rotuloOrigemHandoffHumano(origem: string) {
  return ROTULOS_ORIGEM[origem] ?? origem;
}

export function handoffAberto(handoff: Pick<HandoffHumanoResumo, "status">) {
  return handoff.status === "aberto" || handoff.status === "em_atendimento";
}
