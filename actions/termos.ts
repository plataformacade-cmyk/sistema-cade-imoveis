"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import {
  normalizarPerfisTermosParam,
  resolverAuthNext,
} from "@/lib/auth-redirect";
import { registrarEvento } from "@/lib/log";
import {
  registrarAceitesPendentes,
  type PerfilTermo,
} from "@/lib/termos";

export async function aceitarTermos(formData: FormData) {
  const sessao = await getSessao();
  if (!sessao) redirect("/login");

  const perfis = normalizarPerfisTermosParam(String(formData.get("perfis") ?? ""));
  const next = resolverAuthNext(String(formData.get("next") ?? ""), "/painel");
  const origem = String(formData.get("origem") ?? "web").trim() || "web";
  const confirmou = String(formData.get("confirmacao") ?? "") === "true";

  if (!confirmou || perfis.length === 0) redirect(next);

  const aceitos = await registrarAceitesPendentes({
    usuarioId: sessao.user.id,
    perfis: perfis as PerfilTermo[],
    origem,
  });

  if (perfis.includes("proprietario") && sessao.papel === "cliente") {
    const supabase = await createClient();
    await supabase
      .from("usuarios")
      .update({ papel: "proprietario" })
      .eq("id", sessao.user.id);
  }

  if (aceitos.length > 0) {
    await registrarEvento("termos_aceitos", {
      entidadeId: sessao.user.id,
      payload: {
        perfis: aceitos.map((termo) => termo.perfil),
        versoes: aceitos.map((termo) => termo.versao),
        origem,
      },
    });
  }

  revalidatePath("/", "layout");
  revalidatePath("/termos");
  revalidatePath("/painel", "layout");
  redirect(next);
}
