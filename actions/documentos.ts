"use server";

import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { registrarEvento } from "@/lib/log";
import { revalidatePath } from "next/cache";

export type DocumentoState = { error?: string; message?: string };

// Status válidos de um documento (espelha o CHECK da migration S4.1).
const STATUS_VALIDOS = ["pendente", "recebido", "verificado", "reprovado"];

/**
 * Registra um documento enviado a um negócio. O arquivo em si já foi enviado ao
 * bucket privado `documentos-negocio` pelo client (path `${auth.uid()}/...`);
 * aqui só gravamos a linha em `documentos` com status inicial 'recebido'.
 * Loga documento_enviado.
 */
export async function enviarDocumento(
  _prev: DocumentoState,
  formData: FormData,
): Promise<DocumentoState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessão expirada. Entre novamente." };

  const negocio_id = String(formData.get("negocio_id") ?? "");
  const tipo_doc = String(formData.get("tipo_doc") ?? "").trim();
  const arquivo_url = String(formData.get("arquivo_url") ?? "").trim();

  if (!negocio_id) return { error: "Negócio não identificado." };
  if (!tipo_doc) return { error: "Tipo de documento não identificado." };
  if (!arquivo_url) return { error: "Envie o arquivo antes de salvar." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documentos")
    .insert({
      negocio_id,
      tipo_doc,
      arquivo_url,
      enviado_por: sessao.user.id,
      status: "recebido",
    })
    .select("id")
    .single();

  if (error || !data)
    return { error: "Não foi possível salvar o documento. Tente novamente." };

  await registrarEvento("documento_enviado", {
    entidadeId: negocio_id,
    payload: { documento_id: data.id, tipo_doc },
  });

  revalidatePath(`/painel/negocios/${negocio_id}/documentos`);
  return { message: "Documento enviado." };
}

/**
 * Muda o status de um documento (verificar/reprovar/etc). Loga
 * documento_status_mudado.
 */
export async function mudarStatusDocumento(
  _prev: DocumentoState,
  formData: FormData,
): Promise<DocumentoState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessão expirada. Entre novamente." };

  const documento_id = String(formData.get("documento_id") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!documento_id) return { error: "Documento não identificado." };
  if (!STATUS_VALIDOS.includes(status)) return { error: "Status inválido." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documentos")
    .update({ status })
    .eq("id", documento_id)
    .select("negocio_id")
    .single();

  if (error || !data)
    return {
      error: "Não foi possível mudar o status do documento. Tente novamente.",
    };

  await registrarEvento("documento_status_mudado", {
    entidadeId: documento_id,
    payload: { status, negocio_id: data.negocio_id },
  });

  revalidatePath(`/painel/negocios/${data.negocio_id}/documentos`);
  return { message: "Status do documento atualizado." };
}
