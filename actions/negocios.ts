"use server";

import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { registrarEvento } from "@/lib/log";
import { revalidatePath } from "next/cache";

export type NegocioState = { error?: string; message?: string };

const STATUS_VALIDOS = ["aberto", "em_negociacao", "fechado", "cancelado"];
const PAPEIS_VALIDOS = ["proprietario", "comprador", "corretor"];

/**
 * Abre um novo negócio para um imóvel. Insere em `negocios` (criado_por = usuário
 * logado) e, se houver, os participantes iniciais em `papeis_negocio`.
 * Loga negocio_aberto + papel_atribuido (um por participante).
 */
export async function abrirNegocio(
  _prev: NegocioState,
  formData: FormData,
): Promise<NegocioState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessão expirada. Entre novamente." };

  const imovel_id = String(formData.get("imovel_id") ?? "");
  const status = String(formData.get("status") ?? "aberto");
  const valorBruto = String(formData.get("valor_acordado") ?? "").trim();

  if (!imovel_id) return { error: "Selecione um imóvel." };
  if (!STATUS_VALIDOS.includes(status)) return { error: "Status inválido." };

  let valor_acordado: number | null = null;
  if (valorBruto !== "") {
    const n = Number(valorBruto.replace(",", "."));
    if (Number.isNaN(n) || n < 0)
      return { error: "Valor acordado inválido." };
    valor_acordado = n;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("negocios")
    .insert({ imovel_id, status, valor_acordado, criado_por: sessao.user.id })
    .select("id")
    .single();

  if (error || !data)
    return { error: "Não foi possível abrir o negócio. Tente novamente." };

  await registrarEvento("negocio_aberto", {
    entidadeId: data.id,
    payload: { imovel_id, status, valor_acordado },
  });

  revalidatePath("/painel/negocios");
  return { message: "Negócio aberto." };
}

/**
 * Atribui um participante (usuário + papel) a um negócio existente.
 * Insere em `papeis_negocio` e loga papel_atribuido.
 */
export async function atribuirParticipante(
  _prev: NegocioState,
  formData: FormData,
): Promise<NegocioState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessão expirada. Entre novamente." };

  const negocio_id = String(formData.get("negocio_id") ?? "");
  const usuario_id = String(formData.get("usuario_id") ?? "");
  const papel = String(formData.get("papel") ?? "");

  if (!negocio_id) return { error: "Negócio não identificado." };
  if (!usuario_id) return { error: "Selecione um usuário." };
  if (!PAPEIS_VALIDOS.includes(papel)) return { error: "Papel inválido." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("papeis_negocio")
    .insert({ negocio_id, usuario_id, papel, ativo: true });

  if (error)
    return {
      error: "Não foi possível atribuir o participante. Tente novamente.",
    };

  await registrarEvento("papel_atribuido", {
    entidadeId: negocio_id,
    payload: { usuario_id, papel },
  });

  revalidatePath(`/painel/negocios/${negocio_id}`);
  revalidatePath("/painel/negocios");
  return { message: "Participante atribuído." };
}

/**
 * Muda o status de um negócio. Loga negocio_status_mudado.
 */
export async function mudarStatus(
  _prev: NegocioState,
  formData: FormData,
): Promise<NegocioState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessão expirada. Entre novamente." };

  const negocio_id = String(formData.get("negocio_id") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!negocio_id) return { error: "Negócio não identificado." };
  if (!STATUS_VALIDOS.includes(status)) return { error: "Status inválido." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("negocios")
    .update({ status })
    .eq("id", negocio_id);

  if (error)
    return { error: "Não foi possível mudar o status. Tente novamente." };

  await registrarEvento("negocio_status_mudado", {
    entidadeId: negocio_id,
    payload: { status },
  });

  revalidatePath(`/painel/negocios/${negocio_id}`);
  revalidatePath("/painel/negocios");
  return { message: "Status atualizado." };
}
