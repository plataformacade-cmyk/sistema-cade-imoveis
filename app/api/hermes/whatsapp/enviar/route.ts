import { NextResponse } from "next/server";
import { validarRequisicaoHermes } from "@/lib/hermes/auth";
import {
  enviarWhatsappHermes,
  isWhatsappTemplate,
  type WhatsappTemplate,
} from "@/lib/hermes/whatsapp";
import { registrarEventoAdmin } from "@/lib/log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function montarPayload(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  const template = typeof record.template === "string" ? record.template : "";
  if (!isWhatsappTemplate(template)) return null;
  return {
    usuarioId: typeof record.usuarioId === "string" ? record.usuarioId : undefined,
    telefone: typeof record.telefone === "string" ? record.telefone : undefined,
    template: template as WhatsappTemplate,
    variaveis: Array.isArray(record.variaveis)
      ? record.variaveis.filter((item): item is string => typeof item === "string")
      : undefined,
    dryRun: record.dryRun === true,
    teste: record.teste === true,
  };
}

export async function POST(request: Request) {
  if (!validarRequisicaoHermes(request)) {
    await registrarEventoAdmin("whatsapp_envio_bloqueado", {
      severidade: "warn",
      payload: { motivo: "unauthorized" },
    });
    return NextResponse.json({ ok: false, erro: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const payload = montarPayload(body);
  if (!payload) {
    return NextResponse.json({ ok: false, erro: "payload_invalido" }, { status: 400 });
  }

  const resultado = await enviarWhatsappHermes(payload);
  return NextResponse.json(resultado, {
    status: resultado.status,
    headers: { "Cache-Control": "no-store" },
  });
}
