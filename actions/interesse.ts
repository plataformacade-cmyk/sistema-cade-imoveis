"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { registrarEvento } from "@/lib/log";

export type InteresseState = { error?: string; message?: string };

/**
 * Demonstra interesse num imóvel da vitrine pública.
 * Exige login (sem sessão → redirect /login). Cria o negócio (comprador =
 * usuário logado), os papéis (comprador + proprietário) e uma conversa.
 * Evita duplicar: se o usuário já tem negócio nesse imóvel, só leva pra ele.
 * Loga interesse_demonstrado + negocio_aberto.
 */
export async function demonstrarInteresse(
  _prev: InteresseState,
  formData: FormData,
): Promise<InteresseState> {
  const sessao = await getSessao();
  if (!sessao) redirect("/login");

  const imovel_id = String(formData.get("imovel_id") ?? "").trim();
  if (!imovel_id) return { error: "Imóvel não identificado." };

  const supabase = await createClient();

  // Cria negócio + papéis + conversa via função SECURITY DEFINER (RLS-safe:
  // um comprador comum não tem permissão de insert direto em negocios/papeis).
  const { data: negocioId, error } = await supabase.rpc("demonstrar_interesse", {
    p_imovel_id: imovel_id,
  });

  if (error) {
    const msg = error.message || "";
    if (msg.includes("eh_proprietario"))
      return { error: "Você é o anunciante deste imóvel." };
    if (msg.includes("imovel_indisponivel") || msg.includes("imovel_inexistente"))
      return { error: "Este imóvel não está mais disponível." };
    return { error: "Não foi possível registrar o interesse. Tente de novo." };
  }

  await registrarEvento("interesse_demonstrado", {
    entidadeId: imovel_id,
    payload: { comprador: sessao.user.id, negocio_id: negocioId },
  });
  await registrarEvento("negocio_aberto", {
    entidadeId: String(negocioId),
    payload: { imovel_id, origem: "interesse" },
  });

  revalidatePath("/painel/negocios");
  return { message: "Interesse registrado! O anunciante será notificado." };
}
