import { NextResponse, type NextRequest } from "next/server";
import { getSessao } from "@/lib/auth";
import {
  registrarEngajamentoImovel,
  type TipoEventoEngajamentoImovel,
} from "@/lib/engajamento/imoveis";

const TIPOS_PUBLICOS = new Set<TipoEventoEngajamentoImovel>([
  "visualizacao_detalhe",
  "tempo_visualizacao",
  "compartilhamento",
]);

function texto(valor: unknown) {
  return typeof valor === "string" ? valor : null;
}

function numero(valor: unknown) {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : null;
}

function metadata(valor: unknown) {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return undefined;
  return valor as Record<string, unknown>;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const tipo = texto(body?.tipo) as TipoEventoEngajamentoImovel | null;
    if (!tipo || !TIPOS_PUBLICOS.has(tipo)) {
      return new NextResponse(null, { status: 204 });
    }

    const sessao = await getSessao();
    await registrarEngajamentoImovel({
      imovelId: id,
      tipo,
      sessao,
      visitanteId: texto(body?.visitanteId),
      origem: texto(body?.origem),
      referrerHost: texto(body?.referrerHost) ?? request.headers.get("referer"),
      utmSource: texto(body?.utmSource),
      utmMedium: texto(body?.utmMedium),
      utmCampaign: texto(body?.utmCampaign),
      duracaoMs: numero(body?.duracaoMs),
      metadata: metadata(body?.metadata),
    });
  } catch {
    // Nao expor detalhes nem quebrar a navegacao publica.
  }

  return new NextResponse(null, { status: 204 });
}
