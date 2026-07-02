import { revalidatePath } from "next/cache";
import type { Sessao } from "@/lib/auth";
import { registrarEvento } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";

export type InteresseErro =
  | "eh_proprietario"
  | "imovel_indisponivel"
  | "imovel_inexistente"
  | "desconhecido";

export type InteresseResultado =
  | { ok: true; negocioId: string }
  | { ok: false; erro: InteresseErro; mensagem: string };

export async function registrarInteresseNoImovel(
  imovelId: string,
  sessao: Sessao,
): Promise<InteresseResultado> {
  const supabase = await createClient();

  const { data: negocioId, error } = await supabase.rpc("demonstrar_interesse", {
    p_imovel_id: imovelId,
  });

  if (error) {
    const msg = error.message || "";
    if (msg.includes("eh_proprietario")) {
      return {
        ok: false,
        erro: "eh_proprietario",
        mensagem: "Você é o anunciante deste imóvel.",
      };
    }
    if (msg.includes("imovel_indisponivel")) {
      return {
        ok: false,
        erro: "imovel_indisponivel",
        mensagem: "Este imóvel não está mais disponível.",
      };
    }
    if (msg.includes("imovel_inexistente")) {
      return {
        ok: false,
        erro: "imovel_inexistente",
        mensagem: "Imóvel não encontrado.",
      };
    }

    return {
      ok: false,
      erro: "desconhecido",
      mensagem: "Não foi possível registrar o interesse. Tente de novo.",
    };
  }

  if (!negocioId) {
    return {
      ok: false,
      erro: "desconhecido",
      mensagem: "Não foi possível registrar o interesse. Tente de novo.",
    };
  }

  await registrarEvento("interesse_demonstrado", {
    entidadeId: imovelId,
    payload: { comprador: sessao.user.id, negocio_id: negocioId },
  });
  await registrarEvento("negocio_aberto", {
    entidadeId: String(negocioId),
    payload: { imovel_id: imovelId, origem: "interesse" },
  });

  revalidatePath("/painel/negocios");
  return { ok: true, negocioId: String(negocioId) };
}
