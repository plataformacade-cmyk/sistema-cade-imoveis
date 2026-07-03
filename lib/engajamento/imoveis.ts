import "server-only";

import { createHash } from "node:crypto";
import type { Sessao } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type TipoEventoEngajamentoImovel =
  | "visualizacao_detalhe"
  | "tempo_visualizacao"
  | "clique_interesse"
  | "interesse_registrado"
  | "compartilhamento";

export type EntradaEngajamentoImovel = {
  imovelId: string;
  tipo: TipoEventoEngajamentoImovel;
  sessao?: Sessao | null;
  visitanteId?: string | null;
  origem?: string | null;
  referrerHost?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  duracaoMs?: number | null;
  metadata?: Record<string, unknown>;
};

export type MetricaEngajamentoImovel = {
  visualizacoes: number;
  visitantesUnicos: number;
  duracaoMediaMs: number | null;
  cliquesInteresse: number;
  interessesRegistrados: number;
  compartilhamentos: number;
  taxaConversao: number | null;
  origemPrincipal: string | null;
  temperatura: "frio" | "morno" | "quente";
};

type EventoLinha = {
  imovel_id: string;
  tipo: TipoEventoEngajamentoImovel;
  usuario_id: string | null;
  visitante_hash: string | null;
  duracao_ms: number | null;
  origem: string | null;
  referrer_host: string | null;
  utm_source: string | null;
};

export const METRICA_ENGAJAMENTO_VAZIA: MetricaEngajamentoImovel = {
  visualizacoes: 0,
  visitantesUnicos: 0,
  duracaoMediaMs: null,
  cliquesInteresse: 0,
  interessesRegistrados: 0,
  compartilhamentos: 0,
  taxaConversao: null,
  origemPrincipal: null,
  temperatura: "frio",
};

function sanitizarTexto(valor: string | null | undefined, limite = 80) {
  const limpo = valor
    ?.replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limite);
  return limpo || null;
}

