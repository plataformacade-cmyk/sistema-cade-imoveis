export const PACOTE_NAO_CONTRATAR = "nao_contratar" as const;

export const PACOTES_SERVICO_JURIDICO = [
  "contrato_locacao",
  "contrato_compra_venda",
  "juridico_cartorial_venda",
  "analise_documental",
] as const;

export const STATUS_SERVICO_JURIDICO = [
  "contratado",
  "em_atendimento",
  "cancelado",
  "concluido",
] as const;

export const ORIGENS_SERVICO_JURIDICO = [
  "cadastro_imovel",
  "edicao_imovel",
  "proposta_aceita",
  "documentos",
  "contrato",
] as const;

export type PacoteServicoJuridico = (typeof PACOTES_SERVICO_JURIDICO)[number];
export type PacoteServicoJuridicoForm =
  | PacoteServicoJuridico
  | typeof PACOTE_NAO_CONTRATAR;
export type StatusServicoJuridico = (typeof STATUS_SERVICO_JURIDICO)[number];
export type OrigemServicoJuridico = (typeof ORIGENS_SERVICO_JURIDICO)[number];
export type TipoNegocioServicoJuridico = "venda" | "locacao";

export const TERMO_SERVICO_JURIDICO =
  "Contratacao formal interna dos servicos juridicos Cade. A execucao operacional, valores e pagamento serao alinhados fora do app nesta versao.";

export const PACOTE_SERVICO_JURIDICO_INFO: Record<
  PacoteServicoJuridicoForm,
  {
    label: string;
    descricao: string;
    tipoPadrao?: TipoNegocioServicoJuridico;
  }
> = {
  nao_contratar: {
    label: "Nao contratar agora",
    descricao: "Seguir sem apoio juridico Cade nesta etapa.",
  },
  contrato_locacao: {
    label: "Contrato de locacao",
    descricao: "Apoio para montar e revisar contrato de aluguel.",
    tipoPadrao: "locacao",
  },
  contrato_compra_venda: {
    label: "Contrato de compra e venda",
    descricao: "Apoio para contrato particular de compra e venda.",
    tipoPadrao: "venda",
  },
  juridico_cartorial_venda: {
    label: "Juridico e cartorial de venda",
    descricao: "Apoio na documentacao, contrato e encaminhamento cartorial.",
    tipoPadrao: "venda",
  },
  analise_documental: {
    label: "Analise documental",
    descricao: "Revisao inicial dos documentos do imovel e das partes.",
  },
};

export const STATUS_SERVICO_JURIDICO_LABEL: Record<
  StatusServicoJuridico,
  string
> = {
  contratado: "Contratado",
  em_atendimento: "Em atendimento",
  cancelado: "Cancelado",
  concluido: "Concluido",
};

export function pacoteServicoValido(
  pacote: string,
): pacote is PacoteServicoJuridico {
  return PACOTES_SERVICO_JURIDICO.includes(pacote as PacoteServicoJuridico);
}

export function statusServicoValido(
  status: string,
): status is StatusServicoJuridico {
  return STATUS_SERVICO_JURIDICO.includes(status as StatusServicoJuridico);
}

export function tipoNegocioServicoValido(
  tipo: string,
): tipo is TipoNegocioServicoJuridico {
  return tipo === "venda" || tipo === "locacao";
}

export function pacoteAplicaAoTipo(
  pacote: PacoteServicoJuridico,
  tipo: TipoNegocioServicoJuridico,
) {
  const tipoPadrao = PACOTE_SERVICO_JURIDICO_INFO[pacote].tipoPadrao;
  return !tipoPadrao || tipoPadrao === tipo;
}

export function rotuloPacoteServico(pacote: string) {
  return (
    PACOTE_SERVICO_JURIDICO_INFO[pacote as PacoteServicoJuridicoForm]?.label ??
    pacote
  );
}

export function rotuloStatusServico(status: string) {
  return (
    STATUS_SERVICO_JURIDICO_LABEL[status as StatusServicoJuridico] ?? status
  );
}
