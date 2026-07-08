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

async function papeisAtivos(negocioId: string, usuarioId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("papeis_negocio")
    .select("papel")
    .eq("negocio_id", negocioId)
    .eq("usuario_id", usuarioId)
    .eq("ativo", true);
  return (data ?? []).map((item) => String(item.papel));
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
  const papeis = await papeisAtivos(negocioId, sessao.user.id);
  const podeOperar =
    sessao.isAdmin || papeis.some((papel) => ["proprietario", "corretor", "admin"].includes(papel));
  if (!podeOperar)
    return { error: "Apenas proprietario, corretor ou admin pode marcar o negocio como perdido." };

  const { data: negocio } = await supabase
    .from("negocios")
    .select("id, status")
    .eq("id", negocioId)
    .maybeSingle();
  if (!negocio) return { error: "Negocio nao encontrado." };
  if (["concluido", "perdido"].includes(String(negocio.status)))
    return { error: "Este negocio ja esta encerrado." };

  const { data: comprador } = await supabase
    .from("papeis_negocio")
    .select("usuario_id")
    .eq("negocio_id", negocioId)
    .eq("papel", "comprador")
    .eq("ativo", true)
    .order("criado_em", { ascending: true })
    .limit(1)
    .maybeSingle();

  const proximaTentativa = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { error: repescagemError } = await supabase.from("negocio_repescagens").upsert(
    {
      negocio_id: negocioId,
      comprador_id: comprador?.usuario_id ?? null,
      criado_por: sessao.user.id,
      motivo_perda: motivo || null,
      origem: "manual",
      status: "pendente",
      aceita_similares: aceitaSimilares,
      parar_cadencia: !aceitaSimilares,
      proxima_tentativa_em: aceitaSimilares ? proximaTentativa : null,
      encerrado_em: aceitaSimilares ? null : new Date().toISOString(),
    },
    { onConflict: "negocio_id" },
  );

  if (repescagemError)
    return { error: "Nao foi possivel registrar a repescagem do lead." };

  const { error: negocioError } = await supabase
    .from("negocios")
    .update({ status: "perdido" })
    .eq("id", negocioId);

  if (negocioError) return { error: "Nao foi possivel marcar o negocio como perdido." };

  await registrarEvento("negocio_status_mudado", {
    entidadeId: negocioId,
    payload: { status: "perdido", motivo: "repescagem", motivo_perda: motivo || null },
  });
  await registrarEvento("lead_repescagem_criada", {
    entidadeId: negocioId,
    payload: { aceita_similares: aceitaSimilares, motivo_perda: motivo || null },
  });

  revalidar(negocioId);
  return { message: aceitaSimilares ? "Negocio perdido e repescagem agendada." : "Negocio perdido e cadencia encerrada." };
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

  const papeis = await papeisAtivos(negocioId, sessao.user.id);
  const podeResponder =
    sessao.isAdmin || papeis.some((papel) => ["comprador", "proprietario", "corretor", "admin"].includes(papel));
  if (!podeResponder) return { error: "Voce nao participa deste negocio." };

  const update: Record<string, unknown> = {
    resposta_lead: resposta || null,
    aceita_similares: aceitaSimilares,
    parar_cadencia: pararCadencia,
    status: pararCadencia ? "encerrado" : "respondido",
    proxima_tentativa_em: pararCadencia ? null : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  };
  if (pararCadencia) update.encerrado_em = new Date().toISOString();

  const supabase = await createClient();
  const { error } = await supabase
    .from("negocio_repescagens")
    .update(update)
    .eq("id", repescagemId)
    .eq("negocio_id", negocioId);

  if (error) return { error: "Nao foi possivel registrar a resposta." };

  await registrarEvento("lead_repescagem_resposta_registrada", {
    entidadeId: negocioId,
    payload: {
      aceita_similares: aceitaSimilares,
      parar_cadencia: pararCadencia,
      respondeu: Boolean(resposta),
    },
  });

  revalidar(negocioId);
  return { message: pararCadencia ? "Cadencia encerrada." : "Resposta registrada." };
}
