import { createClient } from "@/lib/supabase/server";

export type Sessao = {
  user: { id: string; email: string };
  isAdmin: boolean;
};

/** Pega o usuário logado + flag de admin. Retorna null se não logado. */
export async function getSessao(): Promise<Sessao | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let isAdmin = false;
  try {
    const { data } = await supabase.rpc("is_admin");
    isAdmin = data === true;
  } catch {
    // is_admin pode não estar acessível em alguns contextos — fallback seguro
  }

  return { user: { id: user.id, email: user.email ?? "" }, isAdmin };
}
