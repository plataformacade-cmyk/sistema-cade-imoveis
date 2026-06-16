import { createClient } from "@/lib/supabase/server";

export type Papel = "cliente" | "proprietario" | "corretor" | "admin";

export type Sessao = {
  user: { id: string; email: string; nome: string };
  papel: Papel;
  isAdmin: boolean;
  /** Quem anuncia imóveis (proprietário, corretor ou admin). */
  anuncia: boolean;
};

/** Pega o usuário logado + papel global. Retorna null se não logado. */
export async function getSessao(): Promise<Sessao | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let papel: Papel = "cliente";
  let nome = user.email?.split("@")[0] ?? "";
  try {
    const { data } = await supabase
      .from("usuarios")
      .select("papel, nome")
      .eq("id", user.id)
      .single();
    if (data?.papel) papel = data.papel as Papel;
    if (data?.nome) nome = data.nome;
  } catch {
    // fallback seguro: cliente
  }

  return {
    user: { id: user.id, email: user.email ?? "", nome },
    papel,
    isAdmin: papel === "admin",
    anuncia: papel === "proprietario" || papel === "corretor" || papel === "admin",
  };
}
