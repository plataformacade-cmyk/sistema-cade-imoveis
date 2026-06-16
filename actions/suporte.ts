"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";

export type SuporteState = { error?: string; message?: string };

/** Atendente humano (admin) responde uma conversa de suporte. */
export async function responderSuporte(
  _prev: SuporteState,
  formData: FormData,
): Promise<SuporteState> {
  const sessao = await getSessao();
  if (!sessao?.isAdmin) return { error: "Sem permissão." };

  const conversaId = String(formData.get("conversa_id") ?? "");
  const corpo = String(formData.get("corpo") ?? "").trim().slice(0, 2000);
  if (!conversaId || !corpo) return { error: "Escreva uma resposta." };

  const supabase = await createClient();

  const { error } = await supabase.from("suporte_mensagens").insert({
    conversa_id: conversaId,
    autor: "humano",
    autor_id: sessao.user.id,
    corpo,
  });
  if (error) return { error: "Não foi possível enviar a resposta." };

  // Assume a conversa em nome do atendente (deixa de ficar só na fila).
  await supabase
    .from("suporte_conversas")
    .update({ atendente_id: sessao.user.id, status: "aguardando_humano" })
    .eq("id", conversaId);

  revalidatePath("/painel/suporte");
  return { message: "Resposta enviada." };
}

/** Marca a conversa como resolvida. */
export async function resolverSuporte(formData: FormData) {
  const sessao = await getSessao();
  if (!sessao?.isAdmin) return;
  const conversaId = String(formData.get("conversa_id") ?? "");
  if (!conversaId) return;

  const supabase = await createClient();
  await supabase
    .from("suporte_conversas")
    .update({ status: "resolvida" })
    .eq("id", conversaId);
  revalidatePath("/painel/suporte");
}
