"use server";

import { revalidatePath } from "next/cache";
import { getSessao } from "@/lib/auth";
import {
  isResultadoFollowupExterno,
  type ResultadoFollowupExterno,
} from "@/lib/followups-externos";
import { registrarEvento } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";

export type FollowupExternoState = { error?: string; message?: string };

function revalidarFollowupExterno(negocioId: string) {
  revalidatePath("/painel", "layout");
  revalidatePath("/painel");
  revalidatePath("/painel/negocios");
  revalidatePath(`/painel/negocios/${negocioId}`);
  revalidatePath("/painel/notificacoes");
  revalidatePath("/painel/observabilidade");
}

async function podeOperarFollowup(negocioId: string, usuarioId: string) {
  const sessao = await getSessao();
  if (sessao?.isAdmin) return true;

  const supabase = await createClient();
  const { data } = await supabase
    .from("papeis_negocio")
    .select("id")
    .eq("negocio_id", negocioId)
    .eq("usuario_id", usuarioId)
    .eq("ativo", true)
    .in("papel", ["corretor", "admin"])
    .limit(1);

  return (data?.length ?? 0) > 0;
}

function statusDestinoPorResultado(resultado: ResultadoFollowupExterno) {
  if (resultado === "fechou") return "concluido";
  if (resultado === "encerrar") return "perdido";
  return null;
}

export async function registrarResultadoFollowupExterno(
  _prev: FollowupExternoState,
  formData: FormData,
): Promise<FollowupExternoState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessao expirada. Entre novamente." };

  const followupId = String(formData.get("followup_id") ?? "").trim();
  const resultado = String(formData.get("resultado") ?? "").trim();
  const observacao = String(formData.get("observacao") ?? "").trim();

  if (!followupId) return { error: "Follow-up nao identificado." };
  if (!isResultadoFollowupExterno(resultado))
    return { error: "Selecione um resultado valido." };
  if (observacao.length > 1000)
    return { error: "A observacao deve ter no maximo 1000 caracteres." };

  const supabase = await createClient();
  const { data: followup, error: followupError } = await supabase
    .from("negocio_followups_externos")
    .select("id, negocio_id, fluxo_id, tipo, status")
    .eq("id", followupId)
    .maybeSingle();

  if (followupError || !followup)
    return { error: "Follow-up nao encontrado ou sem permissao." };
  if (String(followup.status) !== "pendente")
    return { error: "Este follow-up ja foi encerrado." };

  const negocioId = String(followup.negocio_id);
  const autorizado = await podeOperarFollowup(negocioId, sessao.user.id);
  if (!autorizado)
    return { error: "Apenas admin ou corretor ativo opera esta cadencia." };

  const agora = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("negocio_followups_externos")
    .update({
      status: "respondido",
      resultado,
      observacao: observacao || null,
      responsavel_id: sessao.user.id,
      respondido_por: sessao.user.id,
      respondido_em: agora,
    })
    .eq("id", followupId);

  if (updateError)
    return { error: "Nao foi possivel registrar o resultado do follow-up." };

  const statusDestino = statusDestinoPorResultado(resultado);

  await registrarEvento("followup_externo_respondido", {
    entidadeId: negocioId,
    payload: {
      followup_id: followupId,
      fluxo_id: followup.fluxo_id,
      tipo: followup.tipo,
      resultado,
      status_destino: statusDestino,
    },
  });

  if (statusDestino) {
    await registrarEvento("negocio_status_mudado", {
      entidadeId: negocioId,
      payload: {
        status: statusDestino,
        motivo: "followup_externo",
        followup_id: followupId,
      },
    });
  }

  revalidarFollowupExterno(negocioId);
  return { message: "Resultado do follow-up registrado." };
}
