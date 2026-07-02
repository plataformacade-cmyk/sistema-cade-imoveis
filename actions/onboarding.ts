"use server";

import { createClient } from "@/lib/supabase/server";
import { criarDestinoAceiteTermos } from "@/lib/auth-redirect";
import { usuarioTemTermosPendentes } from "@/lib/termos";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

/** Promove o usuário logado a proprietário (escolheu anunciar no onboarding). */
export async function tornarProprietario() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  if (await usuarioTemTermosPendentes(user.id, ["proprietario"])) {
    redirect(criarDestinoAceiteTermos(["proprietario"], "/painel/imoveis/novo", "anunciar"));
  }

  await supabase.from("usuarios").update({ papel: "proprietario" }).eq("id", user.id);
  revalidatePath("/", "layout");
}
