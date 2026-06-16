"use server";

import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { registrarEvento } from "@/lib/log";
import { revalidatePath } from "next/cache";

export type MensagemState = { error?: string; message?: string };

/**
 * Garante que existe uma conversa para o negócio e devolve o id dela.
 * Se já houver uma, reaproveita; senão cria. Retorna null em caso de erro.
 */
export async function garantirConversa(
  negocio_id: string,
): Promise<string | null> {
  if (!negocio_id) return null;

  const supabase = await createClient();

  const { data: existente, error: buscaErro } = await supabase
    .from("conversas")
    .select("id")
    .eq("negocio_id", negocio_id)
    .order("criado_em", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (buscaErro) return null;
  if (existente) return existente.id;

  const { data: criada, error: criaErro } = await supabase
    .from("conversas")
    .insert({ negocio_id })
    .select("id")
    .single();

  if (criaErro || !criada) return null;
  return criada.id;
}

/**
 * Envia uma mensagem numa conversa. autor_id = usuário logado.
 * Insere em `mensagens` e loga mensagem_enviada.
 */
export async function enviarMensagem(
  _prev: MensagemState,
  formData: FormData,
): Promise<MensagemState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessão expirada. Entre novamente." };

  const conversa_id = String(formData.get("conversa_id") ?? "");
  const corpo = String(formData.get("corpo") ?? "").trim();

  if (!conversa_id) return { error: "Conversa não identificada." };
  if (!corpo) return { error: "Escreva uma mensagem." };

  const supabase = await createClient();
  const { error } = await supabase.from("mensagens").insert({
    conversa_id,
    autor_id: sessao.user.id,
    corpo,
  });

  if (error)
    return { error: "Não foi possível enviar a mensagem. Tente novamente." };

  await registrarEvento("mensagem_enviada", {
    entidadeId: conversa_id,
    payload: { conversa_id },
  });

  revalidatePath(`/painel/mensagens/${conversa_id}`);
  revalidatePath("/painel/mensagens");
  return { message: "Mensagem enviada." };
}
