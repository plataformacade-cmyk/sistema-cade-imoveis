import "server-only";
import type { Papel } from "@/lib/auth";
import { FAQ, systemPrompt } from "./base-conhecimento";

export type TurnoChat = { autor: "usuario" | "assistente" | "humano"; corpo: string };

export type RespostaAgente = {
  resposta: string;
  /** true quando o agente sugere escalar para um atendente humano. */
  sugereAtendente: boolean;
  /** Origem da resposta: Hermes, IA direta, consultor de busca ou FAQ local. */
  modo: "hermes" | "ia" | "basico" | "consultor";
};

const MODELO = process.env.OPENAI_MODELO_SUPORTE || "gpt-4o-mini";
const HERMES_TIMEOUT_MS = 18_000;

/** Normaliza para casar gatilhos (sem acento, minúsculo). */
function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Modo básico (sem IA): casa a pergunta com a FAQ por palavra-chave. */
function responderBasico(papel: Papel | "visitante", pergunta: string): RespostaAgente {
  const q = normalizar(pergunta);
  let melhor: { item: (typeof FAQ)[number]; pontos: number } | null = null;
  for (const item of FAQ) {
    if (item.papeis && papel !== "visitante" && !item.papeis.includes(papel)) continue;
    let pontos = 0;
    for (const g of item.gatilhos) if (q.includes(normalizar(g))) pontos += 1;
    if (pontos > 0 && (!melhor || pontos > melhor.pontos)) melhor = { item, pontos };
  }
  if (melhor) {
    return { resposta: melhor.item.resposta, sugereAtendente: false, modo: "basico" };
  }
  return {
    resposta:
      "Boa pergunta! Não tenho certeza dessa por aqui. Posso te conectar com um " +
      "atendente da Cadê — é só tocar em \"Falar com atendente\".",
    sugereAtendente: true,
    modo: "basico",
  };
}

/** Tenta delegar ao Hermes quando o serviço externo está configurado. */
async function responderHermes(
  papel: Papel | "visitante",
  historico: TurnoChat[],
  pergunta: string,
): Promise<RespostaAgente | null> {
  const baseUrl = process.env.HERMES_API_URL?.replace(/\/+$/, "");
  const token = process.env.HERMES_API_TOKEN;
  if (!baseUrl || !token) {
    console.warn("[hermes] fallback: env ausente", {
      hasUrl: Boolean(baseUrl),
      hasToken: Boolean(token),
    });
    return null;
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), HERMES_TIMEOUT_MS);
    const response = await fetch(`${baseUrl}/v1/support/respond`, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        papel,
        historico: historico.slice(-10),
        pergunta,
        systemPrompt: systemPrompt(papel),
      }),
    }).finally(() => clearTimeout(timer));

    if (!response.ok) {
      console.warn("[hermes] fallback: resposta nao ok", { status: response.status });
      return null;
    }
    const data = await response.json();
    const texto = typeof data?.resposta === "string" ? data.resposta.trim() : "";
    if (!texto) {
      console.warn("[hermes] fallback: resposta vazia");
      return null;
    }

    return {
      resposta: texto,
      sugereAtendente: Boolean(data?.sugereAtendente),
      modo: "hermes",
    };
  } catch (error) {
    const cause = error instanceof Error && "cause" in error ? error.cause : null;
    console.warn("[hermes] fallback: erro de rede", {
      name: error instanceof Error ? error.name : "unknown",
      message: error instanceof Error ? error.message : "unknown",
      cause:
        cause && typeof cause === "object" && "code" in cause
          ? String(cause.code)
          : undefined,
    });
    return null;
  }
}

export async function responder(
  papel: Papel | "visitante",
  historico: TurnoChat[],
  pergunta: string,
): Promise<RespostaAgente> {
  const respostaHermes = await responderHermes(papel, historico, pergunta);
  if (respostaHermes) return respostaHermes;

  const chave = process.env.OPENAI_API_KEY;
  // Sem chave configurada → modo básico (a plataforma segue funcionando).
  if (!chave) return responderBasico(papel, pergunta);

  try {
    const mensagens = [
      { role: "system", content: systemPrompt(papel) },
      ...historico.slice(-8).map((t) => ({
        role: t.autor === "usuario" ? "user" : "assistant",
        content: t.corpo,
      })),
      { role: "user", content: pergunta },
    ];

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15_000);
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${chave}`,
      },
      body: JSON.stringify({
        model: MODELO,
        messages: mensagens,
        temperature: 0.3,
        max_tokens: 300,
      }),
    }).finally(() => clearTimeout(timer));

    if (!r.ok) return responderBasico(papel, pergunta);
    const data = await r.json();
    const texto: string = data?.choices?.[0]?.message?.content?.trim() ?? "";
    if (!texto) return responderBasico(papel, pergunta);

    const sugereAtendente = /atendente|humano|suporte humano|equipe/i.test(texto);
    return { resposta: texto, sugereAtendente, modo: "ia" };
  } catch {
    // Qualquer falha de rede/modelo → não derruba o chat, responde no básico.
    return responderBasico(papel, pergunta);
  }
}
