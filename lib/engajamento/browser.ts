"use client";

const CHAVE_VISITANTE = "cade:visitante-id";

type TipoEventoPublicoEngajamento =
  | "visualizacao_detalhe"
  | "tempo_visualizacao"
  | "compartilhamento";

export type ContextoEngajamentoBrowser = {
  visitanteId: string;
  origem: string;
  referrerHost: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
};

function texto(valor: string | null | undefined, limite = 120) {
  const limpo = valor
    ?.replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limite);
  return limpo || null;
}

function gerarId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

export function obterVisitanteId() {
  try {
    const existente = localStorage.getItem(CHAVE_VISITANTE);
    if (existente) return existente;
    const novo = gerarId();
    localStorage.setItem(CHAVE_VISITANTE, novo);
    return novo;
  } catch {
    return gerarId();
  }
}

export function coletarContextoEngajamento(): ContextoEngajamentoBrowser {
  const params = new URLSearchParams(window.location.search);
  const utmSource = texto(params.get("utm_source"), 80);
  const utmMedium = texto(params.get("utm_medium"), 80);
  const utmCampaign = texto(params.get("utm_campaign"), 120);
  let referrerHost: string | null = null;

  try {
    referrerHost = document.referrer
      ? new URL(document.referrer).hostname.toLowerCase().slice(0, 80)
      : null;
  } catch {
    referrerHost = null;
  }

  return {
    visitanteId: obterVisitanteId(),
    origem: utmSource ?? referrerHost ?? "direto",
    referrerHost,
    utmSource,
    utmMedium,
    utmCampaign,
  };
}

export function enviarEngajamentoImovel(
  imovelId: string,
  tipo: TipoEventoPublicoEngajamento,
  extra: { duracaoMs?: number; metadata?: Record<string, unknown> } = {},
) {
  const body = JSON.stringify({
    tipo,
    ...coletarContextoEngajamento(),
    duracaoMs: extra.duracaoMs,
    metadata: extra.metadata,
  });
  const url = `/api/imoveis/${encodeURIComponent(imovelId)}/engajamento`;

  if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon(url, blob)) return;
  }

  fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}
