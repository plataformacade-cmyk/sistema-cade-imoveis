export const STATUS_REPESCAGEM = [
  "pendente",
  "em_cadencia",
  "respondido",
  "encerrado",
] as const;

export type StatusRepescagem = (typeof STATUS_REPESCAGEM)[number];

export type ImovelRecomendadoRepescagem = {
  id: string;
  titulo: string | null;
  bairro: string | null;
  cidade: string | null;
  tipo: string | null;
  valor_anuncio: number | null;
  tipo_negocio: string | null;
};

export type RepescagemResumo = {
  id: string;
  negocio_id: string;
  comprador_id: string | null;
  criado_por: string | null;
  motivo_perda: string | null;
  origem: string;
  status: string;
  aceita_similares: boolean | null;
  resposta_lead: string | null;
  parar_cadencia: boolean;
  tentativas: number;
  proxima_tentativa_em: string | null;
  ultima_tentativa_em: string | null;
  imoveis_recomendados: ImovelRecomendadoRepescagem[] | null;
  automacao_execucao_id: string | null;
  encerrado_em: string | null;
  criado_em: string;
  atualizado_em: string;
};

const ROTULOS_STATUS: Record<StatusRepescagem, string> = {
  pendente: "Pendente",
  em_cadencia: "Em cadencia",
  respondido: "Respondido",
  encerrado: "Encerrado",
};

export function rotuloStatusRepescagem(status: string) {
  return ROTULOS_STATUS[status as StatusRepescagem] ?? status;
}

export function isStatusRepescagem(status: string): status is StatusRepescagem {
  return STATUS_REPESCAGEM.includes(status as StatusRepescagem);
}
