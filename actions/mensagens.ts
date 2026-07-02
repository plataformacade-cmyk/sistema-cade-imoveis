"use server";

import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { registrarEvento } from "@/lib/log";
import {
  AVISO_CONTATO_EXTERNO,
  detectarContatoExterno,
} from "@/lib/chat/contato";
import { registrarTentativaContato } from "@/lib/chat/tentativas-contato";
import {
  mensagemTermosPendentes,
  perfisTermosDosPapeisNegocio,
  usuarioTemTermosPendentes,
} from "@/lib/termos";
import { revalidatePath } from "next/cache";

export type MensagemState = { error?: string; message?: string };

/**
 * Garante que existe uma conversa para o negocio e devolve o id dela.
 * Se ja houver uma, reaproveita; senao cria. Retorna null em caso de erro.
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
 * Envia uma mensagem numa conversa. autor_id = usuario logado.
 * Insere em `mensagens` e loga mensagem_enviada.
 */
export async function enviarMensagem(
  _prev: MensagemState,
  formData: FormData,
): Promise<MensagemState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessao expirada. Entre novamente." };

  const conversa_id = String(formData.get("conversa_id") ?? "");
  const corpo = String(formData.get("corpo") ?? "").trim();

  if (!conversa_id) return { error: "Conversa nao identificada." };
  if (!corpo) return { error: "Escreva uma mensagem." };

  const supabase = await createClient();
  const { data: conversa, error: conversaErro } = await supabase
    .from("conversas")
    .select("id, negocio_id")
    .eq("id", conversa_id)
    .maybeSingle();

  if (conversaErro || !conversa?.negocio_id)
    return { error: "Conversa nao encontrada." };

  const { data: papeis } = await supabase
    .from("papeis_negocio")
    .select("papel")
    .eq("negocio_id", conversa.negocio_id)
    .eq("usuario_id", sessao.user.id)
    .eq("ativo", true);
  const perfisTermos = perfisTermosDosPapeisNegocio(
    (papeis ?? []).map((papel) => String(papel.papel)),
    sessao.isAdmin,
  );
  if (
    perfisTermos.length > 0 &&
    (await usuarioTemTermosPendentes(sessao.user.id, perfisTermos))
  ) {
    return {
      error: mensagemTermosPendentes(
        perfisTermos,
        `/painel/mensagens/${conversa_id}`,
        "mensagem",
      ),
    };
  }

  const contato = detectarContatoExterno(corpo);
  if (contato.bloqueado) {
    await registrarTentativaContato({
      conversaId: conversa_id,
      negocioId: conversa.negocio_id,
      usuarioId: sessao.user.id,
      entidadeTipo: "mensagem",
      motivos: contato.motivos,
      textoMascarado: contato.textoMascarado,
    });

    revalidatePath(`/painel/mensagens/${conversa_id}`);
    revalidatePath("/painel/mensagens");
    revalidatePath("/painel/observabilidade");
    revalidatePath("/painel", "layout");
    return { error: AVISO_CONTATO_EXTERNO };
  }

  const { error } = await supabase.from("mensagens").insert({
    conversa_id,
    autor_id: sessao.user.id,
    corpo,
  });

  if (error)
    return { error: "Nao foi possivel enviar a mensagem. Tente novamente." };

  await registrarEvento("mensagem_enviada", {
    entidadeId: conversa_id,
    payload: { conversa_id },
  });

  revalidatePath(`/painel/mensagens/${conversa_id}`);
  revalidatePath("/painel/mensagens");
  return { message: "Mensagem enviada." };
}
