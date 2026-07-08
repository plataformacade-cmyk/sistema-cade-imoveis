import { NextResponse } from "next/server";
import {
  executarAutomacoesHermes,
  type JobAutomacaoHermes,
} from "@/lib/hermes/automacoes";
import { validarRequisicaoHermes } from "@/lib/hermes/auth";
import { registrarEventoAdmin } from "@/lib/log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const JOBS = new Set<JobAutomacaoHermes>([
  "todos",
  "suporte_temas",
  "negocios_travados",
  "repescagem_leads",
  "precos_bairro",
  "saude_sistema",
]);

type PayloadValido = {
  ok: true;
  payload: { job: JobAutomacaoHermes; dryRun: boolean };
};

type PayloadInvalido = {
  ok: false;
  erro: "json_invalido" | "payload_invalido" | "job_invalido";
};

async function montarPayload(request: Request): Promise<PayloadValido | PayloadInvalido> {
  let body: unknown;
  try {
    const texto = await request.text();
    if (!texto.trim()) return { ok: false, erro: "payload_invalido" };
    body = JSON.parse(texto);
  } catch {
    return { ok: false, erro: "json_invalido" };
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, erro: "payload_invalido" };
  }
  const record = body as Record<string, unknown>;
  if (typeof record.job !== "string" || !JOBS.has(record.job as JobAutomacaoHermes)) {
    return { ok: false, erro: "job_invalido" };
  }
  return {
    ok: true,
    payload: {
      job: record.job as JobAutomacaoHermes,
      dryRun: record.dryRun === true,
    },
  };
}

export async function POST(request: Request) {
  if (!validarRequisicaoHermes(request)) {
    await registrarEventoAdmin("hermes_contexto_negado", {
      severidade: "warn",
      payload: { rota: "automacoes", motivo: "unauthorized" },
    });
    return NextResponse.json({ ok: false, erro: "unauthorized" }, { status: 401 });
  }

  const resultadoPayload = await montarPayload(request);
  if (!resultadoPayload.ok) {
    await registrarEventoAdmin("hermes_automacao_executada", {
      severidade: "warn",
      payload: { erro: resultadoPayload.erro },
    });
    return NextResponse.json(
      { ok: false, erro: resultadoPayload.erro },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const payload = resultadoPayload.payload;
  try {
    const resultado = await executarAutomacoesHermes(payload);
    return NextResponse.json(resultado, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    await registrarEventoAdmin("hermes_automacao_executada", {
      severidade: "error",
      payload: {
        job: payload.job,
        erro: error instanceof Error ? error.message : "internal_error",
      },
    });
    return NextResponse.json({ ok: false, erro: "internal_error" }, { status: 500 });
  }
}
