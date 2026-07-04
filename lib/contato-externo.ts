export const TERMO_CONTATO_EXTERNO =
  "Ao seguir sem servico juridico Cade, as partes autorizam o compartilhamento dos contatos cadastrados entre comprador e proprietario. A Cade Imoveis registra esta autorizacao, mas nao se responsabiliza por negociacoes, documentos, pagamentos, prazos, assinaturas ou tratativas feitas fora da plataforma.";

export const STATUS_CONTATO_EXTERNO = [
  "pendente",
  "liberado",
  "recusado",
] as const;

export type StatusContatoExterno = (typeof STATUS_CONTATO_EXTERNO)[number];
export type PapelContatoExterno = "comprador" | "proprietario";
export type DecisaoContatoExterno = "aceitou" | "recusou";

export const STATUS_NEGOCIO_ACOMPANHAMENTO_EXTERNO =
  "acompanhamento_externo" as const;

export const STATUS_NEGOCIO_PERMITE_CONTATO_EXTERNO = [
  "documentos",
  "contrato",
  "cartorial",
  STATUS_NEGOCIO_ACOMPANHAMENTO_EXTERNO,
] as const;

export type ContatoLiberado = {
  usuario_id: string;
  papel: PapelContatoExterno;
  nome: string | null;
  email: string | null;
  telefone: string | null;
};

export type AceiteContatoExterno = {
  usuario_id: string;
  papel: PapelContatoExterno;
  decisao: DecisaoContatoExterno;
  criado_em: string | null;
};

export type EstadoContatoExterno = {
  mostrar: boolean;
  negocioId: string;
  tipoNegocio: "venda" | "locacao";
  status: StatusContatoExterno;
  liberadoEm: string | null;
  recusadoEm: string | null;
  aceites: AceiteContatoExterno[];
  meuPapel: PapelContatoExterno | null;
  podeResponder: boolean;
  temCompradorAceito: boolean;
  temProprietarioAceito: boolean;
  temRecusa: boolean;
  contatos: ContatoLiberado[];
};
