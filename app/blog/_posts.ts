import { ARTIGOS } from "./_artigos";
import type { ArtigoBase } from "./_artigos/_tipo";

export type Autor = {
  nome: string;
  bio: string;
  avatar: string;
};

export type Post = Omit<ArtigoBase, "autorKey"> & {
  autor: Autor;
  /** Minutos de leitura, calculado do conteúdo (~200 palavras/min). */
  tempoLeitura: number;
};

const AUTORES: Record<ArtigoBase["autorKey"], Autor> = {
  redacao: {
    nome: "Redação Cadê",
    bio: "O time de conteúdo da Cadê Imóveis acompanha de perto o mercado de Uberlândia e traduz o que importa em guias práticos, diretos e sem juridiquês.",
    avatar: "/logo-cade.svg",
  },
  marina: {
    nome: "Marina Teixeira",
    bio: "Especialista em crédito imobiliário, ajuda famílias a saírem do aluguel há mais de dez anos. Escreve sobre financiamento, FGTS e planejamento de compra.",
    avatar: "/blog/autores/marina.webp",
  },
  rafael: {
    nome: "Rafael Andrade",
    bio: "Corretor e consultor de mercado em Uberlândia. Conhece bairro por bairro da cidade e gosta de explicar o que está por trás dos números.",
    avatar: "/blog/autores/rafael.webp",
  },
  juliana: {
    nome: "Juliana Mendes",
    bio: "Advogada imobiliária. Defende que um bom negócio começa com a documentação em dia e adora desburocratizar contrato para quem não é da área.",
    avatar: "/blog/autores/juliana.webp",
  },
};

/** Conta palavras e estima minutos de leitura (~200 palavras/min, mínimo 1). */
function calcularTempoLeitura(conteudo: string[]): number {
  const palavras = conteudo
    .join(" ")
    .replace(/^##\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(palavras / 200));
}

export const POSTS: Post[] = ARTIGOS.map((a) => {
  const { autorKey, ...resto } = a;
  return {
    ...resto,
    autor: AUTORES[autorKey] ?? AUTORES.redacao,
    tempoLeitura: calcularTempoLeitura(a.conteudo),
  };
}).sort((x, y) => y.data.localeCompare(x.data));

export function getPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}

/** Categorias na ordem em que aparecem, sem repetição. */
export function listarCategorias(): string[] {
  return Array.from(new Set(POSTS.map((p) => p.categoria)));
}

export function formatarData(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
