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

  // O imóvel precisa existir e estar ativo pra receber interesse.
  const { data: imovel } = await supabase
    .from("imoveis")
    .select("id, proprietario_id, status")
    .eq("id", imovel_id)
    .single();

  if (!imovel || imovel.status !== "ativo")
    return { error: "Este imóvel não está mais disponível." };

  // Dono não demonstra interesse no próprio imóvel.
  if (imovel.proprietario_id === sessao.user.id)
    return { error: "Você é o anunciante deste imóvel." };

  // Evita duplicar: já existe negócio deste usuário (como comprador) pra esse imóvel?
  const { data: jaTem } = await supabase
    .from("papeis_negocio")
    .select("negocio_id, negocios!inner(imovel_id)")
    .eq("usuario_id", sessao.user.id)
    .eq("papel", "comprador")
    .eq("negocios.imovel_id", imovel_id)
    .limit(1)
    .maybeSingle();

  if (jaTem) {
    await registrarEvento("interesse_demonstrado", {
      entidadeId: imovel_id,
      payload: { duplicado: true, negocio_id: jaTem.negocio_id },
    });
    return { message: "Você já demonstrou interesse neste imóvel." };
  }

  await registrarEvento("interesse_demonstrado", {
    entidadeId: imovel_id,
    payload: { comprador: sessao.user.id },
  });

  // 1) Cria o negócio.
  const { data: negocio, error: errNegocio } = await supabase
    .from("negocios")
    .insert({
      imovel_id,
      status: "aberto",
      criado_por: sessao.user.id,
    })
    .select("id")
    .single();

  if (errNegocio || !negocio)
    return { error: "Não foi possível registrar o interesse. Tente de novo." };

  // 2) Papéis: comprador (quem demonstrou) + proprietário (dono do imóvel).
  await supabase.from("papeis_negocio").insert([
    {
      negocio_id: negocio.id,
      usuario_id: sessao.user.id,
      papel: "comprador",
      ativo: true,
    },
    {
      negocio_id: negocio.id,
      usuario_id: imovel.proprietario_id,
      papel: "proprietario",
      ativo: true,
    },
  ]);

  // 3) Conversa do negócio (chat in-app).
  await supabase.from("conversas").insert({ negocio_id: negocio.id });

  await registrarEvento("negocio_aberto", {
    entidadeId: negocio.id,
    payload: { imovel_id, origem: "interesse" },
  });

  revalidatePath("/painel/negocios");
  return { message: "Interesse registrado! O anunciante será notificado." };
}
