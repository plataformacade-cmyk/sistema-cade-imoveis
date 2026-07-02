"use server";

import { redirect } from "next/navigation";
import {
  criarDestinoAceiteTermos,
  criarDestinoInteresse,
  criarLoginHref,
} from "@/lib/auth-redirect";
import { getSessao } from "@/lib/auth";
import { registrarInteresseNoImovel } from "@/lib/interesse";
import { usuarioTemTermosPendentes } from "@/lib/termos";

export type InteresseState = { error?: string; message?: string };

/**
 * Demonstra interesse num imóvel da vitrine pública.
 * Se o usuário ainda não estiver logado, preserva o imóvel de origem no next
 * do login/cadastro. Se já estiver logado, registra pela RPC idempotente.
 */
export async function demonstrarInteresse(
  _prev: InteresseState,
  formData: FormData,
): Promise<InteresseState> {
  const imovelId = String(formData.get("imovel_id") ?? "").trim();
  const destinoInteresse = criarDestinoInteresse(imovelId);

  if (!destinoInteresse) return { error: "Imóvel não identificado." };

  const sessao = await getSessao();
  if (!sessao) redirect(criarLoginHref(destinoInteresse));

  if (await usuarioTemTermosPendentes(sessao.user.id, ["comprador"])) {
    redirect(criarDestinoAceiteTermos(["comprador"], destinoInteresse, "interesse"));
  }

  const resultado = await registrarInteresseNoImovel(imovelId, sessao);

  if (!resultado.ok) return { error: resultado.mensagem };

  redirect(`/painel/negocios/${resultado.negocioId}`);
}
