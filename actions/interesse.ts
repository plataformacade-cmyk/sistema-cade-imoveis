"use server";

import { redirect } from "next/navigation";
import {
  criarDestinoAceiteTermos,
  criarDestinoInteresse,
  criarLoginHref,
} from "@/lib/auth-redirect";
import { registrarEngajamentoImovel } from "@/lib/engajamento/imoveis";
import { getSessao } from "@/lib/auth";
import { registrarInteresseNoImovel } from "@/lib/interesse";
import { usuarioTemTermosPendentes } from "@/lib/termos";

export type InteresseState = { error?: string; message?: string };

function contextoEngajamento(formData: FormData) {
  return {
    visitanteId: String(formData.get("visitante_id") ?? "").trim() || null,
    origem: String(formData.get("origem") ?? "").trim() || null,
    referrerHost: String(formData.get("referrer_host") ?? "").trim() || null,
    utmSource: String(formData.get("utm_source") ?? "").trim() || null,
    utmMedium: String(formData.get("utm_medium") ?? "").trim() || null,
    utmCampaign: String(formData.get("utm_campaign") ?? "").trim() || null,
  };
}

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
  const engajamento = contextoEngajamento(formData);

  await registrarEngajamentoImovel({
    imovelId,
    tipo: "clique_interesse",
    sessao,
    ...engajamento,
    metadata: { origem: "botao_interesse" },
  });

  if (!sessao) redirect(criarLoginHref(destinoInteresse));

  if (await usuarioTemTermosPendentes(sessao.user.id, ["comprador"])) {
    redirect(criarDestinoAceiteTermos(["comprador"], destinoInteresse, "interesse"));
  }

  const resultado = await registrarInteresseNoImovel(imovelId, sessao);

  if (!resultado.ok) return { error: resultado.mensagem };

  await registrarEngajamentoImovel({
    imovelId,
    tipo: "interesse_registrado",
    sessao,
    ...engajamento,
    metadata: {
      origem: "botao_interesse",
      negocio_id: resultado.negocioId,
    },
  });

  redirect(`/painel/negocios/${resultado.negocioId}#qualificacao`);
}
