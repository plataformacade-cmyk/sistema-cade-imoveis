"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { getSessao } from "@/lib/auth";
import { registrarEvento } from "@/lib/log";
import { revalidatePath } from "next/cache";

export type UsuarioState = { error?: string; message?: string };

const STATUS_VALIDOS = ["ativo", "inativo", "convidado"] as const;

/**
 * Edita nome, telefone e status de um usuário. Só admin.
 * Loga usuario_editado.
 */
export async function editarUsuario(
  _prev: UsuarioState,
  formData: FormData,
): Promise<UsuarioState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessão expirada. Entre novamente." };
  if (!sessao.isAdmin)
    return { error: "Apenas administradores podem editar usuários." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Usuário inválido." };

  const nome = String(formData.get("nome") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim();
  const status = String(formData.get("status") ?? "");

  if (!STATUS_VALIDOS.includes(status as (typeof STATUS_VALIDOS)[number]))
    return { error: "Status inválido." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("usuarios")
    .update({
      nome: nome || null,
      telefone: telefone || null,
      status,
    })
    .eq("id", id);

  if (error)
    return { error: "Não foi possível salvar as alterações. Tente de novo." };

  await registrarEvento("usuario_editado", {
    entidadeId: id,
    payload: { nome: nome || null, telefone: telefone || null, status },
  });

  revalidatePath("/painel/usuarios");
  return { message: "Usuário atualizado." };
}

/**
 * Convida um novo usuário por e-mail (Supabase inviteUserByEmail). Só admin.
 * Usa o client service-role (privilégio de admin). Loga usuario_criado.
 */
export async function convidarUsuario(
  _prev: UsuarioState,
  formData: FormData,
): Promise<UsuarioState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessão expirada. Entre novamente." };
  if (!sessao.isAdmin)
    return { error: "Apenas administradores podem convidar usuários." };

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const nome = String(formData.get("nome") ?? "").trim();

  if (!email || !email.includes("@"))
    return { error: "Informe um e-mail válido." };

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { nome: nome || null },
  });

  if (error) {
    if (
      error.message?.toLowerCase().includes("already") ||
      error.status === 422
    )
      return { error: "Já existe um usuário com esse e-mail." };
    return { error: "Não foi possível enviar o convite. Tente de novo." };
  }

  await registrarEvento("usuario_criado", {
    entidadeId: data.user?.id,
    payload: { email, nome: nome || null },
  });

  revalidatePath("/painel/usuarios");
  return { message: `Convite enviado para ${email}.` };
}
