"use server";

import { createClient } from "@/lib/supabase/server";
import {
  CADASTRO_NEXT_PADRAO,
  criarDestinoAceiteTermos,
  resolverAuthNext,
} from "@/lib/auth-redirect";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type AuthState = { error?: string; message?: string };

/** Traduz as mensagens de erro do Supabase (vêm em inglês) para PT-BR. */
function traduzErro(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("weak") || m.includes("known to be"))
    return "Essa senha é muito comum e fácil de adivinhar. Escolha uma mais forte.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Este e-mail já tem uma conta. Tente entrar.";
  if (m.includes("invalid login credentials"))
    return "E-mail ou senha inválidos.";
  if (m.includes("email not confirmed"))
    return "Confirme seu e-mail antes de entrar.";
  if (m.includes("invalid format") || m.includes("unable to validate email"))
    return "E-mail inválido.";
  if (m.includes("at least") && m.includes("characters"))
    return "A senha é curta demais.";
  if (m.includes("for security purposes") || m.includes("rate limit"))
    return "Aguarde alguns segundos e tente novamente.";
  return "Não foi possível concluir agora. Tente novamente.";
}

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = resolverAuthNext(String(formData.get("next") ?? ""), "/painel");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: traduzErro(error.message) };

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const nome = String(formData.get("nome") ?? "");
  const next = resolverAuthNext(
    String(formData.get("next") ?? ""),
    criarDestinoAceiteTermos(["comprador"], CADASTRO_NEXT_PADRAO, "cadastro"),
  );

  if (password.length < 8)
    return { error: "A senha precisa ter ao menos 8 caracteres." };

  // Todo cadastro público nasce como CLIENTE (papel global).
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nome, papel: "cliente" } },
  });
  if (error) return { error: traduzErro(error.message) };

  // Confirmação de e-mail está DESLIGADA no Supabase → o signUp já devolve
  // sessão. Loga direto e leva ao onboarding (escolher buscar × anunciar).
  if (data.session) {
    revalidatePath("/", "layout");
    redirect(next);
  }

  // Fallback (se algum dia ligarem a confirmação por e-mail).
  return {
    message: "Conta criada! Verifique seu e-mail para confirmar o acesso.",
  };
}

export async function resetPassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "");

  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) return { error: traduzErro(error.message) };

  return { message: "Se o e-mail existir, enviamos um link de recuperação." };
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
