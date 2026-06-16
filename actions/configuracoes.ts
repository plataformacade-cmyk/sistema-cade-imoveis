"use server";

import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { registrarEvento } from "@/lib/log";
import { revalidatePath } from "next/cache";

export type ConfigState = { error?: string; ok?: boolean };

/**
 * Atualiza nome e telefone do usuário logado em `usuarios`.
 * Loga usuario_editado.
 */
export async function atualizarPerfil(
  _prev: ConfigState,
  formData: FormData,
): Promise<ConfigState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessão expirada. Entre novamente." };

  const nome = String(formData.get("nome") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim();

  if (!nome) return { error: "O nome não pode ficar em branco." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("usuarios")
    .update({
      nome,
      telefone: telefone || null,
    })
    .eq("id", sessao.user.id);

  if (error)
    return { error: "Não foi possível salvar o perfil. Tente de novo." };

  await registrarEvento("usuario_editado", {
    entidadeId: sessao.user.id,
    payload: { campos: ["nome", "telefone"], origem: "configuracoes" },
  });

  revalidatePath("/painel/configuracoes");
  return { ok: true };
}

/**
 * Troca a senha do usuário logado via Supabase Auth.
 */
export async function atualizarSenha(
  _prev: ConfigState,
  formData: FormData,
): Promise<ConfigState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessão expirada. Entre novamente." };

  const senha = String(formData.get("senha") ?? "");
  const confirmacao = String(formData.get("confirmacao") ?? "");

  if (senha.length < 8)
    return { error: "A senha precisa ter ao menos 8 caracteres." };
  if (senha !== confirmacao)
    return { error: "As senhas não conferem." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: senha });

  if (error)
    return { error: "Não foi possível trocar a senha. Tente de novo." };

  return { ok: true };
}

/**
 * Exclusão de conta (LGPD F-2): marca `usuarios.anonimizado_em = now()`,
 * registra o evento e encerra a sessão. Loga conta_excluida.
 */
export async function excluirConta(
  _prev: ConfigState,
  _formData: FormData,
): Promise<ConfigState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessão expirada. Entre novamente." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("usuarios")
    .update({ anonimizado_em: new Date().toISOString() })
    .eq("id", sessao.user.id);

  if (error)
    return { error: "Não foi possível excluir a conta. Tente de novo." };

  // Loga antes do signOut (depois o usuario_id já não está disponível).
  await registrarEvento("conta_excluida", {
    entidadeId: sessao.user.id,
    severidade: "warn",
  });

  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  return { ok: true };
}
