#!/usr/bin/env node
/**
 * Gera e revisa sugestoes de pauta a partir de duvidas reais.
 *
 * Sem Hermes: usa regras deterministicas e sanitizacao local.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(__dirname, "..");
const PATH_SUGESTOES =
  process.env.PAUTAS_REAIS_PATH || join(__dirname, "pautas-reais.json");
const PATH_PAUTA =
  process.env.PAUTA_CONTEUDO_PATH || join(__dirname, "pauta-conteudo.json");

const COMANDO = process.argv[2] || "listar";
const USA_FIXTURE = process.argv.includes("--fixture");
const IDX_ID = process.argv.indexOf("--id");
const ID = IDX_ID >= 0 ? process.argv[IDX_ID + 1] : null;

const REGRAS = [
  {
    chave: "documentos-locacao",
    tema: "Quais documentos sao pedidos para alugar um imovel em Uberlandia",
    persona: "locatario",
    intencao: "entender documentos, garantias e aprovacao para locacao",
    origemPadrao: "suporte",
    palavras: ["documento", "alugar", "locacao", "contrato de aluguel", "fiador"],
  },
  {
    chave: "garantias-locacao",
    tema: "Seguro-fianca, caucao ou fiador: como escolher a garantia de aluguel",
    persona: "locatario",
    intencao: "comparar garantias de locacao antes de enviar proposta",
    origemPadrao: "negociacao",
    palavras: ["seguro fianca", "caucao", "fiador", "garantia", "aluguel"],
  },
  {
    chave: "documentos-venda",
    tema: "Checklist de documentos para vender um imovel com seguranca",
    persona: "proprietario",
    intencao: "preparar documentacao antes de negociar a venda",
    origemPadrao: "suporte",
    palavras: ["documento", "vender", "certidao", "matricula", "escritura"],
  },
  {
    chave: "cnpj-vendedor",
    tema: "Por que certidoes de empresas do vendedor podem impactar a compra",
    persona: "comprador",
    intencao: "entender risco juridico de empresa aberta, CNPJ e divida ativa",
    origemPadrao: "juridico",
    palavras: ["cnpj", "empresa", "divida ativa", "certidao", "vendedor"],
  },
  {
    chave: "proposta-negociacao",
    tema: "Como fazer uma proposta de compra sem perder a oportunidade",
    persona: "comprador",
    intencao: "negociar valor, condicoes e contraproposta",
    origemPadrao: "negociacao",
    palavras: ["proposta", "contraproposta", "negociar", "valor", "oferta"],
  },
  {
    chave: "visita-imovel",
    tema: "O que observar durante a visita a um imovel",
    persona: "comprador",
    intencao: "avaliar imovel antes de proposta ou aluguel",
    origemPadrao: "negociacao",
    palavras: ["visita", "vistoria", "agendar", "conhecer", "horario"],
  },
  {
    chave: "cartorio-custos",
    tema: "ITBI, escritura e registro: custos que aparecem depois da proposta aceita",
    persona: "comprador",
    intencao: "planejar custos cartoriais da compra",
    origemPadrao: "juridico",
    palavras: ["itbi", "cartorio", "escritura", "registro", "custas"],
  },
  {
    chave: "anunciar-imovel",
    tema: "Como anunciar um imovel com informacoes que geram mais interesse",
    persona: "proprietario",
    intencao: "melhorar anuncio, fotos, preco e descricao",
    origemPadrao: "suporte",
    palavras: ["anunciar", "anuncio", "foto", "descricao", "preco"],
  },
  {
    chave: "bairros-rotina",
    tema: "Como escolher bairro em Uberlandia considerando rotina, escola e trabalho",
    persona: "comprador",
    intencao: "comparar bairros por rotina e prioridades",
    origemPadrao: "suporte",
    palavras: ["bairro", "escola", "trabalho", "perto", "regiao"],
  },
];

function carregarEnvLocal() {
  for (const nome of [".env.local", ".env"]) {
    const path = join(RAIZ, nome);
    if (!existsSync(path)) continue;
    for (const linha of readFileSync(path, "utf8").split(/\r?\n/)) {
      const match = linha.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
      if (!match) continue;
      const [, chave, valorBruto] = match;
      if (process.env[chave]) continue;
      let valor = valorBruto.trim();
      if (
        (valor.startsWith('"') && valor.endsWith('"')) ||
        (valor.startsWith("'") && valor.endsWith("'"))
      ) {
        valor = valor.slice(1, -1);
      }
      process.env[chave] = valor.replace(/\uFEFF/g, "").trim();
    }
  }
}

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

function slugify(s) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function sanitizar(texto) {
  return String(texto || "")
    .replace(/\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, "[email]")
    .replace(/\b(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9\s*)?\d{4}[-.\s]?\d{4}\b/g, "[telefone]")
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[cpf]")
    .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, "[cnpj]")
    .replace(/https?:\/\/\S+/gi, "[link]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

function inferirOrigem(origem, texto, regra) {
  if (origem !== "suporte") return origem;
  const t = texto.toLowerCase();
  if (["proposta", "visita", "contraproposta", "negociar"].some((p) => t.includes(p))) {
    return "negociacao";
  }
  if (["itbi", "certidao", "cartorio", "contrato", "cnpj"].some((p) => t.includes(p))) {
    return "juridico";
  }
  return regra.origemPadrao;
}

function scoreRegra(texto, regra) {
  const t = texto.toLowerCase();
  return regra.palavras.reduce((total, palavra) => total + (t.includes(palavra) ? 1 : 0), 0);
}

function agruparSinais(sinais) {
  const porRegra = new Map();
  for (const sinal of sinais) {
    const texto = String(sinal.texto || "");
    for (const regra of REGRAS) {
      const score = scoreRegra(texto, regra);
      if (score <= 0) continue;
      const atual = porRegra.get(regra.chave) || {
        regra,
        score: 0,
        origens: new Set(),
        amostras: [],
      };
      atual.score += score;
      atual.origens.add(inferirOrigem(sinal.origem, texto, regra));
      if (atual.amostras.length < 3) {
        atual.amostras.push({
          origem: sinal.origem,
          trecho: sanitizar(texto),
          criado_em: sinal.criado_em,
        });
      }
      porRegra.set(regra.chave, atual);
    }
  }

  return [...porRegra.values()]
    .filter((item) => item.score >= 2 || item.amostras.length >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
}

function sugestaoId(regra) {
  return `real-${slugify(regra.tema)}`;
}

function montarSugestoes(agrupados, existentes) {
  const porId = new Map(existentes.map((item) => [item.id, item]));
  const agora = agoraISO();

  for (const item of agrupados) {
    const id = sugestaoId(item.regra);
    const anterior = porId.get(id);
    if (anterior?.status === "aprovada" || anterior?.status === "descartada") continue;

    porId.set(id, {
      id,
      tema: item.regra.tema,
      status: anterior?.status || "revisao",
      origem: [...item.origens].sort(),
      persona: item.regra.persona,
      intencao: item.regra.intencao,
      score: item.score,
      sinais: item.amostras,
      criado_em: anterior?.criado_em || agora,
      atualizado_em: agora,
    });
  }

  return [...porId.values()].sort((a, b) => {
    const rank = { revisao: 0, aprovada: 1, descartada: 2 };
    return (rank[a.status] ?? 9) - (rank[b.status] ?? 9) || (b.score ?? 0) - (a.score ?? 0);
  });
}

async function buscarDadosSupabase() {
  carregarEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPA_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SROLE;
  if (!url || !key) {
    throw new Error("Supabase ausente. Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const sinais = [];

  const { data: suporte, error: erroSuporte } = await supabase
    .from("suporte_mensagens")
    .select("corpo, autor, criado_em")
    .eq("autor", "usuario")
    .order("criado_em", { ascending: false })
    .limit(250);
  if (erroSuporte) console.warn("Nao foi possivel ler suporte_mensagens:", erroSuporte.message);
  for (const msg of suporte ?? []) {
    sinais.push({ origem: "suporte", texto: msg.corpo, criado_em: msg.criado_em });
  }

  const { data: mensagens, error: erroMensagens } = await supabase
    .from("mensagens")
    .select("corpo, tipo, criado_em")
    .order("criado_em", { ascending: false })
    .limit(250);
  if (erroMensagens) console.warn("Nao foi possivel ler mensagens:", erroMensagens.message);
  for (const msg of mensagens ?? []) {
    if (msg.tipo && msg.tipo !== "texto") continue;
    sinais.push({ origem: "negociacao", texto: msg.corpo, criado_em: msg.criado_em });
  }

  return sinais.filter((s) => sanitizar(s.texto).length >= 12);
}

function dadosFixture() {
  return [
    {
      origem: "suporte",
      texto: "Quais documentos preciso mandar para alugar apartamento? Tenho duvida entre fiador e seguro fianca.",
      criado_em: agoraISO(),
    },
    {
      origem: "negociacao",
      texto: "Depois da visita, quero mandar proposta mas nao sei como negociar valor e caucao.",
      criado_em: agoraISO(),
    },
    {
      origem: "suporte",
      texto: "O vendedor tem CNPJ e empresa aberta. Isso pode travar escritura ou certidao?",
      criado_em: agoraISO(),
    },
  ];
}

async function gerar() {
  const existentes = lerJson(PATH_SUGESTOES, []);
  const sinais = USA_FIXTURE ? dadosFixture() : await buscarDadosSupabase();
  const sugestoes = montarSugestoes(agruparSinais(sinais), existentes);
  salvarJson(PATH_SUGESTOES, sugestoes);
  console.log(
    `Sugestoes atualizadas: ${sugestoes.filter((s) => s.status === "revisao").length} em revisao, ${sugestoes.length} no total.`,
  );
}

function listar() {
  const sugestoes = lerJson(PATH_SUGESTOES, []);
  if (!sugestoes.length) {
    console.log("Nenhuma sugestao. Rode: node scripts/pauta-reais.mjs gerar --fixture");
    return;
  }
  for (const s of sugestoes) {
    console.log(`${s.id} | ${s.status} | ${s.origem.join(",")} | ${s.tema}`);
  }
}

function aprovar() {
  if (!ID) throw new Error("Informe --id <id>.");
  const sugestoes = lerJson(PATH_SUGESTOES, []);
  const sugestao = sugestoes.find((s) => s.id === ID);
  if (!sugestao) throw new Error(`Sugestao nao encontrada: ${ID}`);

  sugestao.status = "aprovada";
  sugestao.aprovada_em = agoraISO();
  sugestao.atualizado_em = sugestao.aprovada_em;
  salvarJson(PATH_SUGESTOES, sugestoes);

  const pauta = lerJson(PATH_PAUTA, []);
  const existe = pauta.some(
    (item) => item.pauta_id === sugestao.id || item.tema.toLowerCase() === sugestao.tema.toLowerCase(),
  );
  if (!existe) {
    pauta.push({
      tema: sugestao.tema,
      publicado: false,
      status: "aprovada",
      origem: sugestao.origem,
      persona: sugestao.persona,
      intencao: sugestao.intencao,
      pauta_id: sugestao.id,
      criado_em: agoraISO(),
    });
    salvarJson(PATH_PAUTA, pauta);
  }

  console.log(existe ? "Sugestao ja estava na pauta publicavel." : "Sugestao aprovada e enviada para pauta-conteudo.json.");
}

function descartar() {
  if (!ID) throw new Error("Informe --id <id>.");
  const sugestoes = lerJson(PATH_SUGESTOES, []);
  const sugestao = sugestoes.find((s) => s.id === ID);
  if (!sugestao) throw new Error(`Sugestao nao encontrada: ${ID}`);
  sugestao.status = "descartada";
  sugestao.descartada_em = agoraISO();
  sugestao.atualizado_em = sugestao.descartada_em;
  salvarJson(PATH_SUGESTOES, sugestoes);
  console.log("Sugestao descartada.");
}

async function main() {
  if (COMANDO === "gerar") return gerar();
  if (COMANDO === "listar") return listar();
  if (COMANDO === "aprovar") return aprovar();
  if (COMANDO === "descartar") return descartar();
  throw new Error(`Comando desconhecido: ${COMANDO}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
