// Formato cru de um artigo (antes de resolver autor + tempo de leitura).
// É o MESMO formato que o agente automático de conteúdo grava (ver
// scripts/agente-conteudo.mjs) — um artigo é só um arquivo .ts neste diretório
// exportando `const artigo: ArtigoBase`. O índice (_artigos/index.ts) agrega
// todos e o _posts.ts resolve autor/tempo.
export type ArtigoBase = {
  slug: string;
  titulo: string;
  resumo: string;
  capa: string;
  capaAlt: string;
  categoria: string;
  tags: string[];
  /** Publicação (ISO yyyy-mm-dd). */
  data: string;
  /** Última atualização (ISO). Frescor é sinal forte de GEO/AEO. */
  atualizado?: string;
  autorKey: "redacao" | "marina" | "rafael" | "juliana";
  /** Parágrafos. Strings que começam com "## " viram subtítulos (H2). */
  conteudo: string[];
  /** Perguntas frequentes — viram bloco visual + FAQPage (JSON-LD). */
  faq?: { pergunta: string; resposta: string }[];
};
