import "server-only";
import type { Papel } from "@/lib/auth";
import { FAQ, systemPrompt } from "./base-conhecimento";

export type TurnoChat = { autor: "usuario" | "assistente" | "humano"; corpo: string };

export type RespostaAgente = {
  resposta: string;
  /** true quando o agente sugere escalar para um atendente humano. */
  sugereAtendente: boolean;
  /** "ia" quando respondeu via modelo; "basico" quando via FAQ local. */
  modo: "ia" | "basico";
};

const MODELO = process.env.OPENAI_MODELO_SUPORTE || "gpt-4o-mini";

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

/** Resposta via OpenAI quando há OPENAI_API_KEY; senão cai no modo básico. */
export async function responder(
  papel: Papel | "visitante",
  historico: TurnoChat[],
  pergunta: string,
): Promise<RespostaAgente> {
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
