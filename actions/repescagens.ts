"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { registrarEvento } from "@/lib/log";

export type RepescagemState = { error?: string; message?: string };

function limparTexto(value: FormDataEntryValue | null, limite: number) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limite);
}

function revalidar(negocioId: string) {
  revalidatePath(`/painel/negocios/${negocioId}`);
  revalidatePath("/painel/negocios");
  revalidatePath("/painel/observabilidade");
}

function mensagemErroRpc(error: { message?: string } | null | undefined, fallback: string) {
  const mensagem = error?.message ?? "";
  if (mensagem.includes("not_authenticated")) return "Sessao expirada. Entre novamente.";
  if (mensagem.includes("negocio_nao_encontrado")) return "Negocio nao encontrado.";
  if (mensagem.includes("repescagem_nao_encontrada")) return "Repescagem nao identificada.";
  if (mensagem.includes("negocio_encerrado")) return "Este negocio ja esta encerrado.";
  if (mensagem.includes("sem_permissao")) return "Voce nao tem permissao para esta acao.";
  return fallback;
}

export async function marcarNegocioPerdidoComRepescagem(
  _prev: RepescagemState,
  formData: FormData,
): Promise<RepescagemState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessao expirada. Entre novamente." };

  const negocioId = limparTexto(formData.get("negocio_id"), 80);
  const motivo = limparTexto(formData.get("motivo_perda"), 800);
  const aceitaSimilares = String(formData.get("aceita_similares") ?? "") === "sim";

  if (!negocioId) return { error: "Negocio nao identificado." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("marcar_negocio_perdido_com_repescagem", {
      p_negocio_id: negocioId,
      p_motivo_perda: motivo || null,
      p_aceita_similares: aceitaSimilares,
    })
    .single<{ message: string; aceita_similares: boolean }>();

  if (error)
    return {
      error: mensagemErroRpc(
        error,
        "Nao foi possivel marcar o negocio como perdido e registrar a repescagem.",
      ),
    };

  await registrarEvento("negocio_status_mudado", {
    entidadeId: negocioId,
    payload: { status: "perdido", motivo: "repescagem", motivo_perda: motivo || null },
  });
  await registrarEvento("lead_repescagem_criada", {
    entidadeId: negocioId,
    payload: { aceita_similares: aceitaSimilares, motivo_perda: motivo || null },
  });

  revalidar(negocioId);
  return {
    message:
      data?.message ??
      (aceitaSimilares
        ? "Negocio perdido e repescagem agendada."
        : "Negocio perdido e cadencia encerrada."),
  };
}

export async function registrarRespostaRepescagem(
  _prev: RepescagemState,
  formData: FormData,
): Promise<RepescagemState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessao expirada. Entre novamente." };

  const repescagemId = limparTexto(formData.get("repescagem_id"), 80);
  const negocioId = limparTexto(formData.get("negocio_id"), 80);
  const resposta = limparTexto(formData.get("resposta_lead"), 1200);
  const aceitaSimilares = String(formData.get("aceita_similares") ?? "") === "sim";
  const pararCadencia = String(formData.get("parar_cadencia") ?? "") === "sim";

  if (!repescagemId || !negocioId) return { error: "Repescagem nao identificada." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("registrar_resposta_repescagem", {
      p_repescagem_id: repescagemId,
      p_negocio_id: negocioId,
      p_resposta_lead: resposta || null,
      p_aceita_similares: aceitaSimilares,
      p_parar_cadencia: pararCadencia,
    })
    .single<{ message: string; parar_cadencia: boolean }>();

  if (error)
    return {
      error: mensagemErroRpc(error, "Nao foi possivel registrar a resposta."),
    };

  await registrarEvento("lead_repescagem_resposta_registrada", {
    entidadeId: negocioId,
    payload: {
      aceita_similares: aceitaSimilares,
      parar_cadencia: pararCadencia,
      respondeu: Boolean(resposta),
    },
  });

  revalidar(negocioId);
  return {
    message:
      data?.message ?? (pararCadencia ? "Cadencia encerrada." : "Resposta registrada."),
  };
}
