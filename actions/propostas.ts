"use server";

import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { registrarEvento } from "@/lib/log";
import { revalidatePath } from "next/cache";

export type PropostaState = { error?: string; message?: string };

/** Converte o valor bruto do form em número (>= 0) ou null se inválido. */
function parseValor(bruto: string): number | null {
  const n = Number(bruto.replace(",", "."));
  if (Number.isNaN(n) || n < 0) return null;
  return n;
}

/**
 * Envia uma nova proposta num negócio (status 'enviada').
 * autor_id = usuário logado. Loga proposta_enviada.
 */
export async function enviarProposta(
  _prev: PropostaState,
  formData: FormData,
): Promise<PropostaState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessão expirada. Entre novamente." };

  const negocio_id = String(formData.get("negocio_id") ?? "");
  const valorBruto = String(formData.get("valor") ?? "").trim();
  const condicoes = String(formData.get("condicoes") ?? "").trim();

  if (!negocio_id) return { error: "Negócio não identificado." };
  if (valorBruto === "") return { error: "Informe o valor da proposta." };

  const valor = parseValor(valorBruto);
  if (valor === null) return { error: "Valor da proposta inválido." };

  const supabase = await createClient();
  const { error } = await supabase.from("propostas").insert({
    negocio_id,
    autor_id: sessao.user.id,
    valor,
    condicoes: condicoes || null,
    status: "enviada",
  });

  if (error)
    return { error: "Não foi possível enviar a proposta. Tente novamente." };

  await registrarEvento("proposta_enviada", {
    entidadeId: negocio_id,
    payload: { valor, condicoes: condicoes || null },
  });

  revalidatePath(`/painel/negocios/${negocio_id}`);
  return { message: "Proposta enviada." };
}

/**
 * Responde a uma proposta existente: aceita ou recusa.
 * Atualiza o status e loga proposta_respondida.
 */
export async function responderProposta(
  _prev: PropostaState,
  formData: FormData,
): Promise<PropostaState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessão expirada. Entre novamente." };

  const proposta_id = String(formData.get("proposta_id") ?? "");
  const acao = String(formData.get("acao") ?? "");

  if (!proposta_id) return { error: "Proposta não identificada." };
  if (acao !== "aceita" && acao !== "recusada")
    return { error: "Ação inválida." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("propostas")
    .update({ status: acao })
    .eq("id", proposta_id)
    .select("negocio_id")
    .single();

  if (error || !data)
    return { error: "Não foi possível responder a proposta. Tente novamente." };

  await registrarEvento("proposta_respondida", {
    entidadeId: proposta_id,
    payload: { status: acao, negocio_id: data.negocio_id },
  });

  revalidatePath(`/painel/negocios/${data.negocio_id}`);
  return {
    message: acao === "aceita" ? "Proposta aceita." : "Proposta recusada.",
  };
}

/**
 * Cria uma contraproposta num negócio (nova proposta, status 'contraproposta').
 * autor_id = usuário logado. Loga proposta_enviada.
 */
export async function contraproposta(
  _prev: PropostaState,
  formData: FormData,
): Promise<PropostaState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessão expirada. Entre novamente." };

  const negocio_id = String(formData.get("negocio_id") ?? "");
  const valorBruto = String(formData.get("valor") ?? "").trim();
  const condicoes = String(formData.get("condicoes") ?? "").trim();

  if (!negocio_id) return { error: "Negócio não identificado." };
  if (valorBruto === "") return { error: "Informe o valor da contraproposta." };

  const valor = parseValor(valorBruto);
  if (valor === null) return { error: "Valor da contraproposta inválido." };

  const supabase = await createClient();
  const { error } = await supabase.from("propostas").insert({
    negocio_id,
    autor_id: sessao.user.id,
    valor,
    condicoes: condicoes || null,
    status: "contraproposta",
  });

  if (error)
    return {
      error: "Não foi possível enviar a contraproposta. Tente novamente.",
    };

  await registrarEvento("proposta_enviada", {
    entidadeId: negocio_id,
    payload: { valor, condicoes: condicoes || null, contraproposta: true },
  });

  revalidatePath(`/painel/negocios/${negocio_id}`);
  return { message: "Contraproposta enviada." };
}
