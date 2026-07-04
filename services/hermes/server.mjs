import http from "node:http";
import { timingSafeEqual } from "node:crypto";

const startedAt = new Date().toISOString();
const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || "127.0.0.1";
const serviceToken = process.env.HERMES_API_TOKEN || "";
const anthropicKey = process.env.ANTHROPIC_API_KEY || "";
const anthropicModel = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const anthropicVersion = process.env.ANTHROPIC_VERSION || "2023-06-01";

const MAX_BODY_BYTES = 128 * 1024;

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function bearerToken(req) {
  const header = req.headers.authorization || "";
  const [scheme, value] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" ? value ?? "" : "";
}

function safeEqual(a, b) {
  if (!a || !b) return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function isAuthorized(req) {
  return safeEqual(bearerToken(req), serviceToken);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error("payload_too_large"), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const text = Buffer.concat(chunks).toString("utf8");
        resolve(text ? JSON.parse(text) : {});
      } catch {
        reject(Object.assign(new Error("invalid_json"), { statusCode: 400 }));
      }
    });
    req.on("error", reject);
  });
}

function asText(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function asHistory(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((turn) => ({
      autor: turn?.autor === "usuario" ? "usuario" : "assistente",
      corpo: asText(turn?.corpo).slice(0, 4000),
    }))
    .filter((turn) => turn.corpo);
}

function toAnthropicMessages(history, pergunta) {
  const messages = [];
  for (const turn of history.slice(-10)) {
    messages.push({
      role: turn.autor === "usuario" ? "user" : "assistant",
      content: turn.corpo,
    });
  }
  messages.push({ role: "user", content: pergunta });
  return messages;
}

function extractText(data) {
  if (!Array.isArray(data?.content)) return "";
  return data.content
    .filter((block) => block?.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

async function callAnthropic({ systemPrompt, history, pergunta }) {
  if (!anthropicKey) {
    return { ok: false, status: 503, erro: "anthropic_not_configured" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": anthropicVersion,
      },
      body: JSON.stringify({
        model: anthropicModel,
        max_tokens: 350,
        system: systemPrompt,
        messages: toAnthropicMessages(history, pergunta),
      }),
    });

    if (!response.ok) {
      const requestId = response.headers.get("request-id") || response.headers.get("x-request-id");
      return {
        ok: false,
        status: 502,
        erro: "anthropic_error",
        providerStatus: response.status,
        requestId,
      };
    }

    const data = await response.json();
    const text = extractText(data);
    if (!text) {
      return { ok: false, status: 502, erro: "anthropic_empty_response" };
    }

    return {
      ok: true,
      resposta: text,
      sugereAtendente: /atendente|humano|suporte humano|equipe/i.test(text),
      modo: "hermes",
      model: anthropicModel,
      usage: data?.usage
        ? {
            input_tokens: data.usage.input_tokens,
            output_tokens: data.usage.output_tokens,
          }
        : undefined,
    };
  } catch (error) {
    return {
      ok: false,
      status: 502,
      erro: error?.name === "AbortError" ? "anthropic_timeout" : "anthropic_request_failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

async function handleSupportRespond(req, res) {
  if (!isAuthorized(req)) {
    return json(res, 401, { ok: false, erro: "unauthorized" });
  }

  try {
    const body = await readJson(req);
    const pergunta = asText(body?.pergunta).slice(0, 2000);
    const systemPrompt = asText(body?.systemPrompt).slice(0, 12000);
    if (!pergunta || !systemPrompt) {
      return json(res, 400, { ok: false, erro: "missing_required_fields" });
    }

    const result = await callAnthropic({
      systemPrompt,
      history: asHistory(body?.historico),
      pergunta,
    });

    return json(res, result.ok ? 200 : result.status || 502, result);
  } catch (error) {
    return json(res, error?.statusCode || 500, { ok: false, erro: error?.message || "internal_error" });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/healthz") {
    return json(res, 200, {
      ok: true,
      service: "hermes",
      stage: "ready",
      startedAt,
      anthropicConfigured: Boolean(anthropicKey),
      model: anthropicModel,
    });
  }

  if (req.method === "POST" && url.pathname === "/v1/support/respond") {
    return handleSupportRespond(req, res);
  }

  return json(res, 404, { ok: false, erro: "not_found" });
});

server.listen(port, host, () => {
  console.log(`Hermes listening on ${host}:${port}`);
});
