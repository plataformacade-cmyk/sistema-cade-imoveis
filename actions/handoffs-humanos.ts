"use server";

import { revalidatePath } from "next/cache";
import { getSessao } from "@/lib/auth";
import {
  isResultadoHandoffHumano,
  type ResultadoHandoffHumano,
} from "@/lib/handoffs-humanos";
import { registrarEvento } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";

export type HandoffHumanoState = { error?: string; message?: string };

function revalidarHandoff(negocioId: string) {
  revalidatePath("/painel", "layout");
  revalidatePath("/painel");
  revalidatePath("/painel/negocios");
  revalidatePath(`/painel/negocios/${negocioId}`);
  revalidatePath("/painel/notificacoes");
  revalidatePath("/painel/observabilidade");
}

async function podeOperarHandoff(negocioId: string, usuarioId: string) {
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

function statusDestinoPorResultado(resultado: ResultadoHandoffHumano) {
  if (resultado === "parar_cadencia" || resultado === "perdido") return "perdido";
  return null;
}

export async function assumirHandoffHumano(
  _prev: HandoffHumanoState,
  formData: FormData,
): Promise<HandoffHumanoState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessao expirada. Entre novamente." };

  const handoffId = String(formData.get("handoff_id") ?? "").trim();
  if (!handoffId) return { error: "Handoff nao identificado." };

  const supabase = await createClient();
  const { data: handoff, error: handoffError } = await supabase
    .from("negocio_handoffs_humanos")
    .select("id, negocio_id, status")
    .eq("id", handoffId)
    .maybeSingle();

  if (handoffError || !handoff)
    return { error: "Handoff nao encontrado ou sem permissao." };
  if (!["aberto", "em_atendimento"].includes(String(handoff.status)))
    return { error: "Este handoff ja foi encerrado." };

  const negocioId = String(handoff.negocio_id);
  const autorizado = await podeOperarHandoff(negocioId, sessao.user.id);
  if (!autorizado)
    return { error: "Apenas admin ou corretor ativo pode assumir este handoff." };

  const agora = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("negocio_handoffs_humanos")
    .update({
      status: "em_atendimento",
      responsavel_id: sessao.user.id,
      assumido_em: agora,
    })
    .eq("id", handoffId);

  if (updateError) return { error: "Nao foi possivel assumir o handoff." };

  await registrarEvento("handoff_humano_assumido", {
    entidadeId: negocioId,
    payload: { handoff_id: handoffId },
  });

  revalidarHandoff(negocioId);
  return { message: "Handoff assumido." };
}

export async function registrarResultadoHandoffHumano(
  _prev: HandoffHumanoState,
  formData: FormData,
): Promise<HandoffHumanoState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessao expirada. Entre novamente." };

  const handoffId = String(formData.get("handoff_id") ?? "").trim();
  const resultado = String(formData.get("resultado") ?? "").trim();
  const observacao = String(formData.get("observacao") ?? "").trim();

  if (!handoffId) return { error: "Handoff nao identificado." };
  if (!isResultadoHandoffHumano(resultado))
    return { error: "Selecione um resultado valido." };
  if (observacao.length > 1000)
    return { error: "A observacao deve ter no maximo 1000 caracteres." };

  const supabase = await createClient();
  const { data: handoff, error: handoffError } = await supabase
    .from("negocio_handoffs_humanos")
    .select("id, negocio_id, status")
    .eq("id", handoffId)
    .maybeSingle();

  if (handoffError || !handoff)
    return { error: "Handoff nao encontrado ou sem permissao." };
  if (!["aberto", "em_atendimento"].includes(String(handoff.status)))
    return { error: "Este handoff ja foi encerrado." };

  const negocioId = String(handoff.negocio_id);
  const autorizado = await podeOperarHandoff(negocioId, sessao.user.id);
  if (!autorizado)
    return { error: "Apenas admin ou corretor ativo pode registrar resultado." };

  const agora = new Date().toISOString();
  const pararCadencia = resultado === "parar_cadencia";
  const { error: updateError } = await supabase
    .from("negocio_handoffs_humanos")
    .update({
      status: "concluido",
      responsavel_id: sessao.user.id,
      assumido_em: handoff.status === "aberto" ? agora : undefined,
      resultado,
      observacao: observacao || null,
      parar_cadencia: pararCadencia,
      concluido_em: agora,
    })
    .eq("id", handoffId);

  if (updateError)
    return { error: "Nao foi possivel registrar o resultado do handoff." };

  const statusDestino = statusDestinoPorResultado(resultado);
  if (statusDestino) {
    await supabase
      .from("negocios")
      .update({ status: statusDestino })
      .eq("id", negocioId)
      .not("status", "in", "(concluido,perdido)");
  }

  await registrarEvento("handoff_humano_resultado_registrado", {
    entidadeId: negocioId,
    payload: {
      handoff_id: handoffId,
      resultado,
      parar_cadencia: pararCadencia,
      status_destino: statusDestino,
    },
  });

  if (statusDestino) {
    await registrarEvento("negocio_status_mudado", {
      entidadeId: negocioId,
      payload: {
        status: statusDestino,
        motivo: "handoff_humano",
        handoff_id: handoffId,
      },
    });
  }

  revalidarHandoff(negocioId);
  return { message: "Resultado do handoff registrado." };
}
