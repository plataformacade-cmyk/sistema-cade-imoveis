#!/usr/bin/env node
/**
 * Agente de conteúdo automático - Cadê Imóveis.
 *
 * Gera artigos de blog no formato de app/blog/_artigos/<slug>.ts.
 *
 * Texto: OpenAI quando OPENAI_API_KEY existir.
 * Pesquisa: Perplexity quando PERPLEXITY_API_KEY existir.
 * Imagem: Higgsfield quando HIGGSFIELD_API_KEY/HF_CREDENTIALS existir,
 * fallback Ideogram quando IDEOGRAM_API_KEY existir, e skyline em dry-run.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(__dirname, "..");
const DIR_ARTIGOS = join(RAIZ, "app", "blog", "_artigos");
const DIR_CAPAS = join(RAIZ, "public", "blog");

const OPENAI_API_KEY =
  process.env.OPENAI_API_KEY || "COLOQUE_SUA_CHAVE_OPENAI_AQUI";
const OPENAI_MODELO = process.env.OPENAI_MODELO || "gpt-5";
const IDEOGRAM_API_KEY =
  process.env.IDEOGRAM_API_KEY || "COLOQUE_SUA_CHAVE_IDEOGRAM_AQUI";
const PERPLEXITY_API_KEY =
  process.env.PERPLEXITY_API_KEY || "COLOQUE_SUA_CHAVE_PERPLEXITY_AQUI";
const PERPLEXITY_MODELO = process.env.PERPLEXITY_MODELO || "sonar-pro";
const HIGGSFIELD_API_KEY =
  process.env.HIGGSFIELD_API_KEY ||
  process.env.HF_CREDENTIALS ||
  "COLOQUE_SUA_CHAVE_HIGGSFIELD_AQUI";
const HIGGSFIELD_ENDPOINT =
  process.env.HIGGSFIELD_ENDPOINT || "flux-pro/kontext/max/text-to-image";

const TEM_OPENAI = !OPENAI_API_KEY.startsWith("COLOQUE_");
const TEM_IDEOGRAM = !IDEOGRAM_API_KEY.startsWith("COLOQUE_");
const TEM_PERPLEXITY = !PERPLEXITY_API_KEY.startsWith("COLOQUE_");
const TEM_HIGGSFIELD = !HIGGSFIELD_API_KEY.startsWith("COLOQUE_");

const idxQuantos = process.argv.indexOf("--quantos");
const QUANTOS = idxQuantos >= 0 ? Number(process.argv[idxQuantos + 1]) || 3 : 3;
const VALIDAR_PAUTA = process.argv.includes("--validar-pauta");

const SISTEMA = `Você é redator(a) SEO/GEO da Cadê Imóveis, marketplace imobiliário de Uberlândia/MG.
Escreva um artigo de blog em PT-BR aplicando técnicas de ranqueamento e de ser citado por IAs:
- RESPOSTA-PRIMEIRO: o primeiro parágrafo responde a dúvida do título em 40-60 palavras, direto.
- Estrutura: 7-9 seções marcadas com "## "; blocos de 120-180 palavras; cada um se sustenta sozinho.
- Dados/estatísticas concretas e plausíveis de Uberlândia, com cautela quando não houver fonte.
- 1600-2000 palavras. Voz humana, transparente, foco Uberlândia. Não use travessão.
- 2-4 links internos em markdown para /plataforma, /imoveis-em/<bairro>, /como-funciona/interessado ou /como-funciona/proprietario.
- FAQ com 3-5 perguntas reais e respostas de 40-80 palavras.
Responda apenas um JSON: { "titulo","resumo","categoria","tags":[],"capaPrompt","conteudo":[],"faq":[{"pergunta","resposta"}] }.
"capaPrompt" é uma descrição em inglês para gerar a imagem de capa, foto editorial, sem texto.
"categoria" deve ser um destes valores: "Financiamento", "Comprar", "Alugar", "Dicas", "Bairros de Uberlândia".`;

function slugify(s) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function hojeISO() {
  return process.env.DATA_HOJE || new Date().toISOString().slice(0, 10);
}

function artigoDryRun(tema) {
  return {
    titulo: `${tema} - guia da Cadê`,
    resumo: `Guia prático sobre ${tema.toLowerCase()} em Uberlândia. Conteúdo de exemplo: configure OPENAI_API_KEY para gerar de verdade.`,
    categoria: "Dicas",
    tags: ["uberlandia", "guia", slugify(tema)],
    capaPrompt: `editorial real estate photo about ${tema}, Uberlandia Brazil, no text, no people`,
    conteudo: [
      `Este é um artigo de exemplo gerado em modo dry-run sobre ${tema}. Configure OPENAI_API_KEY para o agente escrever conteúdo real, otimizado para SEO e para ser citado por IAs.`,
      "## Como funciona o agente",
      "Quando as chaves estiverem configuradas, este texto é substituído por um artigo completo de 1600-2000 palavras, com resposta-primeiro, dados, links internos e FAQ. Veja imóveis na [plataforma da Cadê](/plataforma).",
    ],
    faq: [
      {
        pergunta: `O que é ${tema}?`,
        resposta:
          "Conteúdo de exemplo. Configure a chave da OpenAI para gerar a resposta real.",
      },
    ],
  };
}

async function gerarPesquisa(tema) {
  if (!TEM_PERPLEXITY) return null;

  const r = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
    },
    body: JSON.stringify({
      model: PERPLEXITY_MODELO,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "Você pesquisa mercado imobiliário local e devolve fatos úteis, cautelosos e verificáveis para orientar um artigo. Não invente números exatos quando não houver base.",
        },
        {
          role: "user",
          content: `Pesquise insumos para um artigo da Cadê Imóveis em Uberlândia/MG sobre: ${tema}. Traga pontos práticos, termos de busca, dúvidas frequentes, riscos e oportunidades. Responda em PT-BR, em bullets curtos.`,
        },
      ],
    }),
  });

  if (!r.ok) throw new Error(`Perplexity ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return j.choices?.[0]?.message?.content?.trim() || null;
}

function parseJsonConteudo(conteudo) {
  try {
    return JSON.parse(conteudo);
  } catch {
    const inicio = conteudo.indexOf("{");
    const fim = conteudo.lastIndexOf("}");
    if (inicio >= 0 && fim > inicio) {
      return JSON.parse(conteudo.slice(inicio, fim + 1));
    }
    throw new Error("Resposta de texto não contém JSON válido.");
  }
}

function contextoPauta(item) {
  if (!item || typeof item === "string") return "";
  const partes = [];
  if (item.origem) {
    partes.push(
      `Origem da pauta: ${Array.isArray(item.origem) ? item.origem.join(", ") : item.origem}.`,
    );
  }
  if (item.persona) partes.push(`Persona: ${item.persona}.`);
  if (item.intencao) partes.push(`Intencao de busca: ${item.intencao}.`);
  return partes.join("\n");
}

async function gerarTexto(item) {
  const tema = typeof item === "string" ? item : item.tema;
  if (!TEM_OPENAI) return artigoDryRun(tema);

  let pesquisa = null;
  if (TEM_PERPLEXITY) {
    try {
      pesquisa = await gerarPesquisa(tema);
    } catch (e) {
      console.warn(
        "Perplexity indisponível; seguindo sem pesquisa externa:",
        e.message,
      );
    }
  }

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODELO,
      messages: [
        { role: "system", content: SISTEMA },
        {
          role: "user",
          content:
            `Tema do artigo: ${tema}` +
            (contextoPauta(item) ? `\n\nContexto da pauta:\n${contextoPauta(item)}` : "") +
            (pesquisa
              ? `\n\nPesquisa Perplexity para embasar o artigo:\n${pesquisa}`
              : "\n\nSem pesquisa externa nesta execução; use conhecimento geral com cautela."),
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return parseJsonConteudo(j.choices?.[0]?.message?.content ?? "");
}

async function baixarImagemParaBlog(slug, urlImg) {
  if (!urlImg) throw new Error("URL de imagem ausente.");
  const img = await fetch(urlImg);
  if (!img.ok) throw new Error(`Download imagem ${img.status}`);
  const bin = Buffer.from(await img.arrayBuffer());
  const destino = `/blog/${slug}.webp`;
  writeFileSync(join(DIR_CAPAS, `${slug}.webp`), bin);
  return destino;
}

async function gerarCapaHiggsfield(slug, capaPrompt) {
  const { createHiggsfieldClient } = await import("@higgsfield/client/v2");
  const client = createHiggsfieldClient({ credentials: HIGGSFIELD_API_KEY });
  const jobSet = await client.subscribe(HIGGSFIELD_ENDPOINT, {
    input: {
      aspect_ratio: "16:9",
      prompt: capaPrompt,
      safety_tolerance: 2,
    },
    withPolling: true,
  });
  const urlImg =
    jobSet.jobs?.[0]?.results?.raw?.url ||
    jobSet.jobs?.[0]?.results?.min?.url;
  return baixarImagemParaBlog(slug, urlImg);
}

async function gerarCapaIdeogram(slug, capaPrompt) {
  const r = await fetch("https://api.ideogram.ai/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Api-Key": IDEOGRAM_API_KEY },
    body: JSON.stringify({
      image_request: {
        prompt: capaPrompt,
        aspect_ratio: "ASPECT_16_10",
        model: "V_2",
        magic_prompt_option: "AUTO",
      },
    }),
  });

  if (!r.ok) throw new Error(`Ideogram ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return baixarImagemParaBlog(slug, j.data?.[0]?.url);
}

async function gerarCapa(slug, capaPrompt) {
  if (TEM_HIGGSFIELD) {
    try {
      return await gerarCapaHiggsfield(slug, capaPrompt);
    } catch (e) {
      console.warn(
        "Higgsfield indisponível; tentando fallback de imagem:",
        e.message,
      );
    }
  }

  if (TEM_IDEOGRAM) return gerarCapaIdeogram(slug, capaPrompt);
  return "/blog/skyline.webp";
}

function escreverArtigo(a) {
  const j = (v) => JSON.stringify(v, null, 2);
  const corpo = `import type { ArtigoBase } from "./_tipo";

export const artigo: ArtigoBase = {
  slug: ${JSON.stringify(a.slug)},
  titulo: ${JSON.stringify(a.titulo)},
  resumo: ${JSON.stringify(a.resumo)},
  capa: ${JSON.stringify(a.capa)},
  capaAlt: ${JSON.stringify(a.titulo)},
  categoria: ${JSON.stringify(a.categoria)},
  tags: ${j(a.tags)},
  data: ${JSON.stringify(a.data)},
  atualizado: ${JSON.stringify(a.data)},
  autorKey: "redacao",
  conteudo: ${j(a.conteudo)},
  faq: ${j(a.faq ?? [])},
};
`;
  writeFileSync(join(DIR_ARTIGOS, `${a.slug}.ts`), corpo);
}

function regenerarIndice() {
  const arquivos = readdirSync(DIR_ARTIGOS)
    .filter((f) => f.endsWith(".ts") && f !== "_tipo.ts" && f !== "index.ts")
    .sort();
  const imports = arquivos
    .map((f, i) => `import { artigo as a${i} } from "./${f.replace(/\.ts$/, "")}";`)
    .join("\n");
  const lista = arquivos.map((_, i) => `a${i}`).join(", ");
  const conteudo = `// GERADO AUTOMATICAMENTE - não edite à mão (ver scripts/agente-conteudo.mjs).
import type { ArtigoBase } from "./_tipo";
${imports}

export const ARTIGOS: ArtigoBase[] = [${lista}];
`;
  writeFileSync(join(DIR_ARTIGOS, "index.ts"), conteudo);
}

async function main() {
  console.log(TEM_OPENAI ? "Texto: OpenAI" : "Texto: dry-run");
  console.log(TEM_PERPLEXITY ? "Pesquisa: Perplexity" : "Pesquisa: desativada");
  console.log(
    TEM_HIGGSFIELD ? "Imagem: Higgsfield" : TEM_IDEOGRAM ? "Imagem: Ideogram" : "Imagem: dry-run",
  );

  const pautaPath = process.env.PAUTA_CONTEUDO_PATH || join(__dirname, "pauta-conteudo.json");
  const pauta = JSON.parse(readFileSync(pautaPath, "utf8"));
  const pendentes = pauta
    .filter((p) => !p.publicado && p.status !== "revisao" && p.status !== "descartada")
    .slice(0, QUANTOS);

  if (VALIDAR_PAUTA) {
    console.log(`Pauta publicavel validada: ${pendentes.length} item(ns).`);
    return;
  }

  if (!pendentes.length) {
    console.log("Pauta vazia. Adicione temas em scripts/pauta-conteudo.json.");
    return;
  }

  const existentes = new Set(
    readdirSync(DIR_ARTIGOS).map((f) => f.replace(/\.ts$/, "")),
  );

  for (const item of pendentes) {
    const artigo = await gerarTexto(item);
    let slug = slugify(artigo.titulo);
    while (existentes.has(slug)) slug = `${slug}-${hojeISO().slice(5)}`;
    existentes.add(slug);
    const capa = await gerarCapa(slug, artigo.capaPrompt);
    escreverArtigo({ ...artigo, slug, capa, data: hojeISO() });
    item.publicado = true;
    console.log("Artigo gerado:", slug);
  }

  regenerarIndice();
  writeFileSync(pautaPath, JSON.stringify(pauta, null, 2));
  console.log(`Pronto: ${pendentes.length} artigo(s). Commit + push publicam na Vercel.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
