"use server";

import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { registrarEvento } from "@/lib/log";
import { revalidatePath } from "next/cache";

export type CorretorState = { error?: string; message?: string };

/**
 * Cadastra (ou atualiza) um corretor parceiro a partir de um usuário existente.
 * Só admin. imobiliaria_id é opcional. Faz upsert em corretores (PK = usuario_id).
 * Loga corretor_cadastrado.
 */
export async function cadastrarCorretor(
  _prev: CorretorState,
  formData: FormData,
): Promise<CorretorState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessão expirada. Entre novamente." };
  if (!sessao.isAdmin)
    return { error: "Apenas administradores podem cadastrar corretores." };

  const usuarioId = String(formData.get("usuario_id") ?? "");
  if (!usuarioId) return { error: "Selecione um usuário." };

  const creci = String(formData.get("creci") ?? "").trim();
  if (!creci) return { error: "Informe o número do CRECI." };

  const creciUf = String(formData.get("creci_uf") ?? "")
    .trim()
    .toUpperCase();

  const imobiliariaId = String(formData.get("imobiliaria_id") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase.from("corretores").upsert(
    {
      usuario_id: usuarioId,
      creci,
      creci_uf: creciUf || null,
      imobiliaria_id: imobiliariaId || null,
    },
    { onConflict: "usuario_id" },
  );

  if (error)
    return { error: "Não foi possível cadastrar o corretor. Tente de novo." };

  await registrarEvento("corretor_cadastrado", {
    entidadeId: usuarioId,
    payload: {
      creci,
      creci_uf: creciUf || null,
      imobiliaria_id: imobiliariaId || null,
    },
  });

  revalidatePath("/painel/corretores");
  return { message: "Corretor cadastrado." };
}

/**
 * Remove o vínculo de corretor de um usuário. Só admin.
 */
export async function removerCorretor(
  _prev: CorretorState,
  formData: FormData,
): Promise<CorretorState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessão expirada. Entre novamente." };
  if (!sessao.isAdmin)
    return { error: "Apenas administradores podem remover corretores." };

  const usuarioId = String(formData.get("usuario_id") ?? "");
  if (!usuarioId) return { error: "Corretor inválido." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("corretores")
    .delete()
    .eq("usuario_id", usuarioId);

  if (error)
    return { error: "Não foi possível remover o corretor. Tente de novo." };

  revalidatePath("/painel/corretores");
  return { message: "Corretor removido." };
}