export function sanitizarReferrerHost(valor: string | null | undefined) {
  const texto = sanitizarTexto(valor, 200);
  if (!texto) return null;

  try {
    return new URL(texto).hostname.toLowerCase().slice(0, 80) || null;
  } catch {
    const host = texto
      .replace(/^https?:\/\//i, "")
      .split(/[/?#]/)[0]
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, "")
      .slice(0, 80);
    return host || null;
  }
}

function hashVisitante(visitanteId: string | null | undefined) {
  const limpo = sanitizarTexto(visitanteId, 120);
  if (!limpo) return null;
  const salt = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "cade-engajamento";
  return createHash("sha256").update(`${salt}:${limpo}`).digest("hex");
}

function sanitizarDuracao(valor: number | null | undefined) {
  if (valor == null) return null;
  if (!Number.isFinite(valor)) return null;
  const inteiro = Math.round(valor);
  if (inteiro < 0) return null;
  return Math.min(inteiro, 86_400_000);
}

function sanitizarMetadata(metadata: Record<string, unknown> | undefined) {
  const out: Record<string, unknown> = {};
  for (const [chave, valor] of Object.entries(metadata ?? {})) {
    if (!/^[a-z0-9_]{1,40}$/i.test(chave)) continue;
    if (typeof valor === "string") out[chave] = sanitizarTexto(valor, 120);
    else if (typeof valor === "number" && Number.isFinite(valor)) out[chave] = valor;
    else if (typeof valor === "boolean") out[chave] = valor;
  }
  return out;
}

export async function registrarEngajamentoImovel(
  entrada: EntradaEngajamentoImovel,
) {
  try {
    const admin = createAdminClient();
    const { data: imovel } = await admin
      .from("imoveis")
      .select("id, status")
      .eq("id", entrada.imovelId)
      .maybeSingle();

    if (!imovel || imovel.status !== "ativo") return;

    const referrerHost = sanitizarReferrerHost(entrada.referrerHost);
    const utmSource = sanitizarTexto(entrada.utmSource, 80);
    const origem =
      sanitizarTexto(entrada.origem, 80) ??
      utmSource ??
      referrerHost ??
      "direto";

    await admin.from("imovel_engajamento_eventos").insert({
      imovel_id: entrada.imovelId,
      usuario_id: entrada.sessao?.user.id ?? null,
      visitante_hash: hashVisitante(entrada.visitanteId),
      tipo: entrada.tipo,
      origem,
      referrer_host: referrerHost,
      utm_source: utmSource,
      utm_medium: sanitizarTexto(entrada.utmMedium, 80),
      utm_campaign: sanitizarTexto(entrada.utmCampaign, 120),
      duracao_ms: sanitizarDuracao(entrada.duracaoMs),
      metadata: sanitizarMetadata(entrada.metadata),
    });
  } catch {
    // Metrica nunca pode derrubar o fluxo principal.
  }
}

function labelOrigem(evento: EventoLinha) {
  if (evento.utm_source) return evento.utm_source;
  if (evento.referrer_host) return evento.referrer_host;
  if (evento.origem) return evento.origem;
  return "direto";
}

function calcularTemperatura(params: {
  visitantes: number;
  visualizacoes: number;
  cliques: number;
  interesses: number;
  compartilhamentos: number;
  duracaoMediaMs: number | null;
}) {
  const score =
    params.visitantes +
    params.visualizacoes * 0.5 +
    params.cliques * 3 +
    params.interesses * 8 +
    params.compartilhamentos * 2 +
    (params.duracaoMediaMs != null && params.duracaoMediaMs >= 30_000
      ? 3
      : params.duracaoMediaMs != null && params.duracaoMediaMs >= 10_000
        ? 1
        : 0);

  if (score >= 20) return "quente";
  if (score >= 6) return "morno";
  return "frio";
}

function agregarEventos(eventos: EventoLinha[]): MetricaEngajamentoImovel {
  if (eventos.length === 0) return { ...METRICA_ENGAJAMENTO_VAZIA };

  const visitantes = new Set<string>();
  const origens = new Map<string, number>();
  const duracoes: number[] = [];
  let visualizacoes = 0;
  let cliquesInteresse = 0;
  let interessesRegistrados = 0;
  let compartilhamentos = 0;

  for (const evento of eventos) {
    const visitante = evento.visitante_hash ?? evento.usuario_id;
    if (visitante) visitantes.add(visitante);

    const origem = labelOrigem(evento);
    origens.set(origem, (origens.get(origem) ?? 0) + 1);

    if (evento.tipo === "visualizacao_detalhe") visualizacoes++;
    if (evento.tipo === "tempo_visualizacao" && evento.duracao_ms != null) {
      duracoes.push(evento.duracao_ms);
    }
    if (evento.tipo === "clique_interesse") cliquesInteresse++;
    if (evento.tipo === "interesse_registrado") interessesRegistrados++;
    if (evento.tipo === "compartilhamento") compartilhamentos++;
  }

  const duracaoMediaMs =
    duracoes.length > 0
      ? Math.round(duracoes.reduce((acc, valor) => acc + valor, 0) / duracoes.length)
      : null;
  const origemPrincipal =
    Array.from(origens.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const taxaConversao =
    visualizacoes > 0 ? interessesRegistrados / visualizacoes : null;

  return {
    visualizacoes,
    visitantesUnicos: visitantes.size,
    duracaoMediaMs,
    cliquesInteresse,
    interessesRegistrados,
    compartilhamentos,
    taxaConversao,
    origemPrincipal,
    temperatura: calcularTemperatura({
      visitantes: visitantes.size,
      visualizacoes,
      cliques: cliquesInteresse,
      interesses: interessesRegistrados,
      compartilhamentos,
      duracaoMediaMs,
    }),
  };
}

export async function buscarMetricasEngajamentoImoveis(
  imovelIds: string[],
  dias: 7 | 30 = 30,
) {
  const ids = Array.from(new Set(imovelIds.filter(Boolean)));
  const mapa = new Map<string, MetricaEngajamentoImovel>();
  for (const id of ids) mapa.set(id, { ...METRICA_ENGAJAMENTO_VAZIA });
  if (ids.length === 0) return mapa;

  const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();
  const admin = createAdminClient();
  const { data } = await admin
    .from("imovel_engajamento_eventos")
    .select(
      "imovel_id, tipo, usuario_id, visitante_hash, duracao_ms, origem, referrer_host, utm_source",
    )
    .in("imovel_id", ids)
    .gte("criado_em", desde);

  const porImovel = new Map<string, EventoLinha[]>();
  for (const evento of (data ?? []) as EventoLinha[]) {
    const lista = porImovel.get(evento.imovel_id) ?? [];
    lista.push(evento);
    porImovel.set(evento.imovel_id, lista);
  }

  for (const id of ids) {
    mapa.set(id, agregarEventos(porImovel.get(id) ?? []));
  }

  return mapa;
}
