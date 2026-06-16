"use server";

import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { registrarEvento } from "@/lib/log";
import { revalidatePath } from "next/cache";

export type VisitaState = { error?: string; message?: string };

const STATUS_VALIDOS = [
  "solicitada",
  "aguardando_confirmacao",
  "confirmada",
  "realizada",
  "cancelada",
  "reagendada",
  "nao_compareceu",
];
const CANAIS_VALIDOS = ["presencial", "video"];

/** Converte o valor de um input datetime-local em ISO ou null. */
function lerDataHora(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/**
 * Agenda uma nova visita para um imóvel. Insere em `visitas` com
 * solicitante_id = usuário logado e status inicial 'solicitada'.
 * Loga visita_agendada.
 */
export async function agendarVisita(
  _prev: VisitaState,
  formData: FormData,
): Promise<VisitaState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessão expirada. Entre novamente." };

  const imovel_id = String(formData.get("imovel_id") ?? "");
  const canal = String(formData.get("canal") ?? "");
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;
  const data_hora = lerDataHora(formData.get("data_hora"));

  if (!imovel_id) return { error: "Selecione um imóvel." };
  if (!CANAIS_VALIDOS.includes(canal)) return { error: "Canal inválido." };
  if (!data_hora) return { error: "Informe a data e hora da visita." };
  if (new Date(data_hora) <= new Date())
    return { error: "A visita precisa ser numa data futura." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("visitas")
    .insert({
      imovel_id,
      data_hora,
      canal,
      observacoes,
      status: "solicitada",
      solicitante_id: sessao.user.id,
    })
    .select("id")
    .single();

  if (error || !data)
    return { error: "Não foi possível agendar a visita. Tente novamente." };

  await registrarEvento("visita_agendada", {
    entidadeId: data.id,
    payload: { imovel_id, data_hora, canal },
  });

  revalidatePath("/painel/visitas");
  return { message: "Visita agendada." };
}

/**
 * Muda o status de uma visita. Loga visita_status_mudada.
 */
export async function mudarStatusVisita(
  _prev: VisitaState,
  formData: FormData,
): Promise<VisitaState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessão expirada. Entre novamente." };

  const visita_id = String(formData.get("visita_id") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!visita_id) return { error: "Visita não identificada." };
  if (!STATUS_VALIDOS.includes(status)) return { error: "Status inválido." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("visitas")
    .update({ status })
    .eq("id", visita_id);

  if (error)
    return { error: "Não foi possível mudar o status. Tente novamente." };

  await registrarEvento("visita_status_mudada", {
    entidadeId: visita_id,
    payload: { status },
  });

  revalidatePath("/painel/visitas");
  return { message: "Status atualizado." };
}

/**
 * Reagenda uma visita para uma nova data/hora e marca status 'reagendada'.
 * Loga visita_status_mudada (com a nova data no payload).
 */
export async function reagendarVisita(
  _prev: VisitaState,
  formData: FormData,
): Promise<VisitaState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessão expirada. Entre novamente." };

  const visita_id = String(formData.get("visita_id") ?? "");
  const data_hora = lerDataHora(formData.get("data_hora"));

  if (!visita_id) return { error: "Visita não identificada." };
  if (!data_hora) return { error: "Informe a nova data e hora." };
  if (new Date(data_hora) <= new Date())
    return { error: "A nova data precisa ser no futuro." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("visitas")
    .update({ data_hora, status: "reagendada" })
    .eq("id", visita_id);

  if (error)
    return { error: "Não foi possível reagendar a visita. Tente novamente." };

  await registrarEvento("visita_status_mudada", {
    entidadeId: visita_id,
    payload: { status: "reagendada", data_hora },
  });

  revalidatePath("/painel/visitas");
  return { message: "Visita reagendada." };
}
