#!/usr/bin/env node
/**
 * Modulo social institucional - v1 sem Hermes e sem publicacao automatica.
 *
 * Gera pecas revisaveis a partir dos artigos do blog.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(__dirname, "..");
const DIR_ARTIGOS = join(RAIZ, "app", "blog", "_artigos");
const PATH_SOCIAL =
  process.env.SOCIAL_CONTEUDO_PATH || join(__dirname, "social-conteudo.json");

const COMANDO = process.argv[2] || "listar";
const IDX_TIPO = process.argv.indexOf("--tipo");
const IDX_SLUG = process.argv.indexOf("--slug");
const IDX_ID = process.argv.indexOf("--id");
const IDX_URL = process.argv.indexOf("--url");
const TIPO = IDX_TIPO >= 0 ? process.argv[IDX_TIPO + 1] : "carrossel";
const SLUG = IDX_SLUG >= 0 ? process.argv[IDX_SLUG + 1] : null;
const ID = IDX_ID >= 0 ? process.argv[IDX_ID + 1] : null;
const URL = IDX_URL >= 0 ? process.argv[IDX_URL + 1] : null;

const TIPOS = new Set(["noticia", "carrossel", "design", "roteiro-avatar"]);
const STATUS = new Set(["rascunho", "aprovado", "publicado"]);

function lerJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8"));
}

function salvarJson(path, valor) {
  writeFileSync(path, `${JSON.stringify(valor, null, 2)}\n`);
}

function agoraISO() {
  return new Date().toISOString();
}

function limparMarkdown(texto) {
  return String(texto || "")
    .replace(/^##\s+/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function extrairString(codigo, campo) {
  const match = codigo.match(new RegExp(`${campo}:\\s*"([^"]*)"`));
  return match?.[1] || "";
}

function extrairArrayStrings(codigo, campo) {
  const match = codigo.match(new RegExp(`${campo}:\\s*\\[([\\s\\S]*?)\\]`, "m"));
  if (!match) return [];
  return [...match[1].matchAll(/"((?:\\.|[^"\\])*)"/g)].map((m) => {
    try {
      return JSON.parse(`"${m[1]}"`);
    } catch {
      return m[1];
    }
  });
}

function listarArtigos() {
  return readdirSync(DIR_ARTIGOS)
    .filter((f) => f.endsWith(".ts") && !f.startsWith("_") && f !== "index.ts")
    .sort();
}

function carregarArtigo(slug) {
  const arquivo = slug
    ? join(DIR_ARTIGOS, `${slug}.ts`)
    : join(DIR_ARTIGOS, listarArtigos().at(-1));
  if (!existsSync(arquivo)) throw new Error(`Artigo nao encontrado: ${slug || arquivo}`);
  const codigo = readFileSync(arquivo, "utf8");
  return {
    slug: extrairString(codigo, "slug"),
    titulo: limparMarkdown(extrairString(codigo, "titulo")),
    resumo: limparMarkdown(extrairString(codigo, "resumo")),
    categoria: extrairString(codigo, "categoria"),
    tags: extrairArrayStrings(codigo, "tags"),
    conteudo: extrairArrayStrings(codigo, "conteudo").map(limparMarkdown),
  };
}

function limitar(texto, max) {
  const limpo = limparMarkdown(texto);
  if (limpo.length <= max) return limpo;
  return `${limpo.slice(0, max - 1).trim()}...`;
}

function gerarSlides(artigo) {
  const pontos = [
    artigo.resumo,
    ...artigo.conteudo.filter((p) => p.length > 40),
  ].slice(0, 5);
  const slides = [
    {
      numero: 1,
      titulo: artigo.titulo,
      texto: "Guia rapido da Cade Imoveis para decidir com mais seguranca.",
    },
  ];

  for (const ponto of pontos) {
    slides.push({
      numero: slides.length + 1,
      titulo: slides.length === 1 ? "O que voce precisa saber" : "Ponto importante",
      texto: limitar(ponto, 145),
    });
  }

  while (slides.length < 6) {
    slides.push({
      numero: slides.length + 1,
      titulo: "Dica Cade",
      texto: "Compare contexto, documentos e etapa da negociacao antes de decidir.",
    });
  }

  slides.push({
    numero: slides.length + 1,
    titulo: "Quer continuar?",
    texto: "Veja imoveis, tire duvidas e anuncie pela plataforma Cade Imoveis.",
  });

  return slides.slice(0, 8);
}

function canaisBase(tipo) {
  if (tipo === "roteiro-avatar") return ["Instagram Reels", "TikTok", "YouTube Shorts"];
  if (tipo === "noticia") return ["Instagram", "Telegram", "YouTube Community"];
  return ["Instagram", "TikTok", "Telegram"];
}

function montarPeca(tipo, artigo) {
  if (!TIPOS.has(tipo)) throw new Error(`Tipo invalido: ${tipo}`);
  const id = `social-${tipo}-${artigo.slug}`;
  const base = {
    id,
    tipo,
    status: "rascunho",
    origem: "blog",
    origem_slug: artigo.slug,
    titulo: artigo.titulo,
    canais: canaisBase(tipo),
    criado_em: agoraISO(),
    atualizado_em: agoraISO(),
  };

  if (tipo === "carrossel") {
    return {
      ...base,
      formato: "carrossel 6-8 slides",
      slides: gerarSlides(artigo),
      legenda: `${artigo.titulo}\n\nSalve este guia e veja mais em /blog/${artigo.slug}.`,
      design: {
        proporcao: "4:5",
        paleta: "laranja Cade como primario, azul ceu vivo como apoio",
        observacoes: "usar cards limpos, pouco texto por slide e CTA final para plataforma",
      },
    };
  }

  if (tipo === "noticia") {
    return {
      ...base,
      formato: "post noticia",
      manchete: artigo.titulo,
      corpo: limitar(artigo.resumo || artigo.conteudo[0], 420),
      legenda: `${artigo.resumo}\n\nLeia o guia completo: /blog/${artigo.slug}`,
      cta: "Ler no blog da Cade",
    };
  }

  if (tipo === "design") {
    return {
      ...base,
      formato: "design estatico",
      headline: limitar(artigo.titulo, 90),
      subtitulo: limitar(artigo.resumo, 140),
      cta: "Buscar ou anunciar na Cade",
      brief_visual: "arte estatica 4:5, imovel/rua realista, logo discreto e sem texto excessivo",
    };
  }

  return {
    ...base,
    formato: "roteiro com avatar",
    status: "rascunho",
    avatar: {
      nome: "Fernando",
      liberado: false,
      dependencia: "consentimento formal, imagem/voz aprovadas e ferramenta externa configurada",
    },
    roteiro: [
      { tempo: "0-3s", fala: limitar(artigo.titulo, 110) },
      { tempo: "3-15s", fala: limitar(artigo.resumo || artigo.conteudo[0], 220) },
      { tempo: "15-25s", fala: "Antes de fechar negocio, compare contexto, documentos e etapa da negociacao." },
      { tempo: "25-30s", fala: "Veja mais no blog e na plataforma Cade Imoveis." },
    ],
  };
}

function upsertPeca(peca) {
  const itens = lerJson(PATH_SOCIAL, []);
  const idx = itens.findIndex((item) => item.id === peca.id);
  if (idx >= 0) {
    if (itens[idx].status !== "rascunho") {
      throw new Error(`Peca ${peca.id} esta ${itens[idx].status}; nao sobrescrevi.`);
    }
    itens[idx] = { ...peca, criado_em: itens[idx].criado_em, atualizado_em: agoraISO() };
  } else {
    itens.push(peca);
  }
  salvarJson(PATH_SOCIAL, itens);
  return peca;
}

function gerar() {
  const artigo = carregarArtigo(SLUG);
  const peca = upsertPeca(montarPeca(TIPO, artigo));
  console.log(`${peca.id} gerado como ${peca.status}.`);
}

function listar() {
  const itens = lerJson(PATH_SOCIAL, []);
  if (!itens.length) {
    console.log("Nenhuma peca social. Rode: node scripts/social-conteudo.mjs gerar --tipo carrossel --slug <slug>");
    return;
  }
  for (const item of itens) {
    console.log(`${item.id} | ${item.tipo} | ${item.status} | ${item.titulo}`);
  }
}

function alterarStatus(novoStatus) {
  if (!ID) throw new Error("Informe --id <id>.");
  if (!STATUS.has(novoStatus)) throw new Error(`Status invalido: ${novoStatus}`);
  const itens = lerJson(PATH_SOCIAL, []);
  const item = itens.find((p) => p.id === ID);
  if (!item) throw new Error(`Peca nao encontrada: ${ID}`);
  if (novoStatus === "publicado" && !URL) {
    throw new Error("Para publicar evidencia, informe --url <url-da-publicacao>.");
  }
  item.status = novoStatus;
  item.atualizado_em = agoraISO();
  if (URL) item.publicacao_url = URL;
  salvarJson(PATH_SOCIAL, itens);
  console.log(`${ID} -> ${novoStatus}`);
}

function tipos() {
  console.log("Tipos: noticia, carrossel, design, roteiro-avatar");
  console.log("Status: rascunho, aprovado, publicado");
  console.log("Avatar Fernando: sempre depende de consentimento e ativo externo.");
}

function main() {
  if (COMANDO === "gerar") return gerar();
  if (COMANDO === "listar") return listar();
  if (COMANDO === "aprovar") return alterarStatus("aprovado");
  if (COMANDO === "publicar") return alterarStatus("publicado");
  if (COMANDO === "tipos") return tipos();
  throw new Error(`Comando desconhecido: ${COMANDO}`);
}

try {
  main();
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
