import { NextResponse } from "next/server";
import {
  buscarContextoHermes,
  type EscopoContextoHermes,
  type PedidoContextoHermes,
} from "@/lib/hermes/contexto";
import { validarRequisicaoHermes } from "@/lib/hermes/auth";
import { registrarEventoAdmin } from "@/lib/log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ESCOPOS = new Set<EscopoContextoHermes>([
  "sistema",
  "imovel",
  "metricas_imovel",
  "negocio",
  "suporte",
]);

function montarPedido(body: unknown): PedidoContextoHermes | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  const escopo = typeof record.escopo === "string" ? record.escopo : "";
  if (!ESCOPOS.has(escopo as EscopoContextoHermes)) return null;
  return {
    escopo: escopo as EscopoContextoHermes,
    id: typeof record.id === "string" ? record.id : undefined,
    limiteMensagens:
      typeof record.limiteMensagens === "number" ? record.limiteMensagens : undefined,
  };
}

export async function POST(request: Request) {
  if (!validarRequisicaoHermes(request)) {
    await registrarEventoAdmin("hermes_contexto_negado", {
      severidade: "warn",
      payload: { motivo: "unauthorized" },
    });
    return NextResponse.json({ ok: false, erro: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const pedido = montarPedido(body);
  if (!pedido) {
    return NextResponse.json({ ok: false, erro: "payload_invalido" }, { status: 400 });
  }

  try {
    const contexto = await buscarContextoHermes(pedido);
    await registrarEventoAdmin("hermes_contexto_lido", {
      entidadeId: pedido.id,
      payload: { escopo: pedido.escopo, tem_id: Boolean(pedido.id) },
    });
    return NextResponse.json(
      {
        ok: true,
        escopo: pedido.escopo,
        contexto,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    const status =
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      typeof error.statusCode === "number"
        ? error.statusCode
        : 500;
    const erro = error instanceof Error ? error.message : "internal_error";
    return NextResponse.json({ ok: false, erro }, { status });
  }
}
