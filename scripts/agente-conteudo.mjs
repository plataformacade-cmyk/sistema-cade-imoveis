#!/usr/bin/env node
/**
 * AGENTE DE CONTEÚDO AUTOMÁTICO — Cadê Imóveis
 * ------------------------------------------------------------------
 * Gera artigos de blog otimizados para SEO/GEO/AEO (resposta-primeiro,
 * dados, FAQ, links internos) e suas imagens de capa, no MESMO formato dos
 * artigos escritos à mão (app/blog/_artigos/<slug>.ts). Roda 3x/dia via
 * GitHub Actions (.github/workflows/agente-conteudo.yml) — o commit do
 * resultado dispara o deploy na Vercel.
 *
 * Texto: API da OpenAI.   Imagens: API do Ideogram.
 * ⚠️ As CHAVES são PLACEHOLDERS (o João gera depois). Sem chave real, o
 * script roda em modo "dry-run": monta um artigo de exemplo e NÃO chama as
 * APIs — assim dá pra testar o encanamento sem custo.
 *
 * Uso:  node scripts/agente-conteudo.mjs            (lê a pauta, gera os de hoje)
 *       node scripts/agente-conteudo.mjs --quantos 3
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(__dirname, "..");
const DIR_ARTIGOS = join(RAIZ, "app", "blog", "_artigos");
const DIR_CAPAS = join(RAIZ, "public", "blog");

// ─── PLACEHOLDERS DAS CHAVES (João preenche via env/secrets depois) ───
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "COLOQUE_SUA_CHAVE_OPENAI_AQUI";
const OPENAI_MODELO = process.env.OPENAI_MODELO || "gpt-5"; // ajustar quando configurar
const IDEOGRAM_API_KEY = process.env.IDEOGRAM_API_KEY || "COLOQUE_SUA_CHAVE_IDEOGRAM_AQUI";
const TEM_CHAVES =
  !OPENAI_API_KEY.startsWith("COLOQUE_") && !IDEOGRAM_API_KEY.startsWith("COLOQUE_");

const QUANTOS = Number(process.argv[process.argv.indexOf("--quantos") + 1]) || 3;

// ─── Prompt do sistema: as técnicas de GEO/AEO (pesquisa do vault) ───
const SISTEMA = `Você é redator(a) SEO/GEO da Cadê Imóveis, marketplace imobiliário de Uberlândia/MG.
Escreva um artigo de blog em PT-BR aplicando estas técnicas comprovadas de ranqueamento e de ser citado por IAs:
- RESPOSTA-PRIMEIRO: o 1º parágrafo responde a dúvida do título em 40-60 palavras, direto.
- Estrutura: 7-9 seções marcadas com "## "; blocos de 120-180 palavras; cada um se sustenta sozinho.
- Dados/estatísticas concretas e plausíveis de Uberlândia (faixas R$, %, prazos).
- ~1600-2000 palavras. Voz humana, transparente, foco Uberlândia. NÃO use travessão "—".
- 2-4 links internos no formato markdown [texto](/rota) para /plataforma, /imoveis-em/<bairro>, /como-funciona/interessado ou /proprietario.
- FAQ com 3-5 perguntas reais e respostas de 40-80 palavras.
Responda APENAS um JSON: { "titulo","resumo","categoria","tags":[],"capaPrompt","conteudo":[],"faq":[{"pergunta","resposta"}] }.
"capaPrompt" é uma descrição em inglês para gerar a imagem de capa (foto editorial, sem texto).
"categoria" ∈ {"Financiamento","Comprar","Alugar","Dicas","Bairros de Uberlândia"}.`;

function slugify(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
function hojeISO() {
  // GitHub Actions injeta a data; localmente passe DATA_HOJE no env se quiser fixar.
  return process.env.DATA_HOJE || new Date().toISOString().slice(0, 10);
}

/** Chama a OpenAI (texto). Placeholder: estrutura pronta, troque pela sua conta. */
async function gerarTexto(tema) {
  if (!TEM_CHAVES) {
    // DRY-RUN: artigo de exemplo (sem chamar API).
    return {
      titulo: `${tema} — guia da Cadê`,
      resumo: `Guia prático sobre ${tema.toLowerCase()} em Uberlândia. (Conteúdo de exemplo — configure a chave da OpenAI para gerar de verdade.)`,
      categoria: "Dicas",
      tags: ["uberlandia", "guia", slugify(tema)],
      capaPrompt: `editorial real estate photo about ${tema}, Uberlandia Brazil, no text, no people`,
      conteudo: [
        `Este é um artigo de exemplo gerado em modo dry-run sobre ${tema}. Configure OPENAI_API_KEY para o agente escrever conteúdo real, otimizado para SEO e para ser citado pelas IAs.`,
        "## Como funciona o agente",
        "Quando as chaves estiverem configuradas, este texto é substituído por um artigo completo de 1600-2000 palavras, com resposta-primeiro, dados, links internos e FAQ. Veja imóveis na [plataforma da Cadê](/plataforma).",
      ],
      faq: [
        { pergunta: `O que é ${tema}?`, resposta: "Conteúdo de exemplo. Configure a chave da OpenAI para gerar a resposta real." },
      ],
    };
  }
  // ── CHAMADA REAL (OpenAI) ──
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: OPENAI_MODELO,
      messages: [
        { role: "system", content: SISTEMA },
        { role: "user", content: `Tema do artigo: ${tema}` },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return JSON.parse(j.choices[0].message.content);
}

/** Gera a capa no Ideogram e salva em public/blog/. Placeholder do fluxo. */
async function gerarCapa(slug, capaPrompt) {
  if (!TEM_CHAVES) return "/blog/skyline.webp"; // dry-run: reaproveita uma capa existente
  // ── CHAMADA REAL (Ideogram) ──
  const r = await fetch("https://api.ideogram.ai/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Api-Key": IDEOGRAM_API_KEY },
    body: JSON.stringify({
      image_request: { prompt: capaPrompt, aspect_ratio: "ASPECT_16_10", model: "V_2", magic_prompt_option: "AUTO" },
    }),
  });
  if (!r.ok) throw new Error(`Ideogram ${r.status}: ${await r.text()}`);
  const j = await r.json();
  const urlImg = j.data?.[0]?.url;
  const bin = Buffer.from(await (await fetch(urlImg)).arrayBuffer());
  const destino = `/blog/${slug}.webp`;
  writeFileSync(join(DIR_CAPAS, `${slug}.webp`), bin);
  return destino;
}

