"use server";

import { createClient } from "@/lib/supabase/server";
import { criarDestinoAceiteTermos, criarDestinoTelefone } from "@/lib/auth-redirect";
import { usuarioTemTermosPendentes } from "@/lib/termos";
import { usuarioTemTelefoneObrigatorio } from "@/lib/telefone";
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
  if (!(await usuarioTemTelefoneObrigatorio(user.id))) {
    redirect(
      criarDestinoTelefone("/cadastro/completar?intencao=anunciar", "anunciar"),
    );
  }

  await supabase.from("usuarios").update({ papel: "proprietario" }).eq("id", user.id);
  revalidatePath("/", "layout");
}
