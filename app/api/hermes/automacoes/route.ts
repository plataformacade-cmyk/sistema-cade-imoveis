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
  "precos_bairro",
  "saude_sistema",
]);

function montarPayload(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { job: "todos" as JobAutomacaoHermes, dryRun: false };
  }
  const record = body as Record<string, unknown>;
  const job = typeof record.job === "string" && JOBS.has(record.job as JobAutomacaoHermes)
    ? (record.job as JobAutomacaoHermes)
    : "todos";
  return {
    job,
    dryRun: record.dryRun === true,
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

  const body = await request.json().catch(() => ({}));
  const payload = montarPayload(body);
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
