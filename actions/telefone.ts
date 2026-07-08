"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessao } from "@/lib/auth";
import { resolverAuthNext } from "@/lib/auth-redirect";
import { registrarEvento } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";
import { normalizarTelefoneObrigatorio } from "@/lib/telefone";

export type TelefoneObrigatorioState = {
  error?: string;
};

export async function salvarTelefoneObrigatorio(
  _prev: TelefoneObrigatorioState,
  formData: FormData,
): Promise<TelefoneObrigatorioState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessao expirada. Entre novamente." };

  const telefone = normalizarTelefoneObrigatorio(
    String(formData.get("telefone") ?? ""),
  );
  if (!telefone) {
    return {
      error:
        "Informe um telefone valido com DDD. Exemplo: (34) 99999-9999.",
    };
  }

  const next = resolverAuthNext(
    String(formData.get("next") ?? ""),
    "/cadastro/completar",
  );

  const supabase = await createClient();
  const { error } = await supabase
    .from("usuarios")
    .update({ telefone })
    .eq("id", sessao.user.id);

  if (error) return { error: "Nao foi possivel salvar o telefone." };

  await registrarEvento("usuario_editado", {
    entidadeId: sessao.user.id,
    payload: { campos: ["telefone"], origem: "telefone_obrigatorio" },
  });

  revalidatePath("/", "layout");
  redirect(next);
}

