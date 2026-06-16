"use server";

import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { registrarEvento } from "@/lib/log";
import { revalidatePath } from "next/cache";
import { LIMITE_ESCRITURA } from "@/lib/contrato";

export type ContratoState = { error?: string; message?: string };

/**
 * Gera o contrato de um negócio:
 * - Cria um registro em `contratos` (status 'gerado', gerado_em=now, tipo=negocio.tipo).
 * - Em vendas, aplica a regra dos 30 SM: se valor_acordado > 30*SM, marca
 *   negocios.escritura_publica = true.
 * - Loga contrato_gerado.
 *
 * Recebe FormData (form action): negocio_id.
 */
export async function gerarContrato(
  _prev: ContratoState,
  formData: FormData,
): Promise<ContratoState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessão expirada. Entre novamente." };

  const negocio_id = String(formData.get("negocio_id") ?? "");
  if (!negocio_id) return { error: "Negócio não identificado." };

  const supabase = await createClient();

  const { data: negocio, error: erroNegocio } = await supabase
    .from("negocios")
    .select("id, tipo, valor_acordado, escritura_publica")
    .eq("id", negocio_id)
    .maybeSingle();

  if (erroNegocio || !negocio)
    return { error: "Não foi possível carregar o negócio." };

  // Regra dos 30 salários mínimos: só se aplica a vendas.
  let exigeEscritura = false;
  if (
    negocio.tipo === "venda" &&
    negocio.valor_acordado != null &&
    negocio.valor_acordado > LIMITE_ESCRITURA
  ) {
    exigeEscritura = true;
  }

  // Atualiza a flag no negócio quando a regra a torna obrigatória.
  if (exigeEscritura && !negocio.escritura_publica) {
    const { error: erroUpdate } = await supabase
      .from("negocios")
      .update({ escritura_publica: true })
      .eq("id", negocio_id);
    if (erroUpdate)
      return { error: "Não foi possível atualizar o negócio. Tente novamente." };
  }

  const { data: contrato, error: erroContrato } = await supabase
    .from("contratos")
    .insert({
      negocio_id,
      tipo: negocio.tipo,
      status: "gerado",
      gerado_em: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (erroContrato || !contrato)
    return { error: "Não foi possível gerar o contrato. Tente novamente." };

  await registrarEvento("contrato_gerado", {
    entidadeId: negocio_id,
    payload: {
      contrato_id: contrato.id,
      tipo: negocio.tipo,
      escritura_publica: exigeEscritura || negocio.escritura_publica,
    },
  });

  revalidatePath(`/painel/negocios/${negocio_id}/contrato`);
  revalidatePath(`/painel/negocios/${negocio_id}`);
  return { message: "Contrato gerado." };
}

/**
 * Marca um contrato como assinado (status 'assinado', assinado_em=now).
 * Opcionalmente grava a url_pdf do documento assinado.
 * Loga contrato_assinado.
 *
 * Recebe FormData (form action): contrato_id, negocio_id (p/ revalidar),
 * url_pdf (opcional).
 */
export async function marcarAssinado(
  _prev: ContratoState,
  formData: FormData,
): Promise<ContratoState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessão expirada. Entre novamente." };

  const contrato_id = String(formData.get("contrato_id") ?? "");
  const negocio_id = String(formData.get("negocio_id") ?? "");
  const url_pdf = String(formData.get("url_pdf") ?? "").trim();

  if (!contrato_id) return { error: "Contrato não identificado." };

  const supabase = await createClient();

  const atualizacao: {
    status: string;
    assinado_em: string;
    url_pdf?: string;
  } = {
    status: "assinado",
    assinado_em: new Date().toISOString(),
  };
  if (url_pdf) atualizacao.url_pdf = url_pdf;

  const { data, error } = await supabase
    .from("contratos")
    .update(atualizacao)
    .eq("id", contrato_id)
    .select("negocio_id")
    .single();

  if (error || !data)
    return {
      error: "Não foi possível marcar como assinado. Tente novamente.",
    };

  await registrarEvento("contrato_assinado", {
    entidadeId: data.negocio_id,
    payload: { contrato_id, url_pdf: url_pdf || null },
  });

  const alvo = negocio_id || data.negocio_id;
  revalidatePath(`/painel/negocios/${alvo}/contrato`);
  revalidatePath(`/painel/negocios/${alvo}`);
  return { message: "Contrato marcado como assinado." };
}