/** Escreve o arquivo do artigo no formato ArtigoBase. */
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

/** Regenera app/blog/_artigos/index.ts a partir dos arquivos do diretório. */
function regenerarIndice() {
  const arquivos = readdirSync(DIR_ARTIGOS)
    .filter((f) => f.endsWith(".ts") && f !== "_tipo.ts" && f !== "index.ts")
    .sort();
  const imports = arquivos
    .map((f, i) => `import { artigo as a${i} } from "./${f.replace(/\.ts$/, "")}";`)
    .join("\n");
  const lista = arquivos.map((_, i) => `a${i}`).join(", ");
  const conteudo = `// GERADO AUTOMATICAMENTE — não edite à mão (ver scripts/agente-conteudo.mjs).
import type { ArtigoBase } from "./_tipo";
${imports}

export const ARTIGOS: ArtigoBase[] = [${lista}];
`;
  writeFileSync(join(DIR_ARTIGOS, "index.ts"), conteudo);
}

async function main() {
  console.log(TEM_CHAVES ? "Modo: PRODUÇÃO (chaves configuradas)" : "Modo: DRY-RUN (sem chaves — conteúdo de exemplo)");
  const pauta = JSON.parse(readFileSync(join(__dirname, "pauta-conteudo.json"), "utf8"));
  const pendentes = pauta.filter((p) => !p.publicado).slice(0, QUANTOS);
  if (!pendentes.length) { console.log("Pauta vazia. Adicione temas em scripts/pauta-conteudo.json."); return; }

  const existentes = new Set(readdirSync(DIR_ARTIGOS).map((f) => f.replace(/\.ts$/, "")));
  for (const item of pendentes) {
    const artigo = await gerarTexto(item.tema);
    let slug = slugify(artigo.titulo);
    while (existentes.has(slug)) slug = `${slug}-${hojeISO().slice(5)}`;
    existentes.add(slug);
    const capa = await gerarCapa(slug, artigo.capaPrompt);
    escreverArtigo({ ...artigo, slug, capa, data: hojeISO() });
    item.publicado = true;
    console.log("✓ artigo gerado:", slug);
  }
  regenerarIndice();
  writeFileSync(join(__dirname, "pauta-conteudo.json"), JSON.stringify(pauta, null, 2));
  console.log(`Pronto: ${pendentes.length} artigo(s). Commit + push publicam na Vercel.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
