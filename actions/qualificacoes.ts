"use server";

import { revalidatePath } from "next/cache";
import { getSessao } from "@/lib/auth";
import { registrarEvento } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";

export type QualificacaoState = {
  error?: string;
  message?: string;
};

type RespostasQualificacao = {
  urgencia: string;
  composicao_familiar: string;
  rotina: string;
  prioridades: string[];
  quer_visitar: string;
  aceita_similares: string;
  observacoes: string;
};

const ROTULOS: Record<string, string> = {
  agora: "precisa agora",
  trinta_dias: "em ate 30 dias",
  noventa_dias: "em ate 90 dias",
  pesquisando: "ainda esta pesquisando",
  sozinho: "mora sozinho(a)",
  casal: "casal",
  familia_criancas: "familia com criancas",
  familia_idosos: "familia com idosos",
  investir: "investimento",
  trabalho: "trabalho",
  escola: "escola",
  familia: "familia",
  transporte: "transporte",
  seguranca: "seguranca",
  preco: "preco",
  lazer: "lazer",
  sim: "sim",
  talvez: "talvez",
  nao: "nao",
};

function limparTexto(valor: FormDataEntryValue | null, max = 500) {
  return String(valor ?? "").trim().slice(0, max);
}

function rotulo(valor: string) {
  return ROTULOS[valor] ?? valor.replaceAll("_", " ");
}

function montarRespostas(formData: FormData): RespostasQualificacao {
  return {
    urgencia: limparTexto(formData.get("urgencia"), 40),
    composicao_familiar: limparTexto(formData.get("composicao_familiar"), 60),
    rotina: limparTexto(formData.get("rotina"), 80),
    prioridades: formData
      .getAll("prioridades")
      .map((item) => limparTexto(item, 40))
      .filter(Boolean)
      .slice(0, 6),
    quer_visitar: limparTexto(formData.get("quer_visitar"), 20),
    aceita_similares: limparTexto(formData.get("aceita_similares"), 20),
    observacoes: limparTexto(formData.get("observacoes"), 700),
  };
}

function calcularTemperatura(respostas: RespostasQualificacao) {
  let score = 0;
  if (["agora", "trinta_dias"].includes(respostas.urgencia)) score += 3;
  if (respostas.urgencia === "noventa_dias") score += 1;
  if (respostas.quer_visitar === "sim") score += 3;
  if (respostas.quer_visitar === "talvez") score += 1;
  if (respostas.aceita_similares === "sim") score += 1;
  if (respostas.prioridades.length >= 3) score += 1;

  if (score >= 5) return "quente";
  if (score >= 2) return "morno";
  return "frio";
}

function montarResumo(respostas: RespostasQualificacao) {
  const partes = [
    respostas.urgencia && `Urgencia: ${rotulo(respostas.urgencia)}.`,
    respostas.composicao_familiar &&
      `Composicao: ${rotulo(respostas.composicao_familiar)}.`,
    respostas.rotina && `Rotina: ${respostas.rotina}.`,
    respostas.prioridades.length > 0 &&
      `Prioridades: ${respostas.prioridades.map(rotulo).join(", ")}.`,
    respostas.quer_visitar &&
      `Abertura para visita: ${rotulo(respostas.quer_visitar)}.`,
    respostas.aceita_similares &&
      `Aceita similares: ${rotulo(respostas.aceita_similares)}.`,
    respostas.observacoes && `Observacoes: ${respostas.observacoes}.`,
  ].filter(Boolean);

  return partes.join(" ");
}

async function notificarParticipantesQualificados(
  supabase: Awaited<ReturnType<typeof createClient>>,
  negocioId: string,
  compradorId: string,
  temperatura: string,
  resumo: string,
) {
  const { data: participantes } = await supabase
    .from("papeis_negocio")
    .select("usuario_id, papel, ativo")
    .eq("negocio_id", negocioId)
    .eq("ativo", true)
    .neq("usuario_id", compradorId)
    .in("papel", ["proprietario", "corretor", "admin"]);

  const corpo = `Temperatura ${temperatura}. ${resumo}`.slice(0, 600);

  await Promise.all(
    (participantes ?? []).map((participante) =>
      supabase.rpc("notificar", {
        p_usuario: participante.usuario_id,
        p_tipo: "interesse",
        p_titulo: "Lead qualificado",
        p_corpo: corpo,
        p_link: `/painel/negocios/${negocioId}`,
      }),
    ),
  );
}

export async function salvarQualificacaoLead(
  _prev: QualificacaoState,
  formData: FormData,
): Promise<QualificacaoState> {
  const negocioId = limparTexto(formData.get("negocio_id"), 80);
  if (!negocioId) return { error: "Negocio nao identificado." };

  const sessao = await getSessao();
  if (!sessao) return { error: "Entre para qualificar seu interesse." };

  const supabase = await createClient();
  const { data: papelComprador, error: papelError } = await supabase
    .from("papeis_negocio")
    .select("id")
    .eq("negocio_id", negocioId)
    .eq("usuario_id", sessao.user.id)
    .eq("papel", "comprador")
    .eq("ativo", true)
    .maybeSingle();

  if (papelError || !papelComprador) {
    return { error: "Apenas o comprador deste negocio pode responder." };
  }

  const respostas = montarRespostas(formData);
  if (!respostas.urgencia || respostas.prioridades.length === 0) {
    return {
      error: "Informe a urgencia e pelo menos uma prioridade para continuar.",
    };
  }

  const temperatura = calcularTemperatura(respostas);
  const resumo = montarResumo(respostas);

  const { error } = await supabase.from("negocio_qualificacoes").upsert(
    {
      negocio_id: negocioId,
      comprador_id: sessao.user.id,
      respostas,
      resumo,
      temperatura,
      origem: "pos_interesse",
      concluida_em: new Date().toISOString(),
    },
    { onConflict: "negocio_id,comprador_id" },
  );

  if (error) {
    return { error: "Nao foi possivel salvar a qualificacao agora." };
  }

  await notificarParticipantesQualificados(
    supabase,
    negocioId,
    sessao.user.id,
    temperatura,
    resumo,
  );

  await registrarEvento("lead_qualificacao_salva", {
    entidadeId: negocioId,
    payload: {
      temperatura,
      prioridades: respostas.prioridades,
      aceita_similares: respostas.aceita_similares,
    },
  });

  revalidatePath(`/painel/negocios/${negocioId}`);
  revalidatePath("/painel/negocios");
  revalidatePath("/painel/notificacoes");

  return { message: "Qualificacao salva. O anunciante ja recebeu o resumo." };
}
